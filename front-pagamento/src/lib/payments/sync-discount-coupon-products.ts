/**
 * Substitui os vínculos cupom ↔ produtos. `productIds` deduplicados; vazio remove todas as linhas.
 */
export async function syncDiscountCouponProducts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  couponId: string,
  productIds: string[]
): Promise<void> {
  const unique = [...new Set(productIds)]
  const { error: delErr } = await supabase
    .schema('payments')
    .from('discount_coupon_products')
    .delete()
    .eq('coupon_id', couponId)
  if (delErr) throw delErr
  if (unique.length === 0) return
  const { error: insErr } = await supabase
    .schema('payments')
    .from('discount_coupon_products')
    .insert(unique.map((product_id) => ({ coupon_id: couponId, product_id })))
  if (insErr) throw insErr
}
