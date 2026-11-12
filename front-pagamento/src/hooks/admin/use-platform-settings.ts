'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export type SecretStatus = {
  configured: boolean
  source: 'env' | 'database' | 'missing'
  preview: string | null
}

export type PlatformSettingsDto = {
  sale_notification_recipients: string | null
  asaas_enabled: boolean
  pagarme_enabled: boolean
  asaas_environment: 'sandbox' | 'production'
  pagarme_environment: 'sandbox' | 'production'
  asaas_environment_source: SecretStatus['source']
  pagarme_environment_source: SecretStatus['source']
  asaas_api_key: SecretStatus
  asaas_webhook_secret: SecretStatus
  pagarme_secret_key: SecretStatus
  pagarme_webhook_user: SecretStatus
  pagarme_webhook_secret: SecretStatus
  gemini_api_key: SecretStatus
  deepinfra_api_key: SecretStatus
  products_by_price_api_key: SecretStatus
}

export type PlatformSettingsPatch = {
  sale_notification_recipients?: string | null
  asaas_enabled?: boolean
  pagarme_enabled?: boolean
  asaas_environment?: 'sandbox' | 'production'
  pagarme_environment?: 'sandbox' | 'production'
  asaas_api_key?: string
  asaas_webhook_secret?: string
  pagarme_secret_key?: string
  pagarme_webhook_user?: string
  pagarme_webhook_secret?: string
  gemini_api_key?: string
  deepinfra_api_key?: string
  products_by_price_api_key?: string
}

async function fetchPlatformSettings(): Promise<PlatformSettingsDto> {
  const res = await fetch('/api/admin/platform-settings')
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Erro ao carregar configurações')
  }
  return res.json()
}

async function patchPlatformSettings(body: PlatformSettingsPatch): Promise<PlatformSettingsDto> {
  const res = await fetch('/api/admin/platform-settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao salvar')
  }
  return data
}

export function usePlatformSettings() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['admin', 'platform-settings'],
    queryFn: fetchPlatformSettings,
    staleTime: 60_000,
  })

  const mutation = useMutation({
    mutationFn: patchPlatformSettings,
    onSuccess: (dto) => {
      queryClient.setQueryData(['admin', 'platform-settings'], dto)
    },
  })

  return {
    settings: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    save: mutation.mutateAsync,
    isSaving: mutation.isPending,
    saveError: mutation.error,
  }
}
