'use client'

import { useEffect, useMemo, useState } from 'react'

import { BookOpen, Check, Copy, Download } from 'lucide-react'
import { toast } from 'sonner'

import { MarkdownViewer } from '@/components/admin/markdown-viewer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  type IntegrationManualTabId,
  buildIntegrationManualMarkdown,
  buildIntegrationManualTabs,
} from '@/lib/checkout-sessions/integration-manual'
import { cn } from '@/lib/utils'

export function IntegrationManualCard() {
  const [origin, setOrigin] = useState('https://pagamentos.seu-dominio.example.com')
  const [activeTabId, setActiveTabId] = useState<IntegrationManualTabId>('overview')
  const [copiedMode, setCopiedMode] = useState<'tab' | 'all' | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location?.origin) {
      setOrigin(window.location.origin)
    }
  }, [])

  const tabs = useMemo(() => buildIntegrationManualTabs(origin), [origin])
  const fullMarkdown = useMemo(() => buildIntegrationManualMarkdown(origin), [origin])
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0]!

  const handleCopy = async (mode: 'tab' | 'all') => {
    const text = mode === 'tab' ? activeTab.markdown : fullMarkdown
    try {
      await navigator.clipboard.writeText(text)
      setCopiedMode(mode)
      toast.success(
        mode === 'tab'
          ? `Seção "${activeTab.label}" copiada em Markdown!`
          : 'Manual completo em Markdown copiado!'
      )
      setTimeout(() => setCopiedMode(null), 2500)
    } catch {
      toast.error('Não foi possível copiar para a área de transferência.')
    }
  }

  const handleDownload = () => {
    const blob = new Blob([fullMarkdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'manual-integracao-quitou.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <BookOpen className="h-5 w-5 shrink-0" />
              Manual Técnico de Integração
            </CardTitle>
            <CardDescription className="mt-1 max-w-2xl">
              Escolha o cenário abaixo para ler ou copiar as instruções exatas em Markdown para o
              seu agente de IA implementar no sistema externo.
            </CardDescription>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="mr-1.5 h-4 w-4" />
              Baixar .md
            </Button>
            <Button variant="outline" size="sm" onClick={() => void handleCopy('tab')}>
              {copiedMode === 'tab' ? (
                <Check className="mr-1.5 h-4 w-4" />
              ) : (
                <Copy className="mr-1.5 h-4 w-4" />
              )}
              {copiedMode === 'tab' ? 'Aba copiada!' : 'Copiar aba'}
            </Button>
            <Button size="sm" onClick={() => void handleCopy('all')}>
              {copiedMode === 'all' ? (
                <Check className="mr-1.5 h-4 w-4" />
              ) : (
                <Copy className="mr-1.5 h-4 w-4" />
              )}
              {copiedMode === 'all' ? 'Tudo copiado!' : 'Copiar tudo (.md)'}
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5 pt-2">
          {tabs.map((tab) => {
            const active = tab.id === activeTab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTabId(tab.id)}
                className={cn(
                  'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <p className="mb-4 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          {activeTab.summary}
        </p>
        <MarkdownViewer content={activeTab.markdown} />
      </CardContent>
    </Card>
  )
}
