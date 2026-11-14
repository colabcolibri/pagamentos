/**
 * Handler reutilizável para webhooks Pagar.me
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  claimWebhookEventOnClient,
  logWebhookOnClient,
  updateWebhookLogOnClient,
} from '../helpers/webhook-logger';
import { getLogger } from '../logger';
import { pagarmeWebhookPayloadSchema } from '../payments/validators';
import type { PagarmeWebhookOptions, RouteHandler } from '../types/routes';
import { recordPricePromoSalesAfterOrderPaid } from '../payments/pricing/record-price-promo-sales';

const logger = getLogger();

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Extrai usuário e senha do header Authorization: Basic (sem vazar detalhes em caso malformado).
 */
function parseBasicAuthCredentials(authHeader: string): { username: string; password: string } | null {
  const parts = authHeader.trim().split(/\s+/);
  if (parts.length < 2 || parts[0] !== 'Basic') {
    return null;
  }
  const b64 = parts[1];
  if (!b64) {
    return null;
  }
  try {
    const decoded = Buffer.from(b64, 'base64').toString('utf8');
    const idx = decoded.indexOf(':');
    if (idx < 0) {
      return null;
    }
    return {
      username: decoded.slice(0, idx),
      password: decoded.slice(idx + 1),
    };
  } catch {
    return null;
  }
}

interface WebhookPayload {
  type: string;
  data: {
    id: string;
    code: string;
    charges: {
      payment_method: string;
    }[];
  };
}

/**
 * Processa pagamento confirmado (order.paid)
 */
async function processPayment(payload: WebhookPayload, supabase: any) {
  const { id: orderId, code: paymentLinkId, charges } = payload.data;
  const paymentMethod = charges[0]?.payment_method || 'unknown';

  logger.info('Webhook Pagar.me recebido', {
    module: 'routes',
    action: 'pagarme-webhook',
    eventType: 'order.paid',
    orderId,
    paymentLinkId,
    paymentMethod,
  });

  // 1. Buscar pagamento no banco
  const { data: paymentRecord, error: findError } = await supabase
    .schema('payments')
    .from('pagarme_payments')
    .select('id, status, order_id, subscription_id, subscriptions(id, status, user_id, price_id)')
    .eq('payment_link_id', paymentLinkId)
    .single();

  if (findError || !paymentRecord) {
    throw new Error(`Pagamento não encontrado para o link: ${paymentLinkId}`);
  }

  // 2. Verificar se já foi processado (idempotência)
  if (paymentRecord.status === 'paid') {
    logger.info('Pagamento já processado anteriormente', {
      module: 'routes',
      action: 'pagarme-webhook',
      paymentId: paymentRecord.id,
      paymentLinkId,
    });
    return { message: 'Pagamento já processado anteriormente.', alreadyProcessed: true };
  }

  // 3. Atualizar pagamento (apenas se ainda estiver pending — evita race entre dois deliveries)
  const paidAt = new Date().toISOString();

  const { data: updatedRow, error: updateError } = await supabase
    .schema('payments')
    .from('pagarme_payments')
    .update({
      status: 'paid',
      payment_method: paymentMethod,
      paid_at: paidAt,
    })
    .eq('payment_link_id', paymentLinkId)
    .in('status', ['pending', 'pix_generated', 'boleto_generated'])
    .select('id')
    .maybeSingle();

  if (updateError) {
    logger.error('Erro ao atualizar pagamento', updateError, {
      module: 'routes',
      action: 'pagarme-webhook',
      paymentLinkId,
    });
    throw new Error('Erro ao atualizar pagamento');
  }

  if (!updatedRow) {
    logger.info('Pagamento já atualizado por outro request (race)', {
      module: 'routes',
      action: 'pagarme-webhook',
      paymentLinkId,
    });
    return { message: 'Pagamento já processado anteriormente.', alreadyProcessed: true };
  }

  if (paymentRecord.order_id) {
    try {
      await recordPricePromoSalesAfterOrderPaid(supabase, paymentRecord.order_id);
    } catch (promoErr) {
      logger.warn('Contadores de promo/estoque do preço não atualizados', {
        module: 'routes',
        action: 'pagarme-webhook',
        orderId: paymentRecord.order_id,
        error: promoErr instanceof Error ? promoErr.message : String(promoErr),
      });
    }
  }

  logger.info('Pagamento atualizado para paid', {
    module: 'routes',
    action: 'pagarme-webhook',
    paymentLinkId,
  });

  // 3.5. Atualizar Order para paid
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
        action: 'pagarme-webhook',
        orderId: paymentRecord.order_id,
      });
      // Não bloqueia o fluxo
    } else {
      logger.info('Order atualizado para paid', {
        module: 'routes',
        action: 'pagarme-webhook',
        orderId: paymentRecord.order_id,
      });
    }
  }

  // 4. Ativar subscription se existir (pedidos one_time não têm subscription)
  const subscription = paymentRecord.subscriptions;

  if (subscription) {
    if (subscription.status !== 'active') {
      const { error: activateError } = await supabase
        .schema('payments')
        .from('subscriptions')
        .update({
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 ano
        })
        .eq('id', subscription.id);

      if (activateError) {
        logger.error('Erro ao ativar subscription', activateError, {
          module: 'routes',
          action: 'pagarme-webhook',
          subscriptionId: subscription.id,
        });
      } else {
        logger.info('Subscription ativada', {
          module: 'routes',
          action: 'pagarme-webhook',
          subscriptionId: subscription.id,
        });
      }
    }
  } else {
    logger.info('Pedido one_time confirmado (sem subscription)', {
      module: 'routes',
      action: 'pagarme-webhook',
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
 * Processa criação de pedido (order.created) para capturar PIX/Boleto
 */
async function processOrderCreated(payload: any, supabase: any) {
  const { id: orderId, code: paymentLinkId, charges } = payload.data;
  
  logger.info('Webhook order.created recebido', {
    module: 'routes',
    action: 'pagarme-webhook',
    orderId,
    paymentLinkId,
  });

  // 1. Buscar pagamento no banco
  const { data: paymentRecord, error: findError } = await supabase
    .schema('payments')
    .from('pagarme_payments')
    .select('id, status, order_id')
    .eq('payment_link_id', paymentLinkId)
    .single();

  if (findError) {
    logger.error('Erro ao buscar pagamento', findError, {
      module: 'routes',
      action: 'pagarme-webhook',
      paymentLinkId,
    });
    return { message: 'Erro ao buscar pagamento' };
  }

  if (!paymentRecord) {
    logger.warn('Pagamento não encontrado para payment_link_id', {
      module: 'routes',
      action: 'pagarme-webhook',
      paymentLinkId,
    });
    return { message: 'Pagamento não encontrado' };
  }

  logger.info('Pagamento encontrado', {
    module: 'routes',
    action: 'pagarme-webhook',
    paymentId: paymentRecord.id,
  });

  // 2. Verificar se tem charges com dados de PIX/Boleto
  if (!charges || charges.length === 0) {
    logger.warn('Nenhuma charge encontrada no order.created', {
      module: 'routes',
      action: 'pagarme-webhook',
      paymentLinkId,
    });
    return { message: 'Sem charges no pedido' };
  }

  const charge = charges[0];
  const paymentMethod = charge.payment_method;
  
  logger.info('Método de pagamento detectado', {
    module: 'routes',
    action: 'pagarme-webhook',
    paymentMethod,
  });

  // 3. Extrair dados específicos baseado no método
  let updateData: any = {
    payment_method: paymentMethod,
  };

  const transaction = charge.last_transaction;
  
  logger.info('Transaction order.created', {
    module: 'routes',
    action: 'pagarme-webhook',
    transactionId: transaction?.id,
  });
  
  // PIX
  if (paymentMethod === 'pix' && transaction) {
    // Para PIX no Pagar.me:
    // - qr_code_url = URL da IMAGEM do QR Code (ex: https://api.pagar.me/.../qrcode?payment_method=pix)
    // - qr_code = String EMV copiável (código PIX) OU link genérico (https://digital.mundipagg.com/pix/)
    
    const pixQrCodeImageUrl = transaction.qr_code_url; // URL da imagem do QR Code
    let pixCode = transaction.qr_code; // Pode ser o código EMV ou link genérico
    
    // Se qr_code é um link HTTP, não é o código EMV (código EMV não tem http)
    // O código EMV PIX geralmente tem 100+ caracteres e não começa com http
    if (pixCode && pixCode.startsWith('http')) {
      logger.warn('qr_code é um link, não o código EMV', {
        module: 'routes',
        action: 'pagarme-webhook',
      });
      pixCode = null; // Ignorar, não é útil
    }

    logger.info('PIX dados order.created', {
      module: 'routes',
      action: 'pagarme-webhook',
      hasQrCodeImageUrl: !!pixQrCodeImageUrl,
      hasPixCode: !!pixCode,
    });
    
    if (pixQrCodeImageUrl) {
      updateData.pix_qr_code = pixQrCodeImageUrl; // URL da imagem do QR Code
      
      // Se não temos o código PIX no webhook, precisamos buscar na API
      if (!pixCode && transaction.id) {
        try {
          logger.info('Código PIX não disponível no webhook, salvando apenas QR Code', {
            module: 'routes',
            action: 'pagarme-webhook',
            transactionId: transaction.id,
          });
        } catch (error) {
          logger.error('Erro ao buscar código PIX', error, {
            module: 'routes',
            action: 'pagarme-webhook',
          });
        }
      }

      updateData.pix_code = pixCode; // Código PIX copiável (pode ser null)
      updateData.status = 'pix_generated';
      logger.info('PIX extraído com sucesso', {
        module: 'routes',
        action: 'pagarme-webhook',
        hasQrCodeImageUrl: !!pixQrCodeImageUrl,
        hasPixCode: !!pixCode,
      });
    } else {
      logger.warn('PIX detectado mas qr_code_url não encontrado', {
        module: 'routes',
        action: 'pagarme-webhook',
      });
    }
  }

  // Boleto
  if (paymentMethod === 'boleto' && transaction) {
    const boletoUrl = transaction.url || transaction.pdf;
    const boletoLine = transaction.line; // Linha digitável
    const boletoBarcode = transaction.barcode; // URL da imagem do código de barras
    
    logger.info('Boleto dados order.created', {
      module: 'routes',
      action: 'pagarme-webhook',
      hasUrl: !!boletoUrl,
      hasLine: !!boletoLine,
      hasBarcode: !!boletoBarcode,
    });

    if (boletoUrl) {
      updateData.boleto_url = boletoUrl;
      updateData.boleto_line = boletoLine; // Salvar linha digitável
      updateData.boleto_barcode = boletoBarcode; // Salvar URL do código de barras
      updateData.status = 'boleto_generated';
      logger.info('Boleto extraído com sucesso', {
        module: 'routes',
        action: 'pagarme-webhook',
      });
    } else {
      logger.warn('Boleto detectado mas URL não encontrada na transaction', {
        module: 'routes',
        action: 'pagarme-webhook',
      });
    }
  }

  // 4. Atualizar pagamento apenas se tiver dados novos
  if (updateData.pix_qr_code || updateData.boleto_url) {
    logger.info('Salvando dados de pagamento', {
      module: 'routes',
      action: 'pagarme-webhook',
      paymentId: paymentRecord.id,
      hasPixQrCode: !!updateData.pix_qr_code,
      hasPixCode: !!updateData.pix_code,
      hasBoletoUrl: !!updateData.boleto_url,
    });

    // Buscar dados atuais para não sobrescrever
    const { data: currentData } = await supabase
      .schema('payments')
      .from('pagarme_payments')
      .select('pix_qr_code, pix_code, boleto_url, boleto_line, boleto_barcode')
      .eq('id', paymentRecord.id)
      .single();

    // Só atualizar campos que estão vazios ou se temos dados melhores
    const finalUpdateData: any = { ...updateData };
    
    // Se já tem PIX salvo, não sobrescrever (order.paid pode vir antes)
    if (currentData?.pix_qr_code && !finalUpdateData.pix_qr_code) {
      delete finalUpdateData.pix_qr_code;
    }
    if (currentData?.pix_code && !finalUpdateData.pix_code) {
      delete finalUpdateData.pix_code;
    }
    
    // Se já tem Boleto salvo, não sobrescrever
    if (currentData?.boleto_url && !finalUpdateData.boleto_url) {
      delete finalUpdateData.boleto_url;
    }
    if (currentData?.boleto_line && !finalUpdateData.boleto_line) {
      delete finalUpdateData.boleto_line;
    }
    if (currentData?.boleto_barcode && !finalUpdateData.boleto_barcode) {
      delete finalUpdateData.boleto_barcode;
    }

    const { error: updateError } = await supabase
      .schema('payments')
      .from('pagarme_payments')
      .update(finalUpdateData)
      .eq('id', paymentRecord.id);

    if (updateError) {
      logger.error('Erro ao atualizar pagamento com PIX/Boleto', updateError, {
        module: 'routes',
        action: 'pagarme-webhook',
        paymentId: paymentRecord.id,
      });
      throw new Error('Erro ao salvar dados de pagamento');
    }

    logger.info('Pagamento atualizado com dados de PIX/Boleto', {
      module: 'routes',
      action: 'pagarme-webhook',
      paymentId: paymentRecord.id,
      paymentMethod,
    });
  } else {
    logger.warn('Nenhum dado de PIX/Boleto para atualizar', {
      module: 'routes',
      action: 'pagarme-webhook',
    });
  }

  // 5. Atualizar order com payment_method
  if (paymentRecord.order_id) {
    const { error: orderUpdateError } = await supabase
      .schema('payments')
      .from('orders')
      .update({ payment_method: paymentMethod })
      .eq('id', paymentRecord.order_id);

    if (orderUpdateError) {
      logger.error('Erro ao atualizar order com payment_method', orderUpdateError, {
        module: 'routes',
        action: 'pagarme-webhook',
        orderId: paymentRecord.order_id,
      });
    } else {
      logger.info('Order atualizado com payment_method', {
        module: 'routes',
        action: 'pagarme-webhook',
        orderId: paymentRecord.order_id,
        paymentMethod,
      });
    }
  }

  return {
    message: 'Order.created processado',
    paymentMethod,
    hasPix: !!updateData.pix_qr_code,
    hasBoleto: !!updateData.boleto_url,
    payment: {
      ...paymentRecord,
      pix_qr_code: updateData.pix_qr_code,
      pix_copy_paste: updateData.pix_code,
      boleto_url: updateData.boleto_url,
      boleto_line: updateData.boleto_line, // Linha digitável do boleto
      boleto_barcode: updateData.boleto_barcode, // URL da imagem do código de barras
    },
    order_id: paymentRecord.order_id,
  };
}

/**
 * Processa estorno (charge.refunded). Idempotente: se já refunded, retorna 200 "já processado".
 * No charge.refunded o payload data é a charge; usar data.order?.code quando existir (code do order),
 * pois data.code pode ser o código da charge e não o payment_link_id.
 */
async function processRefund(payload: WebhookPayload, supabase: any) {
  const data = payload.data as { code: string; order?: { code?: string } };
  const paymentLinkId = data.order?.code ?? data.code;

  logger.info('Webhook estorno Pagar.me recebido', {
    module: 'routes',
    action: 'pagarme-webhook',
    paymentLinkId,
  });

  const { data: existing, error: findError } = await supabase
    .schema('payments')
    .from('pagarme_payments')
    .select('id, status, order_id')
    .eq('payment_link_id', paymentLinkId)
    .maybeSingle();

  if (findError) {
    logger.error('Erro ao buscar pagamento para estorno', findError, {
      module: 'routes',
      action: 'pagarme-webhook',
      paymentLinkId,
    });
    throw new Error('Erro ao processar estorno');
  }

  if (!existing) {
    logger.warn('Pagamento não encontrado para estorno (payment_link_id pode ser code da charge)', {
      module: 'routes',
      action: 'pagarme-webhook',
      paymentLinkId,
    });
    return { message: 'Pagamento não encontrado para o link informado.' };
  }

  if (existing.status === 'refunded') {
    logger.info('Estorno já processado anteriormente', {
      module: 'routes',
      action: 'pagarme-webhook',
      paymentLinkId,
    });
    return { message: 'Estorno já processado.' };
  }

  const refundedAt = new Date().toISOString();
  const { error } = await supabase
    .schema('payments')
    .from('pagarme_payments')
    .update({
      status: 'refunded',
      refunded_at: refundedAt,
    })
    .eq('payment_link_id', paymentLinkId);

  if (error) {
    logger.error('Erro ao processar estorno', error, {
      module: 'routes',
      action: 'pagarme-webhook',
      paymentLinkId,
    });
    throw new Error('Erro ao processar estorno');
  }

  if (existing.order_id) {
    const { error: orderUpdateError } = await supabase
      .schema('payments')
      .from('orders')
      .update({
        status: 'refunded',
        refunded_at: refundedAt,
      })
      .eq('id', existing.order_id);

    if (orderUpdateError) {
      logger.error('Erro ao atualizar order para refunded', orderUpdateError, {
        module: 'routes',
        action: 'pagarme-webhook',
        orderId: existing.order_id,
      });
    } else {
      logger.info('Order atualizado para refunded', {
        module: 'routes',
        action: 'pagarme-webhook',
        orderId: existing.order_id,
      });
    }
  }

  logger.info('Estorno processado', {
    module: 'routes',
    action: 'pagarme-webhook',
    paymentLinkId,
  });

  return { message: 'Estorno processado com sucesso' };
}

/**
 * Cria handler para webhook Pagar.me
 */
export function createPagarmeWebhookHandler(options: PagarmeWebhookOptions): RouteHandler {
  const payments = options.payments ?? options.supabase;
  return async (request: NextRequest): Promise<NextResponse> => {
    let webhookEventId: string | null = null;
    let responseMessage = 'Webhook processado com sucesso';
    let responseStatus = 200;

    try {
      // 1. Verificação de autenticação (Basic Auth)
      const authHeader = request.headers.get('authorization');

      if (!authHeader) {
        return NextResponse.json(
          { error: 'Cabeçalho de autorização ausente' },
          { status: 401 }
        );
      }

      const parsedAuth = parseBasicAuthCredentials(authHeader);
      if (!parsedAuth) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
      }
      const { username, password } = parsedAuth;

      if (!(await options.validateAuth(username, password))) {
        logger.warn('Webhook não autorizado', {
          module: 'routes',
          action: 'pagarme-webhook',
        });
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
      }

      // 2. Parsear e validar payload
      const rawPayload = await request.json();
      const parsed = pagarmeWebhookPayloadSchema.safeParse(rawPayload);

      if (!parsed.success) {
        logger.warn('Payload de webhook Pagar.me inválido, ignorando', {
          module: 'routes',
          action: 'pagarme-webhook',
          issues: parsed.error.issues,
        });
        return NextResponse.json({ message: 'Payload inválido, ignorando.' });
      }

      const payload = parsed.data as WebhookPayload;
      const eventType = payload.type;
      const dataId = payload.data?.id;

      const providerEventId =
        dataId && eventType ? `pagarme:${String(dataId)}:${eventType}` : null;

      // Converter headers para objeto
      const headers: Record<string, string> = {};
      request.headers.forEach((value, key) => {
        headers[key] = value;
      });

      logger.info('Evento webhook recebido', {
        module: 'routes',
        action: 'pagarme-webhook',
        eventType,
      });

      // 3. Idempotência: claim em webhook_events
      if (providerEventId) {
        const claim = await claimWebhookEventOnClient(
          payments,
          {
            provider: 'pagarme',
            payload: payload as unknown as Record<string, unknown>,
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
            provider: 'pagarme',
            payload: payload as unknown as Record<string, unknown>,
            headers,
            eventType,
            providerEventId,
          }
        );
      }

      // 4. Processar evento
      if (eventType === 'order.paid') {
        const result = await processPayment(payload, payments);
        responseMessage = result.message;
        
        // Callback de sucesso (passar webhook_event_id)
        if (options.onSuccess && !result.alreadyProcessed) {
          await options.onSuccess({ ...result.payment, webhook_event_id: webhookEventId });
        }
      } else if (eventType === 'order.created') {
        const result = await processOrderCreated(payload, payments);
        responseMessage = result.message;
        logger.info('Order.created processado', {
          module: 'routes',
          action: 'pagarme-webhook',
          message: result.message,
          orderId: result.order_id,
          paymentId: result.payment?.id,
          paymentMethod: result.paymentMethod,
        });
        
        // Callback de order.created (envio de email PIX/Boleto, passar webhook_event_id)
        if (options.onOrderCreated && result.payment) {
          await options.onOrderCreated({ ...result, webhook_event_id: webhookEventId });
        }
      } else if (eventType === 'charge.refunded') {
        const result = await processRefund(payload, payments);
        responseMessage = result.message;
      } else {
        logger.warn('Evento não processado', {
          module: 'routes',
          action: 'pagarme-webhook',
          eventType,
        });
        responseMessage = 'Evento não processado.';
      }

      return NextResponse.json({ message: responseMessage }, { status: responseStatus });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro interno do servidor';
      logger.error('Erro no webhook Pagar.me', error, {
        module: 'routes',
        action: 'pagarme-webhook',
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
      // 5. LOG: Atualizar status do processamento
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

