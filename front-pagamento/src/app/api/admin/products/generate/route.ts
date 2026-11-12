import { NextResponse } from 'next/server'

import { isPublicHttpsWebhookUrl } from '@quitou/core/product-webhook'

import { geminiChat } from '@/lib/ai/gemini'
import { tryParseGeneratedProduct } from '@/lib/ai/parse-generated-product-json'
import {
  PRODUCT_GENERATION_JSON_SCHEMA,
  type PriceTypeHint,
  buildProductGenerationPrompt,
  buildProductGenerationUserMessage,
  buildProductGenerationUserMessageFromScrape,
} from '@/lib/ai/product-generation-prompt'
import { requireAdmin } from '@/lib/auth'
import { createApiHandler } from '@/lib/errors'
import { getLogger } from '@/lib/logger'
import { loadGatewayConfig } from '@/lib/payments/gateway-config'
import { isUrlSafeForServerSideFetch } from '@/lib/security/safe-fetch-url'

const PRICE_TYPES: PriceTypeHint[] = ['subscription', 'one_time', 'both']

const JINA_READER_BASE = 'https://r.jina.ai/'
const JINA_FETCH_TIMEOUT_MS = 25_000

const MIN_FREE_TEXT_LENGTH = 50

const generateValidator = {
  name: (v: unknown) => typeof v === 'string' && v.trim().length > 0,
  description: (v: unknown) => typeof v === 'string',
  priceInfo: (v: unknown) => typeof v === 'string' && v.trim().length > 0,
  priceType: (v: unknown): v is PriceTypeHint =>
    typeof v === 'string' && PRICE_TYPES.includes(v as PriceTypeHint),
  objective: (v: unknown) => typeof v === 'string',
  policyInfo: (v: unknown) => typeof v === 'string',
  url: (v: unknown) => typeof v === 'string' && v.trim().length > 0,
  freeText: (v: unknown) => typeof v === 'string' && v.trim().length >= MIN_FREE_TEXT_LENGTH,
}

/**
 * POST /api/admin/products/generate
 * Gera produto + preços + política via IA (Google Gemini 3 Flash)
 */
export const POST = createApiHandler(
  async (request: Request) => {
    const authResult = await requireAdmin()
    if (!authResult.success) {
      return authResult.response
    }

    const apiKey = (await loadGatewayConfig()).geminiApiKey
    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'Gemini não configurado. Cole a chave em Configurações.',
        },
        { status: 503 }
      )
    }

    const body = await request.json()
    const priceType = generateValidator.priceType(body.priceType)
      ? (body.priceType as PriceTypeHint)
      : ('both' as PriceTypeHint)

    let systemPrompt: string
    let userMessage: string

    if (generateValidator.url(body.url)) {
      const url = (body.url as string).trim()
      if (!isUrlSafeForServerSideFetch(url) || !(await isPublicHttpsWebhookUrl(url))) {
        return NextResponse.json(
          { error: 'URL não permitida. Informe um endereço público HTTPS válido.' },
          { status: 400 }
        )
      }
      let scrapedContent: string
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), JINA_FETCH_TIMEOUT_MS)
        const normalizedTarget = new URL(url).toString()
        const jinaUrl = JINA_READER_BASE + normalizedTarget
        const res = await fetch(jinaUrl, {
          signal: controller.signal,
          redirect: 'error',
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
        scrapedContent = await res.text()
        if (!scrapedContent || scrapedContent.length < MIN_FREE_TEXT_LENGTH) {
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

      systemPrompt = buildProductGenerationPrompt({
        name: '',
        description: '',
        priceInfo: '',
        priceType,
        objective: '',
        policyInfo: '',
      })
      userMessage = buildProductGenerationUserMessageFromScrape(scrapedContent, priceType)
    } else if (generateValidator.freeText(body.freeText)) {
      const pastedText = (body.freeText as string).trim()
      systemPrompt = buildProductGenerationPrompt({
        name: '',
        description: '',
        priceInfo: '',
        priceType,
        objective: '',
        policyInfo: '',
      })
      userMessage = buildProductGenerationUserMessageFromScrape(pastedText, priceType)
    } else {
      const name = body.name as string
      const description = (body.description as string) ?? ''
      const priceInfo = body.priceInfo as string
      const objective = (body.objective as string) ?? ''
      const policyInfo = (body.policyInfo as string) ?? ''

      if (!generateValidator.name(name)) {
        return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
      }
      if (!generateValidator.priceInfo(priceInfo)) {
        return NextResponse.json({ error: 'Informação de preço é obrigatória' }, { status: 400 })
      }

      systemPrompt = buildProductGenerationPrompt({
        name,
        description,
        priceInfo,
        priceType,
        objective,
        policyInfo,
      })
      userMessage = buildProductGenerationUserMessage({
        name,
        description,
        priceInfo,
        priceType,
        objective,
        policyInfo,
      })
    }

    const logger = getLogger()
    const { text: rawContent, finishReason } = await geminiChat(apiKey, {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      responseFormat: {
        type: 'json_object',
        responseJsonSchema: PRODUCT_GENERATION_JSON_SCHEMA as Record<string, unknown>,
      },
      temperature: 0.2,
      maxTokens: 8192,
    })

    const parsed = tryParseGeneratedProduct(rawContent)
    if (!parsed) {
      logger.error('Geração de produto: JSON inválido retornado pela IA', undefined, {
        rawLength: rawContent.length,
        finishReason,
        rawStart: rawContent.slice(0, 400),
        rawEnd: rawContent.slice(-200),
      })
      const truncatedHint =
        finishReason === 'MAX_TOKENS'
          ? ' A resposta pode ter sido cortada; encurte o texto de entrada ou gere em partes.'
          : ''
      return NextResponse.json(
        {
          error: `A IA retornou um JSON inválido.${truncatedHint} Tente novamente com informações mais claras.`,
          parseError: 'parse_failed',
          raw: rawContent.slice(0, 800),
        },
        { status: 422 }
      )
    }

    if (!parsed.product || !parsed.prices || !Array.isArray(parsed.prices)) {
      return NextResponse.json(
        {
          error: 'Estrutura do JSON gerado está incorreta. Tente novamente.',
          expected: 'product e prices (array)',
        },
        { status: 422 }
      )
    }

    if (parsed.prices.length === 0) {
      return NextResponse.json({ error: 'É necessário pelo menos um preço.' }, { status: 422 })
    }

    return NextResponse.json({
      product: parsed.product,
      prices: parsed.prices,
    })
  },
  { module: 'admin', action: 'generate_product' }
)
