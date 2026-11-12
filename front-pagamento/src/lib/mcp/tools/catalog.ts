import 'server-only'
import { z } from 'zod'

import { recordAdminAction } from '@/lib/admin/audit'
import { runAllConnectionTests } from '@/lib/admin/connection-tests'
import { loadDashboardStats } from '@/lib/admin/dashboard-stats'
import { geminiChat } from '@/lib/ai/gemini'
import { tryParseGeneratedProduct } from '@/lib/ai/parse-generated-product-json'
import {
  PRODUCT_GENERATION_JSON_SCHEMA,
  buildProductEditPrompt,
  buildProductEditUserMessage,
  buildProductGenerationPrompt,
  buildProductGenerationUserMessageFromScrape,
} from '@/lib/ai/product-generation-prompt'
import { loadBrandConfig } from '@/lib/brand/load-brand-config'
import { createAdminPaymentsClient } from '@/lib/db/payments-query'
import { getPool } from '@/lib/db/pool'
import {
  sendOrderCreatedEmailFromOrder,
  sendPaymentConfirmedEmailFromOrder,
} from '@/lib/email-helpers'
import { getLogger } from '@/lib/logger'
import { cancelAdminPaymentLink } from '@/lib/payments/admin-cancel-payment-link'
import {
  deleteAdminCoupon,
  getAdminCoupon,
  insertAdminCoupon,
  listAdminCoupons,
  updateAdminCoupon,
} from '@/lib/payments/admin-coupon-store'
import {
  listAdminOrders,
  readAdminOrder,
  softDeleteCancelledOrder,
} from '@/lib/payments/admin-orders'
import { createAdminProductServices } from '@/lib/payments/factories/service-factory'
import { loadGatewayConfig, maskSecret, toAdminGatewayView } from '@/lib/payments/gateway-config'
import { REFUND_TEMPLATES, presentRefundTemplate } from '@/lib/payments/refund-templates'
import {
  platformSettingsPatchSchema,
  updatePlatformSettings,
} from '@/lib/payments/update-platform-settings'
import { isUrlSafeForServerSideFetch } from '@/lib/security/safe-fetch-url'

import type { McpTool, McpToolContext } from '../core/types'

const object = { type: 'object', additionalProperties: false } as const

function define<I extends z.ZodType>(tool: McpTool<I>): McpTool<I> {
  return tool
}

function guardWrite(ctx: McpToolContext, preview: unknown) {
  if (ctx.dryRun) return { dry_run: true, preview }
  return null
}

async function askGemini(apiKey: string, options: Parameters<typeof geminiChat>[1]) {
  try {
    return await geminiChat(apiKey, options)
  } catch {
    throw new Error('Gemini não respondeu. Confira a chave em Configurações.')
  }
}

async function readPublicPage(url: string) {
  if (!isUrlSafeForServerSideFetch(url)) {
    throw new Error('URL não permitida (rede local, localhost ou endereço reservado).')
  }
  const response = await fetch(`https://r.jina.ai/${url}`, {
    headers: { 'X-Return-Format': 'markdown' },
    signal: AbortSignal.timeout(25_000),
  })
  if (!response.ok)
    throw new Error(`Não foi possível obter o conteúdo da URL (${response.status}).`)
  return response.text()
}

async function draftFromGemini(apiKey: string, system: string, user: string) {
  const result = await askGemini(apiKey, {
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    responseFormat: {
      type: 'json_object',
      responseJsonSchema: PRODUCT_GENERATION_JSON_SCHEMA as Record<string, unknown>,
    },
    temperature: 0.2,
    maxTokens: 8192,
  })
  const parsed = tryParseGeneratedProduct(result.text)
  if (!parsed?.product || !Array.isArray(parsed.prices) || parsed.prices.length === 0) {
    throw new Error('A IA retornou um JSON inválido. Tente novamente com informações mais claras.')
  }
  return { product: parsed.product, prices: parsed.prices }
}

function viewProduct(product: Record<string, unknown>) {
  const secret = typeof product.webhook_secret === 'string' ? product.webhook_secret : null
  const { webhook_secret: _secret, ...rest } = product
  return { ...rest, webhook_secret: maskSecret(secret) }
}

export const MCP_TOOLS: McpTool[] = [
  define({
    name: 'quem_sou',
    title: 'Quem está conectado',
    description: 'Devolve o e-mail do admin autenticado, sem o token.',
    policyKey: 'identidade',
    action: 'read',
    risk: 'baixo',
    input: z.object({}),
    parameters: object,
    handler: async (_args, ctx) => ({ id: ctx.principal.id, email: ctx.principal.email }),
  }),
  define({
    name: 'produto_listar',
    title: 'Listar produtos',
    description: 'Lista produtos e preços, com o segredo de webhook mascarado.',
    policyKey: 'produto',
    action: 'read',
    risk: 'baixo',
    input: z.object({ active: z.boolean().optional() }),
    parameters: { ...object, properties: { active: { type: 'boolean' } } },
    handler: async (args) => {
      const { productService } = createAdminProductServices()
      const products = await productService.getAllProducts({ active: args.active })
      return products.map((product) => viewProduct(product as unknown as Record<string, unknown>))
    },
  }),
  define({
    name: 'produto_abrir',
    title: 'Abrir produto',
    description: 'Abre um produto pelo id.',
    policyKey: 'produto',
    action: 'read',
    risk: 'baixo',
    input: z.object({ id: z.string().uuid() }),
    parameters: { ...object, properties: { id: { type: 'string' } }, required: ['id'] },
    handler: async (args) => {
      const { productService } = createAdminProductServices()
      const product = await productService.getProductById(args.id)
      return viewProduct(product as unknown as Record<string, unknown>)
    },
  }),
  define({
    name: 'produto_salvar',
    title: 'Salvar produto',
    description: 'Cadastra ou edita nome e ref do produto. Risco alto: exige confirmar ou dry_run.',
    policyKey: 'produto',
    action: 'upsert',
    risk: 'alto',
    input: z.object({
      id: z.string().uuid().optional(),
      name: z.string().min(1).max(255),
      ref: z.string().min(1).max(100),
    }),
    parameters: {
      ...object,
      properties: { id: { type: 'string' }, name: { type: 'string' }, ref: { type: 'string' } },
      required: ['name', 'ref'],
    },
    handler: async (args, ctx) => {
      const preview = guardWrite(ctx, args)
      if (preview) return preview
      const { productService } = createAdminProductServices()
      const product = args.id
        ? await productService.updateProduct(
            args.id,
            { name: args.name, ref: args.ref },
            ctx.principal.id
          )
        : await productService.createProduct(
            { name: args.name, ref: args.ref, active: true },
            ctx.principal.id
          )
      return viewProduct(product as unknown as Record<string, unknown>)
    },
  }),
  define({
    name: 'produto_apagar',
    title: 'Apagar produto',
    description: 'Apaga o produto. A ação delete nasce desligada e pede confirmação.',
    policyKey: 'produto',
    action: 'delete',
    risk: 'alto',
    input: z.object({ id: z.string().uuid() }),
    parameters: { ...object, properties: { id: { type: 'string' } }, required: ['id'] },
    handler: async (args, ctx) => {
      const preview = guardWrite(ctx, args)
      if (preview) return preview
      const { productService } = createAdminProductServices()
      await productService.deleteProduct(args.id, ctx.principal.id)
      return { deleted: args.id }
    },
  }),
  define({
    name: 'preco_salvar',
    title: 'Salvar preço',
    description: 'Cadastra ou edita um preço do produto.',
    policyKey: 'produto',
    action: 'upsert',
    risk: 'alto',
    input: z.object({
      productId: z.string().uuid(),
      priceId: z.string().uuid().optional(),
      ref: z.string().min(1).max(100),
      amount: z.number().int().positive(),
    }),
    parameters: {
      ...object,
      properties: {
        productId: { type: 'string' },
        priceId: { type: 'string' },
        ref: { type: 'string' },
        amount: { type: 'number' },
      },
      required: ['productId', 'ref', 'amount'],
    },
    handler: async (args, ctx) => {
      const preview = guardWrite(ctx, args)
      if (preview) return preview
      const { productService } = createAdminProductServices()
      const product = args.priceId
        ? await productService.updatePrice(
            args.productId,
            args.priceId,
            { ref: args.ref, amount: args.amount },
            ctx.principal.id
          )
        : await productService.createPrice(
            args.productId,
            { ref: args.ref, amount: args.amount },
            ctx.principal.id
          )
      return viewProduct(product as unknown as Record<string, unknown>)
    },
  }),
  define({
    name: 'preco_apagar',
    title: 'Apagar preço',
    description: 'Apaga um preço do produto.',
    policyKey: 'produto',
    action: 'delete',
    risk: 'alto',
    input: z.object({ productId: z.string().uuid(), priceId: z.string().uuid() }),
    parameters: {
      ...object,
      properties: { productId: { type: 'string' }, priceId: { type: 'string' } },
      required: ['productId', 'priceId'],
    },
    handler: async (args, ctx) => {
      const preview = guardWrite(ctx, args)
      if (preview) return preview
      const { productService } = createAdminProductServices()
      await productService.deletePrice(args.productId, args.priceId, ctx.principal.id)
      return { deleted: args.priceId }
    },
  }),
  define({
    name: 'estoque_recalcular',
    title: 'Recalcular estoque',
    description: 'Recalcula o estoque vendido de um preço.',
    policyKey: 'produto',
    action: 'upsert',
    risk: 'medio',
    input: z.object({ priceId: z.string().uuid() }),
    parameters: { ...object, properties: { priceId: { type: 'string' } }, required: ['priceId'] },
    handler: async (args, ctx) => {
      const preview = guardWrite(ctx, args)
      if (preview) return preview
      const rows = await getPool().query('SELECT payments.recalc_stock_for_price($1) AS stock', [
        args.priceId,
      ])
      return { priceId: args.priceId, stock: rows.rows[0]?.stock ?? null }
    },
  }),
  define({
    name: 'produto_gerar',
    title: 'Gerar produto com IA',
    description: 'Pede um rascunho ao Gemini. Sem chave, pede para configurar. dry_run não grava.',
    policyKey: 'ia',
    action: 'upsert',
    risk: 'alto',
    input: z
      .object({
        texto: z.string().min(50).max(8000).optional(),
        url: z.string().url().optional(),
      })
      .refine((value) => Boolean(value.texto || value.url), { message: 'Informe texto ou URL' }),
    parameters: {
      ...object,
      properties: { texto: { type: 'string' }, url: { type: 'string' } },
    },
    handler: async (args, ctx) => {
      const key = (await loadGatewayConfig()).geminiApiKey
      if (!key) return { error: 'Gemini não configurado. Cole a chave em Configurações.' }
      const source = args.url ? await readPublicPage(args.url) : args.texto!
      const draft = await draftFromGemini(
        key,
        buildProductGenerationPrompt({
          name: '',
          description: '',
          priceInfo: '',
          priceType: 'both',
          objective: '',
          policyInfo: '',
        }),
        buildProductGenerationUserMessageFromScrape(source, 'both')
      )
      if (ctx.dryRun) return { dry_run: true, ...draft }
      const { productService } = createAdminProductServices()
      const saved = await productService.createProductWithPrices(
        {
          name: draft.product.name,
          ref: draft.product.ref,
          description: draft.product.description,
          active: false,
        },
        draft.prices.map((price) => ({
          ref: price.ref,
          amount: price.amount,
          currency: price.currency,
          recurring: price.recurring,
          interval: price.interval,
          interval_count: price.interval_count,
          active: price.active,
        })),
        ctx.principal.id
      )
      return { ...draft, saved: viewProduct(saved as unknown as Record<string, unknown>) }
    },
  }),
  define({
    name: 'produto_revisar',
    title: 'Revisar produto com IA',
    description: 'Pede ao Gemini um nome novo e grava se não for dry_run.',
    policyKey: 'ia',
    action: 'upsert',
    risk: 'alto',
    input: z.object({
      id: z.string().uuid(),
      instrucao: z.string().min(5).max(4000),
      texto: z.string().min(50).max(8000).optional(),
      url: z.string().url().optional(),
    }),
    parameters: {
      ...object,
      properties: {
        id: { type: 'string' },
        instrucao: { type: 'string' },
        texto: { type: 'string' },
        url: { type: 'string' },
      },
      required: ['id', 'instrucao'],
    },
    handler: async (args, ctx) => {
      const key = (await loadGatewayConfig()).geminiApiKey
      if (!key) return { error: 'Gemini não configurado. Cole a chave em Configurações.' }
      const { productService } = createAdminProductServices()
      const current = await productService.getProductById(args.id)
      const source = args.url ? await readPublicPage(args.url) : (args.texto ?? args.instrucao)
      const draft = await draftFromGemini(
        key,
        buildProductEditPrompt(),
        buildProductEditUserMessage(JSON.stringify(current), source, args.instrucao)
      )
      if (draft.prices.length !== (current.prices?.length ?? 0)) {
        throw new Error(
          `A IA alterou a quantidade de preços (atual: ${current.prices?.length ?? 0}, retornado: ${draft.prices.length}). A edição mantém o mesmo número de preços.`
        )
      }
      if (ctx.dryRun) return { dry_run: true, ...draft }
      const product = await productService.updateProduct(
        args.id,
        {
          name: draft.product.name,
          description: draft.product.description,
          active: draft.product.active,
        },
        ctx.principal.id
      )
      return { ...draft, saved: viewProduct(product as unknown as Record<string, unknown>) }
    },
  }),
  define({
    name: 'pedido_listar',
    title: 'Listar pedidos',
    description: 'Lista pedidos sem dado de cartão.',
    policyKey: 'pedido',
    action: 'read',
    risk: 'baixo',
    input: z.object({ limit: z.number().int().min(1).max(50).optional() }),
    parameters: { ...object, properties: { limit: { type: 'number' } } },
    handler: async (args) => listAdminOrders({ limit: args.limit ?? 20, offset: 0 }),
  }),
  define({
    name: 'pedido_abrir',
    title: 'Abrir pedido',
    description: 'Abre um pedido.',
    policyKey: 'pedido',
    action: 'read',
    risk: 'baixo',
    input: z.object({ id: z.string().uuid() }),
    parameters: { ...object, properties: { id: { type: 'string' } }, required: ['id'] },
    handler: async (args) => readAdminOrder(args.id),
  }),
  define({
    name: 'pedido_cancelar',
    title: 'Cancelar pedido',
    description: 'Cancela pedido pendente, falho ou expirado.',
    policyKey: 'pedido',
    action: 'upsert',
    risk: 'alto',
    input: z.object({ id: z.string().uuid(), motivo: z.string().min(3).max(300) }),
    parameters: {
      ...object,
      properties: { id: { type: 'string' }, motivo: { type: 'string' } },
      required: ['id', 'motivo'],
    },
    handler: async (args, ctx) => {
      const order = await readAdminOrder(args.id)
      if (!order) throw new Error('Pedido não encontrado')
      if (!['pending', 'failed', 'expired'].includes(String(order.status))) {
        throw new Error('Estado do pedido não permite cancelar')
      }
      const preview = guardWrite(ctx, { id: args.id, status: order.status })
      if (preview) return preview
      await getPool().query(
        `UPDATE payments.orders SET status = 'cancelled', updated_at = now()
         WHERE id = $1 AND status = ANY($2::text[])`,
        [args.id, ['pending', 'failed', 'expired']]
      )
      await recordAdminAction(getPool(), {
        actorId: ctx.principal.id,
        action: 'order.cancel',
        targetType: 'order',
        targetId: args.id,
      })
      return { id: args.id, status: 'cancelled' }
    },
  }),
  define({
    name: 'pedido_marcar_pago',
    title: 'Marcar pedido como pago',
    description: 'Recusa pedido cancelado ou reembolsado. Não marca sem confirmação.',
    policyKey: 'pedido',
    action: 'upsert',
    risk: 'alto',
    input: z.object({ id: z.string().uuid(), motivo: z.string().min(3).max(300) }),
    parameters: {
      ...object,
      properties: { id: { type: 'string' }, motivo: { type: 'string' } },
      required: ['id', 'motivo'],
    },
    handler: async (args, ctx) => {
      const order = await readAdminOrder(args.id)
      if (!order) throw new Error('Pedido não encontrado')
      if (order.status === 'cancelled' || order.status === 'refunded') {
        throw new Error('Não é possível marcar como pago neste estado')
      }
      const preview = guardWrite(ctx, { id: args.id })
      if (preview) return preview
      await getPool().query(
        `UPDATE payments.orders SET status = 'paid', paid_at = now(), updated_at = now()
         WHERE id = $1 AND status <> ALL($2::text[])`,
        [args.id, ['cancelled', 'refunded']]
      )
      await recordAdminAction(getPool(), {
        actorId: ctx.principal.id,
        action: 'order.mark_paid',
        targetType: 'order',
        targetId: args.id,
      })
      return { id: args.id, status: 'paid' }
    },
  }),
  define({
    name: 'pedido_apagar',
    title: 'Apagar pedido cancelado',
    description: 'Apaga só pedido já cancelado. Delete nasce desligado.',
    policyKey: 'pedido',
    action: 'delete',
    risk: 'alto',
    input: z.object({ id: z.string().uuid() }),
    parameters: { ...object, properties: { id: { type: 'string' } }, required: ['id'] },
    handler: async (args, ctx) => {
      const preview = guardWrite(ctx, args)
      if (preview) return preview
      const deleted = await softDeleteCancelledOrder(args.id, ctx.principal.id)
      if (!deleted) throw new Error('Só é possível apagar pedido cancelado')
      return { deleted: args.id }
    },
  }),
  define({
    name: 'pagamento_listar',
    title: 'Listar pagamentos',
    description: 'Lista id, estado, valor e gateway. Sem cartão e sem chave.',
    policyKey: 'pagamento',
    action: 'read',
    risk: 'baixo',
    input: z.object({}),
    parameters: object,
    handler: async () => {
      const rows = await getPool().query(
        `SELECT id, order_id, status, amount_cents, 'pagarme' AS gateway, created_at
         FROM payments.pagarme_payments
         UNION ALL
         SELECT id, order_id, status, amount_cents, 'asaas' AS gateway, created_at
         FROM payments.asaas_payments
         ORDER BY created_at DESC
         LIMIT 50`
      )
      return rows.rows
    },
  }),
  define({
    name: 'pagamento_abrir',
    title: 'Abrir pagamento',
    description: 'Abre id, estado, valor e gateway. Sem cartão e sem código PIX.',
    policyKey: 'pagamento',
    action: 'read',
    risk: 'baixo',
    input: z.object({ id: z.string().uuid(), gateway: z.enum(['pagarme', 'asaas']) }),
    parameters: {
      ...object,
      properties: { id: { type: 'string' }, gateway: { type: 'string' } },
      required: ['id', 'gateway'],
    },
    handler: async (args) => {
      const table = args.gateway === 'pagarme' ? 'pagarme_payments' : 'asaas_payments'
      const rows = await getPool().query(
        `SELECT id, order_id, status, amount_cents, created_at FROM payments.${table} WHERE id = $1`,
        [args.id]
      )
      return rows.rows[0] ?? null
    },
  }),
  define({
    name: 'pagamento_cancelar',
    title: 'Cancelar pagamento',
    description: 'Cancela no gateway com a mesma regra da tela. Estado proibido é recusado.',
    policyKey: 'pagamento',
    action: 'upsert',
    risk: 'alto',
    input: z.object({
      id: z.string().uuid(),
      gateway: z.enum(['pagarme', 'asaas']),
    }),
    parameters: {
      ...object,
      properties: { id: { type: 'string' }, gateway: { type: 'string' } },
      required: ['id', 'gateway'],
    },
    handler: async (args, ctx) => {
      const preview = guardWrite(ctx, args)
      if (preview) return preview
      const result = await cancelAdminPaymentLink({
        supabase: createAdminPaymentsClient(),
        paymentRowId: args.id,
        gateway: args.gateway,
        logger: getLogger(),
      })
      if (!result.ok) throw new Error(result.error)
      await recordAdminAction(getPool(), {
        actorId: ctx.principal.id,
        action: 'payment.cancel',
        targetType: 'payment',
        targetId: args.id,
      })
      return { cancelled: args.id }
    },
  }),
  define({
    name: 'cupom_listar',
    title: 'Listar cupons',
    description: 'Lista cupons.',
    policyKey: 'cupom',
    action: 'read',
    risk: 'baixo',
    input: z.object({}),
    parameters: object,
    handler: async () => listAdminCoupons({ active: 'all', limit: 50, offset: 0 }),
  }),
  define({
    name: 'cupom_abrir',
    title: 'Abrir cupom',
    description: 'Abre um cupom.',
    policyKey: 'cupom',
    action: 'read',
    risk: 'baixo',
    input: z.object({ id: z.string().uuid() }),
    parameters: { ...object, properties: { id: { type: 'string' } }, required: ['id'] },
    handler: async (args) => getAdminCoupon(args.id),
  }),
  define({
    name: 'cupom_salvar',
    title: 'Salvar cupom',
    description: 'Cadastra ou edita cupom percentual.',
    policyKey: 'cupom',
    action: 'upsert',
    risk: 'alto',
    input: z.object({
      id: z.string().uuid().optional(),
      code: z.string().min(2).max(40),
      discount_percent: z.number().positive().max(100),
    }),
    parameters: {
      ...object,
      properties: {
        id: { type: 'string' },
        code: { type: 'string' },
        discount_percent: { type: 'number' },
      },
      required: ['code', 'discount_percent'],
    },
    handler: async (args, ctx) => {
      const preview = guardWrite(ctx, args)
      if (preview) return preview
      const row = {
        code: args.code,
        discount_type: 'percent',
        discount_percent: args.discount_percent,
        discount_amount_cents: null,
        applies_to: 'all',
        product_id: null,
        price_id: null,
        max_redemptions_total: null,
        max_redemptions_per_user: null,
        starts_at: null,
        ends_at: null,
        active: true,
        description: null,
        public_show_remaining: false,
        public_remaining_prefix: null,
        public_remaining_suffix: null,
        public_show_valid_until: false,
        public_valid_until_prefix: null,
        public_valid_until_suffix: null,
        public_message_bands: null,
      }
      if (args.id) return updateAdminCoupon(args.id, row)
      return insertAdminCoupon(row)
    },
  }),
  define({
    name: 'cupom_apagar',
    title: 'Apagar cupom',
    description: 'Apaga o cupom. Delete nasce desligado.',
    policyKey: 'cupom',
    action: 'delete',
    risk: 'alto',
    input: z.object({ id: z.string().uuid() }),
    parameters: { ...object, properties: { id: { type: 'string' } }, required: ['id'] },
    handler: async (args, ctx) => {
      const preview = guardWrite(ctx, args)
      if (preview) return preview
      await deleteAdminCoupon(args.id)
      return { deleted: args.id }
    },
  }),
  define({
    name: 'assinatura_listar',
    title: 'Listar assinaturas',
    description: 'Lista assinaturas. Não grava.',
    policyKey: 'assinatura',
    action: 'read',
    risk: 'baixo',
    input: z.object({}),
    parameters: object,
    handler: async () => {
      const rows = await getPool().query(
        `SELECT id, status, price_id, user_id, created_at
         FROM payments.subscriptions
         ORDER BY created_at DESC
         LIMIT 50`
      )
      return rows.rows
    },
  }),
  define({
    name: 'email_listar',
    title: 'Listar e-mails',
    description: 'Lista o histórico sem senha SMTP.',
    policyKey: 'email',
    action: 'read',
    risk: 'baixo',
    input: z.object({}),
    parameters: object,
    handler: async () => {
      const rows = await getPool().query(
        `SELECT id, recipient, subject, status, created_at
         FROM payments.email_logs
         ORDER BY created_at DESC
         LIMIT 30`
      )
      return rows.rows
    },
  }),
  define({
    name: 'email_abrir',
    title: 'Abrir e-mail',
    description: 'Abre destinatário, assunto e estado. Sem o HTML e sem senha SMTP.',
    policyKey: 'email',
    action: 'read',
    risk: 'baixo',
    input: z.object({ id: z.string().uuid() }),
    parameters: { ...object, properties: { id: { type: 'string' } }, required: ['id'] },
    handler: async (args) => {
      const rows = await getPool().query(
        `SELECT id, recipient, subject, status, order_id, created_at
         FROM payments.email_logs WHERE id = $1`,
        [args.id]
      )
      return rows.rows[0] ?? null
    },
  }),
  define({
    name: 'email_reenviar',
    title: 'Reenviar e-mail do pedido',
    description: 'Reenvia o aviso de pedido ou de pagamento confirmado.',
    policyKey: 'email',
    action: 'upsert',
    risk: 'alto',
    input: z.object({
      orderId: z.string().uuid(),
      emailType: z.enum(['order_created', 'payment_confirmed']),
    }),
    parameters: {
      ...object,
      properties: { orderId: { type: 'string' }, emailType: { type: 'string' } },
      required: ['orderId', 'emailType'],
    },
    handler: async (args, ctx) => {
      const preview = guardWrite(ctx, args)
      if (preview) return preview
      const database = createAdminPaymentsClient()
      if (args.emailType === 'order_created') {
        await sendOrderCreatedEmailFromOrder(database, args.orderId, undefined, undefined, true)
      } else {
        await sendPaymentConfirmedEmailFromOrder(database, args.orderId, undefined, true)
      }
      return { resent: args.orderId, emailType: args.emailType }
    },
  }),
  define({
    name: 'admin_listar',
    title: 'Listar admins',
    description: 'Lista e-mail e se está ativo. Sem token.',
    policyKey: 'admin',
    action: 'read',
    risk: 'baixo',
    input: z.object({}),
    parameters: object,
    handler: async () => {
      const rows = await getPool().query(
        `SELECT id, name, email, role, is_active FROM payments.admin_users ORDER BY created_at DESC`
      )
      return rows.rows
    },
  }),
  define({
    name: 'admin_desativar',
    title: 'Desativar admin',
    description: 'Desativa outro admin. Não apaga a linha.',
    policyKey: 'admin',
    action: 'upsert',
    risk: 'alto',
    input: z.object({ id: z.string().uuid() }),
    parameters: { ...object, properties: { id: { type: 'string' } }, required: ['id'] },
    handler: async (args, ctx) => {
      if (args.id === ctx.principal.id)
        throw new Error('Não desative o seu próprio acesso por aqui')
      const preview = guardWrite(ctx, args)
      if (preview) return preview
      const rows = await getPool().query(
        `UPDATE payments.admin_users SET is_active = false WHERE id = $1 RETURNING id, email, is_active`,
        [args.id]
      )
      if (!rows.rows[0]) throw new Error('Admin não encontrado')
      return rows.rows[0]
    },
  }),
  define({
    name: 'config_ler',
    title: 'Ler configurações',
    description: 'Mostra gateways e o trecho mascarado das chaves.',
    policyKey: 'config',
    action: 'read',
    risk: 'baixo',
    input: z.object({}),
    parameters: object,
    handler: async () => toAdminGatewayView(await loadGatewayConfig()),
  }),
  define({
    name: 'config_salvar',
    title: 'Salvar configurações',
    description:
      'Altera aviso, gateway ou chave. Campo vazio não apaga segredo. A resposta vem mascarada.',
    policyKey: 'config',
    action: 'upsert',
    risk: 'alto',
    input: platformSettingsPatchSchema,
    parameters: {
      ...object,
      properties: {
        sale_notification_recipients: { type: 'string' },
        asaas_enabled: { type: 'boolean' },
        pagarme_enabled: { type: 'boolean' },
        asaas_environment: { type: 'string' },
        pagarme_environment: { type: 'string' },
        asaas_api_key: { type: 'string' },
        asaas_webhook_secret: { type: 'string' },
        pagarme_secret_key: { type: 'string' },
        pagarme_webhook_user: { type: 'string' },
        pagarme_webhook_secret: { type: 'string' },
        gemini_api_key: { type: 'string' },
        deepinfra_api_key: { type: 'string' },
        products_by_price_api_key: { type: 'string' },
      },
    },
    handler: async (args, ctx) => {
      const preview = guardWrite(ctx, { fields: Object.keys(args) })
      if (preview) return preview
      return updatePlatformSettings(args)
    },
  }),
  define({
    name: 'webhook_abrir',
    title: 'Abrir webhook recebido',
    description: 'Abre o estado do webhook, sem o corpo.',
    policyKey: 'webhook',
    action: 'read',
    risk: 'baixo',
    input: z.object({ id: z.string().uuid() }),
    parameters: { ...object, properties: { id: { type: 'string' } }, required: ['id'] },
    handler: async (args) => {
      const rows = await getPool().query(
        `SELECT id, provider, event_type, processing_status, created_at
         FROM payments.webhook_events WHERE id = $1`,
        [args.id]
      )
      return rows.rows[0] ?? null
    },
  }),
  define({
    name: 'webhook_listar',
    title: 'Listar webhooks recebidos',
    description: 'Lista o estado do webhook, sem o corpo.',
    policyKey: 'webhook',
    action: 'read',
    risk: 'baixo',
    input: z.object({}),
    parameters: object,
    handler: async () => {
      const rows = await getPool().query(
        `SELECT id, provider, event_type, processing_status, created_at
         FROM payments.webhook_events
         ORDER BY created_at DESC
         LIMIT 30`
      )
      return rows.rows
    },
  }),
  define({
    name: 'auditoria_listar',
    title: 'Listar auditoria',
    description: 'Lista eventos, inclusive chamadas do MCP, sem chave.',
    policyKey: 'auditoria',
    action: 'read',
    risk: 'baixo',
    input: z.object({}),
    parameters: object,
    handler: async () => {
      const rows = await getPool().query(
        `SELECT id, actor_id, action, target_type, target_id, detail, created_at
         FROM payments.admin_audit_events
         ORDER BY created_at DESC
         LIMIT 50`
      )
      return rows.rows
    },
  }),
  define({
    name: 'reembolso_listar',
    title: 'Listar modelos de reembolso',
    description: 'Lista os modelos que a tela já oferece. A rota não grava modelo novo.',
    policyKey: 'reembolso',
    action: 'read',
    risk: 'baixo',
    input: z.object({}),
    parameters: object,
    handler: async () => REFUND_TEMPLATES.map(({ id, name }) => ({ id, name })),
  }),
  define({
    name: 'reembolso_abrir',
    title: 'Abrir modelo de reembolso',
    description: 'Abre o texto do modelo que a tela já oferece.',
    policyKey: 'reembolso',
    action: 'read',
    risk: 'baixo',
    input: z.object({ id: z.string() }),
    parameters: { ...object, properties: { id: { type: 'string' } }, required: ['id'] },
    handler: async (args) => {
      const template = REFUND_TEMPLATES.find((item) => item.id === args.id)
      if (!template) return null
      return presentRefundTemplate(template, loadBrandConfig().supportEmail)
    },
  }),
  define({
    name: 'reembolso_salvar',
    title: 'Salvar modelo de reembolso',
    description: 'A rota atual não grava modelo. A chamada é recusada.',
    policyKey: 'reembolso',
    action: 'upsert',
    risk: 'alto',
    input: z.object({ id: z.string().optional(), texto: z.string().optional() }),
    parameters: object,
    handler: async () => {
      throw new Error('A rota de modelos não grava.')
    },
  }),
  define({
    name: 'reembolso_apagar',
    title: 'Apagar modelo de reembolso',
    description: 'A rota atual não apaga modelo. A chamada é recusada.',
    policyKey: 'reembolso',
    action: 'delete',
    risk: 'alto',
    input: z.object({ id: z.string() }),
    parameters: { ...object, properties: { id: { type: 'string' } }, required: ['id'] },
    handler: async () => {
      throw new Error('A rota de modelos não apaga.')
    },
  }),
  define({
    name: 'conexao_testar',
    title: 'Testar conexões',
    description: 'Testa Postgres, gateways e Gemini. A resposta não traz chave.',
    policyKey: 'conexao',
    action: 'read',
    risk: 'baixo',
    input: z.object({}),
    parameters: object,
    handler: async () => runAllConnectionTests(),
  }),
  define({
    name: 'resumo_ler',
    title: 'Resumo do painel',
    description: 'Conta produtos, pedidos e pagamentos com a mesma base da tela.',
    policyKey: 'resumo',
    action: 'read',
    risk: 'baixo',
    input: z.object({}),
    parameters: object,
    handler: async () => loadDashboardStats(),
  }),
]
