-- ==========================================
-- MIGRATION: Enable Realtime for Payments Tables
-- Descrição: Adiciona tabelas de pagamento à publicação do Realtime
-- Data: 2025-01-XX
-- ==========================================
-- Adicionar tabelas de pagamento à publicação do Realtime
-- Isso permite que o Supabase Realtime monitore mudanças nessas tabelas
-- para atualizações de status em tempo real via postgres_changes
-- RLS garante que usuários só recebem atualizações de seus próprios pagamentos
alter publication supabase_realtime add table "payments"."pagarme_payments";

alter publication supabase_realtime add table "payments"."asaas_payments";