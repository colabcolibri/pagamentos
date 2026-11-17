'use client'

import { ClipboardButton } from '@/components/ui/clipboard-button'

function buildMcpSnippets(endpoint: string, tokenOrPlaceholder: string) {
  const mcpConfigJson = JSON.stringify(
    {
      mcpServers: {
        quitou: {
          url: endpoint,
          headers: {
            Authorization: `Bearer ${tokenOrPlaceholder}`,
          },
        },
      },
    },
    null,
    2
  )

  const curlTest = [
    `curl -X POST "${endpoint}" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -H "Authorization: Bearer ${tokenOrPlaceholder}" \\`,
    `  -d '{"jsonrpc":"2.0","id":1,"method":"initialize"}'`,
  ].join('\n')

  const agentPrompt = [
    `Conecte ao servidor MCP do Quitou via HTTP JSON-RPC 2.0:`,
    `- Endpoint: POST ${endpoint}`,
    `- Autenticação: Authorization: Bearer ${tokenOrPlaceholder}`,
    `- Handshake: {"jsonrpc":"2.0","id":1,"method":"initialize"}`,
    `- Listar ferramentas: {"jsonrpc":"2.0","id":2,"method":"tools/list"}`,
    `- Executar ferramenta: {"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"<nome>","arguments":{}}}`,
    `- OAuth (alternativo para clientes com OAuth 2.1 + PKCE): ${endpoint.replace(/\/api\/mcp$/, '')}/.well-known/oauth-protected-resource`,
  ].join('\n')

  return { mcpConfigJson, curlTest, agentPrompt }
}

export function McpConnectionSnippets({
  endpoint,
  token,
}: {
  endpoint: string
  token?: string | null
}) {
  const snippetToken = token ?? '<SUA_CHAVE_MCP>'
  const { mcpConfigJson, curlTest, agentPrompt } = buildMcpSnippets(endpoint, snippetToken)

  return (
    <div className="space-y-2.5">
      {token && (
        <div className="flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-2">
          <div className="min-w-0">
            <span className="block text-[11px] text-muted-foreground">Token gerado</span>
            <code className="block truncate text-xs font-mono">{token}</code>
          </div>
          <ClipboardButton
            text={token}
            size="sm"
            variant="outline"
            successMessage="Token copiado"
          />
        </div>
      )}

      <div className="flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-2">
        <div className="min-w-0">
          <span className="block text-[11px] text-muted-foreground">URL do servidor MCP</span>
          <code className="block truncate text-xs font-mono">{endpoint}</code>
        </div>
        <ClipboardButton
          text={endpoint}
          size="sm"
          variant="outline"
          successMessage="URL do MCP copiada"
        />
      </div>

      <div className="flex items-start justify-between gap-2 rounded-md border bg-background px-3 py-2">
        <div className="min-w-0 flex-1">
          <span className="block text-[11px] font-medium text-muted-foreground">
            Configuração mcpServers (Cursor / Claude / Antigravity / Windsurf)
          </span>
          <pre className="mt-1 overflow-x-auto text-[11px] font-mono text-muted-foreground">
            {mcpConfigJson}
          </pre>
        </div>
        <ClipboardButton
          text={mcpConfigJson}
          size="sm"
          variant="outline"
          successMessage="Configuração mcpServers copiada"
        />
      </div>

      <div className="flex items-start justify-between gap-2 rounded-md border bg-background px-3 py-2">
        <div className="min-w-0 flex-1">
          <span className="block text-[11px] font-medium text-muted-foreground">
            Instrução pronta para passar a outro agente
          </span>
          <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-[11px] font-mono text-muted-foreground">
            {agentPrompt}
          </pre>
        </div>
        <ClipboardButton
          text={agentPrompt}
          size="sm"
          variant="outline"
          successMessage="Instruções para agente copiadas"
        />
      </div>

      <div className="flex items-start justify-between gap-2 rounded-md border bg-background px-3 py-2">
        <div className="min-w-0 flex-1">
          <span className="block text-[11px] font-medium text-muted-foreground">
            Teste rápido (curl)
          </span>
          <pre className="mt-1 overflow-x-auto text-[11px] font-mono text-muted-foreground">
            {curlTest}
          </pre>
        </div>
        <ClipboardButton
          text={curlTest}
          size="sm"
          variant="outline"
          successMessage="Comando curl copiado"
        />
      </div>
    </div>
  )
}
