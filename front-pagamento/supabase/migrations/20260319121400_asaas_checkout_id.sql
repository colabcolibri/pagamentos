-- ==========================================
-- Migration: asaas_checkout_id - separação de IDs Asaas
-- ==========================================
-- Adiciona coluna asaas_checkout_id para separar checkout.id (Checkout API) de payment.id (Payments API).
-- Antes: asaas_payment_id era usado para ambos, gerando buscas ambíguas.
-- Depois: asaas_checkout_id = checkout.id, asaas_payment_id = payment.id (pay_xxx).
--
-- Modelo de IDs:
-- | Fluxo                          | asaas_checkout_id | asaas_payment_id | asaas_installment_id |
-- |--------------------------------|-------------------|------------------|----------------------|
-- | Checkout API (criação)         | checkout.id       | null             | null                 |
-- | Checkout API (após pago)       | checkout.id       | payment.id       | null                 |
-- | Payments API                   | null              | payment.id       | null                 |
-- | Parcelado (boleto)             | null              | null ou pay_xxx   | installment_id       |

-- 1. Adicionar coluna asaas_checkout_id
ALTER TABLE payments.asaas_payments
ADD COLUMN IF NOT EXISTS asaas_checkout_id text;

-- 2. Migrar dados existentes: Checkout API armazenava checkout.id em asaas_payment_id
--    Identificamos por metadata.flow = 'checkout_api' ou metadata->>'checkout_session_id'
UPDATE payments.asaas_payments
SET asaas_checkout_id = COALESCE(
  metadata->>'checkout_session_id',
  CASE
    WHEN status = 'pending' AND (metadata->>'flow' = 'checkout_api' OR metadata->>'checkout_session_id' IS NOT NULL)
    THEN asaas_payment_id
    ELSE NULL
  END
)
WHERE (metadata->>'flow' = 'checkout_api' OR metadata->>'checkout_session_id' IS NOT NULL)
  AND asaas_checkout_id IS NULL;

-- 3. Remover constraint antiga (permite zerar asaas_payment_id em próxima etapa)
ALTER TABLE payments.asaas_payments
DROP CONSTRAINT IF EXISTS asaas_payment_id_or_installment_id_required;

-- 4. Para pendentes do Checkout API: asaas_payment_id era checkout.id, zerar (já migrado para asaas_checkout_id)
UPDATE payments.asaas_payments
SET asaas_payment_id = NULL
WHERE status = 'pending'
  AND asaas_checkout_id IS NOT NULL
  AND (metadata->>'flow' = 'checkout_api' OR metadata->>'checkout_session_id' IS NOT NULL);

-- 5. Nova constraint: pelo menos um dos IDs Asaas deve existir
ALTER TABLE payments.asaas_payments
DROP CONSTRAINT IF EXISTS asaas_payment_id_or_installment_or_checkout_required;
ALTER TABLE payments.asaas_payments
ADD CONSTRAINT asaas_payment_id_or_installment_or_checkout_required
CHECK (
  asaas_payment_id IS NOT NULL
  OR asaas_installment_id IS NOT NULL
  OR asaas_checkout_id IS NOT NULL
);

-- 6. Índice para buscas por checkout
CREATE INDEX IF NOT EXISTS asaas_payments_asaas_checkout_id_idx
ON payments.asaas_payments(asaas_checkout_id)
WHERE asaas_checkout_id IS NOT NULL;

-- 7. Comentário
COMMENT ON COLUMN payments.asaas_payments.asaas_checkout_id IS 'ID da sessão de checkout no Asaas (Checkout API). Usado para localizar registro em webhooks PAYMENT_RECEIVED/CHECKOUT_PAID.';
