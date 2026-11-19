export type CheckoutSessionPricingMode = 'catalog' | 'custom'

export type CheckoutSessionStatus = 'open' | 'paying' | 'completed' | 'expired' | 'cancelled'

export interface CheckoutApiKeyRecord {
  id: string
  label: string
  key_prefix: string
  key_hash: string
  allowed_product_ids: string[] | null
  revoked_at: string | null
  last_used_at: string | null
  created_at: string
}

export interface CheckoutApiKeyPublic {
  id: string
  label: string
  keyPrefix: string
  allowedProductIds: string[] | null
  revokedAt: string | null
  lastUsedAt: string | null
  createdAt: string
}

export interface CheckoutSessionRecord {
  id: string
  token_hash: string
  api_key_id: string | null
  product_id: string
  price_id: string | null
  pricing_mode: CheckoutSessionPricingMode
  amount_cents: number | null
  customer_email: string | null
  customer_name: string | null
  email_verified_by_origin: boolean
  metadata: Record<string, unknown>
  success_url: string | null
  cancel_url: string | null
  status: CheckoutSessionStatus
  order_id: string | null
  idempotency_key: string | null
  expires_at: string
  completed_at: string | null
  created_at: string
  updated_at: string
}
