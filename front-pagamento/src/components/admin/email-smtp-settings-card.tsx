'use client'

import { useEffect, useState } from 'react'

import { Loader2, Mail, Send } from 'lucide-react'
import { toast } from 'sonner'

import { Field, FieldDescription, FieldLabel } from '@/components/layout/ui/admin-field'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { usePlatformSettings } from '@/hooks/admin/use-platform-settings'
import { useSetupStatus } from '@/hooks/admin/use-setup-status'

export function EmailSmtpSettingsCard({ onSaved }: { onSaved?: () => void } = {}) {
  const { settings, isLoading, save, isSaving } = usePlatformSettings()
  const { sendTestEmail, isSendingTestEmail } = useSetupStatus()

  const [smtpHost, setSmtpHost] = useState('')
  const [smtpPort, setSmtpPort] = useState('587')
  const [smtpSecure, setSmtpSecure] = useState(false)
  const [smtpUser, setSmtpUser] = useState('')
  const [smtpPass, setSmtpPass] = useState('')
  const [emailFrom, setEmailFrom] = useState('')
  const [emailFromName, setEmailFromName] = useState('')
  const [emailFooterText, setEmailFooterText] = useState('')
  const [testRecipient, setTestRecipient] = useState('')

  useEffect(() => {
    if (!settings) return
    setSmtpHost(settings.smtp_host ?? '')
    setSmtpPort(String(settings.smtp_port ?? 587))
    setSmtpSecure(Boolean(settings.smtp_secure))
    setSmtpUser(settings.smtp_user ?? '')
    setEmailFrom(settings.email_from ?? '')
    setEmailFromName(settings.email_from_name ?? '')
    setEmailFooterText(settings.email_footer_text ?? '')
    setSmtpPass('')
  }, [settings])

  async function handleSave() {
    const parsedPort = Number.parseInt(smtpPort, 10)
    if (smtpPort.trim() && (!Number.isFinite(parsedPort) || parsedPort < 1 || parsedPort > 65535)) {
      toast.error('Porta SMTP inválida (1 a 65535).')
      return
    }
    try {
      await save({
        smtp_host: smtpHost.trim() || null,
        smtp_port: Number.isFinite(parsedPort) ? parsedPort : null,
        smtp_secure: smtpSecure,
        smtp_user: smtpUser.trim() || null,
        ...(smtpPass.trim() ? { smtp_pass: smtpPass.trim() } : {}),
        email_from: emailFrom.trim() || null,
        email_from_name: emailFromName.trim() || null,
        email_footer_text: emailFooterText.trim() || null,
      })
      setSmtpPass('')
      toast.success('Configurações de e-mail e SMTP salvas.')
      onSaved?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar SMTP.')
    }
  }

  async function handleTestEmail() {
    try {
      const res = await sendTestEmail(testRecipient.trim() || undefined)
      toast.success(`E-mail de teste enviado para ${res.recipient}.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao enviar e-mail de teste.')
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">E-mail, SMTP & Rodapé</CardTitle>
          </div>
          {settings?.smtp_host_source && settings.smtp_host_source !== 'missing' && (
            <Badge variant="outline" className="text-[11px]">
              Origem SMTP: {settings.smtp_host_source === 'database' ? 'Painel (banco)' : '.env'}
            </Badge>
          )}
        </div>
        <CardDescription>
          Usa o .env como padrão quando preenchido, mas você pode sobrescrever o servidor SMTP,
          remetente e rodapé aqui sem reiniciar o servidor.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="email-from-name">Título / Nome do remetente</FieldLabel>
            <Input
              id="email-from-name"
              value={emailFromName}
              onChange={(e) => setEmailFromName(e.target.value)}
              placeholder="Ex.: Minha Empresa"
              disabled={isLoading || isSaving}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="email-from">E-mail remetente (From)</FieldLabel>
            <Input
              id="email-from"
              type="email"
              value={emailFrom}
              onChange={(e) => setEmailFrom(e.target.value)}
              placeholder="naoresponda@suaempresa.com"
              disabled={isLoading || isSaving}
            />
          </Field>

          <Field className="md:col-span-2">
            <FieldLabel htmlFor="email-footer-text">Rodapé personalizado dos e-mails</FieldLabel>
            <Textarea
              id="email-footer-text"
              rows={2}
              value={emailFooterText}
              onChange={(e) => setEmailFooterText(e.target.value)}
              placeholder="Ex.: Enviado por Minha Empresa — Dúvidas? suporte@suaempresa.com"
              disabled={isLoading || isSaving}
            />
            <FieldDescription>
              Aparece no rodapé de todos os e-mails (código de acesso, pedido criado, pagamento
              confirmado), junto com a razão social/CNPJ.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="smtp-host">Servidor SMTP (Host)</FieldLabel>
            <Input
              id="smtp-host"
              value={smtpHost}
              onChange={(e) => setSmtpHost(e.target.value)}
              placeholder="smtp.resend.com ou mailpit"
              disabled={isLoading || isSaving}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="smtp-port">Porta</FieldLabel>
              <Input
                id="smtp-port"
                type="number"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                placeholder="587"
                disabled={isLoading || isSaving}
              />
            </Field>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={smtpSecure}
                  onCheckedChange={(checked) => setSmtpSecure(Boolean(checked))}
                  disabled={isLoading || isSaving}
                />
                TLS implícito (465)
              </label>
            </div>
          </div>

          <Field>
            <FieldLabel htmlFor="smtp-user">Usuário SMTP</FieldLabel>
            <Input
              id="smtp-user"
              value={smtpUser}
              onChange={(e) => setSmtpUser(e.target.value)}
              placeholder="resend"
              disabled={isLoading || isSaving}
            />
          </Field>

          <Field>
            <div className="flex items-center justify-between gap-2">
              <FieldLabel htmlFor="smtp-pass">Senha / API Key SMTP</FieldLabel>
              {settings?.smtp_pass?.configured && (
                <Badge variant="secondary" className="text-[11px]">
                  Salva ({settings.smtp_pass.preview})
                </Badge>
              )}
            </div>
            <Input
              id="smtp-pass"
              type="password"
              value={smtpPass}
              onChange={(e) => setSmtpPass(e.target.value)}
              placeholder={
                settings?.smtp_pass?.configured ? 'Deixe vazio para manter a atual' : 're_...'
              }
              disabled={isLoading || isSaving}
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <Input
              type="email"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              placeholder="E-mail para teste (vazio = seu e-mail admin)"
              className="max-w-xs"
              disabled={isSendingTestEmail}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleTestEmail}
              disabled={isLoading || isSendingTestEmail}
            >
              {isSendingTestEmail ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Enviar e-mail de teste
            </Button>
          </div>
          <Button type="button" onClick={handleSave} disabled={isLoading || isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar e-mail & SMTP
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
