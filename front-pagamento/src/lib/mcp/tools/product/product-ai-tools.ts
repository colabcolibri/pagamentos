import 'server-only'
import { z } from 'zod'

import { geminiChat } from '@/lib/ai/gemini'
import { tryParseGeneratedProduct } from '@/lib/ai/parse-generated-product-json'
import {
  PRODUCT_GENERATION_JSON_SCHEMA,
  buildProductEditPrompt,
  buildProductEditUserMessage,
  buildProductGenerationPrompt,
  buildProductGenerationUserMessageFromScrape,
} from '@/lib/ai/product-generation-prompt'
import { createAdminProductServices } from '@/lib/payments/factories/service-factory'
import { loadGatewayConfig } from '@/lib/payments/gateway-config'
import { isUrlSafeForServerSideFetch } from '@/lib/security/safe-fetch-url'

import type { McpTool } from '../../core/types'
import { defineTool, maskProduct } from '../shared'

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

export const PRODUCT_AI_TOOLS: McpTool[] = [
  defineTool({
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
      if (!ctx.hasGrant('produto', 'upsert')) {
        throw new Error('Permissão de escrita em produto está desligada na política do MCP.')
      }
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
      return { ...draft, saved: maskProduct(saved as unknown as Record<string, unknown>) }
    },
  }),
  defineTool({
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
      if (!ctx.hasGrant('produto', 'upsert')) {
        throw new Error('Permissão de escrita em produto está desligada na política do MCP.')
      }
      const product = await productService.updateProduct(
        args.id,
        {
          name: draft.product.name,
          description: draft.product.description,
          active: draft.product.active,
        },
        ctx.principal.id
      )
      return { ...draft, saved: maskProduct(product as unknown as Record<string, unknown>) }
    },
  }),
]
