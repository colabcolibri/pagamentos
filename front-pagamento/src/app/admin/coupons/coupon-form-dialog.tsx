'use client'

import { useEffect, useMemo, useState } from 'react'

import {
  type CouponPublicMessageBand,
  type DiscountCouponRow,
  buildCouponPublicLines,
  indexOfActivePublicMessageBand,
  resolveActivePublicMessageBand,
} from '@quitou/core/pricing'
import { Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

import { Dialog } from '@/components/layout/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { AdminDiscountCoupon, CouponPayload } from '@/hooks/admin/use-coupons'
import { useCouponMutations } from '@/hooks/admin/use-coupons'
import { useProducts } from '@/hooks/admin/use-products'
import type { Price, Product } from '@/lib/payments/product'
import { cn } from '@/lib/utils'

function findProductIdForPrice(priceId: string, products: Product[]): string | null {
  for (const p of products) {
    if (p.prices?.some((pr) => pr.id === priceId)) return p.id
  }
  return null
}

function findPriceById(priceId: string, products: Product[]): Price | null {
  for (const p of products) {
    const pr = p.prices?.find((x) => x.id === priceId)
    if (pr) return pr
  }
  return null
}

const CONTENT = {
  createTitle: 'Novo cupom',
  editTitle: 'Editar cupom',
  save: 'Salvar',
  create: 'Criar cupom',
  cancel: 'Cancelar',
  fields: {
    code: 'Código do cupom',
    codeHint: 'Será salvo em maiúsculas (como no checkout).',
    discountType: 'Tipo de desconto',
    percent: 'Percentual (%)',
    fixedCents: 'Valor fixo (centavos)',
    fixedHint: 'Ex.: 1000 = R$ 10,00',
    appliesTo: 'Válido para',
    products: 'Produtos (opcional)',
    productsHint:
      'Inclua produtos um a um. Vazio = qualquer produto (respeitando a lista de preços abaixo, se houver).',
    addProductPlaceholder: 'Adicionar produto…',
    selectedProductsLabel: 'Produtos neste cupom',
    allProductsAdded: 'Todos os produtos ativos já foram adicionados.',
    clearScope: 'Limpar produtos e preços',
    prices: 'Preços (opcional)',
    pricesHint:
      'Inclua um ou mais preços permitidos no checkout. Com produtos acima, só aparecem preços desses produtos. Vazio = qualquer preço compatível com o escopo de produto.',
    addPricePlaceholder: 'Adicionar preço…',
    selectedPricesLabel: 'Preços neste cupom',
    allPricesAdded: 'Não há mais preços para adicionar neste escopo.',
    priceNotInProductScope: 'Este preço não pertence aos produtos selecionados.',
    none: 'Todos / não restringir',
    maxTotal: 'Limite total de usos',
    maxUser: 'Limite por cliente',
    maxHint: 'Vazio = sem limite',
    starts: 'Início (opcional)',
    ends: 'Fim (opcional)',
    active: 'Cupom ativo',
    description: 'Descrição (interna)',
    descriptionHint: 'Só para organização no admin; não aparece no checkout neste momento.',
    sections: {
      status: 'Situação',
      identification: 'Identificação',
      identificationSub: 'Código exibido no checkout e notas só para a equipe.',
      discount: 'Desconto',
      discountSub: 'Como o valor é aplicado e em quais formas de pagamento.',
      scope: 'Escopo do cupom',
      scopeSub:
        'Produtos e preços são camadas independentes: ambos vazios = escopo global; preenchidos = o checkout precisa obedecer às duas listas.',
      limits: 'Limites e vigência',
      limitsSub: 'Controle de uso e janela de tempo em que o cupom pode ser aplicado.',
      publicCopy: 'Textos opcionais no checkout',
      publicCopySub:
        'Frases montadas como: texto fixo + número ou data + texto fixo. Só terão efeito quando o checkout usar esses campos.',
    },
    publicRemaining: 'Mostrar quantos usos ainda restam',
    publicRemainingHint:
      'O número é calculado: limite total menos resgates já feitos. Texto antes e depois são opcionais.',
    beforeNumber: 'Texto antes do número',
    afterNumber: 'Texto depois do número',
    publicValidUntil: 'Mostrar validade (data de fim)',
    publicValidUntilHint:
      'Usa a data de fim configurada abaixo. Texto antes e depois são opcionais.',
    beforeDate: 'Texto antes da data',
    afterDate: 'Texto depois da data',
    bandsTitle: 'Faixas por quantidade de usos restantes (opcional)',
    bandsHint:
      'Enquanto o número de usos ainda disponíveis (limite total menos já usados) estiver dentro do intervalo da faixa, o que você configurar nela substitui o padrão do cupom (só o que preencher). Por faixa você pode manter texto antes/depois do número ou ocultar o número e usar só uma frase. Ordem: a primeira faixa que “cobre” essa quantidade vence. Máximo vazio = sem limite superior. Só se aplica com limite total de usos.',
    bandMin: 'Mínimo de usos restantes (inclusive)',
    bandMax: 'Máximo de usos restantes (opcional, inclusive)',
    bandMaxHint: 'Vazio = qualquer quantidade acima ou igual ao mínimo.',
    bandPhraseRemainingBefore: 'Texto antes do número de usos restantes',
    bandPhraseRemainingAfter: 'Texto depois do número de usos restantes',
    bandHideNumber: 'Ocultar número nesta faixa',
    bandHideNumberHint:
      'Somente nesta faixa: o cliente vê só a frase abaixo, sem quantidade. Fora da faixa vale o padrão do cupom (com número).',
    bandPhraseMessageOnly: 'Frase sem número (nesta faixa)',
    simulateRemainingLabel: 'Simular usos restantes (só visual)',
    simulateRemainingHint:
      'Digite quantos usos ainda restariam para destacar qual faixa vale. Não é salvo nem afeta o checkout real.',
    addBand: 'Adicionar faixa',
    removeBand: 'Remover',
    activeBandHintNone:
      'Com a prévia de 12 usos já resgatados, nenhuma faixa cobre os usos restantes: usam-se os textos padrão.',
    activeBandHintSome:
      'Com a prévia de 12 usos já resgatados, há faixa ativa: textos preenchidos nela têm prioridade sobre o padrão.',
    activeBandHintNoCap:
      'Sem limite total de usos, faixas por quantidade não se aplicam; só valem os textos padrão.',
    activeBandHintEmpty: 'Nenhuma faixa cadastrada.',
  },
  types: {
    percent: 'Percentual',
    fixed_cents: 'Valor fixo (centavos)',
  },
  applies: {
    avista: 'À vista',
    parcelado: 'Parcelado',
    both: 'À vista e parcelado',
  },
} as const

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromDatetimeLocal(s: string): string | null {
  if (!s.trim()) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

/** Chave estável para listas React; fallback quando `crypto.randomUUID` não existe (ex.: HTTP). */
function newPublicBandRowId(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID()
  }
  return `b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`
}

type PublicBandRow = {
  id: string
  remainingMinStr: string
  remainingMaxStr: string
  remaining_hide_number: boolean
  remaining_prefix: string
  remaining_suffix: string
  remaining_message_only: string
}

function emptyBandRow(): PublicBandRow {
  return {
    id: newPublicBandRowId(),
    remainingMinStr: '',
    remainingMaxStr: '',
    remaining_hide_number: false,
    remaining_prefix: '',
    remaining_suffix: '',
    remaining_message_only: '',
  }
}

function parseBandMin(s: string): number | null {
  const t = s.trim()
  if (!t) return null
  const n = parseInt(t, 10)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

function parseBandMax(s: string): number | null {
  const t = s.trim()
  if (!t) return null
  const n = parseInt(t, 10)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

function bandsPayloadAndRowIds(rows: PublicBandRow[]): {
  bands: CouponPublicMessageBand[]
  rowIds: string[]
} {
  const bands: CouponPublicMessageBand[] = []
  const rowIds: string[] = []
  for (const b of rows) {
    const lo = parseBandMin(b.remainingMinStr)
    if (lo === null) continue
    const maxParsed = parseBandMax(b.remainingMaxStr)
    const remaining_max = b.remainingMaxStr.trim() === '' ? null : maxParsed
    if (b.remainingMaxStr.trim() !== '' && maxParsed === null) continue
    if (remaining_max !== null && remaining_max < lo) continue
    const band: CouponPublicMessageBand = { remaining_min: lo, remaining_max }
    if (b.remaining_hide_number) {
      band.remaining_hide_number = true
      if (b.remaining_message_only.trim() !== '') {
        band.remaining_message_only = b.remaining_message_only.trim()
      }
    } else {
      if (b.remaining_prefix !== '') band.remaining_prefix = b.remaining_prefix
      if (b.remaining_suffix !== '') band.remaining_suffix = b.remaining_suffix
    }
    bands.push(band)
    rowIds.push(b.id)
  }
  return { bands, rowIds }
}

function bandsToPayload(rows: PublicBandRow[]): CouponPublicMessageBand[] {
  return bandsPayloadAndRowIds(rows).bands
}

function parseBandsFromCoupon(c: AdminDiscountCoupon): PublicBandRow[] {
  const raw = c.public_message_bands
  if (!raw || !Array.isArray(raw)) return []
  const rows: PublicBandRow[] = []
  for (const item of raw) {
    if (item == null || typeof item !== 'object') continue
    const rec = item as Record<string, unknown>
    let lo: number | null = null
    if (typeof rec.remaining_min === 'number' && Number.isFinite(rec.remaining_min)) {
      lo = Math.trunc(rec.remaining_min)
    } else if (typeof rec.remaining_min === 'string' && rec.remaining_min.trim()) {
      const n = parseInt(rec.remaining_min, 10)
      if (Number.isFinite(n)) lo = n
    }
    if (lo === null || lo < 0) continue
    let maxStr = ''
    if (rec.remaining_max !== undefined && rec.remaining_max !== null) {
      if (typeof rec.remaining_max === 'number' && Number.isFinite(rec.remaining_max)) {
        maxStr = String(Math.trunc(rec.remaining_max))
      } else if (typeof rec.remaining_max === 'string' && rec.remaining_max.trim()) {
        maxStr = rec.remaining_max.trim()
      }
    }
    rows.push({
      id: newPublicBandRowId(),
      remainingMinStr: String(lo),
      remainingMaxStr: maxStr,
      remaining_hide_number: rec.remaining_hide_number === true,
      remaining_prefix: typeof rec.remaining_prefix === 'string' ? rec.remaining_prefix : '',
      remaining_suffix: typeof rec.remaining_suffix === 'string' ? rec.remaining_suffix : '',
      remaining_message_only:
        typeof rec.remaining_message_only === 'string' ? rec.remaining_message_only : '',
    })
  }
  return rows
}

function buildPreviewCouponRow(
  form: CouponPayload,
  endsLocal: string,
  bandRows: PublicBandRow[]
): DiscountCouponRow {
  return {
    id: 'preview',
    code: 'PREVIEW',
    discount_type: form.discount_type,
    discount_percent: form.discount_percent != null ? String(form.discount_percent) : null,
    discount_amount_cents: form.discount_amount_cents ?? null,
    applies_to: form.applies_to,
    product_id: form.product_ids[0] ?? null,
    price_id: form.price_ids[0] ?? form.price_id ?? null,
    max_redemptions_total: form.max_redemptions_total ?? 24,
    max_redemptions_per_user: form.max_redemptions_per_user,
    starts_at: null,
    ends_at: fromDatetimeLocal(endsLocal),
    active: true,
    description: null,
    public_show_remaining: form.public_show_remaining,
    public_remaining_prefix: form.public_remaining_prefix,
    public_remaining_suffix: form.public_remaining_suffix,
    public_show_valid_until: form.public_show_valid_until,
    public_valid_until_prefix: form.public_valid_until_prefix,
    public_valid_until_suffix: form.public_valid_until_suffix,
    public_message_bands: bandsToPayload(bandRows),
  }
}

function FormSection({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section className="min-w-0 space-y-4">
      <header className="border-b border-border/60 pb-3">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
        {subtitle ? (
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed max-w-prose">
            {subtitle}
          </p>
        ) : null}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function SubBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-l-2 border-border/60 pl-4 space-y-3 min-w-0">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function emptyPayload(): CouponPayload {
  return {
    code: '',
    discount_type: 'percent',
    discount_percent: 10,
    discount_amount_cents: null,
    applies_to: 'both',
    product_ids: [],
    product_id: null,
    price_ids: [],
    price_id: null,
    max_redemptions_total: null,
    max_redemptions_per_user: null,
    starts_at: null,
    ends_at: null,
    active: true,
    description: null,
    public_show_remaining: false,
    public_remaining_prefix: null,
    public_remaining_suffix: null,
    public_show_valid_until: false,
    public_valid_until_prefix: null,
    public_valid_until_suffix: null,
    public_message_bands: [],
  }
}

function couponProductIdsFromApi(c: AdminDiscountCoupon): string[] {
  const rows = c.discount_coupon_products
  if (Array.isArray(rows) && rows.length > 0) {
    return [...new Set(rows.map((r) => r.product_id).filter(Boolean))]
  }
  return c.product_id ? [c.product_id] : []
}

function couponPriceIdsFromApi(c: AdminDiscountCoupon): string[] {
  const rows = c.discount_coupon_prices
  if (Array.isArray(rows) && rows.length > 0) {
    return [...new Set(rows.map((r) => r.price_id).filter(Boolean))]
  }
  return c.price_id ? [c.price_id] : []
}

function couponToPayload(c: AdminDiscountCoupon): CouponPayload {
  const pct =
    c.discount_percent != null && c.discount_percent !== ''
      ? parseFloat(String(c.discount_percent))
      : null
  const product_ids = couponProductIdsFromApi(c)
  const price_ids = couponPriceIdsFromApi(c)
  return {
    code: c.code,
    discount_type: c.discount_type,
    discount_percent: c.discount_type === 'percent' ? pct : null,
    discount_amount_cents: c.discount_type === 'fixed_cents' ? c.discount_amount_cents : null,
    applies_to: c.applies_to,
    product_ids,
    product_id: product_ids[0] ?? null,
    price_ids,
    price_id: price_ids[0] ?? null,
    max_redemptions_total: c.max_redemptions_total,
    max_redemptions_per_user: c.max_redemptions_per_user,
    starts_at: c.starts_at,
    ends_at: c.ends_at,
    active: c.active,
    description: c.description ?? null,
    public_show_remaining: c.public_show_remaining ?? false,
    public_remaining_prefix: c.public_remaining_prefix ?? null,
    public_remaining_suffix: c.public_remaining_suffix ?? null,
    public_show_valid_until: c.public_show_valid_until ?? false,
    public_valid_until_prefix: c.public_valid_until_prefix ?? null,
    public_valid_until_suffix: c.public_valid_until_suffix ?? null,
    public_message_bands: Array.isArray(c.public_message_bands) ? c.public_message_bands : [],
  }
}

interface CouponFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  coupon: AdminDiscountCoupon | null
}

export function CouponFormDialog({ open, onOpenChange, mode, coupon }: CouponFormDialogProps) {
  const { data: products = [] } = useProducts({ active: true })
  const { create, update } = useCouponMutations()

  const [form, setForm] = useState<CouponPayload>(emptyPayload)
  const [startsLocal, setStartsLocal] = useState('')
  const [endsLocal, setEndsLocal] = useState('')
  const [publicBands, setPublicBands] = useState<PublicBandRow[]>([])
  const [simulateRemainingStr, setSimulateRemainingStr] = useState('')

  useEffect(() => {
    if (!open) return
    setSimulateRemainingStr('')
    if (mode === 'edit' && coupon) {
      setForm(couponToPayload(coupon))
      setStartsLocal(toDatetimeLocal(coupon.starts_at))
      setEndsLocal(toDatetimeLocal(coupon.ends_at))
      setPublicBands(parseBandsFromCoupon(coupon))
    } else {
      setForm(emptyPayload())
      setStartsLocal('')
      setEndsLocal('')
      setPublicBands([])
    }
  }, [open, mode, coupon])

  /** Preços dos produtos escolhidos; se a lista de produtos está vazia, todos os preços ativos (escopo global + preço fixo). */
  const priceOptions: Price[] = useMemo(() => {
    const list: Price[] = []
    const seen = new Set<string>()
    const scoped: Product[] =
      form.product_ids.length > 0
        ? (form.product_ids
            .map((pid) => products.find((x: Product) => x.id === pid))
            .filter(Boolean) as Product[])
        : products
    for (const p of scoped) {
      if (!p?.prices?.length) continue
      for (const pr of p.prices) {
        if (seen.has(pr.id)) continue
        seen.add(pr.id)
        list.push(pr)
      }
    }
    return list
  }, [form.product_ids, products])

  const productsAvailableToAdd = useMemo(
    () => products.filter((p: Product) => !form.product_ids.includes(p.id)),
    [products, form.product_ids]
  )

  const addProductId = (id: string) => {
    setForm((f) => {
      if (f.product_ids.includes(id)) return f
      const product_ids = [...f.product_ids, id]
      return {
        ...f,
        product_ids,
        product_id: product_ids[0] ?? null,
      }
    })
  }

  const removeProductId = (id: string) => {
    setForm((f) => {
      const product_ids = f.product_ids.filter((x) => x !== id)
      const removed = products.find((p: Product) => p.id === id)
      const dropPriceIds = new Set((removed?.prices ?? []).map((pr) => pr.id))
      const price_ids = f.price_ids.filter((pid) => !dropPriceIds.has(pid))
      return {
        ...f,
        product_ids,
        product_id: product_ids[0] ?? null,
        price_ids,
        price_id: price_ids[0] ?? null,
      }
    })
  }

  const pricesAvailableToAdd = useMemo(
    () => priceOptions.filter((pr) => !form.price_ids.includes(pr.id)),
    [priceOptions, form.price_ids]
  )

  const addPriceId = (priceId: string) => {
    if (form.product_ids.length > 0) {
      const owner = findProductIdForPrice(priceId, products)
      if (!owner || !form.product_ids.includes(owner)) {
        toast.error(CONTENT.fields.priceNotInProductScope)
        return
      }
    }
    setForm((f) => {
      if (f.price_ids.includes(priceId)) return f
      const price_ids = [...f.price_ids, priceId]
      return {
        ...f,
        price_ids,
        price_id: price_ids[0] ?? null,
      }
    })
  }

  const removePriceId = (priceId: string) => {
    setForm((f) => {
      const price_ids = f.price_ids.filter((x) => x !== priceId)
      return {
        ...f,
        price_ids,
        price_id: price_ids[0] ?? null,
      }
    })
  }

  const submit = async () => {
    for (const b of publicBands) {
      const touched =
        b.remainingMinStr.trim() !== '' ||
        b.remainingMaxStr.trim() !== '' ||
        b.remaining_prefix !== '' ||
        b.remaining_suffix !== '' ||
        b.remaining_hide_number ||
        b.remaining_message_only.trim() !== ''
      if (!touched) continue
      const lo = parseBandMin(b.remainingMinStr)
      if (lo === null) {
        toast.error('Verifique o mínimo de usos restantes em cada faixa de mensagem')
        return
      }
      if (b.remaining_hide_number && b.remaining_message_only.trim() === '') {
        toast.error('Informe a frase ao ocultar o número em cada faixa que usa essa opção')
        return
      }
      if (b.remainingMaxStr.trim() !== '') {
        const hi = parseBandMax(b.remainingMaxStr)
        if (hi === null) {
          toast.error('Verifique o máximo de usos restantes em faixas de mensagem')
          return
        }
        if (hi < lo) {
          toast.error('O máximo de usos restantes deve ser maior ou igual ao mínimo')
          return
        }
      }
    }

    const payload: CouponPayload = {
      ...form,
      starts_at: fromDatetimeLocal(startsLocal),
      ends_at: fromDatetimeLocal(endsLocal),
      public_message_bands: bandsToPayload(publicBands),
    }

    try {
      if (mode === 'create') {
        await create.mutateAsync(payload)
        toast.success('Cupom criado')
      } else if (coupon) {
        await update.mutateAsync({ id: coupon.id, payload })
        toast.success('Cupom atualizado')
      }
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar')
    }
  }

  const busy = create.isPending || update.isPending

  const { bands: bandsBuiltPreview, rowIds: bandRowIdsForPayload } = useMemo(
    () => bandsPayloadAndRowIds(publicBands),
    [publicBands]
  )

  const simulatedRemaining = useMemo(() => {
    const t = simulateRemainingStr.trim()
    if (t === '') return null
    const n = parseInt(t, 10)
    if (!Number.isFinite(n) || n < 0) return null
    return n
  }, [simulateRemainingStr])

  const activeBandPayloadIndex = useMemo(() => {
    if (simulatedRemaining === null) return null
    return indexOfActivePublicMessageBand(bandsBuiltPreview, simulatedRemaining)
  }, [bandsBuiltPreview, simulatedRemaining])

  const activeBandRowId =
    activeBandPayloadIndex != null ? (bandRowIdsForPayload[activeBandPayloadIndex] ?? null) : null

  const PREVIEW_USED_TOTAL = 12

  const previewUsedRedemptions = useMemo(() => {
    if (simulatedRemaining != null && form.max_redemptions_total != null) {
      return Math.max(0, form.max_redemptions_total - simulatedRemaining)
    }
    return PREVIEW_USED_TOTAL
  }, [simulatedRemaining, form.max_redemptions_total])

  const publicPreviewLines = useMemo(
    () =>
      buildCouponPublicLines(
        buildPreviewCouponRow(form, endsLocal, publicBands),
        previewUsedRedemptions
      ),
    [form, endsLocal, publicBands, previewUsedRedemptions]
  )

  const activeBandHint = useMemo(() => {
    if (bandsBuiltPreview.length === 0) return CONTENT.fields.activeBandHintEmpty
    if (simulatedRemaining !== null) {
      if (activeBandPayloadIndex != null) {
        return `Simulação: ${simulatedRemaining} usos restantes — a faixa em destaque é a que o checkout usaria.`
      }
      return `Simulação: ${simulatedRemaining} usos restantes — nenhuma faixa cobre esse valor.`
    }
    const maxTot = form.max_redemptions_total
    if (maxTot == null) return CONTENT.fields.activeBandHintNoCap
    const remainingLeft = Math.max(0, maxTot - PREVIEW_USED_TOTAL)
    const hit = resolveActivePublicMessageBand(bandsBuiltPreview, remainingLeft)
    return hit ? CONTENT.fields.activeBandHintSome : CONTENT.fields.activeBandHintNone
  }, [bandsBuiltPreview, form.max_redemptions_total, simulatedRemaining, activeBandPayloadIndex])

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={mode === 'create' ? CONTENT.createTitle : CONTENT.editTitle}
      showIcon={false}
      size="lg"
      /** Rolar só no ScrollArea do template @/components/layout/ui/dialog — evita scroll duplo */
      contentPadding={null}
      footerContent={
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end w-full min-w-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            {CONTENT.cancel}
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={busy}>
            {mode === 'create' ? CONTENT.create : CONTENT.save}
          </Button>
        </div>
      }
    >
      <div className="space-y-5 min-w-0 px-4 py-4 sm:px-6 sm:py-5">
        <FormSection title={CONTENT.fields.sections.status}>
          <Field>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-border/60 bg-background px-3 py-3 sm:px-4">
              <FieldLabel htmlFor="coupon-active" className="text-sm font-medium">
                {CONTENT.fields.active}
              </FieldLabel>
              <Switch
                id="coupon-active"
                checked={form.active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
              />
            </div>
          </Field>
        </FormSection>

        <FormSection
          title={CONTENT.fields.sections.identification}
          subtitle={CONTENT.fields.sections.identificationSub}
        >
          <Field className="w-full min-w-0">
            <FieldLabel htmlFor="coupon-code">{CONTENT.fields.code}</FieldLabel>
            <Input
              id="coupon-code"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              className="uppercase font-mono min-w-0 w-full"
              autoComplete="off"
              disabled={mode === 'edit'}
            />
            {mode === 'edit' ? (
              <FieldDescription>Código não pode ser alterado após criação.</FieldDescription>
            ) : (
              <FieldDescription>{CONTENT.fields.codeHint}</FieldDescription>
            )}
          </Field>

          <Field className="w-full min-w-0">
            <FieldLabel htmlFor="coupon-description">{CONTENT.fields.description}</FieldLabel>
            <Textarea
              id="coupon-description"
              value={form.description ?? ''}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  description: e.target.value === '' ? null : e.target.value,
                }))
              }
              rows={3}
              placeholder="Ex.: campanha parceiro X, observações para o time…"
              className="min-h-18 min-w-0 w-full resize-y"
            />
            <FieldDescription>{CONTENT.fields.descriptionHint}</FieldDescription>
          </Field>
        </FormSection>

        <FormSection
          title={CONTENT.fields.sections.discount}
          subtitle={CONTENT.fields.sections.discountSub}
        >
          <Field className="w-full min-w-0">
            <FieldLabel>{CONTENT.fields.discountType}</FieldLabel>
            <Select
              value={form.discount_type}
              onValueChange={(v) =>
                setForm((f) => ({
                  ...f,
                  discount_type: v as CouponPayload['discount_type'],
                  discount_percent: v === 'percent' ? (f.discount_percent ?? 10) : null,
                  discount_amount_cents:
                    v === 'fixed_cents' ? (f.discount_amount_cents ?? 100) : null,
                }))
              }
            >
              <SelectTrigger className="w-full min-w-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">{CONTENT.types.percent}</SelectItem>
                <SelectItem value="fixed_cents">{CONTENT.types.fixed_cents}</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {form.discount_type === 'percent' ? (
            <Field className="w-full min-w-0">
              <FieldLabel htmlFor="coupon-pct">{CONTENT.fields.percent}</FieldLabel>
              <Input
                id="coupon-pct"
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={form.discount_percent ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, discount_percent: parseFloat(e.target.value) || 0 }))
                }
                className="min-w-0 w-full max-w-full sm:max-w-xs"
              />
            </Field>
          ) : (
            <Field className="w-full min-w-0">
              <FieldLabel htmlFor="coupon-cents">{CONTENT.fields.fixedCents}</FieldLabel>
              <Input
                id="coupon-cents"
                type="number"
                min={1}
                step={1}
                value={form.discount_amount_cents ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    discount_amount_cents: parseInt(e.target.value, 10) || 0,
                  }))
                }
                className="min-w-0 w-full max-w-full sm:max-w-xs"
              />
              <FieldDescription>{CONTENT.fields.fixedHint}</FieldDescription>
            </Field>
          )}

          <Field className="w-full min-w-0">
            <FieldLabel>{CONTENT.fields.appliesTo}</FieldLabel>
            <Select
              value={form.applies_to}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, applies_to: v as CouponPayload['applies_to'] }))
              }
            >
              <SelectTrigger className="w-full min-w-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="avista">{CONTENT.applies.avista}</SelectItem>
                <SelectItem value="parcelado">{CONTENT.applies.parcelado}</SelectItem>
                <SelectItem value="both">{CONTENT.applies.both}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </FormSection>

        <FormSection
          title={CONTENT.fields.sections.scope}
          subtitle={CONTENT.fields.sections.scopeSub}
        >
          <Field className="w-full min-w-0">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
              <FieldLabel className="shrink-0">{CONTENT.fields.products}</FieldLabel>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 shrink-0 self-start text-muted-foreground"
                disabled={form.product_ids.length === 0 && form.price_ids.length === 0}
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    product_ids: [],
                    product_id: null,
                    price_ids: [],
                    price_id: null,
                  }))
                }
              >
                {CONTENT.fields.clearScope}
              </Button>
            </div>
            <FieldDescription>{CONTENT.fields.productsHint}</FieldDescription>
            {products.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Nenhum produto ativo.</p>
            ) : (
              <>
                <Select
                  key={form.product_ids.join(',')}
                  onValueChange={(id) => addProductId(id)}
                  disabled={productsAvailableToAdd.length === 0}
                >
                  <SelectTrigger
                    className="mt-2 w-full min-w-0"
                    aria-label={CONTENT.fields.addProductPlaceholder}
                  >
                    <SelectValue placeholder={CONTENT.fields.addProductPlaceholder} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[min(18rem,70vh)]">
                    {productsAvailableToAdd.map((p: Product) => (
                      <SelectItem key={p.id} value={p.id} className="min-w-0">
                        <span className="block truncate">
                          <span className="font-medium">{p.name}</span>{' '}
                          <span className="text-muted-foreground">({p.ref})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {productsAvailableToAdd.length === 0 && form.product_ids.length > 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {CONTENT.fields.allProductsAdded}
                  </p>
                ) : null}
                {form.product_ids.length > 0 ? (
                  <div className="mt-4 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      {CONTENT.fields.selectedProductsLabel}
                    </p>
                    <ul className="flex flex-wrap gap-2 list-none p-0 m-0" role="list">
                      {form.product_ids.map((id) => {
                        const p = products.find((x: Product) => x.id === id)
                        const label = p ? `${p.name} (${p.ref})` : id
                        return (
                          <li key={id} className="min-w-0 max-w-full">
                            <Badge
                              variant="secondary"
                              className="flex h-auto max-w-full min-w-0 items-center gap-1 py-1 pl-2 pr-1 whitespace-normal"
                            >
                              <span className="wrap-break-word min-w-0 text-left text-xs leading-snug">
                                {label}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-7 shrink-0 rounded-sm text-muted-foreground hover:text-foreground"
                                aria-label={`Remover ${label}`}
                                onClick={() => removeProductId(id)}
                              >
                                <X className="size-3.5" />
                              </Button>
                            </Badge>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ) : null}
              </>
            )}
          </Field>

          <Field className="w-full min-w-0">
            <FieldLabel>{CONTENT.fields.prices}</FieldLabel>
            <FieldDescription>{CONTENT.fields.pricesHint}</FieldDescription>
            {priceOptions.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {products.length === 0
                  ? 'Cadastre produtos com preços para habilitar esta opção.'
                  : 'Adicione produtos acima para listar preços, ou deixe produtos vazios para ver todos os preços.'}
              </p>
            ) : (
              <>
                <Select
                  key={form.price_ids.join(',')}
                  onValueChange={(id) => addPriceId(id)}
                  disabled={pricesAvailableToAdd.length === 0}
                >
                  <SelectTrigger
                    className="mt-2 w-full min-w-0"
                    aria-label={CONTENT.fields.addPricePlaceholder}
                  >
                    <SelectValue placeholder={CONTENT.fields.addPricePlaceholder} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[min(18rem,70vh)]">
                    {pricesAvailableToAdd.map((pr) => {
                      const owner = products.find((p: Product) =>
                        p.prices?.some((x) => x.id === pr.id)
                      )
                      const money = (pr.amount / 100).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })
                      const suffix = pr.recurring ? ' (recorrente)' : ' (único)'
                      const prefix = owner ? `${owner.name} · ` : ''
                      return (
                        <SelectItem key={pr.id} value={pr.id} className="min-w-0">
                          <span className="block truncate">
                            {prefix}
                            {money}
                            {suffix}
                          </span>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                {pricesAvailableToAdd.length === 0 && form.price_ids.length > 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {CONTENT.fields.allPricesAdded}
                  </p>
                ) : null}
                {form.price_ids.length > 0 ? (
                  <div className="mt-4 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      {CONTENT.fields.selectedPricesLabel}
                    </p>
                    <ul className="flex flex-wrap gap-2 list-none p-0 m-0" role="list">
                      {form.price_ids.map((pid) => {
                        const pr = findPriceById(pid, products)
                        const owner = products.find((p: Product) =>
                          p.prices?.some((x) => x.id === pid)
                        )
                        const money = pr
                          ? (pr.amount / 100).toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            })
                          : pid
                        const suffix = pr?.recurring === true ? ' recorrente' : pr ? ' único' : ''
                        const label = owner ? `${owner.name} · ${money}${suffix}` : String(money)
                        return (
                          <li key={pid} className="min-w-0 max-w-full">
                            <Badge
                              variant="secondary"
                              className="flex h-auto max-w-full min-w-0 items-center gap-1 py-1 pl-2 pr-1 whitespace-normal"
                            >
                              <span className="wrap-break-word min-w-0 text-left text-xs leading-snug">
                                {label}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-7 shrink-0 rounded-sm text-muted-foreground hover:text-foreground"
                                aria-label={`Remover ${label}`}
                                onClick={() => removePriceId(pid)}
                              >
                                <X className="size-3.5" />
                              </Button>
                            </Badge>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ) : null}
              </>
            )}
          </Field>
        </FormSection>

        <FormSection
          title={CONTENT.fields.sections.limits}
          subtitle={CONTENT.fields.sections.limitsSub}
        >
          <Field className="w-full min-w-0">
            <FieldLabel htmlFor="max-total">{CONTENT.fields.maxTotal}</FieldLabel>
            <Input
              id="max-total"
              type="number"
              min={1}
              value={form.max_redemptions_total ?? ''}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  max_redemptions_total: e.target.value ? parseInt(e.target.value, 10) : null,
                }))
              }
              placeholder="Ilimitado"
              className="min-w-0 w-full max-w-full sm:max-w-xs"
            />
            <FieldDescription>{CONTENT.fields.maxHint}</FieldDescription>
          </Field>

          <Field className="w-full min-w-0">
            <FieldLabel htmlFor="max-user">{CONTENT.fields.maxUser}</FieldLabel>
            <Input
              id="max-user"
              type="number"
              min={1}
              value={form.max_redemptions_per_user ?? ''}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  max_redemptions_per_user: e.target.value ? parseInt(e.target.value, 10) : null,
                }))
              }
              placeholder="Ilimitado"
              className="min-w-0 w-full max-w-full sm:max-w-xs"
            />
          </Field>

          <Field className="w-full min-w-0">
            <FieldLabel htmlFor="starts">{CONTENT.fields.starts}</FieldLabel>
            <Input
              id="starts"
              type="datetime-local"
              value={startsLocal}
              onChange={(e) => setStartsLocal(e.target.value)}
              className="min-w-0 w-full"
            />
          </Field>

          <Field className="w-full min-w-0">
            <FieldLabel htmlFor="ends">{CONTENT.fields.ends}</FieldLabel>
            <Input
              id="ends"
              type="datetime-local"
              value={endsLocal}
              onChange={(e) => setEndsLocal(e.target.value)}
              className="min-w-0 w-full"
            />
          </Field>
        </FormSection>

        <FormSection
          title={CONTENT.fields.sections.publicCopy}
          subtitle={CONTENT.fields.sections.publicCopySub}
        >
          <Field>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between rounded-lg border border-border/60 bg-background px-3 py-3 sm:px-4">
              <div className="min-w-0 space-y-1 flex-1">
                <FieldLabel htmlFor="show-remaining">{CONTENT.fields.publicRemaining}</FieldLabel>
                <FieldDescription className="text-pretty">
                  {CONTENT.fields.publicRemainingHint}
                </FieldDescription>
              </div>
              <Switch
                id="show-remaining"
                className="shrink-0 sm:mt-1"
                checked={form.public_show_remaining}
                onCheckedChange={(v) => setForm((f) => ({ ...f, public_show_remaining: v }))}
              />
            </div>
          </Field>

          {form.public_show_remaining ? (
            <SubBlock title="Montagem da frase (usos restantes)">
              <Field className="w-full min-w-0">
                <FieldLabel htmlFor="remaining-prefix">{CONTENT.fields.beforeNumber}</FieldLabel>
                <Input
                  id="remaining-prefix"
                  value={form.public_remaining_prefix ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      public_remaining_prefix: e.target.value === '' ? null : e.target.value,
                    }))
                  }
                  placeholder="Temos apenas "
                  className="min-w-0 w-full font-mono text-sm"
                />
              </Field>
              <Field className="w-full min-w-0">
                <FieldLabel htmlFor="remaining-suffix">{CONTENT.fields.afterNumber}</FieldLabel>
                <Input
                  id="remaining-suffix"
                  value={form.public_remaining_suffix ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      public_remaining_suffix: e.target.value === '' ? null : e.target.value,
                    }))
                  }
                  placeholder=" cupons disponíveis — aproveite!"
                  className="min-w-0 w-full font-mono text-sm"
                />
              </Field>
              <p className="text-xs text-muted-foreground rounded-md bg-muted/60 border border-border/50 px-3 py-2 leading-relaxed">
                <span className="font-medium text-foreground">Prévia:</span> «
                {publicPreviewLines.remaining ?? '—'}»
                <span className="text-muted-foreground">
                  {' '}
                  (prévia com 12 resgates totais já feitos — exemplo)
                </span>
              </p>
            </SubBlock>
          ) : null}

          <Field>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between rounded-lg border border-border/60 bg-background px-3 py-3 sm:px-4">
              <div className="min-w-0 space-y-1 flex-1">
                <FieldLabel htmlFor="show-valid-until">
                  {CONTENT.fields.publicValidUntil}
                </FieldLabel>
                <FieldDescription className="text-pretty">
                  {CONTENT.fields.publicValidUntilHint}
                </FieldDescription>
              </div>
              <Switch
                id="show-valid-until"
                className="shrink-0 sm:mt-1"
                checked={form.public_show_valid_until}
                onCheckedChange={(v) => setForm((f) => ({ ...f, public_show_valid_until: v }))}
              />
            </div>
          </Field>

          {form.public_show_valid_until ? (
            <SubBlock title="Montagem da frase (validade)">
              <Field className="w-full min-w-0">
                <FieldLabel htmlFor="valid-prefix">{CONTENT.fields.beforeDate}</FieldLabel>
                <Input
                  id="valid-prefix"
                  value={form.public_valid_until_prefix ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      public_valid_until_prefix: e.target.value === '' ? null : e.target.value,
                    }))
                  }
                  placeholder="Cupom válido até "
                  className="min-w-0 w-full font-mono text-sm"
                />
              </Field>
              <Field className="w-full min-w-0">
                <FieldLabel htmlFor="valid-suffix">{CONTENT.fields.afterDate}</FieldLabel>
                <Input
                  id="valid-suffix"
                  value={form.public_valid_until_suffix ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      public_valid_until_suffix: e.target.value === '' ? null : e.target.value,
                    }))
                  }
                  placeholder="."
                  className="min-w-0 w-full font-mono text-sm"
                />
              </Field>
              <p className="text-xs text-muted-foreground rounded-md bg-muted/60 border border-border/50 px-3 py-2 leading-relaxed">
                <span className="font-medium text-foreground">Prévia:</span> «
                {publicPreviewLines.validUntil ?? '—'}»
              </p>
            </SubBlock>
          ) : null}

          <SubBlock title={CONTENT.fields.bandsTitle}>
            <FieldDescription className="text-pretty">{CONTENT.fields.bandsHint}</FieldDescription>
            <Field className="w-full min-w-0">
              <FieldLabel htmlFor="coupon-simulate-remaining">
                {CONTENT.fields.simulateRemainingLabel}
              </FieldLabel>
              <Input
                id="coupon-simulate-remaining"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={simulateRemainingStr}
                onChange={(e) => setSimulateRemainingStr(e.target.value)}
                placeholder="Ex.: 7"
                className="min-w-0 w-full max-w-full sm:max-w-xs"
              />
              <FieldDescription>{CONTENT.fields.simulateRemainingHint}</FieldDescription>
            </Field>
            <p className="text-xs text-muted-foreground rounded-md bg-muted/40 border border-border/40 px-3 py-2 text-pretty">
              {activeBandHint}
            </p>
            <div className="space-y-4">
              {publicBands.map((row, idx) => (
                <div
                  key={row.id}
                  className={cn(
                    'rounded-lg border p-3 sm:p-4 space-y-3 min-w-0 transition-colors',
                    row.id === activeBandRowId
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/30 shadow-sm'
                      : 'border-border/80 bg-background'
                  )}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm font-medium text-foreground">
                      Faixa {idx + 1}
                      {row.id === activeBandRowId ? (
                        <span className="ml-2 text-primary font-semibold">
                          (ativa na simulação)
                        </span>
                      ) : null}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-destructive shrink-0 self-start"
                      disabled={busy}
                      onClick={() => setPublicBands((prev) => prev.filter((r) => r.id !== row.id))}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      {CONTENT.fields.removeBand}
                    </Button>
                  </div>
                  <Field className="w-full min-w-0">
                    <FieldLabel>{CONTENT.fields.bandMin}</FieldLabel>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      value={row.remainingMinStr}
                      onChange={(e) =>
                        setPublicBands((prev) =>
                          prev.map((r) =>
                            r.id === row.id ? { ...r, remainingMinStr: e.target.value } : r
                          )
                        )
                      }
                      placeholder="Ex.: 1"
                      className="min-w-0 w-full max-w-full sm:max-w-xs"
                    />
                  </Field>
                  <Field className="w-full min-w-0">
                    <FieldLabel>{CONTENT.fields.bandMax}</FieldLabel>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      value={row.remainingMaxStr}
                      onChange={(e) =>
                        setPublicBands((prev) =>
                          prev.map((r) =>
                            r.id === row.id ? { ...r, remainingMaxStr: e.target.value } : r
                          )
                        )
                      }
                      placeholder="Ex.: 10"
                      className="min-w-0 w-full max-w-full sm:max-w-xs"
                    />
                    <FieldDescription>{CONTENT.fields.bandMaxHint}</FieldDescription>
                  </Field>
                  <Field>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between rounded-lg border border-border/60 bg-muted/15 px-3 py-3 sm:px-4">
                      <div className="min-w-0 space-y-1 flex-1">
                        <FieldLabel htmlFor={`band-hide-${row.id}`}>
                          {CONTENT.fields.bandHideNumber}
                        </FieldLabel>
                        <FieldDescription className="text-pretty">
                          {CONTENT.fields.bandHideNumberHint}
                        </FieldDescription>
                      </div>
                      <Switch
                        id={`band-hide-${row.id}`}
                        className="shrink-0 sm:mt-1"
                        checked={row.remaining_hide_number}
                        disabled={busy}
                        onCheckedChange={(v) =>
                          setPublicBands((prev) =>
                            prev.map((r) =>
                              r.id === row.id ? { ...r, remaining_hide_number: v } : r
                            )
                          )
                        }
                      />
                    </div>
                  </Field>
                  {row.remaining_hide_number ? (
                    <Field className="min-w-0 w-full">
                      <FieldLabel htmlFor={`band-msg-${row.id}`}>
                        {CONTENT.fields.bandPhraseMessageOnly}
                      </FieldLabel>
                      <Textarea
                        id={`band-msg-${row.id}`}
                        value={row.remaining_message_only}
                        onChange={(e) =>
                          setPublicBands((prev) =>
                            prev.map((r) =>
                              r.id === row.id ? { ...r, remaining_message_only: e.target.value } : r
                            )
                          )
                        }
                        rows={2}
                        placeholder="Ex.: Últimas vagas — corra!"
                        className="min-w-0 w-full resize-y font-mono text-sm"
                        disabled={busy}
                      />
                    </Field>
                  ) : (
                    <div className="space-y-3 min-w-0">
                      <Field className="min-w-0 w-full">
                        <FieldLabel>{CONTENT.fields.bandPhraseRemainingBefore}</FieldLabel>
                        <Input
                          value={row.remaining_prefix}
                          onChange={(e) =>
                            setPublicBands((prev) =>
                              prev.map((r) =>
                                r.id === row.id ? { ...r, remaining_prefix: e.target.value } : r
                              )
                            )
                          }
                          className="min-w-0 w-full font-mono text-sm"
                          placeholder="(padrão do cupom)"
                          disabled={busy}
                        />
                      </Field>
                      <Field className="min-w-0 w-full">
                        <FieldLabel>{CONTENT.fields.bandPhraseRemainingAfter}</FieldLabel>
                        <Input
                          value={row.remaining_suffix}
                          onChange={(e) =>
                            setPublicBands((prev) =>
                              prev.map((r) =>
                                r.id === row.id ? { ...r, remaining_suffix: e.target.value } : r
                              )
                            )
                          }
                          className="min-w-0 w-full font-mono text-sm"
                          placeholder="(padrão do cupom)"
                          disabled={busy}
                        />
                      </Field>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              disabled={busy}
              onClick={() => setPublicBands((prev) => [...prev, emptyBandRow()])}
            >
              <Plus className="h-4 w-4 mr-2" />
              {CONTENT.fields.addBand}
            </Button>
          </SubBlock>
        </FormSection>
      </div>
    </Dialog>
  )
}
