import type { Pool, PoolClient } from 'pg'

import { CheckoutSessionError } from './service'

type Queryable = Pick<Pool, 'query'> | Pick<PoolClient, 'query'>

export async function countReservedUnitsByPriceIds(
  db: Queryable,
  priceIds: string[]
): Promise<Map<string, number>> {
  const result = new Map<string, number>()
  if (priceIds.length === 0) return result

  const res = await db.query<{ price_id: string; reserved_count: string }>(
    `SELECT cs.price_id, COUNT(*)::text AS reserved_count
     FROM payments.checkout_sessions cs
     WHERE cs.price_id = ANY($1::uuid[])
       AND cs.status = 'paying'
       AND cs.expires_at > now()
     GROUP BY cs.price_id`,
    [priceIds]
  )

  for (const row of res.rows) {
    result.set(row.price_id, Number(row.reserved_count) || 0)
  }
  return result
}

export interface LockedCatalogPrice {
  id: string
  product_id: string
  amount: number
  active: boolean
  stock_cap: number | null
  stock_sold: number
}

export async function assertAndLockCatalogPriceStock(
  client: PoolClient,
  input: {
    priceId: string
    expectedProductId: string
    excludeSessionId?: string | null
  }
): Promise<LockedCatalogPrice> {
  const priceRes = await client.query<LockedCatalogPrice>(
    `SELECT id, product_id, amount, active, stock_cap, stock_sold
     FROM payments.prices
     WHERE id = $1
     FOR UPDATE`,
    [input.priceId]
  )

  const price = priceRes.rows[0]
  if (!price || !price.active || price.product_id !== input.expectedProductId) {
    throw new CheckoutSessionError(422, 'Plano selecionado não pertence a esta sessão')
  }

  if (price.stock_cap != null) {
    const reservedRes = await client.query<{ reserved_count: string }>(
      `SELECT COUNT(*)::text AS reserved_count
       FROM payments.checkout_sessions
       WHERE price_id = $1
         AND status = 'paying'
         AND expires_at > now()
         AND ($2::uuid IS NULL OR id <> $2::uuid)`,
      [price.id, input.excludeSessionId ?? null]
    )
    const reserved = Number(reservedRes.rows[0]?.reserved_count ?? 0) || 0
    if (price.stock_sold + reserved >= price.stock_cap) {
      throw new CheckoutSessionError(409, 'Vagas esgotadas ou reservadas para este plano')
    }
  }

  return price
}
