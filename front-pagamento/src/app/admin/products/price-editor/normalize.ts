import type { PriceEmailAddon } from '@quitou/core/email'

import type { PriceMetadata } from './types'

/** Normaliza metadata de preços: access_months 999 → lifetime_access true. Para uso antes de salvar. */
export function normalizePriceAccessMetadata(
  meta: PriceMetadata | null | undefined
): PriceMetadata {
  if (!meta) return {}
  const next = { ...meta }
  if (next.access_months === 999) {
    next.lifetime_access = true
    next.access_months = undefined
  }
  if (next.lifetime_access === true) {
    next.access_months = undefined
  }
  return next
}

/** Remove blocos vazios antes de persistir `email_addon` no banco. */
export function normalizePriceEmailAddonForDb(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {}
  }
  const a = raw as PriceEmailAddon
  const out: Record<string, unknown> = {}
  const oc = a.order_created
  if (oc) {
    const block: Record<string, string> = {}
    if (oc.custom_message?.trim()) block.custom_message = oc.custom_message.trim()
    if (oc.instructions?.trim()) block.instructions = oc.instructions.trim()
    if (Object.keys(block).length) out.order_created = block
  }
  const pc = a.payment_confirmed
  if (pc) {
    const block: Record<string, unknown> = {}
    if (pc.custom_message?.trim()) block.custom_message = pc.custom_message.trim()
    const steps = (pc.next_steps ?? []).map((s: string) => s.trim()).filter(Boolean)
    if (steps.length) block.next_steps = steps
    if (Object.keys(block).length) out.payment_confirmed = block
  }
  return out
}
