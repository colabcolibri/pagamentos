# Payment Components

Componentes reutilizáveis para fluxo de pagamento com polling em tempo real.

## 📦 Componentes

### `PaymentStatus`

Dialog inteligente que monitora o status do pagamento em tempo real via polling.

**Funcionalidades:**

- ✅ Polling automático a cada 3 segundos
- ✅ Detecta PIX, Boleto e Cartão de Crédito
- ✅ Exibe QR Code PIX e botão para copiar código
- ✅ Link para abrir boleto
- ✅ Callback de sucesso quando pagamento é confirmado
- ✅ UI responsiva com estados de loading
- ✅ Sem hardcoded text (tudo em constantes)

## 🚀 Como Usar

### Exemplo Básico

```typescript
'use client'

import { PaymentStatus } from '@/components/payment/payment-dialog'
import { useState } from 'react'

export function MyCheckoutPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [paymentLinkUrl, setPaymentLinkUrl] = useState<string | null>(null)

  const handleCreatePayment = async () => {
    const response = await fetch('/api/payments/pagarme/checkout', {
      method: 'POST',
      body: JSON.stringify({
        price_id: 'price-123',
        customer_info: {
          name: 'João Silva',
          email: 'joao@example.com',
          document: '12345678900',
        },
      }),
    })

    const data = await response.json()

    setPaymentId(data.payment_id)
    setPaymentLinkUrl(data.payment_link_url)
    setDialogOpen(true)
  }

  return (
    <>
      <button onClick={handleCreatePayment}>
        Criar pagamento
      </button>

      <PaymentStatus
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        paymentId={paymentId}
        paymentLinkUrl={paymentLinkUrl}
        gateway="pagarme"
        productName="Produto Teste"
        amount={9990} // em centavos
        onSuccess={() => {
          console.log('Pagamento confirmado!')
          // Redirecionar, mostrar mensagem, etc
        }}
      />
    </>
  )
}
```

### Props do `PaymentStatus`

| Prop             | Tipo                      | Obrigatório | Descrição                              |
| ---------------- | ------------------------- | ----------- | -------------------------------------- |
| `open`           | `boolean`                 | ✅          | Controla se o dialog está aberto       |
| `onOpenChange`   | `(open: boolean) => void` | ✅          | Callback quando o dialog abre/fecha    |
| `paymentId`      | `string \| null`          | ✅          | ID do pagamento (para polling)         |
| `paymentLinkUrl` | `string \| null`          | ✅          | URL do link de pagamento               |
| `gateway`        | `'pagarme' \| 'asaas'`    | ✅          | Gateway usado                          |
| `productName`    | `string`                  | ❌          | Nome do produto (exibido no dialog)    |
| `amount`         | `number`                  | ❌          | Valor em centavos (exibido formatado)  |
| `onSuccess`      | `() => void`              | ❌          | Callback quando pagamento é confirmado |

## 🔧 Hooks

### `usePaymentPolling`

Hook que faz polling do status do pagamento a cada 3 segundos.

```typescript
import { usePaymentPolling } from '@/hooks/use-payment-polling'

const { paymentStatus, paymentInfo, isLoading, stopPolling } = usePaymentPolling({
  paymentId: 'payment-123',
  enabled: true,
  gateway: 'pagarme',
  onSuccess: () => console.log('Pago!'),
  onPixGenerated: (qrCode) => console.log('PIX:', qrCode),
  onBoletoGenerated: (url) => console.log('Boleto:', url),
})
```

**Callbacks disponíveis:**

- `onSuccess()` - Quando status = 'paid' ou 'approved'
- `onPixGenerated(qrCode)` - Quando status = 'pix_generated'
- `onBoletoGenerated(url)` - Quando status = 'boleto_generated'
- `onError()` - Quando o polling falha após 5 tentativas

**Retorno:**

- `paymentStatus` - Status atual ('pending', 'paid', 'pix_generated', etc)
- `paymentInfo` - Dados completos do pagamento
- `isLoading` - Se está carregando
- `stopPolling()` - Para o polling manualmente

## 🎨 Dialog Customizado

O projeto usa um Dialog customizado em `src/components/layout/ui/dialog.tsx` baseado no padrão do `@app-client`.

**Recursos:**

- Variants de intent (success, danger, warning, info, default)
- Tamanhos customizáveis (sm, md, lg, xl, 2xl, 3xl, 4xl, full)
- Loading states
- Controle de overlay (pode desabilitar fechar ao clicar fora)
- Footer customizável
- Header actions
- Ícones customizáveis

```typescript
<Dialog
  open={open}
  onOpenChange={setOpen}
  title="Confirmar ação"
  description="Tem certeza?"
  intent="warning"
  size="md"
  onConfirm={() => console.log('Confirmado!')}
  onCancel={() => setOpen(false)}
/>
```

## 📁 Estrutura de Arquivos

```
src/
├── components/
│   ├── layout/
│   │   └── ui/
│   │       └── dialog.tsx          # Dialog customizado
│   └── payment/
│       ├── payment-dialog.tsx      # Dialog de pagamento
│       └── README.md               # Esta documentação
└── hooks/
    └── use-payment-polling.ts      # Hook de polling
```

## 🔄 Fluxo de Pagamento

1. **Usuário clica em "Pagar"**
2. **Frontend** chama API `/api/payments/[gateway]/checkout`
3. **API** retorna `payment_id` e `payment_link_url`
4. **Frontend** abre `PaymentStatus` com esses dados
5. **Dialog** inicia polling automático (3s)
6. **Usuário** paga via link, boleto ou PIX
7. **Webhook** atualiza status no banco
8. **Polling** detecta mudança de status
9. **Dialog** exibe mensagem de sucesso
10. **Callback** `onSuccess()` é executado

## 🎯 Próximos Passos

Este componente foi feito para ser **genérico e reutilizável**. Você pode:

1. **Adicionar ao `@quitou/core` templates**
   - Copiar para `src/components/payment/`
   - Documentar no README do pacote

2. **Criar variações**
   - `SubscriptionDialog` para recorrências
   - `RefundDialog` para estornos
   - `InvoiceDialog` para faturas

3. **Integrar com TanStack Query**
   - Já usa `useQuery` no polling
   - Fácil de estender com mutations

4. **Adicionar testes**
   - Testar estados de loading/success/error
   - Testar polling e callbacks
   - Testar interação do usuário

## 💡 Dicas

- **Performance**: O polling para automaticamente após pagamento confirmado
- **Erros**: Após 5 falhas consecutivas, o polling para e chama `onError()`
- **Timeout**: Após 10 minutos sem sucesso, o polling para
- **Realtime**: Para updates instantâneos, considere usar Supabase Realtime
- **Analytics**: Adicione tracking nos callbacks para métricas de conversão
