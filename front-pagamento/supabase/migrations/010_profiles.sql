-- ==========================================
-- MIGRATION: Profiles (Clientes)
-- ==========================================
-- Tabela para armazenar dados dos clientes/usuários que fazem pagamentos
-- Relacionada com auth.users do Supabase Auth
-- Separada do public.profiles para não conflitar com outras aplicações

-- ==========================================
-- TABELA: profiles
-- ==========================================

CREATE TABLE payments.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    
    -- Tipo de pessoa
    person_type TEXT DEFAULT 'individual' CHECK (person_type IN ('individual', 'company')),
    
    -- Dados de Pessoa Física
    document TEXT, -- CPF
    
    -- Dados de Pessoa Jurídica
    company_name TEXT, -- Razão Social
    company_document TEXT, -- CNPJ
    state_registration TEXT, -- Inscrição Estadual (IE)
    municipal_registration TEXT, -- Inscrição Municipal (IM)
    
    -- Endereço de cobrança (campos separados para validação e queries)
    billing_street TEXT,
    billing_number TEXT,
    billing_complement TEXT,
    billing_neighborhood TEXT,
    billing_city TEXT,
    billing_state TEXT, -- UF com 2 caracteres
    billing_zip TEXT, -- CEP
    billing_country TEXT DEFAULT 'BR', -- Código ISO do país
    
    -- Metadados (IDs de clientes nos gateways, etc)
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- ÍNDICES
-- ==========================================

CREATE INDEX idx_profiles_email ON payments.profiles(email);
CREATE INDEX idx_profiles_document ON payments.profiles(document) WHERE document IS NOT NULL;
CREATE INDEX idx_profiles_company_document ON payments.profiles(company_document) WHERE company_document IS NOT NULL;
CREATE INDEX idx_profiles_person_type ON payments.profiles(person_type);
CREATE INDEX idx_profiles_billing_city ON payments.profiles(billing_city) WHERE billing_city IS NOT NULL;
CREATE INDEX idx_profiles_billing_state ON payments.profiles(billing_state) WHERE billing_state IS NOT NULL;
CREATE INDEX idx_profiles_billing_zip ON payments.profiles(billing_zip) WHERE billing_zip IS NOT NULL;
CREATE INDEX idx_profiles_created_at ON payments.profiles(created_at DESC);

-- ==========================================
-- TRIGGER: Atualizar updated_at
-- ==========================================

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON payments.profiles
    FOR EACH ROW
    EXECUTE FUNCTION payments.update_updated_at_column();

-- ==========================================
-- RLS (Row Level Security)
-- ==========================================

ALTER TABLE payments.profiles ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver apenas seus próprios dados
CREATE POLICY "Usuários podem ver seus próprios dados" ON payments.profiles
    FOR SELECT USING (auth.uid() = id);

-- Usuários podem atualizar apenas seus próprios dados
CREATE POLICY "Usuários podem atualizar seus próprios dados" ON payments.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Admins podem ver todos os profiles
CREATE POLICY "Admins podem ver todos os profiles" ON payments.profiles
    FOR SELECT USING (payments.is_admin_user());

-- Admins podem atualizar qualquer profile
CREATE POLICY "Admins podem atualizar qualquer profile" ON payments.profiles
    FOR UPDATE USING (payments.is_admin_user());

-- Admins podem inserir profiles
CREATE POLICY "Admins podem criar profiles" ON payments.profiles
    FOR INSERT WITH CHECK (payments.is_admin_user());

-- ==========================================
-- FUNÇÃO: Criar ou atualizar profile
-- ==========================================

CREATE OR REPLACE FUNCTION payments.upsert_profile(
    user_id UUID,
    user_email TEXT,
    user_name TEXT,
    user_phone TEXT DEFAULT NULL,
    user_person_type TEXT DEFAULT 'individual',
    user_document TEXT DEFAULT NULL,
    user_company_name TEXT DEFAULT NULL,
    user_company_document TEXT DEFAULT NULL,
    user_state_registration TEXT DEFAULT NULL,
    user_municipal_registration TEXT DEFAULT NULL,
    user_billing_street TEXT DEFAULT NULL,
    user_billing_number TEXT DEFAULT NULL,
    user_billing_complement TEXT DEFAULT NULL,
    user_billing_neighborhood TEXT DEFAULT NULL,
    user_billing_city TEXT DEFAULT NULL,
    user_billing_state TEXT DEFAULT NULL,
    user_billing_zip TEXT DEFAULT NULL,
    user_billing_country TEXT DEFAULT 'BR',
    user_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS payments.profiles AS $$
DECLARE
    result payments.profiles;
BEGIN
    INSERT INTO payments.profiles (
        id,
        email,
        name,
        phone,
        person_type,
        document,
        company_name,
        company_document,
        state_registration,
        municipal_registration,
        billing_street,
        billing_number,
        billing_complement,
        billing_neighborhood,
        billing_city,
        billing_state,
        billing_zip,
        billing_country,
        metadata
    ) VALUES (
        user_id,
        user_email,
        user_name,
        user_phone,
        user_person_type,
        user_document,
        user_company_name,
        user_company_document,
        user_state_registration,
        user_municipal_registration,
        user_billing_street,
        user_billing_number,
        user_billing_complement,
        user_billing_neighborhood,
        user_billing_city,
        user_billing_state,
        user_billing_zip,
        user_billing_country,
        user_metadata
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        phone = COALESCE(EXCLUDED.phone, payments.profiles.phone),
        person_type = COALESCE(EXCLUDED.person_type, payments.profiles.person_type),
        document = COALESCE(EXCLUDED.document, payments.profiles.document),
        company_name = COALESCE(EXCLUDED.company_name, payments.profiles.company_name),
        company_document = COALESCE(EXCLUDED.company_document, payments.profiles.company_document),
        state_registration = COALESCE(EXCLUDED.state_registration, payments.profiles.state_registration),
        municipal_registration = COALESCE(EXCLUDED.municipal_registration, payments.profiles.municipal_registration),
        billing_street = COALESCE(EXCLUDED.billing_street, payments.profiles.billing_street),
        billing_number = COALESCE(EXCLUDED.billing_number, payments.profiles.billing_number),
        billing_complement = COALESCE(EXCLUDED.billing_complement, payments.profiles.billing_complement),
        billing_neighborhood = COALESCE(EXCLUDED.billing_neighborhood, payments.profiles.billing_neighborhood),
        billing_city = COALESCE(EXCLUDED.billing_city, payments.profiles.billing_city),
        billing_state = COALESCE(EXCLUDED.billing_state, payments.profiles.billing_state),
        billing_zip = COALESCE(EXCLUDED.billing_zip, payments.profiles.billing_zip),
        billing_country = COALESCE(EXCLUDED.billing_country, payments.profiles.billing_country),
        metadata = payments.profiles.metadata || EXCLUDED.metadata,
        updated_at = NOW()
    RETURNING * INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = payments, public, auth;

-- ==========================================
-- FUNÇÃO: Obter profile atual
-- ==========================================

CREATE OR REPLACE FUNCTION payments.get_current_profile()
RETURNS payments.profiles AS $$
DECLARE
    result payments.profiles;
BEGIN
    SELECT * INTO result
    FROM payments.profiles
    WHERE id = auth.uid();

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = payments, public, auth;

-- ==========================================
-- FUNÇÃO: Criar profile automaticamente após auth
-- ==========================================

CREATE OR REPLACE FUNCTION payments.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO payments.profiles (id, email, name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
    )
    ON CONFLICT (id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = payments, public, auth;

-- Trigger para criar profile automaticamente quando usuário se registra
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION payments.handle_new_user();

-- ==========================================
-- COMENTÁRIOS
-- ==========================================

COMMENT ON TABLE payments.profiles IS 'Perfis de usuários/clientes do sistema de pagamentos (separado de public.profiles)';
COMMENT ON COLUMN payments.profiles.id IS 'UUID do usuário (referência para auth.users)';
COMMENT ON COLUMN payments.profiles.email IS 'Email do usuário';
COMMENT ON COLUMN payments.profiles.name IS 'Nome completo (PF) ou Nome Fantasia (PJ)';
COMMENT ON COLUMN payments.profiles.phone IS 'Telefone do usuário (formato: (99) 99999-9999)';
COMMENT ON COLUMN payments.profiles.person_type IS 'Tipo de pessoa: individual (PF) ou company (PJ)';
COMMENT ON COLUMN payments.profiles.document IS 'CPF (apenas para PF) - formato: 999.999.999-99';
COMMENT ON COLUMN payments.profiles.company_name IS 'Razão Social (apenas para PJ)';
COMMENT ON COLUMN payments.profiles.company_document IS 'CNPJ (apenas para PJ) - formato: 99.999.999/9999-99';
COMMENT ON COLUMN payments.profiles.state_registration IS 'Inscrição Estadual (IE) - opcional para PJ';
COMMENT ON COLUMN payments.profiles.municipal_registration IS 'Inscrição Municipal (IM) - opcional para PJ';
COMMENT ON COLUMN payments.profiles.billing_street IS 'Logradouro (rua, avenida, etc)';
COMMENT ON COLUMN payments.profiles.billing_number IS 'Número do endereço';
COMMENT ON COLUMN payments.profiles.billing_complement IS 'Complemento (apto, sala, bloco, etc) - opcional';
COMMENT ON COLUMN payments.profiles.billing_neighborhood IS 'Bairro';
COMMENT ON COLUMN payments.profiles.billing_city IS 'Cidade';
COMMENT ON COLUMN payments.profiles.billing_state IS 'Estado - UF com 2 caracteres (SP, RJ, MG, etc)';
COMMENT ON COLUMN payments.profiles.billing_zip IS 'CEP - formato: 99999-999';
COMMENT ON COLUMN payments.profiles.billing_country IS 'País - código ISO 3166-1 alpha-2 (BR, US, etc)';
COMMENT ON COLUMN payments.profiles.metadata IS 'Metadados adicionais (customer_ids dos gateways: pagarme_customer_id, asaas_customer_id, etc)';

COMMENT ON FUNCTION payments.upsert_profile IS 'Cria ou atualiza um profile no sistema de pagamentos';
COMMENT ON FUNCTION payments.get_current_profile IS 'Retorna o profile do usuário atual autenticado';
COMMENT ON FUNCTION payments.handle_new_user IS 'Cria automaticamente um profile quando um novo usuário se registra';

-- ==========================================
-- ADICIONAR FOREIGN KEYS para payments.profiles
-- ==========================================
-- As colunas user_id já existem nas migrations 003, 004, 005
-- Agora que profiles existe, adicionamos as FKs

-- subscriptions.user_id → payments.profiles.id
ALTER TABLE payments.subscriptions
    DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;

ALTER TABLE payments.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES payments.profiles(id)
    ON DELETE NO ACTION;

-- pagarme_payments.user_id → payments.profiles.id
ALTER TABLE payments.pagarme_payments
    DROP CONSTRAINT IF EXISTS pagarme_payments_user_id_fkey;

ALTER TABLE payments.pagarme_payments
    ADD CONSTRAINT pagarme_payments_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES payments.profiles(id)
    ON DELETE NO ACTION;

-- asaas_payments.user_id → payments.profiles.id
ALTER TABLE payments.asaas_payments
    DROP CONSTRAINT IF EXISTS asaas_payments_user_id_fkey;

ALTER TABLE payments.asaas_payments
    ADD CONSTRAINT asaas_payments_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES payments.profiles(id)
    ON DELETE NO ACTION;

COMMENT ON CONSTRAINT subscriptions_user_id_fkey ON payments.subscriptions
    IS 'Referência para payments.profiles';

COMMENT ON CONSTRAINT pagarme_payments_user_id_fkey ON payments.pagarme_payments
    IS 'Referência para payments.profiles';

COMMENT ON CONSTRAINT asaas_payments_user_id_fkey ON payments.asaas_payments
    IS 'Referência para payments.profiles';

