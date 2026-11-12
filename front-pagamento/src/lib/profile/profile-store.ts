import 'server-only'

import { getPool } from '@/lib/db/pool'

export async function readOwnProfile(profileId: string) {
  const rows = await getPool().query('SELECT * FROM payments.profiles WHERE id = $1', [profileId])
  return rows.rows[0] ?? null
}

export async function updateOwnProfile(profileId: string, name: string, phone: string | null) {
  const rows = await getPool().query(
    `UPDATE payments.profiles
     SET name = $2, phone = $3
     WHERE id = $1
     RETURNING *`,
    [profileId, name, phone]
  )
  return rows.rows[0] ?? null
}

export async function listOwnOrders(profileId: string) {
  const rows = await getPool().query(
    `SELECT o.*,
            json_build_object(
              'id', p.id, 'name', p.name, 'ref', p.ref, 'description', p.description
            ) AS products,
            json_build_object(
              'id', pr.id, 'amount', pr.amount, 'currency', pr.currency,
              'recurring', pr.recurring, 'interval', pr.interval, 'interval_count', pr.interval_count
            ) AS prices
     FROM payments.orders o
     INNER JOIN payments.products p ON p.id = o.product_id
     INNER JOIN payments.prices pr ON pr.id = o.price_id
     WHERE o.user_id = $1
       AND o.deleted_at IS NULL
     ORDER BY o.created_at DESC
     LIMIT 50`,
    [profileId]
  )
  return rows.rows
}
