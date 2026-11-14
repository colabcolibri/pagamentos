/**
 * Helpers para envio de emails em webhooks
 */
import type { Database, Json } from '@db/database.types'
import {
  type PriceEmailAddon,
  createEmailTransporter,
  sendOrderCreatedEmail,
  sendPaymentConfirmedEmail,
  sendPlatformSaleNotificationEmail,
} from '@quitou/core/email'
import 'server-only'

import { renderAccessCodeEmail } from '@/lib/access-code-email-template'
import { serverEnv } from '@/lib/config/env'
import { getLogger } from '@/lib/logger'

type SupabaseClient<_Database = unknown> = {
  schema: (name: string) => any
  from: (table: string) => any
}

function parsePriceEmailAddon(raw: Json | null | undefined): PriceEmailAddon | null {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return null
  if (Object.keys(raw as Record<string, unknown>).length === 0) return null
  return raw as PriceEmailAddon
}

type AppLogger = ReturnType<typeof getLogger>

/**
 * Valor no email vem só de `orders.amount_cents` (valor cobrado no pedido).
 * Sem fallback: se estiver inválido, não envia email com valor inventado.
 */
function formatOrderAmountForEmail(
  amountCents: unknown,
  currency: string | null | undefined,
  orderId: string,
  logger: AppLogger
): string | null {
  if (typeof amountCents !== 'number' || !Number.isFinite(amountCents) || amountCents < 0) {
    logger.error('amount_cents inválido ou ausente; email não enviado', undefined, {
      orderId,
      amountCents,
    })
    return null
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency || 'BRL',
  }).format(amountCents / 100)
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  spot: 'PIX ou cartão',
  pix: 'PIX',
  boleto: 'Boleto',
  credit_card: 'Cartão de crédito',
}

export function formatEmailFrom(address: string, name: string): string {
  const safeName = name.replace(/"/g, '')
  return `"${safeName}" <${address}>`
}

export async function sendAccessCodeEmail(email: string, code: string): Promise<void> {
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER
  if (!from) {
    throw new Error('Remetente de e-mail não configurado')
  }
  const fromName = serverEnv.EMAIL_FROM_NAME
  const message = renderAccessCodeEmail(code, fromName)
  const transporter = createEmailTransporter()
  const subject =
    serverEnv.NODE_ENV === 'production' ? 'Seu código de acesso' : `Seu código de acesso — ${email}`
  await transporter.sendMail({
    from: formatEmailFrom(from, fromName),
    to: email,
    subject,
    text: message.text,
    html: message.html,
  })
}

export function formatPaymentMethod(method: string | null | undefined): string {
  const key = method ?? ''
  return PAYMENT_METHOD_LABELS[key] ?? (key ? key : 'N/A')
}

/**
 * Envia email de pagamento confirmado baseado no order_id
 */
export async function sendPaymentConfirmedEmailFromOrder(
  supabase: SupabaseClient<Database>,
  orderId: string,
  webhookEventId?: string,
  isManualResend?: boolean
): Promise<{ success: boolean; error?: string }> {
  const logger = getLogger()
  try {
    logger.info('Preparando envio de email de pagamento confirmado para order', { orderId })

    // Buscar order com price e product
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(
        `
        id,
        user_id,
        price_id,
        status,
        payment_method,
        amount_cents,
        prices!inner (
          id,
          amount,
          currency,
          recurring,
          interval,
          interval_count,
          product_id,
          email_addon,
          products!inner (
            id,
            name,
            description
          )
        )
      `
      )
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      logger.error('Erro ao buscar order para email', orderError)
      return { success: false, error: 'Pedido não encontrado' }
    }

    // Buscar user no profiles
    const { data: user, error: userError } = await supabase
      .schema('payments')
      .from('profiles')
      .select('id, email, name')
      .eq('id', order.user_id)
      .single()

    if (userError || !user) {
      logger.error('Erro ao buscar user para email', userError)
      return { success: false, error: 'Cliente do pedido não encontrado' }
    }

    const price = order.prices
    const product = price?.products

    if (!user?.email || !product || !price) {
      logger.error('Dados incompletos para enviar email', undefined, {
        hasUser: !!user?.email,
        hasProduct: !!product,
        hasPrice: !!price,
      })
      return { success: false, error: 'Dados incompletos (email, produto ou preço)' }
    }

    const priceEmailAddon = parsePriceEmailAddon(price.email_addon as Json | null)

    const priceDisplay = formatOrderAmountForEmail(
      order.amount_cents,
      price.currency,
      order.id,
      logger
    )
    if (priceDisplay === null) return { success: false, error: 'Valor do pedido inválido' }

    // Formatar opções de pagamento (se recorrente)
    let paymentOptions: string | undefined
    if (price.recurring && price.interval) {
      const intervalMap: Record<string, string> = {
        day: 'dia',
        week: 'semana',
        month: 'mês',
        year: 'ano',
      }
      const intervalText = intervalMap[price.interval] || price.interval
      const count = price.interval_count || 1
      paymentOptions = count > 1 ? `A cada ${count} ${intervalText}s` : `Por ${intervalText}`
    }

    // Enviar email
    const emailResult = await sendPaymentConfirmedEmail(
      supabase as any,
      product.id,
      {
        userEmail: user.email,
        userName: user.name || 'Cliente',
        productName: product.name,
        priceDisplay,
        orderId: order.id,
        paymentMethod: formatPaymentMethod(order.payment_method),
        paymentOptions,
        priceId: price.id,
        priceEmailAddon,
      },
      webhookEventId,
      isManualResend
    )

    if (emailResult.success) {
      logger.info('Email de pagamento confirmado enviado', { orderId: order.id })
    } else {
      logger.error('Falha ao enviar email de pagamento confirmado', emailResult.error)
    }

    const platformResult = await sendPlatformSaleNotificationEmail(
      supabase as any,
      {
        orderId: order.id,
        productName: product.name,
        customerEmail: user.email,
        customerName: user.name || 'Cliente',
        priceDisplay,
        paymentMethod: formatPaymentMethod(order.payment_method),
      },
      webhookEventId
    )
    const skipNoRemetente =
      typeof platformResult.error === 'string' &&
      platformResult.error.includes('Remetente não configurado')
    if (!platformResult.success && !skipNoRemetente) {
      logger.error('Falha ao enviar aviso interno de venda', platformResult.error)
    }

    return emailResult.success
      ? { success: true }
      : {
          success: false,
          error:
            typeof emailResult.error === 'string'
              ? emailResult.error
              : 'Falha ao enviar e-mail de pagamento confirmado',
        }
  } catch (error) {
    logger.error('Erro ao enviar email de pagamento confirmado', error)
    // Não re-throw para não quebrar o webhook
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao enviar e-mail',
    }
  }
}

/**
 * Aviso interno de venda (admin) a partir do id do pedido — ex.: marcação manual como pago.
 */
export async function sendPlatformSaleNotificationForOrderId(
  supabase: SupabaseClient<Database>,
  orderId: string,
  webhookEventId?: string
): Promise<void> {
  const logger = getLogger()
  try {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(
        `
        id,
        user_id,
        payment_method,
        amount_cents,
        prices!inner (
          currency,
          products!inner (
            name
          )
        )
      `
      )
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      logger.error('Erro ao buscar order para aviso interno de venda', orderError)
      return
    }

    const { data: user, error: userError } = await supabase
      .schema('payments')
      .from('profiles')
      .select('email, name')
      .eq('id', order.user_id)
      .single()

    if (userError || !user?.email) {
      logger.error('Erro ao buscar user para aviso interno de venda', userError)
      return
    }

    const price = order.prices as {
      currency: string | null
      products: { name: string } | null
    }
    const product = price?.products
    if (!product) {
      logger.error('Produto ausente para aviso interno de venda', undefined, { orderId })
      return
    }

    const priceDisplay = formatOrderAmountForEmail(
      order.amount_cents,
      price.currency,
      order.id,
      logger
    )
    if (priceDisplay === null) return

    const platformResult = await sendPlatformSaleNotificationEmail(
      supabase as any,
      {
        orderId: order.id,
        productName: product.name,
        customerEmail: user.email,
        customerName: user.name || 'Cliente',
        priceDisplay,
        paymentMethod: formatPaymentMethod(order.payment_method),
      },
      webhookEventId
    )
    const skipNoRemetente =
      typeof platformResult.error === 'string' &&
      platformResult.error.includes('Remetente não configurado')
    if (!platformResult.success && !skipNoRemetente) {
      logger.error('Falha ao enviar aviso interno de venda', platformResult.error)
    }
  } catch (error) {
    logger.error('Erro no aviso interno de venda', error)
  }
}

/**
 * Envia email de pedido criado baseado no order_id (PIX/Boleto)
 */
export async function sendOrderCreatedEmailFromOrder(
  supabase: SupabaseClient<Database>,
  orderId: string,
  paymentInfo?: {
    pixQrCode?: string
    pixCopyPaste?: string
    boletoUrl?: string
    boletoLine?: string // Linha digitável do boleto
    boletoBarcode?: string // URL da imagem do código de barras
  },
  webhookEventId?: string,
  isManualResend?: boolean
): Promise<{ success: boolean; error?: string }> {
  const logger = getLogger()
  try {
    logger.info('Preparando envio de email de pedido criado para order', { orderId })

    // Buscar order com price e product
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(
        `
        id,
        user_id,
        price_id,
        status,
        payment_method,
        payment_gateway,
        metadata,
        amount_cents,
        prices!inner (
          id,
          amount,
          currency,
          recurring,
          interval,
          interval_count,
          product_id,
          email_addon,
          products!inner (
            id,
            name,
            description
          )
        )
      `
      )
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      logger.error('Erro ao buscar order para email', orderError)
      return { success: false, error: 'Pedido não encontrado' }
    }

    // Buscar user no profiles
    const { data: user, error: userError } = await supabase
      .schema('payments')
      .from('profiles')
      .select('id, email, name')
      .eq('id', order.user_id)
      .single()

    if (userError || !user) {
      logger.error('Erro ao buscar user para email', userError)
      return { success: false, error: 'Cliente do pedido não encontrado' }
    }

    const price = order.prices
    const product = price?.products

    if (!user?.email || !product || !price) {
      logger.error('Dados incompletos para enviar email', undefined, {
        hasUser: !!user?.email,
        hasProduct: !!product,
        hasPrice: !!price,
      })
      return { success: false, error: 'Dados incompletos (email, produto ou preço)' }
    }

    const priceEmailAddon = parsePriceEmailAddon(price.email_addon as Json | null)

    const priceDisplay = formatOrderAmountForEmail(
      order.amount_cents,
      price.currency,
      order.id,
      logger
    )
    if (priceDisplay === null) return { success: false, error: 'Valor do pedido inválido' }

    // Buscar payment_link_url e billing_type do metadata do order
    const metadata = (order.metadata as Record<string, unknown>) || {}
    const paymentLinkUrl = metadata.payment_link_url as string | undefined
    const billingType = metadata.billing_type as string | undefined

    // Enviar email
    const emailResult = await sendOrderCreatedEmail(
      supabase as any,
      product.id,
      {
        userEmail: user.email,
        userName: user.name || 'Cliente',
        productName: product.name,
        priceDisplay,
        orderId: order.id,
        paymentMethod: formatPaymentMethod(order.payment_method),
        priceId: price.id,
        priceEmailAddon,
        paymentInfo: {
          pixQrCode: paymentInfo?.pixQrCode,
          pixCopyPaste: paymentInfo?.pixCopyPaste,
          boletoUrl: paymentInfo?.boletoUrl,
          boletoLine: paymentInfo?.boletoLine,
          boletoBarcode: paymentInfo?.boletoBarcode,
          paymentLinkUrl,
          paymentGateway: order.payment_gateway,
          billingType,
        },
      },
      webhookEventId,
      isManualResend
    )

    if (emailResult.success) {
      logger.info('Email de pedido criado enviado', { orderId: order.id })
      return { success: true }
    } else {
      logger.error('Falha ao enviar email de pedido criado', emailResult.error)
      return {
        success: false,
        error:
          typeof emailResult.error === 'string'
            ? emailResult.error
            : 'Falha ao enviar e-mail de pedido criado',
      }
    }
  } catch (error) {
    logger.error('Erro ao enviar email de pedido criado', error)
    // Não re-throw para não quebrar o webhook
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao enviar e-mail',
    }
  }
}
