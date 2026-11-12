# Análise Asaas como gateway prioritário e plano de testes

## Resumo executivo

O sistema está em transição para usar **Asaas como gateway prioritário**, com Pagarme apenas para casos esporádicos. As alterações não commitadas já implementam a maior parte do fluxo. Este documento consolida a análise do funcionamento do Asaas, o que foi alterado e o que falta validar via testes.

---

## 1. Como funciona o Asaas (via MCP e API)

### 1.1 API Asaas – principais endpoints

| Endpoint | Método | Uso no sistema |
|----------|--------|----------------|
| `/v3/payments` | POST | Criar cobrança (única ou parcelada) |
| `/v3/payments/{id}` | GET | Buscar status do pagamento |
| `/v3/payments/{id}/pixQrCode` | GET | Obter QR Code e payload PIX |
| `/v3/customers` | POST | Criar cliente |
| `/v3/customers?cpfCnpj=` | GET | Buscar cliente por CPF/CNPJ |

### 1.2 Resposta da criação de pagamento (PaymentGetResponseDTO)

- `id` – ID do pagamento no Asaas
- `invoiceUrl` – URL da página de pagamento hospedada pelo Asaas
- `bankSlipUrl` – URL do boleto (quando BOLETO)
- `status` – PENDING, RECEIVED, CONFIRMED, etc.
- `installment` – ID do parcelamento (quando parcelado)

### 1.3 Webhooks Asaas

Eventos tratados no sistema:

- `PAYMENT_RECEIVED` – Pagamento recebido
- `PAYMENT_CONFIRMED` – Pagamento confirmado
- `PAYMENT_REFUNDED` – Estorno

---

## 2. Alterações já feitas (não commitadas)

### 2.1 Backend (packages/core)

| Arquivo | Alteração |
|---------|-----------|
| `asaas.service.ts` | Serviço completo: createCustomer, getCustomerByCpfCnpj, createPayment, createInstallments, getPayment, getPixQrCode, deletePayment, cancelInstallmentPayments |
| `asaas-checkout.ts` | Handler de checkout com deduplicação (reutiliza cobrança pendente em 7 dias), criação de order, persistência em asaas_payments |
| `asaas-webhook.ts` | Processa PAYMENT_RECEIVED, PAYMENT_CONFIRMED, PAYMENT_REFUNDED; atualiza asaas_payments e orders; ativa subscription |
| `payment-methods.ts` | `getGatewayForMethod()` sempre retorna `'asaas'` |

### 2.2 Frontend (front-pagamento)

| Arquivo | Alteração |
|---------|-----------|
| `checkout/[priceId]/page.tsx` | Gateway fixo `asaas`, endpoint `/api/payments/asaas/checkout`, `paymentLinkUrl` de `invoice_url` ou `bank_slip_url` |
| `checkout-form.tsx` | `selectedGateway: 'asaas'` fixo, validação sempre para Asaas |
| `checkout-form-content.ts` | Interface com `selectedGateway` |
| `checkout-validation.ts` | CPF/CNPJ e endereço sempre obrigatórios (Asaas) |
| `gateway-selector.tsx` | Apenas métodos Asaas: PIX, boleto, cartão, boleto parcelado |
| `payment-status.tsx` | Suporta gateway `asaas` (invoice_url, boleto_url, pix_qr_code, pix_code) |
| `use-payment-polling.ts` | Realtime em `asaas_payments`, callbacks para PIX/boleto |

### 2.3 API routes

| Arquivo | Alteração |
|---------|-----------|
| `api/payments/[id]/status/route.ts` | Suporte a `gateway=asaas`, select de `invoice_url`, `boleto_url`, `pix_qr_code`, `pix_code` |
| `api/payments/asaas/checkout/route.ts` | Wrapper do handler do core |
| `api/payments/asaas/webhook/route.ts` | Webhook Asaas |

### 2.4 Migrations

| Arquivo | Alteração |
|---------|-----------|
| `20260319000000_asaas_pix_code_and_invoice_url.sql` | Adiciona `pix_code` e `invoice_url` em `asaas_payments` |

---

## 3. Fluxo de pagamento Asaas

```
1. Usuário acessa /checkout/[priceId]
2. Autenticação (OTP se necessário)
3. Preenche dados (CPF/CNPJ, endereço obrigatórios)
4. Escolhe método: PIX, boleto, cartão ou boleto parcelado
5. POST /api/payments/asaas/checkout
   ├─ Se cobrança pendente (7 dias): retorna existente
   └─ Senão: cria cliente, cobrança no Asaas, order, asaas_payments
6. Frontend exibe PaymentStatus com:
   - invoice_url (link de pagamento)
   - boleto_url (quando boleto)
   - pix_qr_code + pix_code (quando PIX)
7. Realtime escuta UPDATE em asaas_payments
8. Webhook Asaas → atualiza status para paid → Realtime notifica → onSuccess → redirect /checkout/confirmation
9. Usuário pode voltar (onBack) e tentar novamente
```

### 3.1 Reutilização de cobrança pendente

- Mesmo `user_id`, `price_id`, `product_id`, `status=pending`, `billing_type`, `installments`
- Dentro de 7 dias
- Order não deletada (se houver)
- Retorna cobrança existente em vez de criar nova

---

## 4. Pontos de atenção

### 4.1 RLS e autenticação

- `GET /api/payments/[id]/status` usa `createClient()` (cookies da requisição)
- RLS: `auth.uid() = user_id` → usuário precisa estar autenticado
- Fetch do frontend é same-origin → cookies enviados por padrão

### 4.2 Boleto parcelado

- Asaas retorna `installment` (ID do parcelamento)
- Primeira parcela: `installmentsData.bankSlipUrl` ou similar
- Demais parcelas: enviadas por e-mail pelo Asaas

### 4.3 PIX

- QR Code obtido via `getPixQrCode(payment.id)` após criar cobrança
- Fallback: `invoiceUrl` se QR falhar
- Expira em ~30 minutos

### 4.4 Cartão de crédito

- Asaas redireciona para página própria
- `invoiceUrl` leva o cliente à tela de pagamento com cartão

---

## 5. Plano de testes

### 5.1 Testes unitários a criar/expandir

| Arquivo | Testes |
|---------|--------|
| `packages/core/src/payments/services/asaas.service.test.ts` | `createCustomer`, `createPayment`, `getPixQrCode`, `getPayment` (já tem deletePayment e cancelInstallmentPayments) |
| `packages/core/src/routes/asaas-checkout.test.ts` (novo) | Validação de body, erro 404 para price inexistente, deduplicação (mock de cobrança existente), criação de pagamento único e parcelado |
| `packages/core/src/routes/asaas-webhook.test.ts` (novo) | PAYMENT_CONFIRMED atualiza status, PAYMENT_REFUNDED, idempotência (já processado), token inválido 401 |
| `front-pagamento/src/app/api/payments/[id]/status/route.test.ts` (novo) | Retorna 400 sem gateway, retorna 400 com gateway inválido, retorna 404 para pagamento inexistente, retorna dados corretos para asaas (invoice_url, pix_code) |
| `front-pagamento/src/hooks/use-payment-polling.test.ts` (novo) | Chama onSuccess quando status paid, chama onPixGenerated quando pix_qr_code presente |

### 5.2 Testes de integração / E2E sugeridos

| Cenário | Passos |
|---------|--------|
| Checkout PIX completo | Login → checkout → PIX → pagar (sandbox) → confirmação |
| Checkout boleto completo | Login → checkout → boleto → abrir link → confirmação (simular) |
| Reutilização de cobrança | Criar checkout → fechar sem pagar → voltar ao checkout → mesma cobrança retornada |
| Voltar e tentar novamente | Checkout → ver PIX → Voltar → alterar método → novo checkout |
| Webhook PAYMENT_CONFIRMED | Simular webhook → verificar asaas_payments.status=paid e orders.status=paid |

### 5.3 Testes manuais recomendados

1. **Sandbox Asaas**: criar cobrança PIX e pagar com QR Code de teste
2. **Boleto**: gerar boleto e verificar link/linha digitável
3. **Boleto parcelado**: verificar primeira parcela e e-mail das demais
4. **Cartão**: redirecionamento para página Asaas
5. **Deduplicação**: mesmo usuário, mesmo produto, tentar checkout 2x em sequência
6. **Realtime**: deixar tela aberta, pagar em outro dispositivo, ver atualização automática

---

## 6. Checklist pré-commit

- [ ] Migration `20260319000000_asaas_pix_code_and_invoice_url.sql` aplicada
- [ ] Variáveis: `ASAAS_API_KEY`, `ASAAS_ENVIRONMENT`, `ASAAS_WEBHOOK_SECRET`
- [ ] Webhook Asaas configurado no painel (URL + token)
- [ ] Realtime habilitado para `asaas_payments` no Supabase
- [ ] Testes unitários passando
- [ ] Teste manual em sandbox

---

## 7. Auditoria (database-architect, devops-engineer, backend-specialist)

### Correções aplicadas

| # | Problema | Correção |
|---|----------|----------|
| 1 | Webhook parcelas 2+ não encontrava registro | Usar `payment.installment` na busca quando existir; `idForInstallment = installment \|\| id` |
| 2 | Schema webhook sem `installment` | Adicionado `installment` opcional em `asaasWebhookPayloadSchema` |
| 3 | Docs com `ASAAS_WEBHOOK_TOKEN` | Corrigido para `ASAAS_WEBHOOK_SECRET` |
| 4 | Boleto parcelado: IDs incorretos no checkout | `asaas_installment_id = payment.installment`; `asaas_payment_id = payment.id` (primeira parcela) |
| 5 | Sanitização de IDs no webhook | `sanitizeAsaasId()` com regex para evitar injeção |
| 6 | Índice para deduplicação | Migration `20260319005725_asaas_payments_dedup_idx.sql` |

### Pontos de atenção (não implementados)

- **Timeout nas chamadas à API Asaas**: considerar `AbortController` com 30s
- **4xx da API**: mapear para `ValidationError` em vez de `InternalServerError`
- **Health check específico**: endpoint `GET /api/health/asaas` para validar conexão
- **Persistência de erros de checkout**: tabela `checkout_errors` para análise pós-incidente

---

## 8. Próximos passos (opcional)

1. **Pagarme como fallback**: manter seletor de gateway para casos esporádicos (ex.: flag por produto ou usuário)
2. **Retry de webhook**: política de retry se processamento falhar
3. **Logs**: `webhook_events` já registra payloads; considerar alertas para erros recorrentes
4. **Cobranças vencidas**: job para marcar `overdue` ou notificar usuário
