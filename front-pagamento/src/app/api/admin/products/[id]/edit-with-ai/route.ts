import { NextResponse } from 'next/server'

import type { Json } from '@db/database.types'

import { geminiChat } from '@/lib/ai/gemini'
import { tryParseGeneratedProduct } from '@/lib/ai/parse-generated-product-json'
import {
  type GeneratedProduct,
  PRODUCT_GENERATION_JSON_SCHEMA,
  type PriceTypeHint,
  buildProductEditPrompt,
  buildProductEditUserMessage,
} from '@/lib/ai/product-generation-prompt'
import { requireAdmin } from '@/lib/auth'
import { createApiHandlerWithParams } from '@/lib/errors'
import { getLogger } from '@/lib/logger'
import { createAdminProductServices } from '@/lib/payments/factories/service-factory'
import { loadGatewayConfig } from '@/lib/payments/gateway-config'
import type { Price, Product } from '@/lib/payments/product'
import { isUrlSafeForServerSideFetch } from '@/lib/security/safe-fetch-url'
import { validateUuidParam } from '@/lib/validators/helpers'

const JINA_READER_BASE = 'https://r.jina.ai/'
const JINA_FETCH_TIMEOUT_MS = 25_000
/** Edição envia JSON grande (produto atual + conteúdo); 4096 costuma truncar e quebrar o parse */
const EDIT_AI_MAX_TOKENS = 8192
const EDIT_REPAIR_MAX_INPUT_CHARS = 14_000

const EDIT_JSON_REPAIR_SYSTEM = `Você recebe texto que deveria ser um único objeto JSON com as chaves de topo "product" e "prices" (configuração de produto digital para pagamentos).
Corrija apenas sintaxe e formato para JSON válido (vírgulas, aspas, chaves). Preserve o máximo possível do conteúdo.
Saída: somente o objeto JSON, sem markdown, sem texto antes do primeiro "{" ou depois do último "}".`

const VALID_PRICE_TYPE_HINTS: PriceTypeHint[] = ['subscription', 'one_time', 'both']

function parsePriceTypeHint(raw: unknown): PriceTypeHint | undefined {
  if (typeof raw !== 'string') return undefined
  return VALID_PRICE_TYPE_HINTS.includes(raw as PriceTypeHint) ? (raw as PriceTypeHint) : undefined
}

function toCurrentProductJson(product: Product): string {
  const productPayload = {
    name: product.name,
    ref: product.ref,
    description: product.description ?? null,
    active: product.active,
    payment_methods: product.payment_methods ?? [],
    refund_policy: product.refund_policy ?? null,
    email_config: product.email_config ?? null,
    metadata: product.metadata ?? null,
  }
  const pricesPayload = (product.prices || []).map((p: Price) => ({
    ref: p.ref,
    amount: p.amount,
    currency: p.currency,
    recurring: p.recurring,
    interval: p.interval ?? null,
    interval_count: p.interval_count ?? null,
    active: p.active,
    metadata: p.metadata ?? null,
    email_addon: p.email_addon ?? null,
    stock_cap: p.stock_cap ?? null,
    stock_sold: p.stock_sold,
    promo_tiers: (p.promo_tiers ?? []).map((t) => ({
      sort_order: t.sort_order,
      discount_percent: t.discount_percent,
      ends_at: t.ends_at,
      max_units: t.max_units,
      applies_to: t.applies_to,
    })),
  }))
  return JSON.stringify({ product: productPayload, prices: pricesPayload }, null, 2)
}

function mergeEditResult(
  current: Product,
  parsed: GeneratedProduct
): { product: Product; prices: Price[] } {
  const mergedProduct: Product = {
    ...current,
    name: parsed.product.name ?? current.name,
    ref: current.ref,
    description: parsed.product.description ?? current.description,
    active: parsed.product.active ?? current.active,
    payment_methods: parsed.product.payment_methods ?? current.payment_methods,
    refund_policy: (parsed.product.refund_policy ?? current.refund_policy) as Json | null,
    email_config: (parsed.product.email_config ?? current.email_config) as Json | null,
    metadata: (parsed.product.metadata ?? current.metadata) as Json | null,
  }
  const currentPrices = current.prices ?? []
  const mergedPrices: Price[] = parsed.prices.map((p, i) => {
    const existing = currentPrices[i]
    const parsedAddon = (p as { email_addon?: Json | null }).email_addon
    const core = {
      ref: p.ref ?? existing?.ref ?? '',
      amount: p.amount ?? existing?.amount ?? 0,
      currency: p.currency ?? existing?.currency ?? 'BRL',
      recurring: p.recurring ?? existing?.recurring ?? false,
      interval: p.interval ?? existing?.interval ?? null,
      interval_count: p.interval_count ?? existing?.interval_count ?? null,
      active: p.active ?? existing?.active ?? true,
      metadata: p.metadata ?? existing?.metadata ?? null,
      email_addon:
        parsedAddon !== undefined && parsedAddon !== null
          ? parsedAddon
          : (existing?.email_addon ?? null),
    }
    if (!existing) {
      return {
        id: '',
        product_id: current.id,
        ...core,
        created_at: null,
        updated_at: null,
      } as Price
    }
    return {
      ...existing,
      product_id: current.id,
      ...core,
    }
  })
  return { product: mergedProduct, prices: mergedPrices }
}

/**
 * POST /api/admin/products/[id]/edit-with-ai
 * Revisa produto existente com base em conteúdo (texto ou URL) e instrução.
 */
export const POST = createApiHandlerWithParams(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const authResult = await requireAdmin()
    if (!authResult.success) {
      return authResult.response
    }

    const apiKey = (await loadGatewayConfig()).geminiApiKey
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini não configurado. Cole a chave em Configurações.' },
        { status: 503 }
      )
    }

    const { id } = await params
    const invalidId = validateUuidParam(id)
    if (invalidId) return invalidId

    const body = await request.json()
    const content = typeof body.content === 'string' ? body.content.trim() : ''
    const url = typeof body.url === 'string' ? body.url.trim() : ''
    const instruction = typeof body.instruction === 'string' ? body.instruction.trim() : ''
    const priceTypeHint = parsePriceTypeHint(body.priceType)

    if (!content && !url) {
      return NextResponse.json(
        { error: 'Informe o conteúdo (campo "content") ou uma URL (campo "url").' },
        { status: 400 }
      )
    }
    if (url && !/^https?:\/\/.+/i.test(url)) {
      return NextResponse.json({ error: 'URL inválida. Use https:// ou http://' }, { status: 400 })
    }
    if (url && !isUrlSafeForServerSideFetch(url)) {
      return NextResponse.json(
        { error: 'URL não permitida (rede local, localhost ou endereço reservado).' },
        { status: 400 }
      )
    }

    const { productService } = createAdminProductServices()
    const current = await productService.getProductById(id)
    if (!current) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    }

    let contentText = content
    if (url) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), JINA_FETCH_TIMEOUT_MS)
        const res = await fetch(JINA_READER_BASE + url, {
          signal: controller.signal,
          headers: { 'X-Return-Format': 'markdown' },
        })
        clearTimeout(timeoutId)
        if (!res.ok) {
          return NextResponse.json(
            {
              error: `Não foi possível obter o conteúdo da URL (${res.status}). Verifique o link ou tente depois.`,
            },
            { status: 502 }
          )
        }
        contentText = await res.text()
        if (!contentText || contentText.length < 50) {
          return NextResponse.json(
            { error: 'O conteúdo retornado da página está vazio ou muito curto.' },
            { status: 422 }
          )
        }
      } catch (e) {
        const message =
          e instanceof Error && e.name === 'AbortError'
            ? 'A leitura da URL demorou demais. Tente novamente.'
            : 'Não foi possível acessar a URL. Verifique o link e se o site está no ar.'
        return NextResponse.json({ error: message }, { status: 502 })
      }
    }

    const currentProductJson = toCurrentProductJson(current)
    const systemPrompt = buildProductEditPrompt()
    const userMessage = buildProductEditUserMessage(
      currentProductJson,
      contentText,
      instruction,
      priceTypeHint
    )

    const logger = getLogger()
    const first = await geminiChat(apiKey, {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      responseFormat: {
        type: 'json_object',
        responseJsonSchema: PRODUCT_GENERATION_JSON_SCHEMA as Record<string, unknown>,
      },
      temperature: 0.15,
      maxTokens: EDIT_AI_MAX_TOKENS,
    })

    let parsed = tryParseGeneratedProduct(first.text)
    if (!parsed) {
      logger.warn('Edição com IA: primeiro parse falhou, tentando reparo estruturado', {
        rawLength: first.text.length,
        finishReason: first.finishReason,
      })
      const slice = first.text.slice(0, EDIT_REPAIR_MAX_INPUT_CHARS)
      const repairUser = `O texto abaixo deveria ser JSON válido com "product" e "prices". Corrija e retorne só o JSON.

${slice}`

      const repaired = await geminiChat(apiKey, {
        messages: [
          { role: 'system', content: EDIT_JSON_REPAIR_SYSTEM },
          { role: 'user', content: repairUser },
        ],
        responseFormat: {
          type: 'json_object',
          responseJsonSchema: PRODUCT_GENERATION_JSON_SCHEMA as Record<string, unknown>,
        },
        temperature: 0,
        maxTokens: EDIT_AI_MAX_TOKENS,
      })
      parsed = tryParseGeneratedProduct(repaired.text)
    }

    if (!parsed) {
      logger.error('Edição com IA: JSON inválido após reparo', undefined, {
        rawLength: first.text.length,
        finishReason: first.finishReason,
        rawStart: first.text.slice(0, 400),
        rawEnd: first.text.slice(-200),
      })
      const truncatedHint =
        first.finishReason === 'MAX_TOKENS'
          ? ' A resposta pode ter sido cortada por limite de tamanho; encurte o conteúdo colado ou simplifique a instrução e tente de novo.'
          : ''
      return NextResponse.json(
        {
          error: `A IA retornou um JSON inválido.${truncatedHint} Tente novamente.`,
        },
        { status: 422 }
      )
    }

    const currentPrices = current.prices ?? []
    if (parsed.prices.length !== currentPrices.length) {
      return NextResponse.json(
        {
          error: `A IA alterou a quantidade de preços (atual: ${currentPrices.length}, retornado: ${parsed.prices.length}). A edição mantém o mesmo número de preços. Tente outra instrução.`,
        },
        { status: 422 }
      )
    }

    const { product: mergedProduct, prices: mergedPrices } = mergeEditResult(current, parsed)
    return NextResponse.json({
      product: { ...mergedProduct, prices: mergedPrices },
    })
  },
  { module: 'admin', action: 'edit_product_with_ai' }
)
