import 'server-only'

import { getPool } from '@/lib/db/pool'

export type PaymentGateway = 'pagarme' | 'asaas'

const STATUS_COLUMNS: Record<PaymentGateway, string> = {
  pagarme:
    'status, payment_method, payment_link_url, boleto_url, boleto_line, boleto_barcode, pix_qr_code, pix_code',
  asaas: 'status, payment_method, billing_type, invoice_url, boleto_url, pix_qr_code, pix_code',
}

export async function readOwnPaymentStatus(
  profileId: string,
  paymentId: string,
  gateway: PaymentGateway
) {
  const table = gateway === 'pagarme' ? 'pagarme_payments' : 'asaas_payments'
  const rows = await getPool().query(
    `SELECT ${STATUS_COLUMNS[gateway]}
     FROM payments.${table}
     WHERE id = $1 AND user_id = $2`,
    [paymentId, profileId]
  )
  return rows.rows[0] ?? null
}

export async function readOwnPaymentConfirmation(
  profileId: string,
  paymentId: string,
  gateway: PaymentGateway
) {
  const table = gateway === 'pagarme' ? 'pagarme_payments' : 'asaas_payments'
  const installments = gateway === 'asaas' ? 'pay.installments' : 'NULL::int AS installments'
  const rows = await getPool().query(
    `SELECT pay.order_id, pay.amount_cents, pay.payment_method, pay.product_id, pay.metadata,
            ${installments},
            o.id AS order_uuid,
            p.name AS product_name,
            p.metadata AS product_metadata,
            pr.metadata AS price_metadata
     FROM payments.${table} pay
     LEFT JOIN payments.orders o ON o.id = pay.order_id AND o.deleted_at IS NULL
     LEFT JOIN payments.products p ON p.id = COALESCE(o.product_id, pay.product_id)
     LEFT JOIN payments.prices pr ON pr.id = o.price_id
     WHERE pay.id = $1 AND pay.user_id = $2`,
    [paymentId, profileId]
  )
  return rows.rows[0] ?? null
}
