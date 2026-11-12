'use client'

import { type ReactNode, useEffect, useState } from 'react'

import { CreditCard, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { SecretField } from '@/components/admin/secret-field'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { type PlatformSettingsDto, usePlatformSettings } from '@/hooks/admin/use-platform-settings'

export function GatewaySettingsCard() {
  const { settings, isLoading, save, isSaving } = usePlatformSettings()
  const [asaasEnabled, setAsaasEnabled] = useState(true)
  const [pagarmeEnabled, setPagarmeEnabled] = useState(true)
  const [asaasEnvironment, setAsaasEnvironment] = useState<'sandbox' | 'production'>('production')
  const [pagarmeEnvironment, setPagarmeEnvironment] = useState<'sandbox' | 'production'>(
    'production'
  )
  const [asaasApiKey, setAsaasApiKey] = useState('')
  const [asaasWebhookSecret, setAsaasWebhookSecret] = useState('')
  const [pagarmeSecretKey, setPagarmeSecretKey] = useState('')
  const [pagarmeWebhookUser, setPagarmeWebhookUser] = useState('')
  const [pagarmeWebhookSecret, setPagarmeWebhookSecret] = useState('')

  useEffect(() => {
    if (!settings) return
    setAsaasEnabled(settings.asaas_enabled)
    setPagarmeEnabled(settings.pagarme_enabled)
    setAsaasEnvironment(settings.asaas_environment)
    setPagarmeEnvironment(settings.pagarme_environment)
    setAsaasApiKey('')
    setAsaasWebhookSecret('')
    setPagarmeSecretKey('')
    setPagarmeWebhookUser('')
    setPagarmeWebhookSecret('')
  }, [settings])

  const handleSave = async () => {
    try {
      await save({
        asaas_enabled: asaasEnabled,
        pagarme_enabled: pagarmeEnabled,
        asaas_environment: asaasEnvironment,
        pagarme_environment: pagarmeEnvironment,
        asaas_api_key: asaasApiKey,
        asaas_webhook_secret: asaasWebhookSecret,
        pagarme_secret_key: pagarmeSecretKey,
        pagarme_webhook_user: pagarmeWebhookUser,
        pagarme_webhook_secret: pagarmeWebhookSecret,
      })
      toast.success('Gateways atualizados.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar')
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <CreditCard className="h-5 w-5 shrink-0" />
          Gateways de pagamento
        </CardTitle>
        <CardDescription>
          Ligado e com chave aparece no checkout. Com os dois ligados, a compra vai pelo Asaas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading || !settings ? (
          <Skeleton className="h-40 w-full rounded-md" />
        ) : (
          <GatewayForm
            settings={settings}
            disabled={isSaving}
            asaasEnabled={asaasEnabled}
            pagarmeEnabled={pagarmeEnabled}
            asaasEnvironment={asaasEnvironment}
            pagarmeEnvironment={pagarmeEnvironment}
            asaasApiKey={asaasApiKey}
            asaasWebhookSecret={asaasWebhookSecret}
            pagarmeSecretKey={pagarmeSecretKey}
            pagarmeWebhookUser={pagarmeWebhookUser}
            pagarmeWebhookSecret={pagarmeWebhookSecret}
            onAsaasEnabled={setAsaasEnabled}
            onPagarmeEnabled={setPagarmeEnabled}
            onAsaasEnvironment={setAsaasEnvironment}
            onPagarmeEnvironment={setPagarmeEnvironment}
            onAsaasApiKey={setAsaasApiKey}
            onAsaasWebhookSecret={setAsaasWebhookSecret}
            onPagarmeSecretKey={setPagarmeSecretKey}
            onPagarmeWebhookUser={setPagarmeWebhookUser}
            onPagarmeWebhookSecret={setPagarmeWebhookSecret}
            onSave={() => void handleSave()}
            isSaving={isSaving}
          />
        )}
      </CardContent>
    </Card>
  )
}

function GatewayForm({
  settings,
  disabled,
  asaasEnabled,
  pagarmeEnabled,
  asaasEnvironment,
  pagarmeEnvironment,
  asaasApiKey,
  asaasWebhookSecret,
  pagarmeSecretKey,
  pagarmeWebhookUser,
  pagarmeWebhookSecret,
  onAsaasEnabled,
  onPagarmeEnabled,
  onAsaasEnvironment,
  onPagarmeEnvironment,
  onAsaasApiKey,
  onAsaasWebhookSecret,
  onPagarmeSecretKey,
  onPagarmeWebhookUser,
  onPagarmeWebhookSecret,
  onSave,
  isSaving,
}: {
  settings: PlatformSettingsDto
  disabled: boolean
  asaasEnabled: boolean
  pagarmeEnabled: boolean
  asaasEnvironment: 'sandbox' | 'production'
  pagarmeEnvironment: 'sandbox' | 'production'
  asaasApiKey: string
  asaasWebhookSecret: string
  pagarmeSecretKey: string
  pagarmeWebhookUser: string
  pagarmeWebhookSecret: string
  onAsaasEnabled: (value: boolean) => void
  onPagarmeEnabled: (value: boolean) => void
  onAsaasEnvironment: (value: 'sandbox' | 'production') => void
  onPagarmeEnvironment: (value: 'sandbox' | 'production') => void
  onAsaasApiKey: (value: string) => void
  onAsaasWebhookSecret: (value: string) => void
  onPagarmeSecretKey: (value: string) => void
  onPagarmeWebhookUser: (value: string) => void
  onPagarmeWebhookSecret: (value: string) => void
  onSave: () => void
  isSaving: boolean
}) {
  return (
    <div className="space-y-8">
      <GatewayBlock
        title="Asaas"
        enabled={asaasEnabled}
        onEnabled={onAsaasEnabled}
        environment={asaasEnvironment}
        environmentLocked={settings.asaas_environment_source === 'env'}
        onEnvironment={onAsaasEnvironment}
        disabled={disabled}
      >
        <SecretField
          id="asaas-api-key"
          label="Chave da API"
          envName="ASAAS_API_KEY"
          status={settings.asaas_api_key}
          value={asaasApiKey}
          onChange={onAsaasApiKey}
          disabled={disabled}
        />
        <SecretField
          id="asaas-webhook-secret"
          label="Token do webhook"
          envName="ASAAS_WEBHOOK_SECRET"
          status={settings.asaas_webhook_secret}
          value={asaasWebhookSecret}
          onChange={onAsaasWebhookSecret}
          disabled={disabled}
        />
      </GatewayBlock>
      <GatewayBlock
        title="Pagar.me"
        enabled={pagarmeEnabled}
        onEnabled={onPagarmeEnabled}
        environment={pagarmeEnvironment}
        environmentLocked={settings.pagarme_environment_source === 'env'}
        onEnvironment={onPagarmeEnvironment}
        disabled={disabled}
      >
        <SecretField
          id="pagarme-secret-key"
          label="Chave secreta"
          envName="PAGARME_SECRET_KEY"
          status={settings.pagarme_secret_key}
          value={pagarmeSecretKey}
          onChange={onPagarmeSecretKey}
          disabled={disabled}
        />
        <SecretField
          id="pagarme-webhook-user"
          label="Usuário do webhook"
          envName="PAGARME_WEBHOOK_USER"
          status={settings.pagarme_webhook_user}
          value={pagarmeWebhookUser}
          onChange={onPagarmeWebhookUser}
          disabled={disabled}
        />
        <SecretField
          id="pagarme-webhook-secret"
          label="Senha do webhook"
          envName="PAGARME_WEBHOOK_SECRET"
          status={settings.pagarme_webhook_secret}
          value={pagarmeWebhookSecret}
          onChange={onPagarmeWebhookSecret}
          disabled={disabled}
        />
      </GatewayBlock>
      <Button type="button" onClick={onSave} disabled={isSaving} className="w-full sm:w-auto">
        {isSaving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Salvando…
          </>
        ) : (
          'Salvar gateways'
        )}
      </Button>
    </div>
  )
}

function GatewayBlock({
  title,
  enabled,
  onEnabled,
  environment,
  environmentLocked,
  onEnvironment,
  disabled,
  children,
}: {
  title: string
  enabled: boolean
  onEnabled: (value: boolean) => void
  environment: 'sandbox' | 'production'
  environmentLocked: boolean
  onEnvironment: (value: 'sandbox' | 'production') => void
  disabled: boolean
  children: ReactNode
}) {
  return (
    <section className="min-w-0 space-y-4 border-t pt-6 first:border-t-0 first:pt-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Switch
            checked={enabled}
            onCheckedChange={onEnabled}
            disabled={disabled}
            aria-label={title}
          />
          <div>
            <p className="font-medium">{title}</p>
            <p className="text-sm text-muted-foreground">
              {enabled ? 'No checkout' : 'Fora do checkout'}
            </p>
          </div>
        </div>
        {environmentLocked ? (
          <p className="text-sm text-muted-foreground">
            {environment === 'sandbox' ? 'Sandbox' : 'Produção'} no ambiente
          </p>
        ) : (
          <Select
            value={environment}
            onValueChange={(value) => onEnvironment(value as 'sandbox' | 'production')}
            disabled={disabled}
          >
            <SelectTrigger className="w-full sm:w-40" aria-label={`Ambiente ${title}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sandbox">Sandbox</SelectItem>
              <SelectItem value="production">Produção</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">{children}</div>
    </section>
  )
}
