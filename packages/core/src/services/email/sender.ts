// ==========================================
// EMAIL SENDER - Send and Log Emails
// ==========================================

import { maskEmail } from '../../logger/mask-pii';
import type { SupabaseClient } from '../../types/query-client';
import {
  mergeOrderCreatedCustomMessage,
  mergeOrderCreatedInstructions,
  mergePaymentConfirmedCustomMessage,
  mergePaymentConfirmedNextSteps,
} from './merge-price-email-addon';
import { generateEmailHtml, generateEmailText, generatePlatformSaleHtml } from './templates';
import { createEmailTransporter } from './transport';
import type {
  EmailDispatchOptions,
  EmailSendResult,
  EmailTemplateData,
  OrderCreatedEmailData,
  PaymentConfirmedEmailData,
  PlatformSaleNotificationData,
  ProductEmailConfig,
  SmtpOverrides,
} from './types';

/**
 * Envia email e registra no banco de dados
 */
async function sendAndLogEmail(
  supabase: SupabaseClient<any, any, any>,
  emailData: {
    recipient: string;
    subject: string;
    fromName: string;
    fromEmail: string;
    replyTo?: string;
    cc?: string[];
    html: string;
    text: string;
    orderId?: string;
    webhookEventId?: string;
    metadata?: any;
    smtp?: SmtpOverrides;
  }
): Promise<EmailSendResult> {
  let logId: string | null = null;

  try {
    // 1. Verificar idempotência APENAS para emails automáticos (de webhooks)
    // Reenvios manuais (sem webhookEventId) ignoram este check
    if (emailData.webhookEventId && emailData.orderId && emailData.metadata?.type) {
      const { data: existingLog } = await supabase
        .from('email_logs')
        .select('id, status')
        .eq('order_id', emailData.orderId)
        .eq('metadata->>type', emailData.metadata.type)
        .eq('status', 'success')
        .limit(1)
        .single();

      if (existingLog) {
        console.log('⏭️ Email já foi enviado para order:', emailData.orderId, 'tipo:', emailData.metadata.type);
        return {
          success: true,
          messageId: 'already_sent',
        };
      }
    }

    // 2. Criar log inicial com status "sending"
    const { data: logData, error: logError } = await supabase
      .from('email_logs')
      .insert({
        status: 'sending',
        recipient: emailData.recipient,
        subject: emailData.subject,
        from_name: emailData.fromName,
        from_email: emailData.fromEmail,
        reply_to: emailData.replyTo,
        body_html: emailData.html,
        body_text: emailData.text,
        order_id: emailData.orderId,
        webhook_event_id: emailData.webhookEventId,
        metadata: emailData.metadata,
      })
      .select('id')
      .single();

    if (logError) {
      // Se erro é de constraint (duplicate key), significa que já foi enviado
      if (logError.code === '23505') {
        console.log('⏭️ Email já foi enviado (constraint violation):', emailData.orderId, emailData.metadata?.type);
        return {
          success: true,
          messageId: 'already_sent_constraint',
        };
      }
      console.error('❌ Erro ao criar log de email:', logError);
    } else {
      logId = logData.id;
    }

    // 2. Enviar email via Nodemailer
    const transporter = createEmailTransporter(emailData.smtp);
    const info = await transporter.sendMail({
      from: `"${emailData.fromName}" <${emailData.fromEmail}>`,
      to: emailData.recipient,
      replyTo: emailData.replyTo,
      cc: emailData.cc,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html,
    });

    console.log(`✅ Email enviado para: ${maskEmail(emailData.recipient)}`);
    console.log(`✉️ Message-ID: ${info.messageId}`);

    // 3. Atualizar log para status "success"
    if (logId) {
      await supabase
        .from('email_logs')
        .update({
          status: 'success',
          message_id: info.messageId,
          error_message: null,
        })
        .eq('id', logId);
    }

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Erro ao enviar email:', errorMessage);

    // 4. Atualizar log para status "failed"
    if (logId) {
      await supabase
        .from('email_logs')
        .update({
          status: 'failed',
          error_message: errorMessage,
        })
        .eq('id', logId);
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Obtém configuração de email do produto
 */
async function getProductEmailConfig(
  supabase: SupabaseClient,
  productId: string
): Promise<ProductEmailConfig | null> {
  const { data, error } = await supabase
    .from('products')
    .select('email_config')
    .eq('id', productId)
    .single();

  if (error || !data?.email_config) {
    console.warn(`⚠️ Produto ${productId} não possui email_config`);
    return null;
  }

  return data.email_config as ProductEmailConfig;
}

/**
 * Envia email de pedido criado (order_created)
 */
export async function sendOrderCreatedEmail(
  supabase: SupabaseClient<any, any, any>,
  productId: string,
  data: OrderCreatedEmailData,
  webhookEventId?: string,
  isManualResend?: boolean,
  options?: EmailDispatchOptions
): Promise<EmailSendResult> {
  try {
    const emailConfig = await getProductEmailConfig(supabase, productId);

    if (!emailConfig?.order_created) {
      console.warn('⚠️ Produto não possui configuração de email para order_created');
      return {
        success: false,
        error: 'Email config não encontrada para order_created',
      };
    }

    const config = emailConfig.order_created;

    // Montar assunto: [Reenvio] apenas quando reenvio manual do admin
    const orderIdShort = data.orderId.substring(0, 8);
    const subject = `${isManualResend ? '[Reenvio] ' : ''}${config.subject} #${orderIdShort}`;

    // Reply-to: usar configuração do produto (sem padrão hardcoded)
    const replyTo = config.reply_to;

    // CC: parsear string separada por vírgula (undefined se vazio)
    const cc = config.cc
      ? config.cc.split(',').map((email) => email.trim()).filter(Boolean)
      : undefined;

    const addon = data.priceEmailAddon;
    const resolvedFromName =
      config.from_name?.trim() || options?.fromName?.trim() || options?.brandName?.trim() || 'Quitou';
    const resolvedFromEmail = config.from_email?.trim() || options?.fromEmail?.trim() || '';
    const templateData: EmailTemplateData = {
      userName: data.userName,
      productName: data.productName,
      priceDisplay: data.priceDisplay,
      orderId: data.orderId,
      paymentMethod: data.paymentMethod,
      subject,
      fromName: resolvedFromName,
      customMessage: mergeOrderCreatedCustomMessage(
        'Seu pedido foi criado com sucesso!',
        config.custom_message,
        addon
      ),
      instructions: mergeOrderCreatedInstructions(config.instructions, addon),
      paymentInfo: data.paymentInfo,
      footerText: data.footerText ?? options?.footerText,
      companyLine: data.companyLine ?? options?.companyLine,
    };

    const html = generateEmailHtml(templateData);
    const text = generateEmailText(templateData);

    return await sendAndLogEmail(supabase, {
      recipient: data.userEmail,
      subject,
      fromName: resolvedFromName,
      fromEmail: resolvedFromEmail,
      replyTo,
      cc,
      html,
      text,
      orderId: data.orderId,
      webhookEventId,
      smtp: options?.smtp,
      metadata: {
        type: 'order_created',
        productId,
        ...(data.priceId ? { priceId: data.priceId } : {}),
        paymentMethod: data.paymentMethod,
      },
    });
  } catch (error) {
    console.error('❌ Erro ao enviar email de order_created:', error);
    return {
      success: false,
      error,
    };
  }
}

/**
 * Envia email de pagamento confirmado (payment_confirmed)
 */
export async function sendPaymentConfirmedEmail(
  supabase: SupabaseClient<any, any, any>,
  productId: string,
  data: PaymentConfirmedEmailData,
  webhookEventId?: string,
  isManualResend?: boolean,
  options?: EmailDispatchOptions
): Promise<EmailSendResult> {
  try {
    const emailConfig = await getProductEmailConfig(supabase, productId);

    if (!emailConfig?.payment_confirmed) {
      console.warn('⚠️ Produto não possui configuração de email para payment_confirmed');
      return {
        success: false,
        error: 'Email config não encontrada para payment_confirmed',
      };
    }

    const config = emailConfig.payment_confirmed;

    // Montar assunto: [Reenvio] apenas quando reenvio manual do admin
    const orderIdShort = data.orderId.substring(0, 8);
    const subject = `${isManualResend ? '[Reenvio] ' : ''}${config.subject} #${orderIdShort}`;

    // Reply-to: usar configuração do produto (sem padrão hardcoded)
    const replyTo = config.reply_to;

    // CC: parsear string separada por vírgula (undefined se vazio)
    const cc = config.cc
      ? config.cc.split(',').map((email) => email.trim()).filter(Boolean)
      : undefined;

    const addon = data.priceEmailAddon;
    const resolvedFromName =
      config.from_name?.trim() || options?.fromName?.trim() || options?.brandName?.trim() || 'Quitou';
    const resolvedFromEmail = config.from_email?.trim() || options?.fromEmail?.trim() || '';
    const { nextSteps, includeNextSteps } = mergePaymentConfirmedNextSteps(config, addon);
    const templateData: EmailTemplateData = {
      userName: data.userName,
      productName: data.productName,
      priceDisplay: data.priceDisplay,
      orderId: data.orderId,
      paymentMethod: data.paymentMethod,
      paymentOptions: data.paymentOptions,
      subject,
      fromName: resolvedFromName,
      customMessage: mergePaymentConfirmedCustomMessage(
        'Seu pagamento foi confirmado com sucesso!',
        config.custom_message,
        addon
      ),
      nextSteps,
      includeNextSteps,
      footerText: data.footerText ?? options?.footerText,
      companyLine: data.companyLine ?? options?.companyLine,
    };

    const html = generateEmailHtml(templateData);
    const text = generateEmailText(templateData);

    return await sendAndLogEmail(supabase, {
      recipient: data.userEmail,
      subject,
      fromName: resolvedFromName,
      fromEmail: resolvedFromEmail,
      replyTo,
      cc,
      html,
      text,
      orderId: data.orderId,
      webhookEventId,
      smtp: options?.smtp,
      metadata: {
        type: 'payment_confirmed',
        productId,
        ...(data.priceId ? { priceId: data.priceId } : {}),
        paymentMethod: data.paymentMethod,
      },
    });
  } catch (error) {
    console.error('❌ Erro ao enviar email de payment_confirmed:', error);
    return {
      success: false,
      error,
    };
  }
}

function parseRecipientList(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
}

/**
 * Remetente do e-mail interno (venda).
 * Em dev o SMTP é Inbucket/Mailpit (sem auth); o cliente já aceita envio como os outros e-mails.
 * Em produção exige EMAIL_FROM ou SMTP_USER. EMAIL_FROM vem primeiro: no Resend o usuário SMTP é "resend".
 */
function getPlatformNotificationFrom(options?: EmailDispatchOptions): {
  fromName: string;
  fromEmail: string;
} | null {
  if (typeof process === 'undefined' || !process.env) {
    return null;
  }

  const isDev = process.env.NODE_ENV !== 'production';

  const fromEmail =
    options?.fromEmail?.trim() ||
    options?.smtp?.user?.trim() ||
    process.env.EMAIL_FROM?.trim() ||
    process.env.SMTP_USER?.trim() ||
    (isDev ? 'noreply@quitou.local' : '');

  if (!fromEmail) {
    return null;
  }

  const fromName =
    options?.fromName?.trim() ||
    options?.brandName?.trim() ||
    process.env.EMAIL_FROM_NAME?.trim() ||
    process.env.SMTP_FROM_NAME?.trim() ||
    process.env.BRAND_NAME?.trim() ||
    'Quitou';

  return { fromName, fromEmail };
}

async function getPlatformSaleRecipients(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase
    .from('platform_settings')
    .select('sale_notification_recipients')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    console.warn('⚠️ Erro ao ler platform_settings para aviso de venda:', error.message);
    return [];
  }

  return parseRecipientList(data?.sale_notification_recipients ?? null);
}

/**
 * E-mail interno para a equipe quando um pagamento é confirmado.
 * Destinatários vêm de payments.platform_settings.sale_notification_recipients (admin).
 */
export async function sendPlatformSaleNotificationEmail(
  supabase: SupabaseClient<any, any, any>,
  data: PlatformSaleNotificationData,
  webhookEventId?: string,
  options?: EmailDispatchOptions
): Promise<EmailSendResult> {
  try {
    const recipients = await getPlatformSaleRecipients(supabase);
    if (recipients.length === 0) {
      return { success: true, messageId: 'skipped_no_recipients' };
    }

    const { data: existing } = await supabase
      .from('email_logs')
      .select('id')
      .eq('order_id', data.orderId)
      .eq('metadata->>type', 'platform_sale_notification')
      .eq('status', 'success')
      .limit(1)
      .maybeSingle();

    if (existing) {
      return { success: true, messageId: 'already_sent' };
    }

    const from = getPlatformNotificationFrom(options);
    if (!from) {
      console.warn(
        '⚠️ Remetente não configurado (defina SMTP_USER ou EMAIL_FROM); aviso interno de venda não enviado'
      );
      return {
        success: false,
        error: 'Remetente não configurado (SMTP_USER ou EMAIL_FROM)',
      };
    }

    const orderShort = data.orderId.substring(0, 8);
    const subject = `[Venda] Pagamento confirmado #${orderShort} — ${data.productName.slice(0, 80)}`;

    const html = generatePlatformSaleHtml({
      ...data,
      brandName: data.brandName ?? options?.brandName ?? from.fromName,
      footerText: data.footerText ?? options?.footerText,
      companyLine: data.companyLine ?? options?.companyLine,
    });

    const text = [
      'Pagamento confirmado',
      `Pedido: ${data.orderId}`,
      `Produto: ${data.productName}`,
      `Valor: ${data.priceDisplay}`,
      `Cliente: ${data.customerName} <${data.customerEmail}>`,
      `Meio: ${data.paymentMethod}`,
    ].join('\n');

    const toHeader = recipients.join(', ');

    return await sendAndLogEmail(supabase, {
      recipient: toHeader,
      subject,
      fromName: from.fromName,
      fromEmail: from.fromEmail,
      html,
      text,
      orderId: data.orderId,
      webhookEventId,
      smtp: options?.smtp,
      metadata: {
        type: 'platform_sale_notification',
        recipients,
        productName: data.productName,
      },
    });
  } catch (error) {
    console.error('❌ Erro ao enviar email interno de venda:', error);
    return {
      success: false,
      error,
    };
  }
}

