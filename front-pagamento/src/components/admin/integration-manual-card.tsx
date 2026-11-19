'use client'

import { useEffect, useMemo, useState } from 'react'

import { BookOpen, Check, Copy, Download } from 'lucide-react'
import { toast } from 'sonner'

import { MarkdownViewer } from '@/components/admin/markdown-viewer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { buildIntegrationManualMarkdown } from '@/lib/checkout-sessions/integration-manual'

export function IntegrationManualCard() {
  const [origin, setOrigin] = useState('https://pagamentos.seu-dominio.example.com')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location?.origin) {
      setOrigin(window.location.origin)
    }
  }, [])

  const markdown = useMemo(() => buildIntegrationManualMarkdown(origin), [origin])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown)
      setCopied(true)
      toast.success('Manual completo em Markdown copiado! Pode colar direto no seu agente.')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error('Não foi possível copiar para a área de transferência.')
    }
  }

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
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
              Manual Técnico de Integração (Markdown)
            </CardTitle>
            <CardDescription className="mt-1 max-w-2xl">
              Documentação agnóstica pronta para leitura ou para copiar e colar em um agente de IA
              implementar a conexão com o Quitou (pró-rata, catálogo, tokens S2S, CPF e webhooks
              HMAC).
            </CardDescription>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="mr-1.5 h-4 w-4" />
              Baixar .md
            </Button>
            <Button size="sm" onClick={() => void handleCopy()}>
              {copied ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
              {copied ? 'Copiado!' : 'Copiar Markdown'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <MarkdownViewer content={markdown} />
      </CardContent>
    </Card>
  )
}
