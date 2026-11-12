'use client'

import { useEffect, useState } from 'react'

import { KeyRound, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { SecretField } from '@/components/admin/secret-field'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { usePlatformSettings } from '@/hooks/admin/use-platform-settings'

export function IntegrationKeysCard() {
  const { settings, isLoading, save, isSaving } = usePlatformSettings()
  const [gemini, setGemini] = useState('')
  const [deepinfra, setDeepinfra] = useState('')
  const [productsKey, setProductsKey] = useState('')

  useEffect(() => {
    if (!settings) return
    setGemini('')
    setDeepinfra('')
    setProductsKey('')
  }, [settings])

  const handleSave = async () => {
    try {
      await save({
        gemini_api_key: gemini,
        deepinfra_api_key: deepinfra,
        products_by_price_api_key: productsKey,
      })
      toast.success('Chaves atualizadas.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar')
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <KeyRound className="h-5 w-5 shrink-0" />
          Chaves de integração
        </CardTitle>
        <CardDescription className="max-w-2xl">
          Gemini, DeepInfra e a chave da consulta de produto por preço. O token do webhook do Asaas
          e a senha do webhook do Pagar.me ficam em Gateways. O segredo de aviso de cada produto
          fica no próprio produto. Em branco não apaga o que já está salvo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading || !settings ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <SecretField
                id="gemini-api-key"
                label="Gemini"
                hint="Geração e edição de produto com IA."
                envName="GEMINI_API_KEY"
                status={settings.gemini_api_key}
                value={gemini}
                onChange={setGemini}
                disabled={isSaving}
              />
              <SecretField
                id="deepinfra-api-key"
                label="DeepInfra"
                hint="Reservada para o cliente de IA. Sem uso no checkout."
                envName="DEEPINFRA_API_KEY"
                status={settings.deepinfra_api_key}
                value={deepinfra}
                onChange={setDeepinfra}
                disabled={isSaving}
              />
              <SecretField
                id="products-by-price-api-key"
                label="API de produto por preço"
                hint="Se preenchida, a consulta pública exige x-api-key."
                envName="PRODUCTS_BY_PRICE_API_KEY"
                status={settings.products_by_price_api_key}
                value={productsKey}
                onChange={setProductsKey}
                disabled={isSaving}
              />
            </div>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="w-full sm:w-auto"
            >
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar chaves
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
