-- Allow orders and payments without catalog price_id for custom-amount checkout sessions (US-0054)

ALTER TABLE payments.orders
  ALTER COLUMN price_id DROP NOT NULL;

ALTER TABLE payments.pagarme_payments
  ALTER COLUMN price_id DROP NOT NULL;

ALTER TABLE payments.asaas_payments
  ALTER COLUMN price_id DROP NOT NULL;
