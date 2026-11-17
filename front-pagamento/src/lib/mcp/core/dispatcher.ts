import 'server-only'
import { z } from 'zod'

import { auditMcpCall } from '../audit'
import { filterAllowed, resolveEffectivePolicy } from '../policy/decide'
import { loadPolicyConfig } from '../policy/store'
import { executeTool } from './execute-tool'
import type { McpPrincipal, McpTool } from './types'

const callSchema = z.object({
  name: z.string(),
  arguments: z.unknown().optional(),
})

export function createDispatcher(tools: readonly McpTool[]) {
  const byName = new Map(tools.map((tool) => [tool.name, tool]))

  return async function dispatch(method: string, params: unknown, principal: McpPrincipal) {
    if (method === 'ping') return {}
    if (method === 'notifications/initialized' || method === 'notifications/cancelled') return {}
    if (method === 'initialize') {
      return {
        protocolVersion: '2025-03-26',
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'quitou', version: '1' },
        instructions: [
          'Servidor MCP administrativo do Quitou (gateway de pagamentos e catálogo).',
          'Domínios disponíveis via tools/list: identidade (quem_sou), painel/relatórios (resumo_ler), produtos/preços/estoque (produto_*, preco_*, estoque_recalcular, produto_gerar, produto_revisar), pedidos (pedido_*), pagamentos (pagamento_*), cupons (cupom_*), assinaturas (assinatura_listar), e-mails (email_*), configurações (config_ler, config_salvar), webhooks (webhook_*), auditoria (auditoria_listar), reembolso (reembolso_*), conexões (conexao_testar) e admins (admin_*).',
          'Segurança em mutações: toda ferramenta de escrita/exclusão aceita dry_run: true para simular sem gravar no banco; ferramentas de risco alto exigem confirmar: true para executar.',
          'Valores monetários: todos os campos de dinheiro (revenue, averageTicketCents, revenueCents, amountCents, amount) estão em centavos BRL (divida por 100 para reais).',
          'Relatórios e gráficos: use resumo_ler com filtros opcionais period (today, 7d, 30d, month, 90d, all) e gateway (all, asaas, pagarme); use series (bucket, label, revenueCents, paidOrders, totalOrders) para gráficos temporais e byMethod, byGateway e topProducts para distribuições.',
        ].join(' '),
      }
    }
    if (method === 'tools/list') {
      const policy = resolveEffectivePolicy(await loadPolicyConfig(), principal.grantsOverride)
      return {
        tools: filterAllowed(tools, policy).map((tool) => ({
          name: tool.name,
          title: tool.title,
          description: tool.description,
          inputSchema: tool.parameters,
          annotations: {
            readOnlyHint: tool.action === 'read',
            destructiveHint: tool.action === 'delete' || tool.risk === 'alto',
            openWorldHint:
              tool.policyKey === 'ia' || tool.policyKey === 'conexao' || tool.policyKey === 'email',
          },
        })),
      }
    }
    if (method === 'tools/call') {
      const parsed = callSchema.safeParse(params)
      if (!parsed.success) return { error: { code: -32602, message: 'Argumento inválido' } }
      const tool = byName.get(parsed.data.name)
      if (!tool) return { error: { code: -32602, message: 'Ferramenta desconhecida' } }
      return executeTool(tool, parsed.data.arguments ?? {}, principal, {
        loadPolicy: loadPolicyConfig,
        audit: auditMcpCall,
      })
    }
    return { error: { code: -32601, message: 'Método desconhecido' } }
  }
}
