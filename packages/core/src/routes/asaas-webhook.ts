/**
 * Handler reutilizável para webhooks Asaas
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  claimWebhookEventOnClient,
  logWebhookOnClient,
  updateWebhookLogOnClient,
} from '../helpers/webhook-logger';
import { getLogger } from '../logger';
import { asaasWebhookPayloadSchema } from '../payments/validators';
import type { AsaasWebhookOptions, RouteHandler } from '../types/routes';
import { recordPricePromoSalesAfterOrderPaid } from '../payments/pricing/record-price-promo-sales';

const logger = getLogger();

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const RELEVANT_EVENTS = [
  'PAYMENT_RECEIVED',
  'PAYMENT_CONFIRMED',
  'PAYMENT_REFUNDED',
  'CHECKOUT_PAID',
  'CHECKOUT_CANCELED',
  'CHECKOUT_EXPIRED',
  'CHECKOUT_CREATED',
];

const ASAAS_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

function sanitizeAsaasId(id: unknown): string | null {
  if (typeof id !== 'string' || !id || !ASAAS_ID_REGEX.test(id)) return null;
  return id;
}

type PaymentRecord = {
  id: string;
  status: string;
  order_id: string | null;
  subscription_id: string | null;
  asaas_payment_id: string | null;
  refunded_at: string | null;
  subscriptions: { id: string; status: string; user_id: string; price_id: string } | null;
};

/**
 * Busca registro de pagamento de forma determinística.
 * Ordem: (1) asaas_payment_id, (2) asaas_installment_id, (3) asaas_checkout_id = checkoutSession.
 */
async function findPaymentRecord(
  paymentData: Record<string, unknown>,
  supabase: any
): Promise<{ data: PaymentRecord | null; error: any }> {
  const asaasPaymentId = sanitizeAsaasId(paymentData.id);
  const asaasInstallmentId = sanitizeAsaasId(paymentData.installment);
  const checkoutSession =
    sanitizeAsaasId(paymentData.checkoutSession) ?? sanitizeAsaasId(paymentData.checkout_session);

  const select =
    'id, status, order_id, subscription_id, asaas_payment_id, refunded_at, subscriptions(id, status, user_id, price_id)';

  // (1) asaas_payment_id (payment.id = pay_xxx)
  if (asaasPaymentId) {
    const { data, error } = await supabase
      .schema('payments')
      .from('asaas_payments')
      .select(select)
      .eq('asaas_payment_id', asaasPaymentId)
      .maybeSingle();
    if (!error && data) return { data: data as PaymentRecord, error: null };
  }

  // (2) asaas_installment_id (parcelado)
  if (asaasInstallmentId) {
    const { data, error } = await supabase
      .schema('payments')
      .from('asaas_payments')
      .select(select)
      .eq('asaas_installment_id', asaasInstallmentId)
      .maybeSingle();
    if (!error && data) return { data: data as PaymentRecord, error: null };
  }

  // (3) asaas_checkout_id = checkoutSession (Checkout API: PAYMENT_RECEIVED envia payment.checkoutSession)
  if (checkoutSession) {
    const { data, error } = await supabase
      .schema('payments')
      .from('asaas_payments')
      .select(select)
      .eq('asaas_checkout_id', checkoutSession)
      .maybeSingle();
    if (!error && data) return { data: data as PaymentRecord, error: null };
  }

  return { data: null, error: null };
}

/**
 * Checkout cancelado (usuário) ou expirado (minutesToExpire): atualiza pagamento/pedido se ainda pending.
 */
async function markCheckoutSessionTerminal(
  supabase: any,
  checkoutId: string,
  terminalStatus: 'cancelled' | 'expired',
  logPastParticiple: 'cancelado' | 'expirado'
): Promise<void> {
  const { data: paymentRecord } = await supabase
    .schema('payments')
    .from('asaas_payments')
    .select('id, status, order_id')
    .eq('asaas_checkout_id', checkoutId)
    .maybeSingle();

  if (!paymentRecord || paymentRecord.status !== 'pending') {
    return;
  }

  await supabase.schema('payments').from('asaas_payments').update({ status: terminalStatus }).eq('id', paymentRecord.id);

  if (paymentRecord.order_id) {
    await supabase.schema('payments').from('orders').update({ status: terminalStatus }).eq('id', paymentRecord.order_id);
  }

  logger.info(`Checkout ${logPastParticiple} processado`, {
    module: 'routes',
    action: 'asaas-webhook',
    checkoutId,
    paymentId: paymentRecord.id,
    orderId: paymentRecord.order_id,
  });
}

/**
 * Processa pagamento confirmado
 */
async function processAsaasPayment(paymentData: Record<string, unknown>, supabase: any) {
  const asaasPaymentId = sanitizeAsaasId(paymentData.id);
  const asaasInstallmentId = sanitizeAsaasId(paymentData.installment);
  const billingType = paymentData.billingType as string;

  if (!asaasPaymentId) {
    logger.warn('Webhook Asaas: payment.id inválido ou ausente', {
      module: 'routes',
      action: 'asaas-webhook',
    });
    return {
      message: 'payment.id inválido ou ausente',
      alreadyProcessed: false,
    };
  }

  logger.info('Webhook Asaas recebido', {
    module: 'routes',
    action: 'asaas-webhook',
    asaasPaymentId,
    asaasInstallmentId: asaasInstallmentId ?? undefined,
    billingType,
  });

  const { data: paymentRecord } = await findPaymentRecord(paymentData, supabase);

  if (!paymentRecord) {
    const checkoutSession =
      sanitizeAsaasId(paymentData.checkoutSession) ?? sanitizeAsaasId(paymentData.checkout_session);
    logger.warn('Pagamento não encontrado', {
      module: 'routes',
      action: 'asaas-webhook',
      asaasPaymentId,
      hasCheckoutSession: !!checkoutSession,
    });
    return {
      message: `Registro de pagamento não encontrado para ${asaasPaymentId}. Verifique se o webhook Asaas envia payment.checkoutSession (Checkout API).`,
      alreadyProcessed: false,
    };
  }

  // 2. Verificar se já foi processado (idempotência)
  if (paymentRecord.status === 'paid') {
    logger.info('Pagamento já processado anteriormente', {
      module: 'routes',
      action: 'asaas-webhook',
      paymentId: paymentRecord.id,
      asaasPaymentId,
    });
    return { message: 'Pagamento já estava processado. Webhook ignorado.', alreadyProcessed: true };
  }

  // 3. Determinar método de pagamento
  let paymentMethod = 'unknown';
  if (billingType) {
    const billingTypeLower = billingType.toLowerCase();
    if (billingTypeLower === 'boleto') {
      paymentMethod = 'boleto';
    } else if (billingTypeLower === 'pix') {
      paymentMethod = 'pix';
    } else if (billingTypeLower === 'credit_card') {
      paymentMethod = 'credit_card';
    } else {
      paymentMethod = billingTypeLower;
    }
  }

  // 4. Atualizar pagamento (apenas se ainda estiver pending — evita race entre dois deliveries)
  const paidAt = new Date().toISOString();

  const { data: updatedRow, error: updateError } = await supabase
    .schema('payments')
    .from('asaas_payments')
    .update({
      status: 'paid',
      paid_at: paidAt,
      payment_method: paymentMethod,
    })
    .eq('id', paymentRecord.id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();

  if (updateError) {
    logger.error('Erro ao atualizar pagamento', updateError, {
      module: 'routes',
      action: 'asaas-webhook',
      paymentId: paymentRecord.id,
    });
    throw new Error('Erro ao atualizar pagamento');
  }

  if (!updatedRow) {
    logger.info('Pagamento já atualizado por outro request (race)', {
      module: 'routes',
      action: 'asaas-webhook',
      paymentId: paymentRecord.id,
      asaasPaymentId,
    });
    return { message: 'Pagamento já estava processado. Webhook ignorado.', alreadyProcessed: true };
  }

  if (paymentRecord.order_id) {
    try {
      await recordPricePromoSalesAfterOrderPaid(supabase, paymentRecord.order_id);
    } catch (promoErr) {
      logger.warn('Contadores de promo/estoque do preço não atualizados', {
        module: 'routes',
        action: 'asaas-webhook',
        orderId: paymentRecord.order_id,
        error: promoErr instanceof Error ? promoErr.message : String(promoErr),
      });
    }
  }

  logger.info('Pagamento atualizado para paid', {
    module: 'routes',
    action: 'asaas-webhook',
    paymentId: paymentRecord.id,
  });

  // 4.1. Atualizar asaas_payment_id para payment.id (para PAYMENT_REFUNDED e outros webhooks encontrarem corretamente)
  if (asaasPaymentId && paymentRecord.asaas_payment_id !== asaasPaymentId) {
    await supabase
      .schema('payments')
      .from('asaas_payments')
      .update({ asaas_payment_id: asaasPaymentId })
      .eq('id', paymentRecord.id);
  }

  // 4.5. Atualizar Order para paid
  if (paymentRecord.order_id) {
    const { error: orderUpdateError } = await supabase
      .schema('payments')
      .from('orders')
      .update({
        status: 'paid',
        payment_method: paymentMethod,
        paid_at: paidAt,
      })
      .eq('id', paymentRecord.order_id);

    if (orderUpdateError) {
      logger.error('Erro ao atualizar order', orderUpdateError, {
        module: 'routes',
        action: 'asaas-webhook',
        orderId: paymentRecord.order_id,
      });
      // Não bloqueia o fluxo
    } else {
      logger.info('Order atualizado para paid', {
        module: 'routes',
        action: 'asaas-webhook',
        orderId: paymentRecord.order_id,
      });
    }
  }

  // 5. Ativar subscription se existir (pedidos one_time não têm subscription)
  const subscription = paymentRecord.subscriptions;

  if (subscription) {
    if (subscription.status !== 'active') {
      const { error: activateError } = await supabase
        .schema('payments')
        .from('subscriptions')
        .update({
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', subscription.id);

      if (activateError) {
        logger.error('Erro ao ativar subscription', activateError, {
          module: 'routes',
          action: 'asaas-webhook',
          subscriptionId: subscription.id,
        });
      } else {
        logger.info('Subscription ativada', {
          module: 'routes',
          action: 'asaas-webhook',
          subscriptionId: subscription.id,
        });
      }
    }
  } else {
    logger.info('Pedido one_time confirmado (sem subscription)', {
      module: 'routes',
      action: 'asaas-webhook',
      paymentId: paymentRecord.id,
      orderId: paymentRecord.order_id,
    });
  }

  return {
    message: 'Pagamento processado com sucesso',
    subscription_id: subscription?.id ?? null,
    payment: paymentRecord,
  };
}

/**
 * Marca pedido vinculado como refunded via RPC SECURITY DEFINER.
 * O UPDATE direto em `orders` via PostgREST pode afetar 0 linhas (RLS/políticas) sem retornar erro;
 * a função `payments.apply_refund_to_order` garante atualização ou exceção.
 */
async function updateLinkedOrderToRefunded(
  supabase: any,
  orderId: string,
  refundedAt: string
): Promise<void> {
  const { error: rpcError } = await supabase.schema('payments').rpc('apply_refund_to_order', {
    p_order_id: orderId,
    p_refunded_at: refundedAt,
  });

  if (rpcError) {
    logger.error('Erro ao atualizar order para refunded (RPC)', rpcError, {
      module: 'routes',
      action: 'asaas-webhook',
      orderId,
    });
    throw new Error(
      `Falha ao marcar pedido como refunded: ${rpcError.message ?? String(rpcError)}`
    );
  }

  logger.info('Order atualizado para refunded', {
    module: 'routes',
    action: 'asaas-webhook',
    orderId,
  });
}

/**
 * Processa estorno (idempotente: se já refunded no pagamento, ainda sincroniza o pedido)
 */
async function processRefund(paymentData: Record<string, unknown>, supabase: any) {
  const asaasPaymentId = sanitizeAsaasId(paymentData.id);

  if (!asaasPaymentId) {
    logger.warn('Webhook estorno Asaas: payment.id inválido ou ausente', {
      module: 'routes',
      action: 'asaas-webhook',
    });
    throw new Error('payment.id inválido ou ausente');
  }

  logger.info('Webhook estorno Asaas recebido', {
    module: 'routes',
    action: 'asaas-webhook',
    eventType: 'PAYMENT_REFUNDED',
    asaasPaymentId,
  });

  const { data: existing } = await findPaymentRecord(paymentData, supabase);

  if (!existing) {
    logger.warn('Registro de pagamento não encontrado para estorno', {
      module: 'routes',
      action: 'asaas-webhook',
      asaasPaymentId,
    });
    return { message: 'Registro de pagamento não encontrado para estorno.' };
  }

  if (existing.status === 'refunded') {
    logger.info('Estorno já processado anteriormente', {
      module: 'routes',
      action: 'asaas-webhook',
      asaasPaymentId,
    });
    if (existing.order_id) {
      const refundedAt =
        typeof existing.refunded_at === 'string' && existing.refunded_at
          ? existing.refunded_at
          : new Date().toISOString();
      await updateLinkedOrderToRefunded(supabase, existing.order_id, refundedAt);
    }
    return { message: 'Estorno já processado.' };
  }

  const refundedAt = new Date().toISOString();

  const { error } = await supabase
    .schema('payments')
    .from('asaas_payments')
    .update({
      status: 'refunded',
      refunded_at: refundedAt,
    })
    .eq('id', existing.id);

  if (error) {
    logger.error('Erro ao processar estorno', error, {
      module: 'routes',
      action: 'asaas-webhook',
      asaasPaymentId,
    });
    throw new Error('Erro ao processar estorno');
  }

  if (existing.order_id) {
    await updateLinkedOrderToRefunded(supabase, existing.order_id, refundedAt);
  }

  logger.info('Estorno processado', {
    module: 'routes',
    action: 'asaas-webhook',
    asaasPaymentId,
  });

  return { message: 'Estorno processado com sucesso' };
}

/**
 * Cria handler para webhook Asaas
 */
export function createAsaasWebhookHandler(options: AsaasWebhookOptions): RouteHandler {
  const payments = options.payments ?? options.supabase;
  return async (request: NextRequest): Promise<NextResponse> => {
    let webhookEventId: string | null = null;
    let responseMessage = 'Webhook processado com sucesso';
    let responseStatus = 200;

    try {
      // 1. Verificação de token
      const asaasToken = request.headers.get('asaas-access-token');

      if (!asaasToken || !(await options.validateToken(asaasToken))) {
        logger.warn('Token de webhook inválido', {
          module: 'routes',
          action: 'asaas-webhook',
        });
        return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
      }

      // 2. Parsear e validar payload
      const rawPayload = await request.json();
      const parsed = asaasWebhookPayloadSchema.safeParse(rawPayload);

      if (!parsed.success) {
        logger.warn('Payload de webhook Asaas inválido, ignorando', {
          module: 'routes',
          action: 'asaas-webhook',
          issues: parsed.error.issues,
        });
        return NextResponse.json({ message: 'Payload inválido, ignorando.' });
      }

      const payload = parsed.data;
      const { event: eventType, payment: paymentData, checkout: checkoutData } = payload;

      const providerEventId =
        (paymentData?.id || checkoutData?.id) && eventType
          ? `asaas:${String(paymentData?.id ?? checkoutData?.id)}:${eventType}`
          : null;

      // Converter headers para objeto
      const headers: Record<string, string> = {};
      request.headers.forEach((value, key) => {
        headers[key] = value;
      });

      logger.info('Evento webhook Asaas recebido', {
        module: 'routes',
        action: 'asaas-webhook',
        eventType,
      });

      // 3. Idempotência: claim em webhook_events (permite retry após erro; evita “veneno” pós-insert)
      if (providerEventId) {
        const claim = await claimWebhookEventOnClient(
          payments,
          {
            provider: 'asaas',
            payload,
            headers,
            eventType,
            providerEventId,
          }
        );
        if (claim.action === 'respond') {
          return NextResponse.json({ message: claim.message });
        }
        webhookEventId = claim.eventId;
      } else {
        webhookEventId = await logWebhookOnClient(
          payments,
          {
            provider: 'asaas',
            payload,
            headers,
            eventType,
            providerEventId,
          }
        );
      }

      // 4. Verificar se é um evento relevante
      if (!RELEVANT_EVENTS.includes(eventType)) {
        responseMessage = 'Evento não relevante, ignorando.';
        return NextResponse.json({ message: responseMessage });
      }

      // 5. Processar estorno
      if (eventType === 'PAYMENT_REFUNDED') {
        if (!paymentData) {
          return NextResponse.json({ message: 'Payload inválido, ignorando.' });
        }
        const result = await processRefund(
          paymentData as Record<string, unknown>,
          payments
        );
        responseMessage = result.message;
        return NextResponse.json(result);
      }

      // 6. Processar CHECKOUT_CANCELED (Checkout API — gestão de pedidos cancelados)
      if (eventType === 'CHECKOUT_CANCELED') {
        if (!checkoutData?.id) {
          return NextResponse.json({ message: 'Payload de checkout inválido, ignorando.' });
        }
        const checkoutId = sanitizeAsaasId(checkoutData.id);
        if (!checkoutId) {
          return NextResponse.json({ message: 'ID de checkout inválido, ignorando.' });
        }
        await markCheckoutSessionTerminal(payments, checkoutId, 'cancelled', 'cancelado');
        return NextResponse.json({ message: 'Checkout cancelado processado.' });
      }

      // 6b. CHECKOUT_EXPIRED — sessão atingiu minutesToExpire (distinto de cancelamento manual)
      if (eventType === 'CHECKOUT_EXPIRED') {
        if (!checkoutData?.id) {
          return NextResponse.json({ message: 'Payload de checkout inválido, ignorando.' });
        }
        const checkoutId = sanitizeAsaasId(checkoutData.id);
        if (!checkoutId) {
          return NextResponse.json({ message: 'ID de checkout inválido, ignorando.' });
        }
        await markCheckoutSessionTerminal(payments, checkoutId, 'expired', 'expirado');
        return NextResponse.json({ message: 'Checkout expirado processado.' });
      }

      // 6c. CHECKOUT_CREATED — apenas auditoria (sessão gerada; cobrança ainda não paga)
      if (eventType === 'CHECKOUT_CREATED') {
        const rawId = checkoutData?.id;
        const checkoutId = typeof rawId === 'string' ? sanitizeAsaasId(rawId) : null;
        logger.info('Webhook CHECKOUT_CREATED (sessão Asaas criada)', {
          module: 'routes',
          action: 'asaas-webhook',
          checkoutId: checkoutId ?? rawId,
        });
        return NextResponse.json({ message: 'Checkout criado recebido.' });
      }

      // 7. Processar CHECKOUT_PAID (Checkout API — asaas_checkout_id = checkout.id)
      if (eventType === 'CHECKOUT_PAID') {
        if (!checkoutData?.id) {
          return NextResponse.json({ message: 'Payload de checkout inválido, ignorando.' });
        }
        const result = await processAsaasPayment(
          {
            id: checkoutData.id,
            billingType: checkoutData.billingTypes?.[0] ?? 'CREDIT_CARD',
            checkoutSession: checkoutData.id,
          } as Record<string, unknown>,
          payments
        );
        responseMessage = result.message;
        if (options.onSuccess && !result.alreadyProcessed) {
          await options.onSuccess(result.payment);
        }
        return NextResponse.json(result, { status: responseStatus });
      }

      // 8. Processar pagamento (PAYMENT_RECEIVED ou PAYMENT_CONFIRMED — cobrança direta)
      if (!paymentData || !paymentData.id) {
        throw new Error('Payload de pagamento inválido');
      }

      const result = await processAsaasPayment(
        paymentData as Record<string, unknown>,
        payments
      );
      responseMessage = result.message;

      // Callback de sucesso
      if (options.onSuccess && !result.alreadyProcessed) {
        await options.onSuccess(result.payment);
      }

      return NextResponse.json(result, { status: responseStatus });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro interno do servidor';
      logger.error('Erro no webhook Asaas', error, {
        module: 'routes',
        action: 'asaas-webhook',
      });

      responseStatus = 500;
      responseMessage = errorMessage;

      // Callback de erro
      if (options.onError) {
        await options.onError(error as Error);
      }

      const clientMessage = IS_PRODUCTION ? 'Erro interno do servidor' : errorMessage;
      return NextResponse.json({ error: clientMessage }, { status: 500 });
    } finally {
      // 7. LOG: Atualizar status do processamento
      if (webhookEventId) {
        await updateWebhookLogOnClient(
          payments,
          {
            eventId: webhookEventId,
            status: responseStatus >= 200 && responseStatus < 300 ? 'success' : 'error',
            log: responseMessage,
          }
        );
      }
    }
  };
}

