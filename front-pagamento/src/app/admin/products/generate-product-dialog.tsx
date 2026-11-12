'use client'

import { useState } from 'react'

import { Field, FieldDescription, FieldLabel } from '@/components/layout/ui/admin-field'
import { Dialog } from '@/components/layout/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import type { GeneratedProduct, PriceTypeHint } from '@/lib/ai/product-generation-prompt'

const CONTENT = {
  title: 'Gerar produto com IA',
  description:
    'Preencha os campos ou informe uma URL. A IA (Gemini 3 Flash) gerará o produto completo com preços e política de reembolso.',
  tabs: {
    digitar: 'Digitar',
    url: 'Por URL',
    texto: 'Texto livre',
  },
  fields: {
    url: 'URL da página',
    urlPlaceholder: 'https://exemplo.com/comunidade',
    freeText: 'Cole o texto aqui',
    freeTextPlaceholder:
      'Cole qualquer texto: página copiada, PDF, email, descrição de produto... A IA extrairá nome, preços e política.',
    name: 'Nome do produto *',
    namePlaceholder: 'Ex: Curso de React Avançado',
    description: 'Descrição breve',
    descriptionPlaceholder: 'Descreva o produto em poucas linhas...',
    priceInfo: 'Preço / valor *',
    pricePlaceholder: 'Ex: R$ 197 à vista ou 12x de R$ 19,70. Assinatura mensal R$ 49/mês.',
    priceType: 'Tipo de cobrança',
    priceTypeSubscription: 'Assinatura',
    priceTypeOneTime: 'Preço único',
    priceTypeBoth: 'Ambos',
    objective: 'Objetivo do produto',
    objectivePlaceholder: 'Ex: Ensinar React para desenvolvedores que já dominam o básico',
    policyInfo: 'Informações sobre política',
    policyPlaceholder:
      'Ex: 7 dias de garantia para reembolso. Após o 2º encontro ao vivo não há reembolso. Contato: contato@empresa.com',
  },
  buttons: {
    cancel: 'Cancelar',
    generate: 'Gerar produto',
    generating: 'Gerando...',
    register: 'Cadastrar produto',
    registering: 'Cadastrando...',
    regenerate: 'Gerar novamente',
  },
  errors: {
    required: 'Campo obrigatório',
    urlRequired: 'Informe a URL da página',
    urlInvalid: 'URL inválida. Use https:// ou http://',
    freeTextRequired: 'Cole o texto (mínimo 50 caracteres)',
    generateFailed: 'Erro ao gerar. Verifique a chave do Gemini em Configurações.',
    registerFailed: 'Erro ao cadastrar',
  },
  success: {
    generated: 'Produto gerado! Revise e clique em Cadastrar.',
  },
} as const

export interface GenerateProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRegistered?: () => void
}

export function GenerateProductDialog({
  open,
  onOpenChange,
  onRegistered,
}: GenerateProductDialogProps) {
  const [inputMode, setInputMode] = useState<'digitar' | 'url' | 'texto'>('digitar')
  const [url, setUrl] = useState('')
  const [freeText, setFreeText] = useState('')
  const [formData, setFormData] = useState<{
    name: string
    description: string
    priceInfo: string
    priceType: PriceTypeHint
    objective: string
    policyInfo: string
  }>({
    name: '',
    description: '',
    priceInfo: '',
    priceType: 'both',
    objective: '',
    policyInfo: '',
  })
  const [generated, setGenerated] = useState<GeneratedProduct | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validate = () => {
    if (inputMode === 'url') {
      const u = url.trim()
      if (!u) {
        setError(CONTENT.errors.urlRequired)
        return false
      }
      if (!/^https?:\/\/.+/i.test(u)) {
        setError(CONTENT.errors.urlInvalid)
        return false
      }
      setError(null)
      return true
    }
    if (inputMode === 'texto') {
      const t = freeText.trim()
      if (t.length < 50) {
        setError(CONTENT.errors.freeTextRequired)
        return false
      }
      setError(null)
      return true
    }
    if (!formData.name.trim()) {
      setError(CONTENT.errors.required + ' (nome)')
      return false
    }
    if (!formData.priceInfo.trim()) {
      setError(CONTENT.errors.required + ' (preço)')
      return false
    }
    setError(null)
    return true
  }

  const handleGenerate = async () => {
    if (!validate()) return
    setIsGenerating(true)
    setError(null)
    try {
      const payload =
        inputMode === 'url'
          ? { url: url.trim(), priceType: formData.priceType }
          : inputMode === 'texto'
            ? { freeText: freeText.trim(), priceType: formData.priceType }
            : formData
      const res = await fetch('/api/admin/products/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || CONTENT.errors.generateFailed)
      }
      setGenerated(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : CONTENT.errors.generateFailed)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRegister = async () => {
    if (!generated) return
    setIsRegistering(true)
    setError(null)
    try {
      const payload = {
        ...generated.product,
        prices: generated.prices,
      }
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || CONTENT.errors.registerFailed)
      }
      setGenerated(null)
      setFormData({
        name: '',
        description: '',
        priceInfo: '',
        priceType: 'both',
        objective: '',
        policyInfo: '',
      })
      setUrl('')
      setFreeText('')
      onRegistered?.()
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : CONTENT.errors.registerFailed)
    } finally {
      setIsRegistering(false)
    }
  }

  const handleRegenerate = () => {
    setGenerated(null)
    setError(null)
  }

  const disableForm = !!generated

  const handleCancel = () => {
    onOpenChange(false)
  }

  const formatPrice = (cents: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)

  const loading = isGenerating || isRegistering

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={CONTENT.title}
      description={CONTENT.description}
      size="2xl"
      height={800}
      showIcon={false}
      cancelText={CONTENT.buttons.cancel}
      confirmText={generated ? CONTENT.buttons.register : CONTENT.buttons.generate}
      onCancel={handleCancel}
      onConfirm={generated ? handleRegister : handleGenerate}
      loading={loading}
      disableConfirm={loading}
      footerContent={
        generated ? (
          <Button
            variant="outline"
            onClick={handleRegenerate}
            disabled={loading}
            className="sm:mr-auto"
          >
            {CONTENT.buttons.regenerate}
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-6 min-w-0">
        <Tabs
          value={inputMode}
          onValueChange={(v) => setInputMode(v as 'digitar' | 'url' | 'texto')}
          className="w-full"
        >
          <TabsList className="w-full max-w-[420px] grid grid-cols-3">
            <TabsTrigger value="digitar" disabled={disableForm}>
              {CONTENT.tabs.digitar}
            </TabsTrigger>
            <TabsTrigger value="url" disabled={disableForm}>
              {CONTENT.tabs.url}
            </TabsTrigger>
            <TabsTrigger value="texto" disabled={disableForm}>
              {CONTENT.tabs.texto}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="mt-4 space-y-4">
            <Field>
              <FieldLabel htmlFor="gen-url">{CONTENT.fields.url}</FieldLabel>
              <Input
                id="gen-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={CONTENT.fields.urlPlaceholder}
                disabled={disableForm}
              />
              <FieldDescription>
                Conteúdo da página será obtido via Jina Reader (r.jina.ai), sem API key
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel>{CONTENT.fields.priceType}</FieldLabel>
              <RadioGroup
                value={formData.priceType}
                onValueChange={(value) =>
                  setFormData({ ...formData, priceType: value as PriceTypeHint })
                }
                className="flex flex-wrap gap-4 pt-1"
                disabled={disableForm}
              >
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <RadioGroupItem value="subscription" id="gen-url-price-sub" />
                  <span>{CONTENT.fields.priceTypeSubscription}</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <RadioGroupItem value="one_time" id="gen-url-price-one" />
                  <span>{CONTENT.fields.priceTypeOneTime}</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <RadioGroupItem value="both" id="gen-url-price-both" />
                  <span>{CONTENT.fields.priceTypeBoth}</span>
                </label>
              </RadioGroup>
            </Field>
          </TabsContent>

          <TabsContent value="texto" className="mt-4 space-y-4">
            <Field>
              <FieldLabel htmlFor="gen-free-text">{CONTENT.fields.freeText}</FieldLabel>
              <Textarea
                id="gen-free-text"
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder={CONTENT.fields.freeTextPlaceholder}
                rows={8}
                disabled={disableForm}
                className="min-w-0 resize-y"
              />
              <FieldDescription>
                Cole qualquer texto com informações do produto. Mínimo 50 caracteres.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel>{CONTENT.fields.priceType}</FieldLabel>
              <RadioGroup
                value={formData.priceType}
                onValueChange={(value) =>
                  setFormData({ ...formData, priceType: value as PriceTypeHint })
                }
                className="flex flex-wrap gap-4 pt-1"
                disabled={disableForm}
              >
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <RadioGroupItem value="subscription" id="gen-texto-price-sub" />
                  <span>{CONTENT.fields.priceTypeSubscription}</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <RadioGroupItem value="one_time" id="gen-texto-price-one" />
                  <span>{CONTENT.fields.priceTypeOneTime}</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <RadioGroupItem value="both" id="gen-texto-price-both" />
                  <span>{CONTENT.fields.priceTypeBoth}</span>
                </label>
              </RadioGroup>
            </Field>
          </TabsContent>

          <TabsContent value="digitar" className="mt-4 space-y-4">
            <Field>
              <FieldLabel htmlFor="gen-name">{CONTENT.fields.name}</FieldLabel>
              <Input
                id="gen-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={CONTENT.fields.namePlaceholder}
                disabled={disableForm}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="gen-desc">{CONTENT.fields.description}</FieldLabel>
              <Textarea
                id="gen-desc"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={CONTENT.fields.descriptionPlaceholder}
                rows={2}
                disabled={disableForm}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="gen-price">{CONTENT.fields.priceInfo}</FieldLabel>
              <Input
                id="gen-price"
                value={formData.priceInfo}
                onChange={(e) => setFormData({ ...formData, priceInfo: e.target.value })}
                placeholder={CONTENT.fields.pricePlaceholder}
                disabled={disableForm}
              />
            </Field>

            <Field>
              <FieldLabel>{CONTENT.fields.priceType}</FieldLabel>
              <RadioGroup
                value={formData.priceType}
                onValueChange={(value) =>
                  setFormData({ ...formData, priceType: value as PriceTypeHint })
                }
                className="flex flex-wrap gap-4 pt-1"
                disabled={disableForm}
              >
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <RadioGroupItem value="subscription" id="gen-price-subscription" />
                  <span>{CONTENT.fields.priceTypeSubscription}</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <RadioGroupItem value="one_time" id="gen-price-one-time" />
                  <span>{CONTENT.fields.priceTypeOneTime}</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <RadioGroupItem value="both" id="gen-price-both" />
                  <span>{CONTENT.fields.priceTypeBoth}</span>
                </label>
              </RadioGroup>
              <FieldDescription>
                Define se a IA deve gerar assinatura, pagamento único ou os dois
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="gen-objective">{CONTENT.fields.objective}</FieldLabel>
              <Input
                id="gen-objective"
                value={formData.objective}
                onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                placeholder={CONTENT.fields.objectivePlaceholder}
                disabled={disableForm}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="gen-policy">{CONTENT.fields.policyInfo}</FieldLabel>
              <Textarea
                id="gen-policy"
                value={formData.policyInfo}
                onChange={(e) => setFormData({ ...formData, policyInfo: e.target.value })}
                placeholder={CONTENT.fields.policyPlaceholder}
                rows={3}
                disabled={disableForm}
              />
              <FieldDescription>
                Prazos de reembolso, garantia, contato para cancelamento
              </FieldDescription>
            </Field>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {generated && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3 min-w-0">
            <p className="text-sm font-medium text-success">{CONTENT.success.generated}</p>
            <div className="text-sm space-y-1 break-words">
              <p>
                <strong>Produto:</strong> {generated.product.name} ({generated.product.ref})
              </p>
              <p>
                <strong>Preços:</strong>{' '}
                {generated.prices.map((p) => formatPrice(p.amount)).join(', ')}
              </p>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  )
}
