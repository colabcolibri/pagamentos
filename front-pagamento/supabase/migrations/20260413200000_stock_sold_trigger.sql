-- Trigger que mantém prices.stock_sold e price_promo_tiers.units_sold
-- sincronizados automaticamente com orders pagas.
--
-- prices.stock_sold  = COUNT de orders com status='paid' para aquele price_id
-- units_sold (tier)  = COUNT de orders pagas criadas enquanto a tier estava ativa
--   (antes de ends_at, se definido) e abaixo do max_units da tier.
--   Na prática, conta orders pagas <= ends_at da tier (se ends_at não nulo),
--   sem tentar reconstruir qual tier "ganhou" na venda — apenas a faixa mais
--   restritiva pelo prazo.
--
-- Segurança:
--   - Função SECURITY DEFINER com search_path fixo: sem SQL injection possível.
--   - Sem acesso externo: nenhum GRANT além de TRIGGER (interno ao banco).
--   - RLS não é relevante: triggers rodam como owner da tabela (service_role-equivalente).
--   - Idempotente: usa SET (não +1/-1), seguro contra duplicação e re-execução.

-- ─── Função principal ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION payments.sync_stock_sold_from_orders()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = payments
AS $$
DECLARE
  v_price_id uuid;
BEGIN
  -- Determina o price_id afetado (antes ou depois da mudança)
  IF TG_OP = 'DELETE' THEN
    v_price_id := OLD.price_id;
  ELSIF TG_OP = 'INSERT' THEN
    v_price_id := NEW.price_id;
  ELSE
    -- UPDATE: pode ter mudado o price_id (raro, mas defensivo)
    -- Recalcula ambos se price_id mudou
    IF OLD.price_id IS DISTINCT FROM NEW.price_id AND OLD.price_id IS NOT NULL THEN
      PERFORM payments.recalc_stock_for_price(OLD.price_id);
    END IF;
    v_price_id := NEW.price_id;
  END IF;

  IF v_price_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  PERFORM payments.recalc_stock_for_price(v_price_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ─── Função de recálculo por price_id ────────────────────────────────────────

CREATE OR REPLACE FUNCTION payments.recalc_stock_for_price(p_price_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = payments
AS $$
DECLARE
  v_paid_count integer;
BEGIN
  -- 1. Conta orders pagas para este preço
  SELECT COUNT(*)::integer
  INTO v_paid_count
  FROM payments.orders
  WHERE price_id = p_price_id
    AND status = 'paid';

  -- 2. Atualiza prices.stock_sold (SET absoluto — idempotente)
  UPDATE payments.prices
  SET stock_sold = v_paid_count
  WHERE id = p_price_id;

  -- 3. Atualiza units_sold em cada promo tier do preço
  --    Conta orders pagas criadas antes do ends_at da tier (se definido)
  UPDATE payments.price_promo_tiers pt
  SET units_sold = (
    SELECT COUNT(*)::integer
    FROM payments.orders o
    WHERE o.price_id = p_price_id
      AND o.status = 'paid'
      AND (pt.ends_at IS NULL OR o.created_at <= pt.ends_at)
  )
  WHERE pt.price_id = p_price_id;
END;
$$;

-- Sem GRANT: funções internas, chamadas só pelo trigger.
REVOKE ALL ON FUNCTION payments.sync_stock_sold_from_orders() FROM PUBLIC;
REVOKE ALL ON FUNCTION payments.recalc_stock_for_price(uuid) FROM PUBLIC;

-- ─── Trigger na tabela orders ─────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_sync_stock_sold ON payments.orders;

CREATE TRIGGER trg_sync_stock_sold
  AFTER INSERT OR UPDATE OF status, price_id OR DELETE
  ON payments.orders
  FOR EACH ROW
  EXECUTE FUNCTION payments.sync_stock_sold_from_orders();

-- ─── Recálculo inicial (sincroniza dados existentes) ─────────────────────────

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT DISTINCT price_id
    FROM payments.orders
    WHERE price_id IS NOT NULL
  LOOP
    PERFORM payments.recalc_stock_for_price(r.price_id);
  END LOOP;
END;
$$;
