import 'server-only'
import { z } from 'zod'

import { loadBrandConfig } from '@/lib/brand/load-brand-config'
import { REFUND_TEMPLATES, presentRefundTemplate } from '@/lib/payments/refund-templates'

import type { McpTool } from '../../core/types'
import { defineTool } from '../shared'

export const REFUND_TOOLS: McpTool[] = [
  defineTool({
    name: 'reembolso_listar',
    title: 'Listar modelos de reembolso',
    description: 'Lista os modelos que a tela já oferece. A rota não grava modelo novo.',
    policyKey: 'reembolso',
    action: 'read',
    risk: 'baixo',
    input: z.object({}),
    handler: async () => REFUND_TEMPLATES.map(({ id, name }) => ({ id, name })),
  }),
  defineTool({
    name: 'reembolso_abrir',
    title: 'Abrir modelo de reembolso',
    description: 'Abre o texto do modelo que a tela já oferece.',
    policyKey: 'reembolso',
    action: 'read',
    risk: 'baixo',
    input: z.object({ id: z.string() }),
    handler: async (args) => {
      const template = REFUND_TEMPLATES.find((item) => item.id === args.id)
      if (!template) return null
      return presentRefundTemplate(template, loadBrandConfig().supportEmail)
    },
  }),
  defineTool({
    name: 'reembolso_salvar',
    title: 'Salvar modelo de reembolso',
    description: 'A rota atual não grava modelo. A chamada é recusada.',
    policyKey: 'reembolso',
    action: 'upsert',
    risk: 'alto',
    input: z.object({ id: z.string().optional(), texto: z.string().optional() }),
    handler: async () => {
      throw new Error('A rota de modelos não grava.')
    },
  }),
  defineTool({
    name: 'reembolso_apagar',
    title: 'Apagar modelo de reembolso',
    description: 'A rota atual não apaga modelo. A chamada é recusada.',
    policyKey: 'reembolso',
    action: 'delete',
    risk: 'alto',
    input: z.object({ id: z.string() }),
    handler: async () => {
      throw new Error('A rota de modelos não apaga.')
    },
  }),
]
