import type { PriceTopicSection } from '@/components/price-topics/types'
import { checkoutAddonPriceLineTitle } from '@/lib/checkout/offer-display'
import type { Price, PriceAddonOffer } from '@/lib/payments/product'

function strFromMeta(meta: unknown, key: string): string | null {
  if (!meta || typeof meta !== 'object') return null
  const v = (meta as Record<string, unknown>)[key]
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

export function topicSectionsFromPriceMetadata(metadata: Price['metadata']): PriceTopicSection[] {
  if (!metadata || typeof metadata !== 'object') return []
  const topics = (metadata as { topics?: unknown }).topics
  if (!Array.isArray(topics)) return []
  return topics.filter((t): t is PriceTopicSection => {
    if (!t || typeof t !== 'object') return false
    const title = (t as PriceTopicSection).title
    const content = (t as PriceTopicSection).content
    return typeof title === 'string' && Array.isArray(content)
  }) as PriceTopicSection[]
}

function truncate(text: string, max: number): string {
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

export type AddonOfferDisplay = {
  title: string
  subtitle: string | null
  topics: PriceTopicSection[]
  /** Descrição completa (produto ou metadata) para o painel expansível. */
  fullDescription: string | null
}

/**
 * Rótulos para opcional no checkout: evita UUID/ref como título único.
 */
export function getAddonOfferDisplay(
  offer: PriceAddonOffer,
  anchorProductName: string
): AddonOfferDisplay {
  const ap = offer.addon_price
  if (!ap) {
    return {
      title: strFromMeta(offer.metadata, 'checkout_label') ?? 'Opcional',
      subtitle: null,
      topics: [],
      fullDescription: null,
    }
  }

  const offerLabel = strFromMeta(offer.metadata, 'checkout_label')
  const productName = ap.product?.name?.trim() || null
  const productDesc = ap.product?.description?.trim() || null
  const metaDesc =
    strFromMeta(ap.metadata, 'description') ?? strFromMeta(ap.metadata, 'short_description')
  const topics = topicSectionsFromPriceMetadata(ap.metadata)

  /** Se o price adicional pertence ao mesmo produto da página, as infos de produto são redundantes. */
  const isSameProduct =
    !!productName && productName.toLowerCase() === anchorProductName.trim().toLowerCase()

  /** Nome da linha de preço (metadata.title, ref legível, ou desambiguação vs. produto âncora). */
  const priceLineName = checkoutAddonPriceLineTitle(ap, anchorProductName, 'Opcional')
  const label = offerLabel?.trim() ?? ''
  const pl = priceLineName.trim()
  const title = label.length > 0 ? (label === pl ? label : `${label} — ${pl}`) : pl

  const teaserSource = metaDesc ?? productDesc
  const subtitle = !isSameProduct && teaserSource ? truncate(teaserSource, 160) : null

  const fullDescription = isSameProduct
    ? null
    : productDesc && productDesc.length > 0
      ? productDesc
      : metaDesc && metaDesc !== productDesc
        ? metaDesc
        : null

  return {
    title,
    subtitle: subtitle && subtitle.length > 0 ? subtitle : null,
    topics,
    fullDescription,
  }
}

/** Há conteúdo no painel "Ver detalhes" (tópicos ou descrição completa — evita repetir teaser na linha principal). */
export function addonOfferHasExpandableDetails(d: AddonOfferDisplay): boolean {
  if (d.topics.length > 0) return true
  const full = d.fullDescription?.trim()
  return !!full && full.length > 0
}
