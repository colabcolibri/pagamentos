-- ==========================================
-- MIGRATION: Refund Policies (OPCIONAL)
-- ==========================================
-- Adiciona suporte para políticas de reembolso no metadata dos produtos
-- ATENÇÃO: Esta migration é OPCIONAL - só use se quiser validação/constraints

-- ==========================================
-- FUNÇÃO: Validar estrutura do refund_policy
-- ==========================================

CREATE OR REPLACE FUNCTION payments.validate_refund_policy(policy jsonb)
RETURNS boolean AS $$
BEGIN
  IF policy IS NULL THEN
    RETURN true;
  END IF;

  IF NOT (
    policy ? 'title' AND
    policy ? 'subtitle' AND
    policy ? 'sections' AND
    policy ? 'footer' AND
    policy ? 'checkout'
  ) THEN
    RETURN false;
  END IF;

  IF jsonb_typeof(policy->'sections') != 'array' THEN
    RETURN false;
  END IF;

  IF NOT (
    policy->'checkout' ? 'buttonText' AND
    policy->'checkout' ? 'acceptanceText' AND
    policy->'checkout' ? 'acceptanceRequired'
  ) THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = payments, public, auth;

-- ==========================================
-- CONSTRAINT: Validar refund_policy no metadata
-- ==========================================

-- Adicionar constraint na tabela products
ALTER TABLE payments.products
ADD CONSTRAINT valid_refund_policy_structure
CHECK (
  -- Se não tem refund_policy no metadata, tudo ok
  (metadata->'refund_policy' IS NULL) OR
  -- Se tem, valida a estrutura
  payments.validate_refund_policy(metadata->'refund_policy')
);

-- ==========================================
-- FUNÇÃO: Obter policy do produto (helper)
-- ==========================================

CREATE OR REPLACE FUNCTION payments.get_product_refund_policy(product_ref text)
RETURNS jsonb AS $$
  SELECT metadata->'refund_policy'
  FROM payments.products
  WHERE ref = product_ref
  LIMIT 1;
$$ LANGUAGE sql STABLE SET search_path = payments, public, auth;

-- ==========================================
-- VIEW: Produtos com policy (facilitador)
-- ==========================================

CREATE OR REPLACE VIEW payments.products_with_policies AS
SELECT 
  id,
  ref,
  name,
  description,
  active,
  metadata,
  metadata->'refund_policy' as refund_policy,
  CASE 
    WHEN metadata->'refund_policy' IS NOT NULL THEN true
    ELSE false
  END as has_refund_policy,
  created_at,
  updated_at
FROM payments.products;

-- ==========================================
-- COMMENTS
-- ==========================================

COMMENT ON FUNCTION payments.validate_refund_policy IS 
  'Valida estrutura do refund_policy no metadata. Retorna true se válido ou null.';

COMMENT ON FUNCTION payments.get_product_refund_policy IS 
  'Retorna a política de reembolso de um produto específico.';

COMMENT ON VIEW payments.products_with_policies IS 
  'View que facilita consulta de produtos com suas políticas de reembolso.';

-- ==========================================
-- EXEMPLO DE USO
-- ==========================================

/*
-- Inserir produto com policy
INSERT INTO payments.products (ref, name, metadata) VALUES (
  'curso-typescript',
  'Curso TypeScript',
  '{
    "type": "course",
    "refund_policy": {
      "title": "Política de compra",
      "subtitle": "Para seu curso",
      "sections": [
        {
          "title": "Cancelamento",
          "content": ["Você tem 7 dias..."]
        }
      ],
      "footer": "Termos...",
      "checkout": {
        "buttonText": "Ver política",
        "acceptanceText": "Li e aceito",
        "acceptanceRequired": "Você precisa aceitar"
      }
    }
  }'::jsonb
);

-- Consultar policy de um produto
SELECT payments.get_product_refund_policy('curso-typescript');

-- Ver todos produtos com policy
SELECT * FROM payments.products_with_policies WHERE has_refund_policy = true;
*/

