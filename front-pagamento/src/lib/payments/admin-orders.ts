import 'server-only'

import { getPool } from '@/lib/db/pool'

const ORDER_COLUMNS = new Set(['created_at', 'updated_at', 'paid_at', 'amount_cents'])

type OrderFilter = {
  userId?: string
  status?: string[]
  orderType?: string
  paymentGateway?: string
  paymentMethod?: string
  orderBy?: string
  orderDirection?: string
  limit?: number
  offset?: number
}

function whereOf(filter: OrderFilter) {
  const values: unknown[] = []
  const parts = ['o.deleted_at IS NULL']
  if (filter.userId) {
    values.push(filter.userId)
    parts.push(`o.user_id = $${values.length}`)
  }
  if (filter.status?.length) {
    values.push(filter.status)
    parts.push(`o.status = ANY($${values.length}::text[])`)
  }
  if (filter.orderType) {
    values.push(filter.orderType)
    parts.push(`o.order_type = $${values.length}`)
  }
  if (filter.paymentGateway) {
    values.push(filter.paymentGateway)
    parts.push(`o.payment_gateway = $${values.length}`)
  }
  if (filter.paymentMethod) {
    values.push(filter.paymentMethod)
    parts.push(`o.payment_method = $${values.length}`)
  }
  return { values, where: parts.join(' AND ') }
}

const RELATION_SELECT = `
  o.*,
  json_build_object('id', p.id, 'name', p.name, 'ref', p.ref, 'description', p.description) AS products,
  json_build_object(
    'id', pr.id, 'amount', pr.amount, 'currency', pr.currency,
    'recurring', pr.recurring, 'interval', pr.interval, 'interval_count', pr.interval_count
  ) AS prices,
  json_build_object('id', pf.id, 'email', pf.email, 'name', pf.name) AS profiles
`

export async function listAdminOrders(filter: OrderFilter) {
  const { values, where } = whereOf(filter)
  const column = ORDER_COLUMNS.has(filter.orderBy ?? '') ? filter.orderBy : 'created_at'
  const direction = filter.orderDirection === 'asc' ? 'ASC' : 'DESC'
  const limit = filter.limit ?? 50
  const offset = filter.offset ?? 0
  values.push(limit, offset)
  const rows = await getPool().query(
    `SELECT ${RELATION_SELECT}
     FROM payments.orders o
     INNER JOIN payments.products p ON p.id = o.product_id
     INNER JOIN payments.prices pr ON pr.id = o.price_id
     INNER JOIN payments.profiles pf ON pf.id = o.user_id
     WHERE ${where}
     ORDER BY o.${column} ${direction}
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  )
  return rows.rows
}

export async function countAdminOrders(filter: OrderFilter) {
  const { values, where } = whereOf(filter)
  const rows = await getPool().query<{ total: number }>(
    `SELECT count(*)::int AS total FROM payments.orders o WHERE ${where}`,
    values
  )
  return rows.rows[0]?.total ?? 0
}

export async function readAdminOrder(id: string) {
  const rows = await getPool().query(
    `SELECT ${RELATION_SELECT}
     FROM payments.orders o
     INNER JOIN payments.products p ON p.id = o.product_id
     INNER JOIN payments.prices pr ON pr.id = o.price_id
     INNER JOIN payments.profiles pf ON pf.id = o.user_id
     WHERE o.id = $1 AND o.deleted_at IS NULL`,
    [id]
  )
  return rows.rows[0] ?? null
}

export async function softDeleteCancelledOrder(id: string, adminId: string) {
  const rows = await getPool().query(
    `UPDATE payments.orders
     SET deleted_at = now(), deleted_by = $2
     WHERE id = $1 AND status = 'cancelled' AND deleted_at IS NULL
     RETURNING id`,
    [id, adminId]
  )
  return rows.rows[0] ?? null
}
