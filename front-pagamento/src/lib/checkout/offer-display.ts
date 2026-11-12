import type { Price } from '@/lib/payments/product'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function humanRef(ref: string): boolean {
  return ref.length > 0 && !UUID_RE.test(ref)
}

/** Título do plano/preço (`metadata.title` no admin). */
export function pricePlanTitle(price: Price | undefined | null): string | null {
  if (!price?.metadata || typeof price.metadata !== 'object' || price.metadata === null) {
    return null
  }
  const raw = (price.metadata as Record<string, unknown>).title
  if (typeof raw !== 'string') return null
  const s = raw.trim()
  return s.length > 0 ? s : null
}

/**
 * Linha de checkout: nome do preço como no admin — `metadata.title`, depois `ref` legível,
 * depois nome do produto; por último `ref` bruto ou fallback.
 */
export function checkoutPriceLineTitle(price: Price | undefined | null, fallback = '—'): string {
  if (!price) return fallback
  const plan = pricePlanTitle(price)
  if (plan) return plan
  if (humanRef(price.ref)) return price.ref
  const pn = price.product?.name?.trim()
  if (pn) return pn
  if (price.ref?.trim()) return price.ref.trim()
  return fallback
}

/**
 * Igual a `checkoutPriceLineTitle`, mas em opcionais do mesmo produto da página: sem `metadata.title`
 * nem `ref` legível, não usamos só o nome do produto (igual ao âncora) — fica "nome · adicional".
 */
export function checkoutAddonPriceLineTitle(
  price: Price | undefined | null,
  anchorProductName: string,
  fallback = 'Opcional'
): string {
  if (!price) return fallback
  const plan = pricePlanTitle(price)
  if (plan) return plan
  if (humanRef(price.ref)) return price.ref
  const pn = price.product?.name?.trim()
  const anchor = anchorProductName.trim()
  const ref = price.ref?.trim() ?? ''
  if (pn && anchor && pn === anchor && UUID_RE.test(ref)) {
    return `${pn} · adicional`
  }
  if (pn) return pn
  if (ref) return ref
  return fallback
}

/** Uma linha para status, confirmação e logs: "Produto · Plano". */
export function checkoutProductAndPlanLine(
  productName: string,
  price: Price | undefined | null
): string {
  const plan = pricePlanTitle(price)
  return plan ? `${productName} · ${plan}` : productName
}
