'use client'

import { useState } from 'react'

import { Field, FieldDescription, FieldLabel } from '@/components/layout/ui/admin-field'
import { Dialog } from '@/components/layout/ui/dialog'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import type { PriceTypeHint } from '@/lib/ai/product-generation-prompt'
import type { Product } from '@/lib/payments/product'

const CONTENT = {
  title: 'Editar com IA',
  description:
    'Informe um texto curto, cole texto livre (página, PDF, e-mail) ou uma URL. A IA revisará o produto atual com base no conteúdo e na instrução.',
  tabs: {
    digitar: 'Digitar',
    url: 'Por URL',
    texto: 'Texto livre',
  },
  fields: {
    content: 'Conteúdo',
    contentPlaceholder: 'Cole aqui o texto com as informações para atualizar o produto...',
    freeText: 'Cole o texto aqui',
    freeTextPlaceholder:
      'Cole qualquer texto: página copiada, PDF, email, descrição atualizada... A IA usará isso para revisar o produto.',
    url: 'URL da página',
    urlPlaceholder: 'https://exemplo.com/pagina-atualizada',
    priceType: 'Tipo de cobrança',
    priceTypeSubscription: 'Assinatura',
    priceTypeOneTime: 'Preço único',
    priceTypeBoth: 'Ambos',
    instruction: 'O que considerar na alteração',
    instructionPlaceholder:
      'Ex: atualize a descrição e a política com base no conteúdo. Se vazio: "Revise tudo com base no conteúdo informado."',
  },
  buttons: {
    cancel: 'Cancelar',
    apply: 'Revisar com IA',
    applying: 'Revisando...',
  },
  errors: {
    contentOrUrlOrText:
      'Informe o conteúdo na aba Digitar, cole texto livre na aba correspondente ou informe a URL.',
    urlInvalid: 'URL inválida. Use https:// ou http://',
    freeTextRequired: 'Cole o texto (mínimo 50 caracteres)',
  },
} as const

export interface EditWithAIDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product
  onApply: (updatedProduct: Product) => void
}

export function EditWithAIDialog({ open, onOpenChange, product, onApply }: EditWithAIDialogProps) {
  const [inputMode, setInputMode] = useState<'digitar' | 'url' | 'texto'>('digitar')
  const [content, setContent] = useState('')
  const [freeText, setFreeText] = useState('')
  const [url, setUrl] = useState('')
  const [priceType, setPriceType] = useState<PriceTypeHint>('both')
  const [instruction, setInstruction] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setError(null)
    const trimmedContent = content.trim()
    const trimmedFree = freeText.trim()
    const trimmedUrl = url.trim()

    if (inputMode === 'texto') {
      if (trimmedFree.length < 50) {
        setError(CONTENT.errors.freeTextRequired)
        return
      }
    } else if (inputMode === 'url') {
      if (!trimmedUrl) {
        setError(CONTENT.errors.contentOrUrlOrText)
        return
      }
      if (!/^https?:\/\/.+/i.test(trimmedUrl)) {
        setError(CONTENT.errors.urlInvalid)
        return
      }
    } else if (!trimmedContent) {
      setError(CONTENT.errors.contentOrUrlOrText)
      return
    }

    const body: Record<string, unknown> = {
      instruction: instruction.trim() || undefined,
      priceType,
    }
    if (inputMode === 'url') {
      body.url = trimmedUrl
    } else if (inputMode === 'texto') {
      body.content = trimmedFree
    } else {
      body.content = trimmedContent
    }

    setIsLoading(true)
    try {
      const res = await fetch(`/api/admin/products/${product.id}/edit-with-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao revisar com IA')
      }
      onApply(data.product)
      setContent('')
      setFreeText('')
      setUrl('')
      setInstruction('')
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao revisar com IA')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={CONTENT.title}
      description={CONTENT.description}
      size="2xl"
      showIcon={false}
      cancelText={CONTENT.buttons.cancel}
      confirmText={isLoading ? CONTENT.buttons.applying : CONTENT.buttons.apply}
      onCancel={() => onOpenChange(false)}
      onConfirm={handleSubmit}
      loading={isLoading}
      disableConfirm={isLoading}
    >
      <div className="space-y-4 min-w-0">
        <Tabs
          value={inputMode}
          onValueChange={(v) => setInputMode(v as 'digitar' | 'url' | 'texto')}
          className="w-full min-w-0"
        >
          <TabsList className="grid h-auto w-full min-w-0 grid-cols-1 gap-1 sm:max-w-[420px] sm:grid-cols-3">
            <TabsTrigger
              value="digitar"
              disabled={isLoading}
              className="min-w-0 shrink text-xs sm:text-sm"
            >
              {CONTENT.tabs.digitar}
            </TabsTrigger>
            <TabsTrigger
              value="url"
              disabled={isLoading}
              className="min-w-0 shrink text-xs sm:text-sm"
            >
              {CONTENT.tabs.url}
            </TabsTrigger>
            <TabsTrigger
              value="texto"
              disabled={isLoading}
              className="min-w-0 shrink text-xs sm:text-sm"
            >
              {CONTENT.tabs.texto}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="digitar" className="mt-4 space-y-4">
            <Field>
              <FieldLabel htmlFor="edit-ai-content">{CONTENT.fields.content}</FieldLabel>
              <Textarea
                id="edit-ai-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={CONTENT.fields.contentPlaceholder}
                rows={5}
                disabled={isLoading}
                className="min-w-0 resize-y"
              />
            </Field>
            <Field>
              <FieldLabel>{CONTENT.fields.priceType}</FieldLabel>
              <RadioGroup
                value={priceType}
                onValueChange={(value) => setPriceType(value as PriceTypeHint)}
                className="flex flex-wrap gap-4 pt-1"
                disabled={isLoading}
              >
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <RadioGroupItem value="subscription" id="edit-ai-digitar-price-sub" />
                  <span>{CONTENT.fields.priceTypeSubscription}</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <RadioGroupItem value="one_time" id="edit-ai-digitar-price-one" />
                  <span>{CONTENT.fields.priceTypeOneTime}</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <RadioGroupItem value="both" id="edit-ai-digitar-price-both" />
                  <span>{CONTENT.fields.priceTypeBoth}</span>
                </label>
              </RadioGroup>
            </Field>
          </TabsContent>

          <TabsContent value="url" className="mt-4 space-y-4">
            <Field>
              <FieldLabel htmlFor="edit-ai-url">{CONTENT.fields.url}</FieldLabel>
              <Input
                id="edit-ai-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={CONTENT.fields.urlPlaceholder}
                disabled={isLoading}
                className="min-w-0"
              />
              <FieldDescription>
                Conteúdo da página será obtido via Jina Reader (r.jina.ai)
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel>{CONTENT.fields.priceType}</FieldLabel>
              <RadioGroup
                value={priceType}
                onValueChange={(value) => setPriceType(value as PriceTypeHint)}
                className="flex flex-wrap gap-4 pt-1"
                disabled={isLoading}
              >
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <RadioGroupItem value="subscription" id="edit-ai-url-price-sub" />
                  <span>{CONTENT.fields.priceTypeSubscription}</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <RadioGroupItem value="one_time" id="edit-ai-url-price-one" />
                  <span>{CONTENT.fields.priceTypeOneTime}</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <RadioGroupItem value="both" id="edit-ai-url-price-both" />
                  <span>{CONTENT.fields.priceTypeBoth}</span>
                </label>
              </RadioGroup>
            </Field>
          </TabsContent>

          <TabsContent value="texto" className="mt-4 space-y-4">
            <Field>
              <FieldLabel htmlFor="edit-ai-free-text">{CONTENT.fields.freeText}</FieldLabel>
              <Textarea
                id="edit-ai-free-text"
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder={CONTENT.fields.freeTextPlaceholder}
                rows={8}
                disabled={isLoading}
                className="min-w-0 resize-y"
              />
              <FieldDescription>
                Cole qualquer texto com informações para revisar o produto. Mínimo 50 caracteres.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel>{CONTENT.fields.priceType}</FieldLabel>
              <RadioGroup
                value={priceType}
                onValueChange={(value) => setPriceType(value as PriceTypeHint)}
                className="flex flex-wrap gap-4 pt-1"
                disabled={isLoading}
              >
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <RadioGroupItem value="subscription" id="edit-ai-texto-price-sub" />
                  <span>{CONTENT.fields.priceTypeSubscription}</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <RadioGroupItem value="one_time" id="edit-ai-texto-price-one" />
                  <span>{CONTENT.fields.priceTypeOneTime}</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <RadioGroupItem value="both" id="edit-ai-texto-price-both" />
                  <span>{CONTENT.fields.priceTypeBoth}</span>
                </label>
              </RadioGroup>
            </Field>
          </TabsContent>
        </Tabs>

        <Field>
          <FieldLabel htmlFor="edit-ai-instruction">{CONTENT.fields.instruction}</FieldLabel>
          <Textarea
            id="edit-ai-instruction"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder={CONTENT.fields.instructionPlaceholder}
            rows={2}
            disabled={isLoading}
            className="min-w-0 resize-y"
          />
        </Field>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
            <p className="text-sm text-destructive break-words">{error}</p>
          </div>
        )}
      </div>
    </Dialog>
  )
}
