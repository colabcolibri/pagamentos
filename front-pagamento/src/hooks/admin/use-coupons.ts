'use client'

import type { CouponPublicMessageBand } from '@quitou/core/pricing'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export type AdminDiscountCoupon = {
  id: string
  code: string
  discount_type: 'percent' | 'fixed_cents'
  discount_percent: string | null
  discount_amount_cents: number | null
  applies_to: 'avista' | 'parcelado' | 'both'
  product_id: string | null
  /** Vínculos N:N (resposta da API com embed). */
  discount_coupon_products?:
    | {
        product_id: string
        products?: { id: string; name: string; ref: string } | null
      }[]
    | null
  discount_coupon_prices?:
    | {
        price_id: string
        prices?: { id: string; amount: number; currency: string; product_id?: string } | null
      }[]
    | null
  price_id: string | null
  max_redemptions_total: number | null
  max_redemptions_per_user: number | null
  starts_at: string | null
  ends_at: string | null
  active: boolean
  description: string | null
  public_show_remaining: boolean
  public_remaining_prefix: string | null
  public_remaining_suffix: string | null
  public_show_valid_until: boolean
  public_valid_until_prefix: string | null
  public_valid_until_suffix: string | null
  public_message_bands?: CouponPublicMessageBand[] | null
  created_at: string
  updated_at: string
  products?: { id: string; name: string; ref: string } | null
  prices?: { id: string; amount: number; currency: string } | null
}

export type CouponPayload = {
  code: string
  discount_type: 'percent' | 'fixed_cents'
  discount_percent?: number | null
  discount_amount_cents?: number | null
  applies_to: 'avista' | 'parcelado' | 'both'
  /** Escopo por produto; vazio = global. */
  product_ids: string[]
  product_id: string | null
  price_ids: string[]
  price_id: string | null
  max_redemptions_total: number | null
  max_redemptions_per_user: number | null
  starts_at: string | null
  ends_at: string | null
  active: boolean
  description: string | null
  public_show_remaining: boolean
  public_remaining_prefix: string | null
  public_remaining_suffix: string | null
  public_show_valid_until: boolean
  public_valid_until_prefix: string | null
  public_valid_until_suffix: string | null
  public_message_bands: CouponPublicMessageBand[]
}

async function fetchCoupons(params: {
  active?: boolean | 'all'
  limit?: number
  offset?: number
}): Promise<{ coupons: AdminDiscountCoupon[]; total: number }> {
  const sp = new URLSearchParams()
  if (params.active === 'all') sp.set('active', 'all')
  else if (typeof params.active === 'boolean') sp.set('active', String(params.active))
  if (params.limit != null) sp.set('limit', String(params.limit))
  if (params.offset != null) sp.set('offset', String(params.offset))

  const res = await fetch(`/api/admin/coupons?${sp.toString()}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Erro ao listar cupons')
  }
  return res.json()
}

async function createCoupon(payload: CouponPayload): Promise<{ coupon: AdminDiscountCoupon }> {
  const res = await fetch('/api/admin/coupons', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Erro ao criar cupom')
  }
  return res.json()
}

async function updateCoupon(
  id: string,
  payload: CouponPayload
): Promise<{ coupon: AdminDiscountCoupon }> {
  const res = await fetch(`/api/admin/coupons/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Erro ao atualizar cupom')
  }
  return res.json()
}

async function deleteCoupon(id: string): Promise<void> {
  const res = await fetch(`/api/admin/coupons/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Erro ao excluir cupom')
  }
}

async function patchCouponActive(
  id: string,
  active: boolean
): Promise<{ coupon: AdminDiscountCoupon }> {
  const res = await fetch(`/api/admin/coupons/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Erro ao atualizar situação do cupom')
  }
  return res.json()
}

const QK = ['admin', 'coupons'] as const

export function useCoupons(options?: {
  active?: boolean | 'all'
  limit?: number
  offset?: number
}) {
  return useQuery({
    queryKey: [...QK, options?.active, options?.limit, options?.offset],
    queryFn: () =>
      fetchCoupons({
        active: options?.active ?? 'all',
        limit: options?.limit ?? 200,
        offset: options?.offset ?? 0,
      }),
  })
}

export function useCouponMutations() {
  const qc = useQueryClient()

  const create = useMutation({
    mutationFn: createCoupon,
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })

  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CouponPayload }) =>
      updateCoupon(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })

  const remove = useMutation({
    mutationFn: deleteCoupon,
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })

  const setActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => patchCouponActive(id, active),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })

  return { create, update, remove, setActive }
}
