# Fluxo de pedidos e pagamentos – formato e lógica

Documento de referência para criação, cancelamento e exclusão de pedidos e pagamentos (Pagarme e Asaas). Define o formato das APIs e a ordem das operações.

---

## 1. Princípios

- **Gateway como fonte da verdade para cobrança:** cancelar/deletar no gateway antes de remover registros no nosso banco.
- **Compliance:** pagamentos `paid`/`approved` não podem ser deletados; apenas cancelados no gateway e depois excluído o registro quando status = `cancelled`.
- **Pedido e pagamento são entidades distintas:** pagamento tem `order_id` (FK opcional). Deletar pagamento não deleta pedido; deletar pedido (delete-permanent) pode desvincular pagamentos (super_admin).

---

## 2. Formato recomendado (APIs admin)

### 2.1 Pagamentos

| Ação | Método | Rota | Regra |
|------|--------|------|--------|
| Cancelar cobrança no gateway | POST | `/api/admin/payments/[id]/cancel?gateway=pagarme\|asaas` | Bloqueado se `paid`/`approved`. Atualiza status para `cancelled`. |
| Excluir registro de pagamento | DELETE | `/api/admin/payments/[id]?gateway=pagarme\|asaas` | Só permitido se `status = cancelled`. Trigger no DB reforça. |


**Query `gateway`:** obrigatório para saber qual tabela (`pagarme_payments` ou `asaas_payments`) e qual serviço chamar. Formato atual é o recomendado.

### 2.2 Pedidos

| Ação | Método | Rota | Regra |
|------|--------|------|--------|
| Exclusão permanente do pedido | POST | `/api/admin/orders/[id]/delete-permanent` | Admin: só sem pagamentos vinculados. Super_admin: desvincula pagamentos e exclui pedido. |

---

## 3. Lógica recomendada (ordem das operações)

### 3.1 Criação (checkout)

Ordem única para os dois gateways:

1. Validar preço/produto, auth, perfil.
2. Verificar pagamento pendente reutilizável (evitar duplicar).
3. Gerar `orderId` (UUID). Se assinatura, criar subscription pendente.
4. **Criar cobrança no gateway** (Pagarme: payment link; Asaas: cliente + cobrança única ou parcelada).
5. **Inserir `orders`** (pedido) com `id = orderId`.
6. **Inserir** `pagarme_payments` ou `asaas_payments` com `order_id: orderId`.

Motivo: se o gateway falhar, não criamos pedido nem pagamento; se a inserção do pedido falhar, temos inconsistência apenas no gateway (link/cobrança órfão), que é menos crítica que pedido órfão no nosso banco.

### 3.2 Remover um pagamento (cancelar + excluir)

Ordem obrigatória:

1. **Cancelar no gateway**  
   POST `/api/admin/payments/[id]/cancel?gateway=...`  
   → Chama gateway (Pagar.me: cancel link; Asaas: delete payment ou cancel installments) e atualiza status para `cancelled`.

2. **Excluir registro**  
   DELETE `/api/admin/payments/[id]?gateway=...`  
   → Só é permitido com `status = cancelled` (API + trigger `prevent_payment_delete`).

O pedido **não** é deletado. Fica com ou sem pagamentos vinculados, conforme regra de negócio (ex.: listar pedidos “sem pagamento ativo”).

### 3.3 Remover pedido (exclusão permanente)

- **Admin (não super):** só pode excluir pedido **sem** pagamentos vinculados.
- **Super_admin:** pode excluir mesmo com pagamentos; o sistema **desvincula** (`order_id = null`) e depois exclui o pedido. Os registros de pagamento permanecem (compliance/auditoria).

Se o objetivo for “sumir com pedido e seu pagamento pendente”:

1. Cancelar cobrança (POST cancel).
2. Excluir pagamento (DELETE payments/[id]).
3. Excluir pedido (POST orders/[id]/delete-permanent).

Ou, como super_admin: excluir pedido (desvincula e remove o pedido); o pagamento continua no banco até alguém cancelar link e excluir manualmente, se desejado.

---

## 4. Resumo visual

```
CRIAÇÃO (checkout)
  Gateway (link/cobrança) → Order → Payment (order_id)

CANCELAR + EXCLUIR PAGAMENTO
  POST cancel (gateway + status=cancelled) → DELETE payment (só se cancelled)

EXCLUIR PEDIDO
  POST delete-permanent
  - Admin: só sem pagamentos
  - Super_admin: desvincula pagamentos → delete order
```

---

## 5. Referências no código

- Criação: `packages/core/src/routes/pagarme-checkout.ts`, `asaas-checkout.ts`
- Cancelar cobrança: `front-pagamento/src/app/api/admin/payments/[id]/cancel/route.ts`
- DELETE pagamento: `front-pagamento/src/app/api/admin/payments/[id]/route.ts`
- Trigger: `front-pagamento/supabase/migrations/20260313160500_allow_delete_only_cancelled_payments.sql`
- Delete pedido: `front-pagamento/src/app/api/admin/orders/[id]/delete-permanent/route.ts`

---

**Versão:** 1.0  
**Projeto:** Quitou
