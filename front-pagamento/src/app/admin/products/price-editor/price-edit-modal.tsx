'use client'

import { useState } from 'react'

import { Loader2, Plus, Trash2 } from 'lucide-react'

import { Field, FieldDescription, FieldLabel } from '@/components/layout/ui/admin-field'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

import { CONTENT } from './content'
import { normalizePriceAccessMetadata, normalizePriceEmailAddonForDb } from './normalize'
import { endsAtToLocalValue, localValueToEndsAt } from './promo-datetime'
import { TextIntInput, TextOptionalPositiveIntInput, TextPercentIntInput } from './text-int-input'
import type { CatalogPriceOption, Price, PricePromoTierDraft } from './types'
import type { UsePricesEditorReturn } from './use-prices-editor'

const TEMP_ID_PREFIX = 'temp-'
function isTempId(id: string) {
  return id.startsWith(TEMP_ID_PREFIX)
}

type PriceModalTab = 'preco' | 'acesso' | 'promos' | 'checkout' | 'emails' | 'addons'

const TABS: { id: PriceModalTab; label: string }[] = [
  { id: 'preco', label: 'Preço' },
  { id: 'acesso', label: 'Acesso' },
  { id: 'promos', label: 'Promoções' },
  { id: 'checkout', label: 'Checkout' },
  { id: 'emails', label: 'Emails' },
  { id: 'addons', label: 'Add-ons' },
]

// ─── Helpers de seção ──────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
      {children}
    </h4>
  )
}

function Divider() {
  return <div className="border-t border-border/50 my-6" />
}

function SummaryRow({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="text-right">
        <span className="text-sm font-semibold tabular-nums">{value}</span>
        {note && <p className="text-[11px] text-muted-foreground mt-0.5">{note}</p>}
      </div>
    </div>
  )
}

// ─── Tab: Preço ────────────────────────────────────────────────────────────

function TabPreco({
  index,
  price,
  editor,
  productId,
}: {
  index: number
  price: Price
  editor: UsePricesEditorReturn
  productId: string
}) {
  const [isRecalculating, setIsRecalculating] = useState(false)
  const [recalcError, setRecalcError] = useState<string | null>(null)

  const handleRecalcStock = async () => {
    if (!price.id || price.id.startsWith(TEMP_ID_PREFIX)) return
    setIsRecalculating(true)
    setRecalcError(null)
    try {
      const res = await fetch(`/api/admin/products/${productId}/prices/${price.id}/recalc-stock`, {
        method: 'POST',
      })
      const json = await res.json()
      if (!res.ok) {
        setRecalcError(json.error ?? 'Erro ao recalcular')
      } else {
        editor.updatePrice(index, { stock_sold: json.stock_sold })
      }
    } catch {
      setRecalcError('Erro de rede')
    } finally {
      setIsRecalculating(false)
    }
  }

  const {
    updatePrice,
    getMetadata,
    prices,
    getAmountInputValue,
    onAmountInputFocus,
    onAmountInputChange,
    onAmountInputBlur,
    getIntMetaInputValue,
    onIntMetaInputFocus,
    onIntMetaInputChange,
    onIntMetaInputBlur,
    setMetadataStringField,
    formatMoney,
    effectiveListAvista,
    effectiveListParcelado,
  } = editor

  const meta = getMetadata(price)
  const listBase = price.amount
  const listAv = effectiveListAvista(price)
  const listPar = effectiveListParcelado(price)
  const cashPct = (meta.cash_discount ?? 0) as number
  const maxInst = Math.max(1, (meta.max_installments ?? 1) as number)
  const pixFinal = cashPct > 0 ? Math.round(listAv * (1 - cashPct / 100)) : listAv
  const showInstallment = maxInst > 1 && listPar > 0
  const tiersAdjust = listBase > 0 && (listAv !== listBase || listPar !== listBase)
  const sameList = listAv === listPar

  return (
    <div className="space-y-6">
      {/* Identificação */}
      <div>
        <SectionTitle>Identificação</SectionTitle>
        <div className="grid grid-cols-12 gap-4 items-start">
          <Field className="col-span-5">
            <FieldLabel htmlFor={`pm-title-${index}`}>Título</FieldLabel>
            <Input
              id={`pm-title-${index}`}
              value={(meta.title as string) ?? ''}
              onChange={(e) => {
                const next = { ...getMetadata(prices[index]), title: e.target.value || undefined }
                updatePrice(index, { metadata: next })
              }}
              placeholder="Ex: Plano mensal, À vista, Anual"
            />
            <FieldDescription>Aparece no checkout e no email de confirmação.</FieldDescription>
          </Field>

          <Field className="col-span-5">
            <FieldLabel htmlFor={`pm-ref-${index}`}>Referência</FieldLabel>
            <Input
              id={`pm-ref-${index}`}
              value={price.ref || ''}
              onChange={(e) => updatePrice(index, { ref: e.target.value })}
              placeholder="Ex: mensal-2024"
              className="font-mono text-sm"
            />
            <FieldDescription>Slug único para URLs e integrações.</FieldDescription>
          </Field>

          <div className="col-span-2 flex flex-col gap-2 pt-6">
            <Switch
              id={`pm-active-${index}`}
              checked={price.active}
              onCheckedChange={(v) => updatePrice(index, { active: v })}
            />
            <Label
              htmlFor={`pm-active-${index}`}
              className="text-xs text-muted-foreground cursor-pointer"
            >
              {price.active ? 'Visível' : 'Oculto'}
            </Label>
          </div>
        </div>
      </div>

      <Divider />

      {/* Valor */}
      <div>
        <SectionTitle>Valor e pagamento</SectionTitle>
        <div className="grid grid-cols-3 gap-4 items-start">
          <Field>
            <FieldLabel htmlFor={`pm-amount-${index}`}>Valor (R$)</FieldLabel>
            <Input
              id={`pm-amount-${index}`}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={getAmountInputValue(index)}
              onFocus={() => onAmountInputFocus(index)}
              onChange={(e) => onAmountInputChange(index, e.target.value)}
              onBlur={() => onAmountInputBlur(index)}
              placeholder="0,00"
              className="font-mono tabular-nums text-base"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor={`pm-cash-${index}`}>Desconto à vista (%)</FieldLabel>
            <Input
              id={`pm-cash-${index}`}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={getIntMetaInputValue(
                'cash_discount',
                index,
                (meta.cash_discount ?? 0) as number
              )}
              onFocus={() =>
                onIntMetaInputFocus('cash_discount', index, (meta.cash_discount ?? 0) as number)
              }
              onChange={(e) => onIntMetaInputChange('cash_discount', index, e.target.value)}
              onBlur={() =>
                onIntMetaInputBlur('cash_discount', index, {
                  min: 0,
                  max: 100,
                  field: 'cash_discount',
                })
              }
              placeholder="0"
            />
            <FieldDescription>Para PIX e boleto.</FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor={`pm-inst-${index}`}>Parcelas máx.</FieldLabel>
            <Input
              id={`pm-inst-${index}`}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={getIntMetaInputValue(
                'max_installments',
                index,
                (meta.max_installments ?? 1) as number
              )}
              onFocus={() =>
                onIntMetaInputFocus(
                  'max_installments',
                  index,
                  (meta.max_installments ?? 1) as number
                )
              }
              onChange={(e) => onIntMetaInputChange('max_installments', index, e.target.value)}
              onBlur={() =>
                onIntMetaInputBlur('max_installments', index, {
                  min: 1,
                  max: 24,
                  field: 'max_installments',
                })
              }
              placeholder="12"
            />
            <FieldDescription>Cartão de crédito. Mín. 1.</FieldDescription>
          </Field>
        </div>

        {listBase > 0 && (
          <div className="mt-4 rounded-lg border border-border/50 bg-muted/20 px-4 py-3">
            <p className="text-xs font-semibold text-foreground mb-2">Resumo no checkout</p>
            <SummaryRow label="Valor base" value={formatMoney(listBase)} />
            {tiersAdjust && (
              <>
                <p className="text-[11px] font-medium text-muted-foreground py-1.5">
                  Após promoções ativas
                </p>
                {sameList ? (
                  <SummaryRow label="Lista (à vista e parcelado)" value={formatMoney(listAv)} />
                ) : (
                  <>
                    <SummaryRow label="Lista à vista" value={formatMoney(listAv)} />
                    <SummaryRow label="Lista parcelado" value={formatMoney(listPar)} />
                  </>
                )}
              </>
            )}
            <SummaryRow
              label="PIX / boleto"
              value={formatMoney(pixFinal)}
              note={cashPct > 0 ? `${cashPct}% de desconto sobre lista à vista` : undefined}
            />
            {showInstallment ? (
              <SummaryRow
                label="Cartão (parcela máx.)"
                value={`${maxInst}x de ${formatMoney(Math.round(listPar / maxInst))}`}
                note="Calculado sobre lista parcelado."
              />
            ) : (
              <SummaryRow label="Cartão" value={formatMoney(listPar)} note="1x sem juros." />
            )}
          </div>
        )}
      </div>

      <Divider />

      {/* Recorrência */}
      <div>
        <SectionTitle>Recorrência</SectionTitle>
        <div className="flex items-center gap-3">
          <Checkbox
            id={`pm-recurring-${index}`}
            checked={price.recurring}
            onCheckedChange={(v) =>
              updatePrice(index, { recurring: v as boolean, interval: v ? 'month' : null })
            }
          />
          <Label htmlFor={`pm-recurring-${index}`} className="text-sm font-medium cursor-pointer">
            Assinatura recorrente
          </Label>
        </div>

        {price.recurring && (
          <div className="mt-4 flex items-end gap-3">
            <Field className="w-24 shrink-0">
              <FieldLabel htmlFor={`pm-interval-count-${index}`}>A cada</FieldLabel>
              <TextIntInput
                id={`pm-interval-count-${index}`}
                value={price.interval_count || 1}
                min={1}
                max={999}
                onCommit={(v) => updatePrice(index, { interval_count: v })}
              />
            </Field>
            <Field className="w-36 shrink-0">
              <FieldLabel htmlFor={`pm-interval-${index}`}>Período</FieldLabel>
              <Select
                value={price.interval || 'month'}
                onValueChange={(v) => updatePrice(index, { interval: v })}
              >
                <SelectTrigger id={`pm-interval-${index}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CONTENT.intervals).map(([k, l]) => (
                    <SelectItem key={k} value={k}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        )}
      </div>

      <Divider />

      {/* Estoque */}
      <div>
        <SectionTitle>Estoque e vagas</SectionTitle>
        <div className="grid grid-cols-3 gap-4 items-start">
          <Field>
            <FieldLabel htmlFor={`pm-stock-cap-${index}`}>Limite de vagas</FieldLabel>
            <TextOptionalPositiveIntInput
              id={`pm-stock-cap-${index}`}
              value={price.stock_cap ?? null}
              onCommit={(v) => updatePrice(index, { stock_cap: v })}
              placeholder="Ilimitado"
            />
            <FieldDescription>Vazio = sem limite.</FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor={`pm-stock-sold-${index}`}>Vendas confirmadas</FieldLabel>
            <div className="flex gap-2 items-center">
              <Input
                id={`pm-stock-sold-${index}`}
                readOnly
                value={String(price.stock_sold ?? 0)}
                className="bg-muted/50 tabular-nums"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRecalcStock}
                disabled={isRecalculating || !price.id || price.id.startsWith(TEMP_ID_PREFIX)}
                className="shrink-0"
              >
                {isRecalculating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Recalcular'}
              </Button>
            </div>
            {recalcError && <p className="text-xs text-destructive mt-1">{recalcError}</p>}
          </Field>

          <Field>
            <FieldLabel htmlFor={`pm-stock-label-${index}`}>Nome no checkout</FieldLabel>
            <Input
              id={`pm-stock-label-${index}`}
              value={(price.metadata?.checkout_stock_label as string) ?? ''}
              onChange={(e) =>
                setMetadataStringField(index, 'checkout_stock_label', e.target.value)
              }
              placeholder="Ex: Vagas, Inscrições"
            />
            <FieldDescription>Rótulo do contador.</FieldDescription>
          </Field>
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Acesso ───────────────────────────────────────────────────────────

function TabAcesso({
  index,
  price,
  editor,
}: {
  index: number
  price: Price
  editor: UsePricesEditorReturn
}) {
  const { updatePrice, getMetadata, prices } = editor
  const meta = getMetadata(price)

  const isLifetime = (() => {
    if (meta.lifetime_access === true) return true
    if (meta.access_months === 999) return true
    return meta.lifetime_access !== false && meta.access_months === undefined
  })()

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <SectionTitle>Duração do acesso</SectionTitle>

        <div
          className={cn(
            'rounded-xl border p-4 flex items-start gap-4 cursor-pointer transition-colors',
            isLifetime ? 'border-primary/40 bg-primary/5' : 'border-border/60 bg-muted/10'
          )}
          onClick={() => {
            const m = getMetadata(prices[index])
            updatePrice(index, {
              metadata: { ...m, lifetime_access: true, access_months: undefined },
            })
          }}
        >
          <div
            className={cn(
              'mt-0.5 h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center',
              isLifetime ? 'border-primary' : 'border-muted-foreground/40'
            )}
          >
            {isLifetime && <div className="h-2 w-2 rounded-full bg-primary" />}
          </div>
          <div>
            <p className="text-sm font-semibold">Acesso vitalício</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              O comprador tem acesso permanente. Para assinaturas, vale enquanto ativa.
            </p>
          </div>
        </div>

        <div
          className={cn(
            'mt-3 rounded-xl border p-4 flex items-start gap-4 cursor-pointer transition-colors',
            !isLifetime ? 'border-primary/40 bg-primary/5' : 'border-border/60 bg-muted/10'
          )}
          onClick={() => {
            const m = getMetadata(prices[index])
            updatePrice(index, {
              metadata: { ...m, lifetime_access: false, access_months: m.access_months ?? 12 },
            })
          }}
        >
          <div
            className={cn(
              'mt-0.5 h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center',
              !isLifetime ? 'border-primary' : 'border-muted-foreground/40'
            )}
          >
            {!isLifetime && <div className="h-2 w-2 rounded-full bg-primary" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Acesso por período</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              O acesso expira após um número de meses.
            </p>
            {!isLifetime && (
              <div className="mt-3 flex items-center gap-2">
                <TextIntInput
                  value={
                    meta.access_months === undefined
                      ? 12
                      : Math.min(998, Math.max(1, Number(meta.access_months) || 12))
                  }
                  min={1}
                  max={998}
                  onCommit={(v) => {
                    const m = getMetadata(prices[index])
                    updatePrice(index, { metadata: { ...m, access_months: v } })
                  }}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">meses</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Promoções ────────────────────────────────────────────────────────

function TabPromos({
  index,
  price,
  editor,
}: {
  index: number
  price: Price
  editor: UsePricesEditorReturn
}) {
  const { addPromoTier, updatePromoTier, removePromoTier } = editor
  const tiers = price.promo_tiers ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <SectionTitle>Faixas de promoção</SectionTitle>
          <p className="text-xs text-muted-foreground -mt-3 mb-4 max-w-prose">
            Cada faixa aplica um desconto extra até uma data ou limite de vendas. A primeira faixa
            válida (pela ordem) é usada no checkout.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => addPromoTier(index)}
          className="shrink-0"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Adicionar faixa
        </Button>
      </div>

      {tiers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhuma faixa. O checkout usa o preço cheio com desconto à vista, se configurado.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Header */}
          <div className="grid grid-cols-[2rem_1fr_1fr_1fr_1fr_1fr_2rem] gap-3 px-3 items-center">
            <span className="text-[11px] font-medium text-muted-foreground">Ord.</span>
            <span className="text-[11px] font-medium text-muted-foreground">Desconto</span>
            <span className="text-[11px] font-medium text-muted-foreground">Válido para</span>
            <span className="text-[11px] font-medium text-muted-foreground">Até (data)</span>
            <span className="text-[11px] font-medium text-muted-foreground">Máx. vendas</span>
            <span className="text-[11px] font-medium text-muted-foreground">Já vendidas</span>
            <span />
          </div>

          {tiers.map((tier, ti) => (
            <div
              key={tier.id ?? ti}
              className="grid grid-cols-[2rem_1fr_1fr_1fr_1fr_1fr_2rem] gap-3 px-3 py-3 items-center rounded-lg border border-border/60 bg-muted/10"
            >
              <TextIntInput
                value={tier.sort_order}
                min={0}
                max={9999}
                onCommit={(v) => updatePromoTier(index, ti, { sort_order: v })}
                className="text-center px-1"
              />

              <div className="flex items-center gap-1">
                <TextPercentIntInput
                  value={tier.discount_percent}
                  min={0}
                  max={100}
                  onCommit={(v) => updatePromoTier(index, ti, { discount_percent: v })}
                />
                <span className="text-xs text-muted-foreground shrink-0">%</span>
              </div>

              <Select
                value={tier.applies_to ?? 'both'}
                onValueChange={(v) =>
                  updatePromoTier(index, ti, { applies_to: v as PricePromoTierDraft['applies_to'] })
                }
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">À vista + parc.</SelectItem>
                  <SelectItem value="avista">Só à vista</SelectItem>
                  <SelectItem value="parcelado">Só parcelado</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="datetime-local"
                value={endsAtToLocalValue(tier.ends_at)}
                onChange={(e) =>
                  updatePromoTier(index, ti, { ends_at: localValueToEndsAt(e.target.value) })
                }
                className="h-9 text-xs font-mono px-2"
              />

              <TextOptionalPositiveIntInput
                value={tier.max_units ?? null}
                onCommit={(v) => updatePromoTier(index, ti, { max_units: v })}
                placeholder="—"
                className="text-center"
              />

              <span className="text-sm tabular-nums text-muted-foreground text-center">
                {tier.units_sold ?? 0}
              </span>

              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                onClick={() => removePromoTier(index, ti)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Tab: Checkout ─────────────────────────────────────────────────────────

function TabCheckout({
  index,
  price,
  editor,
}: {
  index: number
  price: Price
  editor: UsePricesEditorReturn
}) {
  const {
    getMetadata,
    setMetadataStringField,
    getTopics,
    addTopicSection,
    updateTopicSection,
    removeTopicSection,
  } = editor
  const topics = getTopics(price)

  return (
    <div className="space-y-6">
      <div className="max-w-lg">
        <SectionTitle>Mensagem após pagamento</SectionTitle>
        <Field>
          <Textarea
            id={`pm-success-${index}`}
            rows={3}
            value={(getMetadata(price).success_message as string) ?? ''}
            onChange={(e) => setMetadataStringField(index, 'success_message', e.target.value)}
            placeholder="Seu pagamento foi confirmado com sucesso."
            className="resize-y"
          />
          <FieldDescription>
            Exibida na tela de confirmação do checkout. Vazio = mensagem padrão.
          </FieldDescription>
        </Field>
      </div>

      <Divider />

      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <SectionTitle>Tópicos da página de pagamento</SectionTitle>
            <p className="text-xs text-muted-foreground -mt-3">
              Seções com título e itens exibidos no checkout deste preço (ex.: "O que está
              incluso").
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => addTopicSection(index)}
            className="shrink-0"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Adicionar seção
          </Button>
        </div>

        {topics.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 p-6 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma seção configurada.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {topics.map((section, si) => (
              <div
                key={si}
                className="rounded-lg border border-border/60 bg-muted/10 p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <Input
                    value={section.title}
                    onChange={(e) => updateTopicSection(index, si, { title: e.target.value })}
                    placeholder="Título da seção (ex: O que está incluso)"
                    className="text-sm font-medium"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => removeTopicSection(index, si)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea
                  value={section.content.join('\n')}
                  onChange={(e) =>
                    updateTopicSection(index, si, { content: e.target.value.split('\n') })
                  }
                  placeholder={'Item 1\nItem 2\nItem 3'}
                  rows={3}
                  className="text-sm resize-y"
                />
                <FieldDescription>Um item por linha.</FieldDescription>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tab: Extras ───────────────────────────────────────────────────────────

function TabEmails({
  index,
  price,
  editor,
}: {
  index: number
  price: Price
  editor: UsePricesEditorReturn
}) {
  const {
    getEmailAddon,
    setOrderCreatedEmailField,
    setPaymentConfirmedEmailField,
    getPaymentNextSteps,
    setPaymentNextSteps,
  } = editor
  const ea = getEmailAddon(price)
  const nextSteps = getPaymentNextSteps(price)

  return (
    <div className="space-y-8 max-w-xl">
      <div className="space-y-4">
        <SectionTitle>Pedido criado (aguardando pagamento)</SectionTitle>
        <Field>
          <FieldLabel htmlFor={`pm-oc-msg-${index}`}>Mensagem extra</FieldLabel>
          <Textarea
            id={`pm-oc-msg-${index}`}
            rows={3}
            value={ea.order_created?.custom_message ?? ''}
            onChange={(e) => setOrderCreatedEmailField(index, 'custom_message', e.target.value)}
            placeholder="Ex: No plano anual você também tem acesso ao grupo VIP…"
            className="resize-y text-sm"
          />
          <FieldDescription>Somado à mensagem padrão do produto.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor={`pm-oc-inst-${index}`}>Instruções extras</FieldLabel>
          <Textarea
            id={`pm-oc-inst-${index}`}
            rows={3}
            value={ea.order_created?.instructions ?? ''}
            onChange={(e) => setOrderCreatedEmailField(index, 'instructions', e.target.value)}
            placeholder="Ex: prazo do boleto, link de acesso antecipado…"
            className="resize-y text-sm"
          />
        </Field>
      </div>

      <Divider />
      <div className="space-y-4">
        <SectionTitle>Pagamento confirmado</SectionTitle>
        <Field>
          <FieldLabel htmlFor={`pm-pc-msg-${index}`}>Mensagem extra</FieldLabel>
          <Textarea
            id={`pm-pc-msg-${index}`}
            rows={3}
            value={ea.payment_confirmed?.custom_message ?? ''}
            onChange={(e) => setPaymentConfirmedEmailField(index, 'custom_message', e.target.value)}
            placeholder="Ex: Acesse o material exclusivo: https://…"
            className="resize-y text-sm"
          />
          <FieldDescription>Somado à mensagem padrão do produto.</FieldDescription>
        </Field>
        <div className="space-y-2">
          <FieldLabel>Próximos passos extras</FieldLabel>
          <FieldDescription>
            Itens adicionais na lista de próximos passos do email de confirmação.
          </FieldDescription>
          {nextSteps.map((step, si) => (
            <div key={si} className="flex gap-2">
              <Input
                value={step}
                onChange={(e) => {
                  const next = [...nextSteps]
                  next[si] = e.target.value
                  setPaymentNextSteps(index, next)
                }}
                placeholder="Ex: Entre no grupo do Telegram"
                className="text-sm flex-1"
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-9 w-9 shrink-0 text-destructive hover:bg-destructive/10"
                onClick={() =>
                  setPaymentNextSteps(
                    index,
                    nextSteps.filter((_, i) => i !== si)
                  )
                }
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => setPaymentNextSteps(index, [...nextSteps, ''])}
          >
            <Plus className="h-3 w-3 mr-1" /> Adicionar passo
          </Button>
        </div>
      </div>
    </div>
  )
}

function TabAddons({
  index,
  price,
  editor,
  upgradeOptions,
  addonOptions,
}: {
  index: number
  price: Price
  editor: UsePricesEditorReturn
  upgradeOptions: CatalogPriceOption[]
  addonOptions: CatalogPriceOption[]
}) {
  const { updatePrice } = editor
  const persisted = /^[0-9a-f]{8}-/.test(price.id)
  const selectedUp = new Set(price.upgrade_to_price_ids ?? [])
  const selectedAddon = new Set(price.addon_price_ids ?? [])

  const toggleUpgrade = (targetId: string, checked: boolean) => {
    const cur = [...(price.upgrade_to_price_ids ?? [])]
    if (checked) {
      if (!cur.includes(targetId)) cur.push(targetId)
    } else {
      const i = cur.indexOf(targetId)
      if (i >= 0) cur.splice(i, 1)
    }
    updatePrice(index, { upgrade_to_price_ids: cur })
  }

  const toggleAddon = (addonId: string, checked: boolean) => {
    const cur = [...(price.addon_price_ids ?? [])]
    if (checked) {
      if (!cur.includes(addonId)) cur.push(addonId)
    } else {
      const i = cur.indexOf(addonId)
      if (i >= 0) cur.splice(i, 1)
    }
    updatePrice(index, { addon_price_ids: cur })
  }

  if (!persisted) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 p-6 text-center max-w-md">
        <p className="text-sm text-muted-foreground">
          Salve este preço primeiro para configurar upgrade e add-ons.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-xl">
      <div className="space-y-3">
        <SectionTitle>Upgrade (mesmo produto)</SectionTitle>
        <p className="text-xs text-muted-foreground -mt-3">
          Planos de destino quando o cliente troca de plano.
        </p>
        {upgradeOptions.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            Nenhum outro preço disponível neste produto.
          </p>
        ) : (
          <ul className="space-y-2 rounded-lg border border-border/60 p-3">
            {upgradeOptions.map((opt) => (
              <li key={opt.id} className="flex items-start gap-2">
                <Checkbox
                  id={`up-${price.id}-${opt.id}`}
                  checked={selectedUp.has(opt.id)}
                  onCheckedChange={(v) => toggleUpgrade(opt.id, v === true)}
                  className="mt-0.5 shrink-0"
                />
                <Label
                  htmlFor={`up-${price.id}-${opt.id}`}
                  className="text-xs font-normal cursor-pointer leading-snug"
                >
                  {opt.label}
                </Label>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Divider />
      <div className="space-y-3">
        <SectionTitle>Add-ons / upsell</SectionTitle>
        <p className="text-xs text-muted-foreground -mt-3">
          Preços opcionais de qualquer produto ofertados durante a compra.
        </p>
        {addonOptions.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            Nenhum preço disponível no catálogo.
          </p>
        ) : (
          <ul className="space-y-2 rounded-lg border border-border/60 p-3 max-h-64 overflow-y-auto">
            {addonOptions.map((opt) => (
              <li key={opt.id} className="flex items-start gap-2">
                <Checkbox
                  id={`ad-${price.id}-${opt.id}`}
                  checked={selectedAddon.has(opt.id)}
                  onCheckedChange={(v) => toggleAddon(opt.id, v === true)}
                  className="mt-0.5 shrink-0"
                />
                <Label
                  htmlFor={`ad-${price.id}-${opt.id}`}
                  className="text-xs font-normal cursor-pointer leading-snug"
                >
                  {opt.label}
                </Label>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ─── Modal principal ───────────────────────────────────────────────────────

type PriceEditModalProps = {
  open: boolean
  onClose: () => void
  productId: string
  price: Price
  index: number
  editor: UsePricesEditorReturn
  upgradeOptions: CatalogPriceOption[]
  addonOptions: CatalogPriceOption[]
  /** Chamado após save bem-sucedido com o produto atualizado vindo da API */
  onSaved: (updatedPrice: Price) => void
}

export function PriceEditModal({
  open,
  onClose,
  productId,
  price,
  index,
  editor,
  upgradeOptions,
  addonOptions,
  onSaved,
}: PriceEditModalProps) {
  const [activeTab, setActiveTab] = useState<PriceModalTab>('preco')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const { formatMoney, getMetadata } = editor
  const meta = getMetadata(price)
  const title = (meta.title as string | undefined)?.trim() || `Preço ${index + 1}`

  const handleSave = async () => {
    setSaveError(null)
    setIsSaving(true)
    try {
      const normalizedMeta = normalizePriceAccessMetadata(price.metadata)
      const normalizedEmailAddon = normalizePriceEmailAddonForDb(price.email_addon)
      const payload = {
        ref: price.ref,
        amount: price.amount,
        currency: price.currency,
        recurring: price.recurring,
        interval: price.interval,
        interval_count: price.interval_count,
        active: price.active,
        metadata: normalizedMeta,
        email_addon: normalizedEmailAddon,
        stock_cap: price.stock_cap ?? null,
        promo_tiers: price.promo_tiers ?? [],
        upgrade_to_price_ids: price.upgrade_to_price_ids ?? [],
        addon_price_ids: price.addon_price_ids ?? [],
      }

      let updatedProduct: { product: { prices?: Price[] } }

      if (isTempId(price.id)) {
        // Preço novo — POST
        const res = await fetch(`/api/admin/products/${productId}/prices`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Erro ao criar preço')
        }
        updatedProduct = await res.json()
      } else {
        // Preço existente — PUT
        const res = await fetch(`/api/admin/products/${productId}/prices/${price.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Erro ao salvar preço')
        }
        updatedProduct = await res.json()
      }

      // Encontra o preço salvo na resposta do produto e notifica o pai
      const savedPrices = updatedProduct.product?.prices ?? []
      // Para preço novo: último da lista; para update: o que tem o mesmo id ou o mesmo ref
      const savedPrice = isTempId(price.id)
        ? savedPrices[savedPrices.length - 1]
        : savedPrices.find((p) => p.id === price.id)

      if (savedPrice) onSaved(savedPrice as unknown as Price)
      onClose()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erro ao salvar preço')
    } finally {
      setIsSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex">
      {/* Overlay — não fecha ao clicar para não perder edições */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative z-10 flex flex-col w-full h-full bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <h2 className="text-base font-semibold truncate">{title}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                {price.ref && (
                  <span className="text-xs text-muted-foreground font-mono">{price.ref}</span>
                )}
                {price.amount > 0 && (
                  <span className="text-xs font-semibold text-primary">
                    {formatMoney(price.amount)}
                  </span>
                )}
                {!price.active && (
                  <Badge variant="secondary" className="text-[10px]">
                    Inativo
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {saveError && (
              <span className="text-xs text-destructive max-w-xs truncate">{saveError}</span>
            )}
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Salvar preço
            </Button>
          </div>
        </div>

        {/* Body: sidebar + conteúdo */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <nav className="hidden sm:flex w-44 shrink-0 flex-col gap-1 border-r border-border bg-muted/20 p-3">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'rounded-md px-3 py-2 text-left text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'bg-background text-foreground shadow-sm border border-border/60'
                    : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
                )}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Mobile tab bar */}
          <div className="sm:hidden absolute top-[61px] left-0 right-0 flex gap-1 overflow-x-auto border-b border-border bg-background px-3 py-2 scrollbar-none z-10">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'shrink-0 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
                  activeTab === tab.id
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Conteúdo com scroll */}
          <ScrollArea className="flex-1 min-w-0">
            <div className="p-6 sm:p-8 max-w-4xl">
              {activeTab === 'preco' && (
                <TabPreco index={index} price={price} editor={editor} productId={productId} />
              )}
              {activeTab === 'acesso' && <TabAcesso index={index} price={price} editor={editor} />}
              {activeTab === 'promos' && <TabPromos index={index} price={price} editor={editor} />}
              {activeTab === 'checkout' && (
                <TabCheckout index={index} price={price} editor={editor} />
              )}
              {activeTab === 'emails' && <TabEmails index={index} price={price} editor={editor} />}
              {activeTab === 'addons' && (
                <TabAddons
                  index={index}
                  price={price}
                  editor={editor}
                  upgradeOptions={upgradeOptions}
                  addonOptions={addonOptions}
                />
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
