# Integridade Referencial - Sistema de Pagamentos

**CONFORMIDADE:** Lei 12.741/2012, LGPD, Receita Federal, PCI-DSS  
**ÚLTIMA REVISÃO:** 2025-10-13  
**MIGRATIONS:** 015, 016, 017

---

## 🎯 Princípios de Negócio

### 1. **Dados Fiscais são PERMANENTES** 🔒

- ✅ **Pagamentos NUNCA são deletados** (Receita Federal: 5 anos)
- ✅ **Orders NUNCA são deletados** (histórico de vendas)
- ✅ **Produtos/Preços NUNCA são deletados** (histórico do catálogo)
- ✅ **Use SOFT DELETE** (`deleted_at`) para marcar como inativo

### 2. **Proteção contra Perda de Dados** 🛡️

- ❌ **CASCADE em pagamentos = PROIBIDO** (dados fiscais)
- ❌ **CASCADE em orders = PROIBIDO** (histórico de vendas)
- ✅ **NO ACTION** = Bloqueia delete se tiver dependências
- ✅ **SET NULL** = Permite delete mas mantém o registro

### 3. **Auditoria e Compliance** 📋

- **Receita Federal:** 5 anos de histórico fiscal
- **LGPD Art. 16:** Direito à retificação (não deleção)
- **PCI-DSS:** Auditoria de transações
- **NFe:** Emissão de 2ª via (precisa do histórico)

---

## 📊 Mapa de Constraints (Estado Final)

### ✅ **PAGAMENTOS (Dados Fiscais)**

| Tabela             | Coluna            | Referencia      | Delete Rule   | Motivo                         |
| ------------------ | ----------------- | --------------- | ------------- | ------------------------------ |
| `asaas_payments`   | `order_id`        | `orders`        | **NO ACTION** | 🔒 Protege dados fiscais       |
| `asaas_payments`   | `price_id`        | `prices`        | **NO ACTION** | 🔒 Histórico de preço          |
| `asaas_payments`   | `product_id`      | `products`      | **NO ACTION** | 🔒 Histórico do produto        |
| `asaas_payments`   | `subscription_id` | `subscriptions` | **SET NULL**  | ✅ Permite cancelar assinatura |
| `pagarme_payments` | `order_id`        | `orders`        | **NO ACTION** | 🔒 Protege dados fiscais       |
| `pagarme_payments` | `price_id`        | `prices`        | **NO ACTION** | 🔒 Histórico de preço          |
| `pagarme_payments` | `product_id`      | `products`      | **NO ACTION** | 🔒 Histórico do produto        |
| `pagarme_payments` | `subscription_id` | `subscriptions` | **SET NULL**  | ✅ Permite cancelar assinatura |

**TRIGGERS:**

- ❌ **DELETE bloqueado** por `prevent_payment_delete()` (extra safety)
- ✅ Use `status = 'cancelled'` ou `refunded_at` para cancelamentos

---

### ✅ **ORDERS (Histórico de Vendas)**

| Tabela   | Coluna            | Referencia      | Delete Rule   | Motivo                         |
| -------- | ----------------- | --------------- | ------------- | ------------------------------ |
| `orders` | `product_id`      | `products`      | **NO ACTION** | 🔒 Histórico do catálogo       |
| `orders` | `price_id`        | `prices`        | **NO ACTION** | 🔒 Histórico de preços         |
| `orders` | `subscription_id` | `subscriptions` | **SET NULL**  | ✅ Permite cancelar assinatura |

**SOFT DELETE:**

- ✅ Coluna `deleted_at` (marcar como deletado)
- ✅ Coluna `deleted_by` (quem deletou)
- ✅ Índice `idx_orders_not_deleted` (performance)

**NÃO PODE DELETAR SE:**

- ❌ Tiver pagamentos vinculados (bloqueado por FK)
- ✅ **SOLUÇÃO:** Marcar `deleted_at = NOW()`

---

### ✅ **ASSINATURAS (Recorrência)**

| Tabela          | Coluna     | Referencia | Delete Rule   | Motivo                 |
| --------------- | ---------- | ---------- | ------------- | ---------------------- |
| `subscriptions` | `user_id`  | `profiles` | **NO ACTION** | 🔒 Protege histórico   |
| `subscriptions` | `price_id` | `prices`   | **NO ACTION** | 🔒 Histórico de preços |

**NÃO PODE DELETAR SE:**

- ❌ Tiver pagamentos vinculados (protege dados fiscais)
- ✅ **SOLUÇÃO:** `status = 'cancelled'` + `cancelled_at`

---

### ✅ **PRODUTOS E PREÇOS (Catálogo)**

| Tabela   | Coluna       | Referencia | Delete Rule   | Motivo              |
| -------- | ------------ | ---------- | ------------- | ------------------- |
| `prices` | `product_id` | `products` | **NO ACTION** | 🔒 Protege catálogo |

**NÃO PODE DELETAR SE:**

- ❌ Produto tiver preços vinculados
- ❌ Preço tiver orders/subscriptions/pagamentos
- ✅ **SOLUÇÃO:** `is_active = false` + `deleted_at`

---

### ✅ **LOGS (Auditoria)**

| Tabela       | Coluna             | Referencia       | Delete Rule  | Motivo                     |
| ------------ | ------------------ | ---------------- | ------------ | -------------------------- |
| `email_logs` | `order_id`         | `orders`         | **SET NULL** | ✅ LGPD: pode deletar user |
| `email_logs` | `webhook_event_id` | `webhook_events` | **SET NULL** | ✅ Permite limpar webhooks |

**LGPD COMPLIANCE:**

- ✅ Deletar user → `order_id = NULL` (anonimiza)
- ✅ Mantém log para auditoria (sem identificar pessoa)

---

## 🚫 O que NUNCA pode fazer

```sql
-- ❌ DELETAR PAGAMENTO (ILEGAL)
DELETE FROM asaas_payments WHERE id = '...';
-- RESULTADO: Bloqueado por trigger prevent_payment_delete()

-- ❌ DELETAR ORDER COM PAGAMENTO
DELETE FROM orders WHERE id = '...';
-- RESULTADO: ERROR: violates foreign key constraint

-- ❌ DELETAR PRODUTO COM PREÇOS/ORDERS
DELETE FROM products WHERE id = '...';
-- RESULTADO: ERROR: violates foreign key constraint
```

---

## ✅ Como deletar corretamente

### **Orders (Soft Delete)**

```sql
-- ✅ CORRETO: Marcar como deletado
UPDATE orders
SET deleted_at = NOW(), deleted_by = auth.uid()
WHERE id = '...';

-- Buscar apenas ativos
SELECT * FROM orders WHERE deleted_at IS NULL;
```

### **Produtos (Desativar)**

```sql
-- ✅ CORRETO: Desativar produto
UPDATE products
SET is_active = FALSE, deleted_at = NOW()
WHERE id = '...';
```

### **Assinaturas (Cancelar)**

```sql
-- ✅ CORRETO: Cancelar assinatura
UPDATE subscriptions
SET status = 'cancelled', cancelled_at = NOW()
WHERE id = '...';
```

### **Pagamentos (Cancelar/Reembolsar)**

```sql
-- ✅ CORRETO: Marcar como cancelado
UPDATE asaas_payments
SET status = 'cancelled', refunded_at = NOW()
WHERE id = '...';

-- ❌ NUNCA DELETE!
```

---

## 🔍 Como verificar no banco

### **Listar todas as FKs e regras**

```sql
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS references,
    rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'payments'
ORDER BY tc.table_name;
```

### **Verificar se pode deletar um order**

```sql
-- Verificar pagamentos vinculados
SELECT COUNT(*) FROM asaas_payments WHERE order_id = 'order-id';
SELECT COUNT(*) FROM pagarme_payments WHERE order_id = 'order-id';

-- Se COUNT > 0 → NÃO PODE DELETAR
-- Solução: Soft delete (deleted_at)
```

### **Verificar se pode deletar um produto**

```sql
-- Verificar preços
SELECT COUNT(*) FROM prices WHERE product_id = 'product-id';

-- Verificar orders
SELECT COUNT(*) FROM orders WHERE product_id = 'product-id';

-- Verificar pagamentos
SELECT COUNT(*) FROM asaas_payments WHERE product_id = 'product-id';

-- Se COUNT > 0 em qualquer → NÃO PODE DELETAR
-- Solução: is_active = false
```

---

## 📋 Resumo das Regras

| Entidade           | Pode deletar?      | Como "deletar"?                       | Motivo                   |
| ------------------ | ------------------ | ------------------------------------- | ------------------------ |
| **Pagamentos**     | ❌ **NUNCA**       | `status = 'cancelled'`                | Dados fiscais            |
| **Orders**         | ❌ **NUNCA**       | `deleted_at = NOW()`                  | Histórico de vendas      |
| **Produtos**       | ❌ **NUNCA**       | `is_active = false`                   | Histórico do catálogo    |
| **Assinaturas**    | ❌ **NUNCA**       | `status = 'cancelled'`                | Histórico de recorrência |
| **Usuários**       | ⚠️ **COM CUIDADO** | Verificar assinaturas/orders primeiro | LGPD + histórico         |
| **Email Logs**     | ✅ Sim             | `DELETE` normal                       | SET NULL anonimiza       |
| **Webhook Events** | ✅ Sim             | `DELETE` normal                       | Logs técnicos            |

---

## 🛡️ Proteções Implementadas

### **1. Constraints NO ACTION**

- ✅ Bloqueia DELETE se tiver dependências
- ✅ Protege dados fiscais automaticamente
- ✅ Força a pensar antes de deletar

### **2. Triggers de Proteção**

```sql
-- prevent_payment_delete()
-- BLOQUEIA qualquer DELETE em pagamentos
-- ERRO: "PROIBIDO: Pagamentos não podem ser deletados (dados fiscais)"
```

### **3. Soft Delete**

- ✅ `orders.deleted_at` (marcar como deletado)
- ✅ `products.deleted_at` (desativar produto)
- ✅ Índices otimizados para `WHERE deleted_at IS NULL`

### **4. SET NULL (Anonimização)**

- ✅ Deletar user → `email_logs.order_id = NULL` (LGPD)
- ✅ Deletar subscription → `payments.subscription_id = NULL`
- ✅ Mantém dados fiscais sem violar LGPD

---

## 🔧 Migrations Aplicadas

### **015_fix_referential_integrity.sql**

- ✅ `prices → products`: CASCADE → **NO ACTION**
- ✅ `subscriptions → profiles`: CASCADE → **NO ACTION**
- ✅ `asaas_payments → subscriptions`: CASCADE → **SET NULL**

### **016_fix_payment_constraints.sql**

- ✅ `asaas_payments → orders`: CASCADE → **NO ACTION**
- ✅ Trigger `prevent_payment_delete()` (bloqueio HARD)
- ✅ Soft delete em `orders` (`deleted_at`, `deleted_by`)

### **017_fix_pagarme_order_fk.sql**

- ✅ `pagarme_payments.order_id`: TEXT → **UUID**
- ✅ `pagarme_payments → orders`: **NO ACTION**
- ✅ Migração de dados existentes preservada

---

## ✅ Estado Final: **COMPLIANCE TOTAL**

```
🔒 DADOS FISCAIS PROTEGIDOS
   ├─ asaas_payments → orders (NO ACTION)
   ├─ pagarme_payments → orders (NO ACTION)
   └─ Trigger: DELETE bloqueado

🔒 HISTÓRICO PRESERVADO
   ├─ orders → products/prices (NO ACTION)
   ├─ subscriptions → profiles/prices (NO ACTION)
   └─ Soft delete implementado

✅ LGPD COMPLIANCE
   ├─ email_logs → orders (SET NULL)
   └─ Anonimização sem perda de auditoria

✅ RECEITA FEDERAL
   ├─ 5 anos de histórico fiscal garantido
   ├─ NFe: 2ª via possível
   └─ Auditoria completa
```

---

## 📚 Referências Legais

- **Lei 12.741/2012:** Nota Fiscal Eletrônica (NFe)
- **Código Tributário Nacional:** Art. 195 (5 anos de documentos fiscais)
- **LGPD Art. 16:** Direito à retificação (não deleção total)
- **LGPD Art. 18:** Anonimização após término do tratamento
- **PCI-DSS Req 10:** Auditoria de transações (rastreabilidade)

---

## 🎯 Conclusão

✅ **Sistema SEGURO e LEGAL**  
✅ **Dados fiscais PROTEGIDOS**  
✅ **LGPD COMPLIANT**  
✅ **Auditoria COMPLETA**  
✅ **Sem perda de dados**

**NUNCA deletar pagamentos/orders/produtos diretamente.**  
**SEMPRE usar soft delete ou status.**
