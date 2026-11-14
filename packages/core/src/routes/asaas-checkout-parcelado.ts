/**
 * Checkout Asaas parcelado (Checkout API).
 * Cartão parcelado — valor sem desconto, parcelas configuráveis via max_installments.
 * Usa POST /v3/checkouts com chargeType INSTALLMENT.
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  sendOtpAndCreateUserIfNeeded,
  type AccessCodeGateway,
} from '../helpers/auth';
import {
  getPriceWithProduct,
  isAsaasPendingCheckoutReusable,
} from '../helpers/checkout';
import { handleError } from '../errors/error-handler';
import { getLogger } from '../logger';
import { buildCouponOrderMetadata } from '../payments/coupon/checkout-coupon-metadata';
import { type ResolvedCheckoutCoupon } from '../payments/coupon/discount-coupon.service';
import { allocateTotalCentsByWeights } from '../payments/pricing/checkout-addon-prices';
import {
  checkoutDocument,
  findReusableAsaasPayment,
  insertCouponRedemption,
  buildPendingSubscriptionRow,
  insertOrderAndPayment,
  loadCheckoutAddons,
  loadCheckoutCoupon,
  touchCheckoutProfile,
  type CheckoutDatabase,
  type CheckoutSession,
} from '../payments/checkout/checkout-store';
import { resolveCheckoutPricePromo } from '../payments/pricing/checkout-price-promo';
import { parseCashDiscountPercent } from '../payments/pricing/checkout-pricing';
import { asaasCheckoutParceladoBodySchema } from '../payments/validators/asaas-checkout-parcelado.validators';
import { readSetting } from './read-setting';

const PLACEHOLDER_IMAGE_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQYV2NgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=';

/** Remove caracteres que o Asaas pode rejeitar (control chars, BOM, zero-width chars, etc.) */
function sanitizeForAsaas(value: string): string {
  return value
    .replace(/[\u0000-\u001F\u007F\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface AsaasCheckoutParceladoOptions {
  database: CheckoutDatabase;
  findSession: (request: NextRequest) => Promise<CheckoutSession | null>;
  asaasApiKey: string | (() => string | Promise<string>);
  asaasEnvironment: 'sandbox' | 'production' | (() => 'sandbox' | 'production' | Promise<'sandbox' | 'production'>);
  appUrl: string;
  /** Base URL para callbacks (successUrl, cancelUrl, expiredUrl). Asaas exige URLs válidas — use HTTPS (ex: ngrok) quando appUrl for localhost. */
  callbackBaseUrl?: string;
  minutesToExpire?: number;
  onOrderCreated?: (data: { order_id: string; payment_id: string; payment: Record<string, unknown> }) => Promise<void>;
  requestAccessCode?: AccessCodeGateway;
}

export function createAsaasCheckoutParceladoHandler(options: AsaasCheckoutParceladoOptions) {
  const {
    database,
    asaasApiKey,
    asaasEnvironment,
    appUrl,
    callbackBaseUrl,
    minutesToExpire = 60,
  } = options;

  const base = (callbackBaseUrl || appUrl).replace(/\/$/, '');

  return async function POST(request: NextRequest) {
    const logger = getLogger();
    const action = 'asaas-checkout-parcelado';

    const { createAsaasService } = await import('../payments/services');

    try {
      const rawBody = await request.json();
      const parsed = asaasCheckoutParceladoBodySchema.safeParse(rawBody);

      if (!parsed.success) {
        const first = parsed.error.issues[0];
        const message = first ? `${first.path.join('.')}: ${first.message}` : 'Dados de checkout inválidos';
        return NextResponse.json({ error: message, details: parsed.error.issues }, { status: 400 });
      }

      const { price_id, customer_info, installments, force_new = false, coupon_code, addon_price_ids } =
        parsed.data;
      const addonIds = addon_price_ids ?? [];

      const { price: priceData, product, error: priceProductError } = await getPriceWithProduct(
        database,
        price_id
      );

      if (priceProductError || !priceData || !product) {
        return NextResponse.json(
          { error: priceProductError?.message || 'Erro ao buscar produto', details: priceProductError?.details },
          { status: 404 }
        );
      }

      const session = await options.findSession(request);
      const userId = session?.userId ?? null;
      const userEmail = session?.email ?? null;

      if (!userId || userEmail !== customer_info.email) {
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
          { action: 'email_verification_required', message: result.message, user_exists: result.userExists },
          { status: 202 }
        );
      }

      const metadata = (priceData.metadata as Record<string, unknown>) || {};
      const maxInstallmentsRaw = metadata.max_installments;
      const parsedMax =
        typeof maxInstallmentsRaw === 'number'
          ? maxInstallmentsRaw
          : typeof maxInstallmentsRaw === 'string'
            ? parseInt(maxInstallmentsRaw, 10)
            : NaN;
      const effectiveMax = !isNaN(parsedMax) && parsedMax >= 2 && parsedMax <= 24 ? parsedMax : 12;
      const installmentsToUse = installments != null ? Math.min(installments, effectiveMax) : effectiveMax;

      const { listCents, promoMeta, stockSoldOut } = resolveCheckoutPricePromo(priceData, 'parcelado');
      if (stockSoldOut) {
        return NextResponse.json({ error: 'Este plano está esgotado.' }, { status: 409 });
      }

      let finalCents = listCents;
      let resolvedCoupon: ResolvedCheckoutCoupon | null = null;
      const catalogCents = typeof priceData.amount === 'number' ? priceData.amount : listCents;

      const addonResolution = await loadCheckoutAddons(database, {
        anchorPriceId: price_id,
        mainPriceRecurring: !!priceData.recurring,
        requestedAddonPriceIds: addonIds,
        flow: 'parcelado',
      });
      if (!addonResolution.ok) {
        return NextResponse.json({ error: addonResolution.error }, { status: 400 });
      }

      let addonsForSnapshot = addonResolution.addons;

      if (coupon_code) {
        const cashDiscount = parseCashDiscountPercent(metadata);
        const mergedList = listCents + addonResolution.totalAddonListCents;
        const mergedCatalog = catalogCents + addonResolution.totalAddonCatalogCents;
        const couponResult = await loadCheckoutCoupon(database, {
          couponCode: coupon_code,
          userId,
          productId: product.id,
          priceId: priceData.id,
          flow: 'parcelado',
          listAmountCents: mergedList,
          cashDiscountPercent: cashDiscount,
          catalogAmountCents: mergedCatalog,
        });
        if (!couponResult.ok) {
          return NextResponse.json({ error: couponResult.error }, { status: 400 });
        }
        resolvedCoupon = couponResult.data;
        finalCents = couponResult.data.finalCents;
        if (addonResolution.addons.length > 0) {
          const alloc = allocateTotalCentsByWeights(finalCents, [
            { key: '__main__', weight: listCents },
            ...addonResolution.addons.map((a) => ({ key: a.id, weight: a.listCents })),
          ]);
          addonsForSnapshot = addonResolution.addons.map((a) => ({
            ...a,
            amountCents: alloc[a.id] ?? a.amountCents,
          }));
        }
      }

      const combinedCents = coupon_code ? finalCents : finalCents + addonResolution.totalAddonCents;
      const valueInReais = combinedCents / 100;

      const ttlDays = 7;
      const ttlDate = new Date();
      ttlDate.setDate(ttlDate.getDate() - ttlDays);

      if (!coupon_code && addonIds.length === 0) {
        const existingPayment = await findReusableAsaasPayment(database, {
          userId,
          priceId: price_id,
          productId: product.id,
          billingType: 'CREDIT_CARD',
          installments: installmentsToUse,
          createdAfter: ttlDate.toISOString(),
        });

        let validPayment = existingPayment;
        if (existingPayment?.order_id && !isAsaasPendingCheckoutReusable(existingPayment.orders)) {
          validPayment = null;
        }

        if (force_new && validPayment) {
          validPayment = null;
        }

        if (validPayment && !force_new) {
          return NextResponse.json({
            message: 'Checkout pendente encontrado',
            payment: {
              id: validPayment.id,
              invoice_url: validPayment.invoice_url,
              status: 'pending',
            },
            product: { id: product.id, name: product.name },
            subscription_id: validPayment.subscription_id,
            reused: true,
          });
        }
      }

      const { profile, error: profileError } = await touchCheckoutProfile(database, userId, {
        name: customer_info.name,
        phone: customer_info.phone,
        document: checkoutDocument(customer_info),
        personType: customer_info.person_type,
      });
      if (profileError || !profile) {
        return NextResponse.json({ error: profileError?.message || 'Erro ao processar perfil' }, { status: 500 });
      }

      const orderId = uuidv4();
      const orderType = priceData.recurring ? 'subscription' : 'one_time';
      const subscriptionId = priceData.recurring ? uuidv4() : null;

      const cpfCnpj =
        customer_info.person_type === 'juridica'
          ? customer_info.cnpj?.replace(/\D/g, '')
          : customer_info.cpf?.replace(/\D/g, '');
      if (!cpfCnpj) {
        return NextResponse.json({ error: 'CPF ou CNPJ é obrigatório' }, { status: 400 });
      }

      const productName = typeof product.name === 'string' ? product.name.trim() : '';
      if (!productName) {
        return NextResponse.json({ error: 'Produto sem nome configurado' }, { status: 400 });
      }

      const rawCustomerName = (
        customer_info.person_type === 'juridica' && customer_info.razao_social
          ? customer_info.razao_social
          : customer_info.name
      ) ?? '';
      const customerName = sanitizeForAsaas(rawCustomerName);
      if (!customerName) {
        return NextResponse.json({ error: 'Nome do cliente é obrigatório' }, { status: 400 });
      }

      const meta = (product.metadata as Record<string, unknown>) || {};
      const descFromProduct = typeof product.description === 'string' ? product.description.trim() : '';
      const descFromMeta = typeof meta.description === 'string' ? String(meta.description).trim() : '';
      const rawDescription = descFromProduct || descFromMeta || productName;
      const itemDescription = sanitizeForAsaas(rawDescription);
      if (!itemDescription) {
        return NextResponse.json({ error: 'Produto sem descrição configurada' }, { status: 400 });
      }

      const apiKey = await readSetting(asaasApiKey);
      const environment = await readSetting(asaasEnvironment);
      const asaasService = createAsaasService(apiKey, environment);

      const itemName = productName.substring(0, 30);
      const itemDescBase = itemDescription.substring(0, 150);
      const itemDesc =
        addonResolution.addons.length > 0
          ? sanitizeForAsaas(
              `${itemDescBase.slice(0, 100)} (+${addonResolution.addons.length} extra(s))`
            ).substring(0, 150)
          : itemDescBase;

      logger.info('Payload checkout Asaas', {
        module: 'routes',
        action,
        itemName,
        itemDesc,
        valueInReais,
      });

      const checkout = await asaasService.createCheckout({
        billingTypes: ['CREDIT_CARD'],
        chargeTypes: ['DETACHED', 'INSTALLMENT'],
        items: [
          {
            name: itemName,
            value: valueInReais,
            quantity: 1,
            imageBase64: PLACEHOLDER_IMAGE_BASE64,
            description: itemDesc,
            externalReference: priceData.id,
          },
        ],
        callback: {
          successUrl: `${base}/checkout/confirmation?product_name=${encodeURIComponent(productName)}&gateway=asaas`,
          cancelUrl: `${base}/checkout/${price_id}?cancelled=1`,
          expiredUrl: `${base}/checkout/${price_id}?expired=1`,
        },
        externalReference: subscriptionId ?? orderId,
        minutesToExpire,
        customerData: {
          name: customerName,
          cpfCnpj,
          email: sanitizeForAsaas(customer_info.email),
          phone: customer_info.phone?.replace(/\D/g, '') ?? '',
          phoneNumber: customer_info.phone?.replace(/\D/g, '') ?? '',
          address: customer_info.address ? sanitizeForAsaas(customer_info.address) : undefined,
          addressNumber: customer_info.address_number
            ? String(customer_info.address_number).replace(/\D/g, '') || undefined
            : undefined,
          complement: customer_info.complement ? sanitizeForAsaas(customer_info.complement) : undefined,
          province: customer_info.province ? sanitizeForAsaas(customer_info.province) : undefined,
          postalCode: customer_info.cep?.replace(/\D/g, ''),
        },
        installment: { maxInstallmentCount: effectiveMax },
      });

      const checkoutUrl = asaasService.getCheckoutUrl(checkout.id);

      const expiresAt = new Date(Date.now() + minutesToExpire * 60 * 1000).toISOString();

      const paymentId = uuidv4();
      try {
        await insertOrderAndPayment(
          database,
          'asaas_payments',
          {
            id: orderId,
            user_id: userId,
            subscription_id: subscriptionId,
            product_id: product.id,
            price_id: priceData.id,
            order_type: orderType,
            status: 'pending',
            amount_cents: combinedCents,
            payment_gateway: 'asaas',
            payment_method: 'credit_card',
            expires_at: expiresAt,
            metadata: {
              payment_link_url: checkoutUrl,
              checkout_session_id: checkout.id,
              billing_type: 'CREDIT_CARD',
              refund_policy_snapshot: product.refund_policy ?? product.metadata?.refund_policy ?? null,
              price_topics_snapshot: priceData.metadata?.topics ?? null,
              price_metadata_snapshot: priceData.metadata ?? null,
              product_name_snapshot: product.name ?? null,
              product_description_snapshot: product.description ?? null,
              ...(addonResolution.addons.length > 0 && {
                addon_price_ids_snapshot: addonIds,
                addons_checkout_snapshot: addonsForSnapshot.map((a) => ({
                  id: a.id,
                  amount_cents: a.amountCents,
                  list_cents: a.listCents,
                })),
              }),
              ...promoMeta,
              ...buildCouponOrderMetadata(resolvedCoupon),
            },
          },
          {
            id: paymentId,
            order_id: orderId,
            subscription_id: subscriptionId,
            asaas_customer_id: `checkout:${checkout.id}`,
            asaas_checkout_id: checkout.id,
            asaas_payment_id: null,
            amount_cents: combinedCents,
            status: 'pending',
            billing_type: 'CREDIT_CARD',
            user_id: userId,
            product_id: product.id,
            price_id: priceData.id,
            installments: installmentsToUse,
            invoice_url: checkoutUrl,
            metadata: {
              checkout_session_id: checkout.id,
              customer_cpf_cnpj: cpfCnpj,
              product_name: product.name,
              product_ref: product.ref,
              flow: 'checkout_api',
              ...(addonResolution.addons.length > 0 && { addon_price_ids_snapshot: addonIds }),
              ...promoMeta,
              ...buildCouponOrderMetadata(resolvedCoupon),
            },
          },
          subscriptionId
            ? buildPendingSubscriptionRow(userId, priceData.id, product.id, product.ref, subscriptionId)
            : null
        );
      } catch (persistError) {
        logger.error('Erro ao salvar pedido e pagamento', persistError, { module: 'routes', action });
        return NextResponse.json({ error: 'Erro ao salvar informações do pagamento' }, { status: 500 });
      }

      if (resolvedCoupon) {
        try {
          await insertCouponRedemption(database, resolvedCoupon.couponId, orderId, userId);
        } catch (redeemErr) {
          logger.error('Erro ao registrar resgate de cupom', redeemErr, { module: 'routes', action, orderId });
        }
      }

      if (options.onOrderCreated) {
        try {
          await options.onOrderCreated({
            order_id: orderId,
            payment_id: paymentId,
            payment: { invoice_url: checkoutUrl },
          });
        } catch (emailError) {
          logger.error('Erro ao enviar email', emailError, { module: 'routes', action });
        }
      }

      return NextResponse.json({
        message: 'Checkout parcelado criado com sucesso',
        payment: {
          id: paymentId,
          invoice_url: checkoutUrl,
          status: 'pending',
        },
        product: { id: product.id, name: product.name },
        subscription_id: subscriptionId,
        installments: installmentsToUse,
        charged_amount_cents: combinedCents,
      });
    } catch (error) {
      logger.error('Erro no checkout Asaas parcelado', error, { module: 'routes', action });
      const handled = handleError(error, { module: 'routes', action });
      return NextResponse.json(
        {
          error: handled.error,
          ...(handled.field != null && { field: handled.field }),
          ...(handled.code && { code: handled.code }),
        },
        { status: handled.statusCode }
      );
    }
  };
}
