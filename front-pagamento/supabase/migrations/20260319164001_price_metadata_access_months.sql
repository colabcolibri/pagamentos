-- Documenta lifetime_access e access_months no metadata de prices
-- lifetime_access: true = vitalício (pagamento único) ou enquanto assinatura ativa
-- access_months: meses de acesso (quando lifetime_access é false)

COMMENT ON COLUMN payments.prices.metadata IS 'Campos customizados (ex: {cash_discount: 10, max_installments: 12, lifetime_access: true, access_months: 12}). lifetime_access: true=vitalício; access_months: meses quando lifetime_access=false';
