/**
 * Após pagamento confirmado: incrementa stock_sold do preço (se houver teto) e units_sold da faixa (se houver).
 * Leitura + update simples (sem filtro por cota no UPDATE); tolera corrida leve.
 */

export async function recordPricePromoSalesAfterOrderPaid(supabase: any, orderId: string): Promise<void> {
  const db = supabase.schema('payments')

  const { data: order, error: orderErr } = await db
    .from('orders')
    .select('metadata, price_id')
    .eq('id', orderId)
    .maybeSingle()

  if (orderErr || !order) return

  const meta = (order.metadata as Record<string, unknown>) || {}
  const tierId = typeof meta.price_promo_tier_id === 'string' ? meta.price_promo_tier_id : null
  const priceId = typeof order.price_id === 'string' ? order.price_id : null
  if (!priceId) return

  const { data: priceRow } = await db.from('prices').select('stock_cap, stock_sold').eq('id', priceId).maybeSingle()

  if (priceRow && priceRow.stock_cap != null) {
    const sold = Number(priceRow.stock_sold ?? 0)
    await db.from('prices').update({ stock_sold: sold + 1 }).eq('id', priceId)
  }

  if (tierId) {
    const { data: tier } = await db
      .from('price_promo_tiers')
      .select('units_sold')
      .eq('id', tierId)
      .maybeSingle()
    if (tier) {
      const u = Number(tier.units_sold ?? 0)
      await db.from('price_promo_tiers').update({ units_sold: u + 1 }).eq('id', tierId)
    }
  }
}
