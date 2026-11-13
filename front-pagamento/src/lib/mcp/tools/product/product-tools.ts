import { isPublicHttpsWebhookUrl } from '@quitou/core/product-webhook'
import 'server-only'
import { z } from 'zod'

import { getPool } from '@/lib/db/pool'
import { createAdminProductServices } from '@/lib/payments/factories/service-factory'
import { priceUpdateSchema, productValidators } from '@/lib/payments/product/product.validators'

import type { McpTool } from '../../core/types'
import { defineTool, guardWrite, maskProduct } from '../shared'

const productSaveInputSchema = productValidators.update
  .omit({ prices: true })
  .extend({
    id: z.string().uuid().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.id) {
      if (!data.name?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Nome é obrigatório ao criar um produto.',
          path: ['name'],
        })
      }
      if (!data.ref?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Ref é obrigatório ao criar um produto.',
          path: ['ref'],
        })
      }
    }
  })

const priceSaveInputSchema = priceUpdateSchema
  .omit({ id: true })
  .extend({
    productId: z.string().uuid(),
    priceId: z.string().uuid().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.priceId) {
      if (!data.ref?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Ref do preço é obrigatório ao criar.',
          path: ['ref'],
        })
      }
      if (data.amount === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Valor (amount) é obrigatório ao criar.',
          path: ['amount'],
        })
      }
    }
  })

export const PRODUCT_TOOLS: McpTool[] = [
  defineTool({
    name: 'produto_listar',
    title: 'Listar produtos',
    description: 'Lista produtos e preços, com o segredo de webhook mascarado.',
    policyKey: 'produto',
    action: 'read',
    risk: 'baixo',
    input: z.object({ active: z.boolean().optional() }),
    handler: async (args) => {
      const { productService } = createAdminProductServices()
      const products = await productService.getAllProducts({ active: args.active })
      return products.map((product) => maskProduct(product as unknown as Record<string, unknown>))
    },
  }),
  defineTool({
    name: 'produto_abrir',
    title: 'Abrir produto',
    description: 'Abre um produto pelo id.',
    policyKey: 'produto',
    action: 'read',
    risk: 'baixo',
    input: z.object({ id: z.string().uuid() }),
    handler: async (args) => {
      const { productService } = createAdminProductServices()
      const product = await productService.getProductById(args.id)
      return maskProduct(product as unknown as Record<string, unknown>)
    },
  }),
  defineTool({
    name: 'produto_salvar',
    title: 'Salvar produto',
    description:
      'Cadastra ou edita produto completo (nome, ref, descrição, ativo, meios de pagamento, refund_policy, email_config, webhook e metadata). Risco alto: exige confirmar ou dry_run.',
    policyKey: 'produto',
    action: 'upsert',
    risk: 'alto',
    input: productSaveInputSchema,
    handler: async (args, ctx) => {
      if (args.webhook_url && !(await isPublicHttpsWebhookUrl(args.webhook_url))) {
        throw new Error('A URL de webhook precisa ser HTTPS e apontar para um host público.')
      }
      const { id, ...rest } = args
      const preview = guardWrite(
        ctx,
        maskProduct({ id, ...rest } as unknown as Record<string, unknown>)
      )
      if (preview) return preview

      const { productService } = createAdminProductServices()
      const product = id
        ? await productService.updateProduct(id, rest, ctx.principal.id)
        : await productService.createProduct(
            {
              ...rest,
              name: rest.name!,
              ref: rest.ref!,
              active: rest.active ?? true,
              payment_methods: rest.payment_methods ?? undefined,
            },
            ctx.principal.id
          )
      return maskProduct(product as unknown as Record<string, unknown>)
    },
  }),
  defineTool({
    name: 'produto_apagar',
    title: 'Apagar produto',
    description: 'Apaga o produto. A ação delete nasce desligada e pede confirmação.',
    policyKey: 'produto',
    action: 'delete',
    risk: 'alto',
    input: z.object({ id: z.string().uuid() }),
    handler: async (args, ctx) => {
      const preview = guardWrite(ctx, args)
      if (preview) return preview
      const { productService } = createAdminProductServices()
      await productService.deleteProduct(args.id, ctx.principal.id)
      return { deleted: args.id }
    },
  }),
  defineTool({
    name: 'preco_salvar',
    title: 'Salvar preço',
    description:
      'Cadastra ou edita um preço do produto (valor, moeda, recorrência, email_addon, estoque, promo_tiers, upgrades e add-ons).',
    policyKey: 'produto',
    action: 'upsert',
    risk: 'alto',
    input: priceSaveInputSchema,
    handler: async (args, ctx) => {
      const { productId, priceId, ...rest } = args
      const preview = guardWrite(ctx, args)
      if (preview) return preview
      const { productService } = createAdminProductServices()
      const product = priceId
        ? await productService.updatePrice(productId, priceId, rest, ctx.principal.id)
        : await productService.createPrice(
            productId,
            {
              ...rest,
              ref: rest.ref!,
              amount: rest.amount!,
            },
            ctx.principal.id
          )
      return maskProduct(product as unknown as Record<string, unknown>)
    },
  }),
  defineTool({
    name: 'preco_apagar',
    title: 'Apagar preço',
    description: 'Apaga um preço do produto.',
    policyKey: 'produto',
    action: 'delete',
    risk: 'alto',
    input: z.object({
      productId: z.string().uuid(),
      priceId: z.string().uuid(),
    }),
    handler: async (args, ctx) => {
      const preview = guardWrite(ctx, args)
      if (preview) return preview
      const { productService } = createAdminProductServices()
      const product = await productService.deletePrice(
        args.productId,
        args.priceId,
        ctx.principal.id
      )
      return maskProduct(product as unknown as Record<string, unknown>)
    },
  }),
  defineTool({
    name: 'estoque_recalcular',
    title: 'Recalcular estoque',
    description: 'Recalcula o estoque vendido de um preço.',
    policyKey: 'produto',
    action: 'upsert',
    risk: 'medio',
    input: z.object({ priceId: z.string().uuid() }),
    handler: async (args, ctx) => {
      const preview = guardWrite(ctx, args)
      if (preview) return preview
      const rows = await getPool().query('SELECT payments.recalc_stock_for_price($1) AS stock', [
        args.priceId,
      ])
      return { priceId: args.priceId, stock: rows.rows[0]?.stock ?? null }
    },
  }),
]
