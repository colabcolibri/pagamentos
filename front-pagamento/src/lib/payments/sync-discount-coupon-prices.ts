/**
 * Substitui os vínculos cupom ↔ preços. `priceIds` deduplicados; vazio remove todas as linhas.
 */
export async function syncDiscountCouponPrices(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  couponId: string,
  priceIds: string[]
): Promise<void> {
  const unique = [...new Set(priceIds)]
  const { error: delErr } = await supabase
    .schema('payments')
    .from('discount_coupon_prices')
    .delete()
    .eq('coupon_id', couponId)
  if (delErr) throw delErr
  if (unique.length === 0) return
  const { error: insErr } = await supabase
    .schema('payments')
    .from('discount_coupon_prices')
    .insert(unique.map((price_id) => ({ coupon_id: couponId, price_id })))
  if (insErr) throw insErr
}
