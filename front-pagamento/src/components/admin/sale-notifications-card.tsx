'use client'

import { useEffect, useState } from 'react'

import { Bell, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { usePlatformSettings } from '@/hooks/admin/use-platform-settings'

const CONTENT = {
  title: 'Aviso interno de venda',
  description:
    'Quando um pagamento for confirmado (webhook ou marcação manual), enviamos um e-mail para estes endereços com resumo do pedido. O cliente continua recebendo o e-mail configurado no produto. Use vírgula para vários e-mails.',
  placeholder: 'ex.: operacao@suaempresa.com, financeiro@suaempresa.com',
  save: 'Salvar',
  saving: 'Salvando…',
  saved: 'Destinatários atualizados.',
} as const

export function SaleNotificationsCard({ onSaved }: { onSaved?: () => void } = {}) {
  const { settings, isLoading, save, isSaving, saveError } = usePlatformSettings()
  const [recipientsDraft, setRecipientsDraft] = useState('')

  useEffect(() => {
    if (settings) {
      setRecipientsDraft(settings.sale_notification_recipients ?? '')
    }
  }, [settings])

  async function handleSave() {
    try {
      await save({ sale_notification_recipients: recipientsDraft.trim() || null })
      toast.success(CONTENT.saved)
      onSaved?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {CONTENT.title}
        </CardTitle>
        <CardDescription className="max-w-2xl">{CONTENT.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-24 w-full rounded-md" />
        ) : (
          <>
            <Textarea
              value={recipientsDraft}
              onChange={(e) => setRecipientsDraft(e.target.value)}
              placeholder={CONTENT.placeholder}
              className="min-h-[100px] max-w-full resize-y break-all"
              disabled={isSaving}
              aria-label="E-mails para aviso de venda"
            />
            {saveError && (
              <p className="text-sm text-destructive break-words">
                {saveError instanceof Error ? saveError.message : String(saveError)}
              </p>
            )}
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving}
              className="w-full sm:w-auto"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {CONTENT.saving}
                </>
              ) : (
                CONTENT.save
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
