/**
 * Handler reutilizável para checkout Pagar.me
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkoutBodySchema } from '../payments/validators';
import { v4 as uuidv4 } from 'uuid';
import {
  sendOtpAndCreateUserIfNeeded,
  type AccessCodeGateway,
} from '../helpers/auth';
import { getPriceWithProduct } from '../helpers/checkout';
import { getLogger } from '../logger';
import { buildCouponOrderMetadata } from '../payments/coupon/checkout-coupon-metadata';
import { type ResolvedCheckoutCoupon } from '../payments/coupon/discount-coupon.service';
import {
  checkoutDocument,
  findReusablePagarmePayment,
  insertCouponRedemption,
  insertOrderAndPayment,
  insertPendingSubscription,
  loadCheckoutCoupon,
  touchCheckoutProfile,
  type CheckoutDatabase,
  type CheckoutSession,
} from '../payments/checkout/checkout-store';
import { resolveCheckoutPricePromo } from '../payments/pricing/checkout-price-promo';
import { buildPagarmeLineTotals, parseCashDiscountPercent } from '../payments/pricing/checkout-pricing';
import { readSetting } from './read-setting';

export interface PagarmeCheckoutOptions {
  database: CheckoutDatabase;
  findSession: (request: NextRequest) => Promise<CheckoutSession | null>;
  pagarmeSecretKey: string | (() => string | Promise<string>);
  pagarmeEnvironment: 'sandbox' | 'production' | (() => 'sandbox' | 'production' | Promise<'sandbox' | 'production'>);
  appUrl: string;
  maxInstallments?: number;
  expiresInMinutes?: number;
  requestAccessCode?: AccessCodeGateway;
}

export function createPagarmeCheckoutHandler(options: PagarmeCheckoutOptions) {
  const {
    database,
    pagarmeSecretKey,
    pagarmeEnvironment,
    appUrl,
    maxInstallments = 12,
    expiresInMinutes = 60 * 24 * 15, // 15 dias
  } = options;

  return async function POST(request: NextRequest) {
    const logger = getLogger();
    
    // Criar clients Supabase
    const { createPagarmeService } = await import('../payments/services');

    try {
      logger.info('Recebendo requisição de checkout Pagar.me', {
        module: 'routes',
        action: 'pagarme-checkout',
      });
      
      const rawBody = await request.json();
      if (process.env.NODE_ENV !== 'production') {
        const keys =
          rawBody && typeof rawBody === 'object' && !Array.isArray(rawBody)
            ? Object.keys(rawBody as Record<string, unknown>)
            : [];
        logger.debug('Checkout Pagar.me: campos recebidos', {
          module: 'routes',
          action: 'pagarme-checkout',
          fieldKeys: keys,
        });
      }

      const parsed = checkoutBodySchema.safeParse(rawBody);

      if (!parsed.success) {
        const first = parsed.error.issues[0];
        const message = first ? `${first.path.join('.')}: ${first.message}` : 'Dados de checkout inválidos';
        return NextResponse.json(
          { error: message, details: parsed.error.issues },
          { status: 400 }
        );
      }

      const { price_id, customer_info, coupon_code, addon_price_ids } = parsed.data;

      if ((addon_price_ids?.length ?? 0) > 0) {
        return NextResponse.json(
          { error: 'Add-ons estão disponíveis apenas no checkout Asaas.' },
          { status: 400 }
        );
      }

      // 1. Buscar preço e produto
      const { price: priceData, product, error: priceProductError } = await getPriceWithProduct(
        database,
        price_id
      );

      if (priceProductError || !priceData || !product) {
        return NextResponse.json(
          {
            error: priceProductError?.message || 'Erro ao buscar produto',
            details: priceProductError?.details,
          },
          { status: 404 }
        );
      }

      // 2. Verificar autenticação
      const session = await options.findSession(request);
      const userId = session?.userId ?? null;
      const userEmail = session?.email ?? null;

      logger.info('Verificando autenticação', {
        module: 'routes',
        action: 'pagarme-checkout',
        userId: userId || undefined,
      });

      // Se não está autenticado OU email não confere, BLOQUEAR e pedir OTP
      if (!userId || userEmail !== customer_info.email) {
        logger.warn('Usuário não autenticado ou email não confere', {
          module: 'routes',
          action: 'pagarme-checkout',
          userId: userId || undefined,
        });

        const redirectUrl = `${appUrl}/checkout/verify?return_to=checkout`;

        const result = await sendOtpAndCreateUserIfNeeded(
          options.requestAccessCode ?? {
            request: async () => ({
              userExists: false,
              emailSent: false,
              message: 'Envio de código não configurado',
              error: new Error('Envio de código não configurado'),
            }),
          },
          customer_info.email,
          customer_info.name,
          redirectUrl,
          customer_info.phone,
          customer_info.document
        );

        if (result.error || !result.emailSent) {
          return NextResponse.json({ error: result.message }, { status: 400 });
        }

        return NextResponse.json(
          {
            action: 'email_verification_required',
            message: result.message,
            user_exists: result.userExists,
          },
          { status: 202 }
        );
      }

      logger.info('Usuário autenticado', {
        module: 'routes',
        action: 'pagarme-checkout',
        userId,
      });

      // 3. Criar ou atualizar profile
      const { profile, error: profileError } = await touchCheckoutProfile(database, userId, {
        name: customer_info.name,
        phone: customer_info.phone,
        document: checkoutDocument(customer_info),
        personType: customer_info.person_type,
      });

      if (profileError || !profile) {
        return NextResponse.json(
          { error: profileError?.message || 'Erro ao processar perfil' },
          { status: 500 }
        );
      }

      // 4. Verificar se já existe um pagamento pendente (cupom altera valor — não reutilizar)
      const { existingPayment, shouldReuse } = coupon_code
        ? { existingPayment: null, shouldReuse: false }
        : await findReusablePagarmePayment(database, userId, product.id);

      if (shouldReuse && existingPayment) {
        return NextResponse.json({
          message: 'Link de pagamento pendente já existe',
          payment_link_url: existingPayment.payment_link_url,
          payment_id: existingPayment.id,
          status: existingPayment.status,
          reused: true,
        });
      }

      // 5. Gerar ID do pedido e criar subscription só quando for assinatura (recurring)
      const orderId = uuidv4();
      const orderType = priceData.recurring ? 'subscription' : 'one_time';

      let subscriptionId: string | null = null;
      if (priceData.recurring) {
        const result = await insertPendingSubscription(
          database,
          userId,
          priceData.id,
          product.id,
          product.ref,
          uuidv4()
        );
        if (result.error || !result.subscriptionId) {
          return NextResponse.json({ error: 'Erro ao criar assinatura' }, { status: 500 });
        }
        subscriptionId = result.subscriptionId;
      }

      // 6. Criar link de pagamento no Pagar.me
      const secretKey = await readSetting(pagarmeSecretKey);
      const environment = await readSetting(pagarmeEnvironment);
      const pagarmeService = createPagarmeService(secretKey, environment);

      const metadata = (priceData.metadata as Record<string, unknown>) || {};
      const cashDiscount = parseCashDiscountPercent(metadata);
      const priceMaxInstallmentsRaw = metadata.max_installments;
      const parsedMax =
        typeof priceMaxInstallmentsRaw === 'number'
          ? priceMaxInstallmentsRaw
          : typeof priceMaxInstallmentsRaw === 'string'
            ? parseInt(priceMaxInstallmentsRaw, 10)
            : NaN;
      const effectiveMaxInstallments =
        !isNaN(parsedMax) && parsedMax >= 1 && parsedMax <= 24
          ? parsedMax
          : maxInstallments;

      const pagarmeCouponFlow = (parsed.data.installments ?? 1) > 1 ? 'parcelado' : 'avista';

      const { listCents: amount, promoMeta, stockSoldOut } = resolveCheckoutPricePromo(
        priceData,
        pagarmeCouponFlow
      );
      if (stockSoldOut) {
        return NextResponse.json({ error: 'Este plano está esgotado.' }, { status: 409 });
      }

      let resolvedCoupon: ResolvedCheckoutCoupon | null = null;
      if (coupon_code) {
        const couponResult = await loadCheckoutCoupon(database, {
          couponCode: coupon_code,
          userId,
          productId: product.id,
          priceId: priceData.id,
          flow: pagarmeCouponFlow,
          listAmountCents: amount,
          cashDiscountPercent: cashDiscount,
        });
        if (!couponResult.ok) {
          return NextResponse.json({ error: couponResult.error }, { status: 400 });
        }
        resolvedCoupon = couponResult.data;
      }

      const couponRowForLines = resolvedCoupon?.couponRow ?? null;
      const lines = buildPagarmeLineTotals(amount, cashDiscount, couponRowForLines);

      const installments = Array.from({ length: effectiveMaxInstallments }, (_, i) => {
        const number = i + 1;
        const total = number === 1 ? lines.installmentOneTotal : lines.installmentMultiTotal;
        return { number, total };
      });

      const pixBoletoDiscountPct = lines.pixBoletoDiscountPercent;

      const pagarmeData = {
        name: `${product.name} - ${(subscriptionId ?? orderId).toString().substring(0, 8)}`,
        type: 'order' as const,
        expires_in: expiresInMinutes,
        max_sessions: 100,
        max_paid_sessions: 1,
        payment_settings: {
          accepted_payment_methods: ['credit_card', 'pix', 'boleto'],
          credit_card_settings: {
            operation_type: 'auth_and_capture' as const,
            installments,
          },
          boleto_settings: {
            due_in: 3,
            instructions: `Pagamento do produto ${product.name}. Após confirmação, seu acesso será liberado.`,
            ...(pixBoletoDiscountPct != null &&
              pixBoletoDiscountPct > 0 && { discount_percentage: pixBoletoDiscountPct }),
          },
          pix_settings: {
            expires_in: 72 * 60 * 60,
            ...(pixBoletoDiscountPct != null &&
              pixBoletoDiscountPct > 0 && { discount_percentage: pixBoletoDiscountPct }),
          },
        },
        cart_settings: {
          items: [
            {
              amount,
              name: product.name,
              default_quantity: 1,
            },
          ],
        },
        customer_settings: {
          customer: {
            name: customer_info.name,
            email: customer_info.email,
            document: customer_info.document,
            type: 'individual' as const,
          },
        },
        order_code: orderId,
      };

      logger.info('Criando payment link no Pagar.me', {
        module: 'routes',
        action: 'pagarme-checkout',
        orderId,
        productId: product.id,
      });
      
      const paymentLink = await pagarmeService.createPaymentLink(pagarmeData);
      
      logger.info('Payment link criado com sucesso', {
        module: 'routes',
        action: 'pagarme-checkout',
        paymentLinkId: paymentLink.id,
        orderId,
      });

      // Calcular data de expiração
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);

      const primaryAmountCents =
        pagarmeCouponFlow === 'parcelado' ? lines.installmentMultiTotal : lines.installmentOneTotal;

      // 8. Criar Order (pedido)
      const paymentId = uuidv4();
      try {
        await insertOrderAndPayment(
          database,
          'pagarme_payments',
          {
            id: orderId,
            user_id: userId,
            subscription_id: subscriptionId,
            product_id: product.id,
            price_id: priceData.id,
            order_type: orderType,
            status: 'pending',
            amount_cents: primaryAmountCents,
            payment_gateway: 'pagarme',
            expires_at: expiresAt.toISOString(),
            metadata: {
              payment_link_url: paymentLink.url,
              refund_policy_snapshot: product.refund_policy ?? product.metadata?.refund_policy ?? null,
              price_topics_snapshot: priceData.metadata?.topics ?? null,
              price_metadata_snapshot: priceData.metadata ?? null,
              product_name_snapshot: product.name ?? null,
              product_description_snapshot: product.description ?? null,
              pagarme_installment_one_cents: lines.installmentOneTotal,
              pagarme_installment_multi_cents: lines.installmentMultiTotal,
              pagarme_coupon_flow: pagarmeCouponFlow,
              ...promoMeta,
              ...buildCouponOrderMetadata(resolvedCoupon),
            },
          },
          {
            id: paymentId,
            order_id: orderId,
            subscription_id: subscriptionId,
            payment_link_id: paymentLink.id,
            payment_link_url: paymentLink.url,
            amount_cents: primaryAmountCents,
            price_id: priceData.id,
            product_id: product.id,
            status: 'pending',
            expires_at: expiresAt.toISOString(),
            user_id: userId,
          }
        );
      } catch (persistError) {
        logger.error('Erro ao salvar pedido e pagamento', persistError, {
          module: 'routes',
          action: 'pagarme-checkout',
          paymentId,
          orderId,
        });
        return NextResponse.json({ error: 'Erro ao salvar informações do pagamento' }, { status: 500 });
      }

      if (resolvedCoupon) {
        try {
          await insertCouponRedemption(database, resolvedCoupon.couponId, orderId, userId);
        } catch (redeemErr) {
          logger.error('Erro ao registrar resgate de cupom', redeemErr, {
            module: 'routes',
            action: 'pagarme-checkout',
            orderId,
          });
        }
      }

      logger.info('Checkout criado com sucesso', {
        module: 'routes',
        action: 'pagarme-checkout',
        orderId,
        paymentId,
        paymentLinkId: paymentLink.id,
      });

      // 8. Retornar dados
      return NextResponse.json({
        message: 'Link de pagamento criado com sucesso',
        payment_link_url: paymentLink.url,
        payment_id: paymentId,
        payment_link_id: paymentLink.id,
        reused: false,
        charged_amount_cents: primaryAmountCents,
      });
    } catch (error) {
      logger.error('Erro no checkout Pagar.me', error, {
        module: 'routes',
        action: 'pagarme-checkout',
      });
      const isProduction = process.env.NODE_ENV === 'production';
      return NextResponse.json(
        {
          error:
            !isProduction && error instanceof Error ? error.message : 'Erro interno do servidor',
        },
        { status: 500 }
      );
    }
  };
}

