import 'server-only'

import { createAdminPaymentsClient } from '@/lib/db/payments-query'
import { getPool, withTransaction } from '@/lib/db/pool'
import {
  sendOrderCreatedEmailFromOrder,
  sendPaymentConfirmedEmailFromOrder,
} from '@/lib/email-helpers'

import {
  SEED_ADDON_OFFERS,
  SEED_COUPONS,
  SEED_CUSTOMERS,
  SEED_PRODUCTS,
  SEED_PROMO_TIERS,
  SEED_UPGRADE_PATHS,
} from './dev-seed-data'

const DEV_SEED_LOCK_KEY = 98421001
const TOTAL_ORDERS = 100

export interface DevSeedSummary {
  products: number
  prices: number
  coupons: number
  customers: number
  orders: number
  paidOrders: number
  subscriptions: number
  asaasPayments: number
  pagarmePayments: number
  couponRedemptions: number
  webhooks: number
  emailsSent: number
  emailsFailed: number
}

export interface DevSeedHealthCheckItem {
  id: string
  label: string
  ok: boolean
  detail: string
}

export interface DevSeedHealth {
  ok: boolean
  checkedAt: string
  checks: DevSeedHealthCheckItem[]
}

export interface DevSeedStatus {
  enabled: boolean
  executed: boolean
  executedAt: string | null
  summary: DevSeedSummary | null
  health: DevSeedHealth | null
}

export class DevSeedForbiddenError extends Error {
  constructor(message = 'Carga dev disponível apenas fora de produção.') {
    super(message)
    this.name = 'DevSeedForbiddenError'
  }
}

export class DevSeedHealthCheckError extends Error {
  health: DevSeedHealth

  constructor(health: DevSeedHealth) {
    const failed = health.checks
      .filter((c) => !c.ok)
      .map((c) => `${c.label}: ${c.detail}`)
      .join(' | ')
    super(`Health check falhou antes da carga: ${failed}`)
    this.name = 'DevSeedHealthCheckError'
    this.health = health
  }
}

export class DevSeedAlreadyExecutedError extends Error {
  executedAt: string
  summary: DevSeedSummary | null

  constructor(executedAt: string, summary: DevSeedSummary | null) {
    super(`Carga dev já foi executada em ${executedAt}.`)
    this.name = 'DevSeedAlreadyExecutedError'
    this.executedAt = executedAt
    this.summary = summary
  }
}

export function isDevSeedEnabled(): boolean {
  return process.env.NODE_ENV !== 'production'
}

const REQUIRED_TABLES = [
  'dev_seed_runs',
  'products',
  'prices',
  'price_upgrade_paths',
  'price_addon_offers',
  'price_promo_tiers',
  'discount_coupons',
  'discount_coupon_products',
  'discount_coupon_prices',
  'profiles',
  'orders',
  'subscriptions',
  'asaas_payments',
  'pagarme_payments',
  'coupon_redemptions',
  'webhook_events',
  'email_logs',
  'admin_audit_events',
  'platform_settings',
  'admin_users',
] as const

const REQUIRED_COLUMNS: Array<{ table: string; column: string }> = [
  { table: 'prices', column: 'stock_cap' },
  { table: 'prices', column: 'stock_sold' },
  { table: 'products', column: 'email_config' },
  { table: 'products', column: 'refund_policy' },
  { table: 'products', column: 'payment_methods' },
  { table: 'orders', column: 'subscription_id' },
  { table: 'profiles', column: 'person_type' },
  { table: 'profiles', column: 'company_name' },
]

export async function runDevSeedHealthCheck(): Promise<DevSeedHealth> {
  const checks: DevSeedHealthCheckItem[] = []
  const pool = getPool()

  // 1. Conexão com o banco
  try {
    await pool.query('SELECT 1')
    checks.push({
      id: 'db_connection',
      label: 'Conexão Postgres',
      ok: true,
      detail: 'Banco respondeu normalmente',
    })
  } catch (err) {
    checks.push({
      id: 'db_connection',
      label: 'Conexão Postgres',
      ok: false,
      detail: err instanceof Error ? err.message : 'Falha ao conectar no Postgres',
    })
    return { ok: false, checkedAt: new Date().toISOString(), checks }
  }

  // 2. Tabelas obrigatórias no schema payments
  const tablesRes = await pool.query<{ table_name: string }>(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'payments'
       AND table_name = ANY($1::text[])`,
    [REQUIRED_TABLES]
  )
  const foundTables = new Set(tablesRes.rows.map((r) => r.table_name))
  const missingTables = REQUIRED_TABLES.filter((t) => !foundTables.has(t))
  checks.push({
    id: 'schema_tables',
    label: 'Tabelas do schema',
    ok: missingTables.length === 0,
    detail:
      missingTables.length === 0
        ? `${REQUIRED_TABLES.length}/${REQUIRED_TABLES.length} tabelas presentes`
        : `Ausentes: ${missingTables.join(', ')}`,
  })

  // 3. Colunas críticas e constraint validate_refund_policy
  const colsRes = await pool.query<{ table_name: string; column_name: string }>(
    `SELECT table_name, column_name
     FROM information_schema.columns
     WHERE table_schema = 'payments'
       AND table_name = ANY($1::text[])`,
    [Array.from(new Set(REQUIRED_COLUMNS.map((c) => c.table)))]
  )
  const colSet = new Set(colsRes.rows.map((r) => `${r.table_name}.${r.column_name}`))
  const missingCols = REQUIRED_COLUMNS.filter((c) => !colSet.has(`${c.table}.${c.column}`))
  checks.push({
    id: 'critical_columns',
    label: 'Colunas críticas',
    ok: missingCols.length === 0,
    detail:
      missingCols.length === 0
        ? `${REQUIRED_COLUMNS.length}/${REQUIRED_COLUMNS.length} colunas validadas`
        : `Ausentes: ${missingCols.map((c) => `${c.table}.${c.column}`).join(', ')}`,
  })

  // 4. Admin e configurações base
  const baseRes = await pool.query<{ admins: number; settings: number }>(
    `SELECT
       (SELECT COUNT(*)::int FROM payments.admin_users) AS admins,
       (SELECT COUNT(*)::int FROM payments.platform_settings) AS settings`
  )
  const admins = baseRes.rows[0]?.admins ?? 0
  const settings = baseRes.rows[0]?.settings ?? 0
  checks.push({
    id: 'base_records',
    label: 'Base administrativa',
    ok: admins > 0 && settings > 0,
    detail:
      admins > 0 && settings > 0
        ? `${admins} admin(s) e configurações prontas`
        : `admins=${admins}, platform_settings=${settings}`,
  })

  return {
    ok: checks.every((c) => c.ok),
    checkedAt: new Date().toISOString(),
    checks,
  }
}

export async function getDevSeedStatus(): Promise<DevSeedStatus> {
  if (!isDevSeedEnabled()) {
    return { enabled: false, executed: false, executedAt: null, summary: null, health: null }
  }

  const health = await runDevSeedHealthCheck()

  const res = await getPool().query<{ executed_at: string; summary: DevSeedSummary }>(
    `SELECT executed_at, summary FROM payments.dev_seed_runs WHERE id = 1`
  )

  if (res.rowCount === 0) {
    return { enabled: true, executed: false, executedAt: null, summary: null, health }
  }

  return {
    enabled: true,
    executed: true,
    executedAt: res.rows[0].executed_at,
    summary: res.rows[0].summary,
    health,
  }
}

// PRNG determinístico para manter a carga coerente e reproduzível
function createRng(seed = 20261114) {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

function buildOrderStatuses(
  rng: () => number
): Array<'paid' | 'pending' | 'expired' | 'cancelled' | 'refunded' | 'failed'> {
  const pool: Array<'paid' | 'pending' | 'expired' | 'cancelled' | 'refunded' | 'failed'> = [
    ...Array(60).fill('paid'),
    ...Array(18).fill('pending'),
    ...Array(10).fill('expired'),
    ...Array(6).fill('cancelled'),
    ...Array(4).fill('refunded'),
    ...Array(2).fill('failed'),
  ]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool
}

function mapGatewayMethod(
  allowedMethods: string[],
  gateway: 'asaas' | 'pagarme',
  rng: () => number
): { method: 'pix' | 'boleto' | 'credit_card'; billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD' } {
  const normalized = allowedMethods.filter((m) =>
    gateway === 'pagarme' ? m === 'credit_card' || m === 'pix' : true
  )
  const candidates = normalized.length > 0 ? normalized : ['credit_card']
  const picked = candidates[Math.floor(rng() * candidates.length)] as
    | 'pix'
    | 'boleto'
    | 'credit_card'
  const billingType = picked === 'pix' ? 'PIX' : picked === 'boleto' ? 'BOLETO' : 'CREDIT_CARD'
  return { method: picked, billingType }
}

function mapGatewayPaymentStatus(
  orderStatus: 'paid' | 'pending' | 'expired' | 'cancelled' | 'refunded' | 'failed',
  gateway: 'asaas' | 'pagarme',
  method: 'pix' | 'boleto' | 'credit_card'
): string {
  if (gateway === 'asaas') {
    if (orderStatus === 'paid') return 'CONFIRMED'
    if (orderStatus === 'refunded') return 'REFUNDED'
    if (orderStatus === 'expired') return 'OVERDUE'
    if (orderStatus === 'cancelled') return 'CANCELLED'
    if (orderStatus === 'failed') return 'FAILED'
    return method === 'pix' ? 'pix_generated' : method === 'boleto' ? 'boleto_generated' : 'PENDING'
  }
  if (orderStatus === 'paid') return 'paid'
  if (orderStatus === 'refunded') return 'refunded'
  if (orderStatus === 'expired') return 'expired'
  if (orderStatus === 'cancelled') return 'canceled'
  if (orderStatus === 'failed') return 'failed'
  return 'pending'
}

export async function runDevSeed(executedBy?: string | null): Promise<{
  executedAt: string
  summary: DevSeedSummary
}> {
  if (!isDevSeedEnabled()) {
    throw new DevSeedForbiddenError()
  }

  const health = await runDevSeedHealthCheck()
  if (!health.ok) {
    throw new DevSeedHealthCheckError(health)
  }

  const rng = createRng()
  const nowMs = Date.now()
  const daysAgo = (days: number, extraHours = 0) =>
    new Date(nowMs - (days * 24 + extraHours) * 3600 * 1000)

  const orderDispatchQueue: Array<{ id: string; isPaid: boolean }> = []
  let executedAt = new Date().toISOString()

  const summary = await withTransaction<DevSeedSummary>(async (client) => {
    await client.query(`SELECT pg_advisory_xact_lock($1)`, [DEV_SEED_LOCK_KEY])

    const existing = await client.query<{ executed_at: string; summary: DevSeedSummary }>(
      `SELECT executed_at, summary FROM payments.dev_seed_runs WHERE id = 1`
    )
    if (existing.rowCount && existing.rowCount > 0) {
      throw new DevSeedAlreadyExecutedError(existing.rows[0].executed_at, existing.rows[0].summary)
    }

    // 1) Limpeza completa de dados operacionais/exemplo anteriores (preserva admin_users, platform_settings, mcp_* e sessions)
    await client.query(`DELETE FROM payments.email_logs`)
    await client.query(`DELETE FROM payments.webhook_events`)
    await client.query(`DELETE FROM payments.admin_audit_events`)
    await client.query(`DELETE FROM payments.coupon_redemptions`)
    await client.query(
      `UPDATE payments.asaas_payments SET status = 'cancelled' WHERE status IS DISTINCT FROM 'cancelled'`
    )
    await client.query(
      `UPDATE payments.pagarme_payments SET status = 'cancelled' WHERE status IS DISTINCT FROM 'cancelled'`
    )
    await client.query(`DELETE FROM payments.asaas_payments`)
    await client.query(`DELETE FROM payments.pagarme_payments`)
    await client.query(`DELETE FROM payments.subscriptions`)
    await client.query(`DELETE FROM payments.orders`)
    await client.query(`DELETE FROM payments.discount_coupon_prices`)
    await client.query(`DELETE FROM payments.discount_coupon_products`)
    await client.query(`DELETE FROM payments.discount_coupons`)
    await client.query(`DELETE FROM payments.price_promo_tiers`)
    await client.query(`DELETE FROM payments.price_upgrade_paths`)
    await client.query(`DELETE FROM payments.price_addon_offers`)
    await client.query(`DELETE FROM payments.prices`)
    await client.query(`DELETE FROM payments.products`)
    await client.query(
      `DELETE FROM payments.profiles
       WHERE id NOT IN (SELECT id FROM payments.admin_users)`
    )

    // 2) Inserir 15 produtos e seus preços
    let totalPrices = 0
    const activePriceCatalog: Array<{
      productId: string
      productRef: string
      paymentMethods: string[]
      priceId: string
      amount: number
      recurring: boolean
      interval: 'month' | 'year' | null
      intervalCount: number | null
    }> = []

    for (const p of SEED_PRODUCTS) {
      await client.query(
        `INSERT INTO payments.products (id, name, ref, description, active, payment_methods, email_config, refund_policy, metadata)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb)`,
        [
          p.id,
          p.name,
          p.ref,
          p.description,
          p.active,
          JSON.stringify(p.paymentMethods),
          JSON.stringify(p.emailConfig),
          JSON.stringify(p.refundPolicy),
          JSON.stringify(p.metadata),
        ]
      )

      for (const pr of p.prices) {
        await client.query(
          `INSERT INTO payments.prices (id, product_id, ref, amount, currency, recurring, interval, interval_count, active, email_addon, stock_cap, stock_sold, metadata)
           VALUES ($1, $2, $3, $4, 'BRL', $5, $6, $7, $8, '{}'::jsonb, $9, 0, $10::jsonb)`,
          [
            pr.id,
            p.id,
            pr.ref,
            pr.amount,
            pr.recurring,
            pr.interval,
            pr.intervalCount,
            p.active,
            pr.stockLimit,
            JSON.stringify(pr.metadata),
          ]
        )
        totalPrices += 1

        if (p.active) {
          activePriceCatalog.push({
            productId: p.id,
            productRef: p.ref,
            paymentMethods: p.paymentMethods,
            priceId: pr.id,
            amount: pr.amount,
            recurring: pr.recurring,
            interval: pr.interval,
            intervalCount: pr.intervalCount,
          })
        }
      }
    }

    // 3) Upgrade paths, add-ons e promo tiers
    for (const up of SEED_UPGRADE_PATHS) {
      await client.query(
        `INSERT INTO payments.price_upgrade_paths (id, from_price_id, to_price_id, sort_order, metadata)
         VALUES ($1, $2, $3, $4, $5::jsonb)`,
        [up.id, up.fromPriceId, up.toPriceId, up.sortOrder, JSON.stringify(up.metadata)]
      )
    }

    for (const addon of SEED_ADDON_OFFERS) {
      await client.query(
        `INSERT INTO payments.price_addon_offers (id, anchor_price_id, addon_price_id, sort_order, metadata)
         VALUES ($1, $2, $3, $4, $5::jsonb)`,
        [
          addon.id,
          addon.anchorPriceId,
          addon.addonPriceId,
          addon.sortOrder,
          JSON.stringify(addon.metadata),
        ]
      )
    }

    for (const tier of SEED_PROMO_TIERS) {
      await client.query(
        `INSERT INTO payments.price_promo_tiers (id, price_id, discount_percent, max_units, units_sold, applies_to, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          tier.id,
          tier.priceId,
          tier.discountPercent,
          tier.maxUnits,
          tier.unitsSold,
          tier.appliesTo,
          tier.sortOrder,
        ]
      )
    }

    // 4) Inserir 6 cupons de desconto + vínculos
    for (const c of SEED_COUPONS) {
      const startsAt = c.startsOffsetDays !== null ? daysAgo(-c.startsOffsetDays) : null
      const endsAt = c.endsOffsetDays !== null ? daysAgo(-c.endsOffsetDays) : null

      await client.query(
        `INSERT INTO payments.discount_coupons (
           id, code, description, discount_type, discount_percent, discount_amount_cents,
           applies_to, active, max_redemptions_total, max_redemptions_per_user,
           starts_at, ends_at, public_message_bands, public_show_remaining, public_show_valid_until,
           created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14, $15, now(), now())`,
        [
          c.id,
          c.code,
          c.description,
          c.discountType,
          c.discountPercent,
          c.discountAmountCents,
          c.appliesTo,
          c.active,
          c.maxRedemptionsTotal,
          c.maxRedemptionsPerUser,
          startsAt,
          endsAt,
          JSON.stringify(c.publicMessageBands),
          c.publicShowRemaining,
          c.publicShowValidUntil,
        ]
      )

      for (const productId of c.productIds ?? []) {
        await client.query(
          `INSERT INTO payments.discount_coupon_products (coupon_id, product_id) VALUES ($1, $2)`,
          [c.id, productId]
        )
      }

      for (const priceId of c.priceIds ?? []) {
        await client.query(
          `INSERT INTO payments.discount_coupon_prices (coupon_id, price_id) VALUES ($1, $2)`,
          [c.id, priceId]
        )
      }
    }

    // 5) Inserir 30 clientes
    for (const customer of SEED_CUSTOMERS) {
      await client.query(
        `INSERT INTO payments.profiles (id, name, email, document, phone, person_type, company_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          customer.id,
          customer.name,
          customer.email,
          customer.document,
          customer.phone,
          customer.personType,
          customer.companyName,
        ]
      )
    }

    // 6) Rotina de simulação de 100 vendas
    const statuses = buildOrderStatuses(rng)
    const activeCoupons = SEED_COUPONS.filter((c) => c.active && (c.endsOffsetDays ?? 1) > 0)

    let paidOrders = 0
    let subscriptionsCount = 0
    let asaasCount = 0
    let pagarmeCount = 0
    let redemptionsCount = 0
    let webhooksCount = 0

    for (let idx = 0; idx < TOTAL_ORDERS; idx++) {
      const orderId = `88000001-0000-4000-8000-${String(idx + 1).padStart(12, '0')}`
      const status = statuses[idx]
      const customer = SEED_CUSTOMERS[idx % SEED_CUSTOMERS.length]
      const catalogItem =
        activePriceCatalog[(idx * 7 + Math.floor(rng() * 3)) % activePriceCatalog.length]
      const gateway: 'asaas' | 'pagarme' = idx % 2 === 0 ? 'asaas' : 'pagarme'
      const { method, billingType } = mapGatewayMethod(catalogItem.paymentMethods, gateway, rng)

      const createdAt = daysAgo(Math.floor((TOTAL_ORDERS - idx) * 0.58), Math.floor(rng() * 12))
      const paidAt =
        status === 'paid' || status === 'refunded'
          ? new Date(createdAt.getTime() + (5 + Math.floor(rng() * 55)) * 60 * 1000)
          : null

      // Cupom elegível em ~28% dos pedidos
      let appliedCoupon: (typeof activeCoupons)[number] | null = null
      let finalAmountCents = catalogItem.amount
      if (rng() < 0.28) {
        const eligible = activeCoupons.filter((c) => {
          if (c.appliesTo === 'one_time' && catalogItem.recurring) return false
          if (c.appliesTo === 'subscription' && !catalogItem.recurring) return false
          if (c.productIds && !c.productIds.includes(catalogItem.productId)) return false
          if (c.priceIds && !c.priceIds.includes(catalogItem.priceId)) return false
          return true
        })
        if (eligible.length > 0) {
          appliedCoupon = eligible[Math.floor(rng() * eligible.length)]
          if (appliedCoupon.discountType === 'percent' && appliedCoupon.discountPercent) {
            finalAmountCents = Math.max(
              1000,
              Math.round(catalogItem.amount * (1 - appliedCoupon.discountPercent / 100))
            )
          } else if (
            appliedCoupon.discountType === 'fixed_amount' &&
            appliedCoupon.discountAmountCents
          ) {
            finalAmountCents = Math.max(
              1000,
              catalogItem.amount - appliedCoupon.discountAmountCents
            )
          }
        }
      }

      // Se recorrente, cria subscription vinculada antes do pedido
      let subscriptionId: string | null = null
      if (catalogItem.recurring) {
        subscriptionId = `99000001-0000-4000-8000-${String(idx + 1).padStart(12, '0')}`
        const periodDays =
          catalogItem.interval === 'year' ? 365 : 30 * (catalogItem.intervalCount ?? 1)
        const periodEnd = new Date(createdAt.getTime() + periodDays * 24 * 3600 * 1000)
        const subStatus =
          status === 'paid'
            ? 'active'
            : status === 'cancelled' || status === 'refunded'
              ? 'canceled'
              : status === 'expired'
                ? 'past_due'
                : 'incomplete'

        await client.query(
          `INSERT INTO payments.subscriptions (id, user_id, price_id, status, current_period_start, current_period_end, cancel_at_period_end, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            subscriptionId,
            customer.id,
            catalogItem.priceId,
            subStatus,
            createdAt,
            periodEnd,
            status === 'cancelled',
            createdAt,
          ]
        )
        subscriptionsCount += 1
      }

      await client.query(
        `INSERT INTO payments.orders (id, user_id, product_id, price_id, subscription_id, amount_cents, status, order_type, payment_gateway, payment_method, created_at, paid_at, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)`,
        [
          orderId,
          customer.id,
          catalogItem.productId,
          catalogItem.priceId,
          subscriptionId,
          finalAmountCents,
          status,
          catalogItem.recurring ? 'subscription' : 'one_time',
          gateway,
          method,
          createdAt,
          paidAt,
          JSON.stringify({
            seeded: true,
            coupon_code: appliedCoupon?.code ?? null,
            original_amount_cents: catalogItem.amount,
          }),
        ]
      )

      if (status === 'paid') {
        paidOrders += 1
      }

      if (appliedCoupon) {
        await client.query(
          `INSERT INTO payments.coupon_redemptions (id, coupon_id, order_id, user_id, created_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            `aa000001-0000-4000-8000-${String(idx + 1).padStart(12, '0')}`,
            appliedCoupon.id,
            orderId,
            customer.id,
            createdAt,
          ]
        )
        redemptionsCount += 1
      }

      const gatewayPaymentStatus = mapGatewayPaymentStatus(status, gateway, method)
      if (gateway === 'asaas') {
        const paymentId = `bb000001-0000-4000-8000-${String(idx + 1).padStart(12, '0')}`
        await client.query(
          `INSERT INTO payments.asaas_payments (
             id, order_id, user_id, product_id, price_id, asaas_customer_id, asaas_payment_id,
             amount_cents, billing_type, status, payment_method, installments, created_at, paid_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            paymentId,
            orderId,
            customer.id,
            catalogItem.productId,
            catalogItem.priceId,
            `cus_dev_${String((idx % SEED_CUSTOMERS.length) + 1).padStart(3, '0')}`,
            `pay_asaas_dev_${String(idx + 1).padStart(4, '0')}`,
            finalAmountCents,
            billingType,
            gatewayPaymentStatus,
            method,
            method === 'credit_card' && finalAmountCents >= 30000 ? 3 : 1,
            createdAt,
            paidAt,
          ]
        )
        asaasCount += 1
      } else {
        const paymentId = `cc000001-0000-4000-8000-${String(idx + 1).padStart(12, '0')}`
        await client.query(
          `INSERT INTO payments.pagarme_payments (
             id, order_id, user_id, product_id, price_id, payment_link_id, payment_link_url,
             amount_cents, status, payment_method, created_at, paid_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            paymentId,
            orderId,
            customer.id,
            catalogItem.productId,
            catalogItem.priceId,
            `pl_dev_${String(idx + 1).padStart(4, '0')}`,
            `https://pagar.me/link/dev-${idx + 1}`,
            finalAmountCents,
            gatewayPaymentStatus,
            method,
            createdAt,
            paidAt,
          ]
        )
        pagarmeCount += 1
      }

      // Webhooks coerentes para pedidos pagos, estornados ou expirados
      if (status === 'paid' || status === 'refunded' || status === 'expired') {
        const webhookId = `dd000001-0000-4000-8000-${String(idx + 1).padStart(12, '0')}`
        const eventType =
          gateway === 'asaas'
            ? status === 'paid'
              ? 'PAYMENT_CONFIRMED'
              : status === 'refunded'
                ? 'PAYMENT_REFUNDED'
                : 'PAYMENT_OVERDUE'
            : status === 'paid'
              ? 'order.paid'
              : status === 'refunded'
                ? 'charge.refunded'
                : 'order.payment_failed'

        await client.query(
          `INSERT INTO payments.webhook_events (id, provider, event_type, provider_event_id, processing_status, payload, created_at)
           VALUES ($1, $2, $3, $4, 'success', $5::jsonb, $6)`,
          [
            webhookId,
            gateway,
            eventType,
            `evt_${gateway}_dev_${String(idx + 1).padStart(4, '0')}`,
            JSON.stringify({ event: eventType, order_id: orderId, amount_cents: finalAmountCents }),
            paidAt ?? createdAt,
          ]
        )
        webhooksCount += 1
      }

      orderDispatchQueue.push({ id: orderId, isPaid: status === 'paid' })
    }

    // Recalcular stock_sold com base nos pedidos pagos gerados
    await client.query(
      `UPDATE payments.prices pr
       SET stock_sold = COALESCE((
         SELECT COUNT(*)::int FROM payments.orders o
         WHERE o.price_id = pr.id AND o.status = 'paid'
       ), 0)`
    )

    // Eventos de auditoria de exemplo
    const auditActor = executedBy ?? SEED_CUSTOMERS[0].id
    await client.query(
      `INSERT INTO payments.admin_audit_events (id, actor_id, action, target_type, target_id, detail, created_at)
       VALUES
         ('ee000001-0000-4000-8000-000000000001', $1, 'coupon.create', 'coupon', $2, 'Cupom BEMVINDO15 criado na carga inicial', $3),
         ('ee000001-0000-4000-8000-000000000002', $1, 'order.mark_paid', 'order', $4, 'Conciliação manual simulada na carga inicial', $5)`,
      [auditActor, SEED_COUPONS[0].id, daysAgo(12), orderDispatchQueue[0].id, daysAgo(5)]
    )

    const initialSummary: DevSeedSummary = {
      products: SEED_PRODUCTS.length,
      prices: totalPrices,
      coupons: SEED_COUPONS.length,
      customers: SEED_CUSTOMERS.length,
      orders: TOTAL_ORDERS,
      paidOrders,
      subscriptions: subscriptionsCount,
      asaasPayments: asaasCount,
      pagarmePayments: pagarmeCount,
      couponRedemptions: redemptionsCount,
      webhooks: webhooksCount,
      emailsSent: 0,
      emailsFailed: 0,
    }

    const runInsert = await client.query<{ executed_at: string }>(
      `INSERT INTO payments.dev_seed_runs (id, executed_by, summary)
       VALUES (1, $1, $2::jsonb)
       RETURNING executed_at`,
      [executedBy ?? null, JSON.stringify(initialSummary)]
    )
    executedAt = runInsert.rows[0].executed_at

    return initialSummary
  })

  // 7) Disparar e-mails reais pelo pipeline do app (Mailpit em dev + gravação em email_logs)
  const database = createAdminPaymentsClient()
  let emailsSent = 0
  let emailsFailed = 0

  const emailTasks: Array<() => Promise<{ success: boolean }>> = []
  for (const item of orderDispatchQueue) {
    emailTasks.push(() =>
      sendOrderCreatedEmailFromOrder(database, item.id, undefined, undefined, false)
    )
    if (item.isPaid) {
      emailTasks.push(() => sendPaymentConfirmedEmailFromOrder(database, item.id, undefined, false))
    }
  }

  const BATCH_SIZE = 10
  for (let i = 0; i < emailTasks.length; i += BATCH_SIZE) {
    const batch = emailTasks.slice(i, i + BATCH_SIZE)
    const results = await Promise.allSettled(batch.map((fn) => fn()))
    for (const res of results) {
      if (res.status === 'fulfilled' && res.value.success) {
        emailsSent += 1
      } else {
        emailsFailed += 1
      }
    }
  }

  const finalSummary: DevSeedSummary = {
    ...summary,
    emailsSent,
    emailsFailed,
  }

  await getPool().query(`UPDATE payments.dev_seed_runs SET summary = $1::jsonb WHERE id = 1`, [
    JSON.stringify(finalSummary),
  ])

  return { executedAt, summary: finalSummary }
}
