/**
 * Garante que cada preço do cupom existe e pertence ao escopo de produtos (quando o escopo não é global).
 */
export async function assertCouponPricesMatchProductScope(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  priceIds: string[],
  productIds: string[]
): Promise<{ ok: true } | { ok: false; message: string }> {
  const unique = [...new Set(priceIds)]
  if (unique.length === 0) return { ok: true }

  const { data: rows, error } = await supabase
    .schema('payments')
    .from('prices')
    .select('id, product_id')
    .in('id', unique)

  if (error) return { ok: false, message: 'Erro ao validar preços' }
  if (!rows || rows.length !== unique.length) {
    return { ok: false, message: 'Um ou mais preços não foram encontrados' }
  }

  if (productIds.length > 0) {
    const allowed = new Set(productIds)
    for (const row of rows) {
      const pid = row.product_id as string
      if (!allowed.has(pid)) {
        return {
          ok: false,
          message: 'Cada preço deve pertencer a um dos produtos selecionados no cupom',
        }
      }
    }
  }

  return { ok: true }
}
