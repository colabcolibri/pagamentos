-- Seed para admin inicial
-- Este arquivo cria um usuário admin para testes

-- Inserir um usuário fictício na tabela auth.users (para desenvolvimento local)
INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'admin@quitou.local',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
) ON CONFLICT (id) DO NOTHING;

-- Inserir identidade para o usuário
INSERT INTO auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at,
    id
) VALUES (
    'admin@quitou.local',
    '00000000-0000-0000-0000-000000000001'::uuid,
    '{"sub": "00000000-0000-0000-0000-000000000001", "email": "admin@quitou.local", "email_verified": true}',
    'email',
    NOW(),
    NOW(),
    NOW(),
    gen_random_uuid()
) ON CONFLICT (provider, provider_id) DO NOTHING;

-- Criar admin user na tabela payments.admin_users
INSERT INTO payments.admin_users (
    id,
    email,
    name,
    role,
    is_active
) VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'admin@quitou.local',
    'Admin Quitou',
    'super_admin',
    true
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active;

-- Exemplo de produtos para teste com refund_policy correto
INSERT INTO payments.products (
    ref,
    name,
    description,
    active,
    payment_methods,
    metadata
) VALUES 
(
    'produto-teste-001',
    'Produto de teste',
    'Um produto para testar o sistema de pagamentos',
    true,
    '["credit_card", "pix", "boleto"]'::jsonb, -- Permite cartão, PIX e boleto (padrão)
    '{
      "type": "digital_product",
      "refund_policy": {
        "title": "Política de compra",
        "subtitle": "Para seu produto de teste",
        "sections": [
          {
            "title": "Cancelamento e reembolso",
            "content": [
              "Após adquirir o produto online, você tem <strong>7 dias corridos</strong> após a compra para solicitar o reembolso total.",
              "O processamento será feito em até 7 dias úteis."
            ]
          }
        ],
        "footer": "Ao continuar com a compra, você declara estar de acordo com todos os termos desta política.",
        "checkout": {
          "buttonText": "Ver política de compra",
          "acceptanceText": "Li e aceito a política de compra",
          "acceptanceRequired": "Você precisa aceitar a política de compra para continuar"
        }
      }
    }'::jsonb
),
(
    'curso-online-001',
    'Curso online de exemplo',
    'Curso completo de desenvolvimento',
    true,
    '["credit_card", "pix", "boleto", "asaas_boleto_parcelado"]'::jsonb, -- Permite TODOS os métodos (incluindo boleto parcelado)
    '{
      "type": "course",
      "duration_days": 365,
      "modules": 12,
      "refund_policy": {
        "title": "Política de compra",
        "subtitle": "Para seu curso online",
        "sections": [
          {
            "title": "Cancelamento e reembolso",
            "content": [
              "Você pode solicitar o reembolso integral em <strong>até 7 dias corridos após a compra</strong>.",
              "Conforme o Código de Defesa do Consumidor."
            ]
          },
          {
            "title": "Acesso ao curso",
            "content": [
              "O acesso às aulas é liberado após confirmação do pagamento.",
              "Você terá acesso ao conteúdo pelo período estipulado."
            ]
          }
        ],
        "footer": "Ao continuar com a compra, você declara estar de acordo com todos os termos desta política.",
        "checkout": {
          "buttonText": "Ver política de compra",
          "acceptanceText": "Li e aceito a política de compra",
          "acceptanceRequired": "Você precisa aceitar a política de compra para continuar"
        }
      }
    }'::jsonb
) ON CONFLICT (ref) DO NOTHING;

-- Exemplo de preços para os produtos
-- Buscar IDs dos produtos primeiro
DO $$
DECLARE
    produto_teste_id UUID;
    curso_online_id UUID;
BEGIN
    -- Buscar IDs dos produtos
    SELECT id INTO produto_teste_id FROM payments.products WHERE ref = 'produto-teste-001';
    SELECT id INTO curso_online_id FROM payments.products WHERE ref = 'curso-online-001';
    
    -- Preços para produto-teste-001
    INSERT INTO payments.prices (
        product_id,
        ref,
        amount,
        currency,
        recurring,
        interval,
        interval_count,
        active
    ) VALUES 
    (
        produto_teste_id,
        'produto-teste-001-price-1',
        9990, -- R$ 99,90
        'brl',
        false, -- Pagamento único
        NULL,
        NULL,
        true
    ),
    (
        produto_teste_id,
        'produto-teste-001-price-2',
        14990, -- R$ 149,90
        'brl',
        false,
        NULL,
        NULL,
        true
    ) ON CONFLICT (ref) DO NOTHING;
    
    -- Preços para curso-online-001
    INSERT INTO payments.prices (
        product_id,
        ref,
        amount,
        currency,
        recurring,
        interval,
        interval_count,
        active
    ) VALUES 
    (
        curso_online_id,
        'curso-online-001-price-monthly',
        4990, -- R$ 49,90/mês
        'brl',
        true,
        'month',
        1,
        true
    ),
    (
        curso_online_id,
        'curso-online-001-price-yearly',
        49900, -- R$ 499,00/ano
        'brl',
        true,
        'year',
        1,
        true
    ),
    (
        curso_online_id,
        'curso-online-001-price-lifetime',
        99900, -- R$ 999,00 vitalício
        'brl',
        false,
        NULL,
        NULL,
        true
    ) ON CONFLICT (ref) DO NOTHING;
END $$;

-- Exemplo de profiles de clientes para teste
-- Criar usuários de teste no auth.users primeiro
INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES 
-- Cliente PF 1
(
    '00000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'cliente.pf@example.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"name": "João Silva"}'::jsonb,
    '',
    '',
    '',
    ''
),
-- Cliente PF 2
(
    '00000000-0000-0000-0000-000000000003'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'cliente.pf2@example.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"name": "Maria Santos"}'::jsonb,
    '',
    '',
    '',
    ''
),
-- Cliente PJ
(
    '00000000-0000-0000-0000-000000000004'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'contato@empresa.com.br',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"name": "Empresa Exemplo LTDA"}'::jsonb,
    '',
    '',
    '',
    ''
) ON CONFLICT (id) DO NOTHING;

-- Criar identidades para os usuários de teste
INSERT INTO auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at,
    id
) VALUES 
(
    'cliente.pf@example.com',
    '00000000-0000-0000-0000-000000000002'::uuid,
    '{"sub": "00000000-0000-0000-0000-000000000002", "email": "cliente.pf@example.com", "email_verified": true}'::jsonb,
    'email',
    NOW(),
    NOW(),
    NOW(),
    gen_random_uuid()
),
(
    'cliente.pf2@example.com',
    '00000000-0000-0000-0000-000000000003'::uuid,
    '{"sub": "00000000-0000-0000-0000-000000000003", "email": "cliente.pf2@example.com", "email_verified": true}'::jsonb,
    'email',
    NOW(),
    NOW(),
    NOW(),
    gen_random_uuid()
),
(
    'contato@empresa.com.br',
    '00000000-0000-0000-0000-000000000004'::uuid,
    '{"sub": "00000000-0000-0000-0000-000000000004", "email": "contato@empresa.com.br", "email_verified": true}'::jsonb,
    'email',
    NOW(),
    NOW(),
    NOW(),
    gen_random_uuid()
) ON CONFLICT (provider, provider_id) DO NOTHING;

-- Os profiles serão criados automaticamente pelo trigger payments.handle_new_user()
-- Mas podemos atualizar com mais dados se necessário

-- Cliente PF 1 - João Silva (dados completos)
UPDATE payments.profiles 
SET 
    person_type = 'individual',
    phone = '(11) 98765-4321',
    document = '123.456.789-00',
    billing_street = 'Rua Exemplo',
    billing_number = '123',
    billing_complement = 'Apto 45',
    billing_neighborhood = 'Centro',
    billing_city = 'São Paulo',
    billing_state = 'SP',
    billing_zip = '01234-567',
    billing_country = 'BR'
WHERE id = '00000000-0000-0000-0000-000000000002'::uuid;

-- Cliente PF 2 - Maria Santos (dados básicos)
UPDATE payments.profiles 
SET 
    person_type = 'individual',
    phone = '(21) 99876-5432',
    document = '987.654.321-00'
WHERE id = '00000000-0000-0000-0000-000000000003'::uuid;

-- Cliente PJ - Empresa Exemplo LTDA (dados completos)
UPDATE payments.profiles 
SET 
    person_type = 'company',
    phone = '(11) 3000-1234',
    company_name = 'Empresa Exemplo LTDA',
    company_document = '12.345.678/0001-90',
    state_registration = '123.456.789.012',
    municipal_registration = '98765432',
    billing_street = 'Av. Empresarial',
    billing_number = '1000',
    billing_complement = 'Sala 501',
    billing_neighborhood = 'Centro Empresarial',
    billing_city = 'São Paulo',
    billing_state = 'SP',
    billing_zip = '01310-100',
    billing_country = 'BR'
WHERE id = '00000000-0000-0000-0000-000000000004'::uuid;