import { z } from 'zod'

/**
 * Schema mínimo para payload de webhook Asaas.
 * Suporta eventos de cobrança (payment) e checkout (checkout).
 * Payload malformado deve retornar 200 e ser ignorado (não 500).
 */
export const asaasWebhookPayloadSchema = z.object({
  event: z.string().min(1),
  payment: z
    .object({
      id: z.string().min(1),
      installment: z.string().optional(),
      billingType: z.string().optional(),
      /** ID da sessão de checkout (Checkout API). Usado para localizar registro via asaas_checkout_id. */
      checkoutSession: z.string().min(1).optional(),
      checkout_session: z.string().min(1).optional(),
    })
    .optional(),
  checkout: z
    .object({
      id: z.string().min(1),
      status: z.string().optional(),
      billingTypes: z.array(z.string()).optional(),
    })
    .optional(),
})

export type AsaasWebhookPayload = z.infer<typeof asaasWebhookPayloadSchema>

/**
 * Schema mínimo para payload de webhook Pagar.me (order.paid, order.created, charge.refunded).
 * No charge.refunded o data é a charge; pode incluir order com code do pedido para identificar o pagamento.
 * Payload malformado deve retornar 200 e ser ignorado (não 500).
 */
export const pagarmeWebhookPayloadSchema = z.object({
  type: z.string().min(1),
  data: z
    .object({
      id: z.string().min(1),
      code: z.string().min(1),
      charges: z.array(z.object({ payment_method: z.string().optional() })).optional(),
      order: z.object({ code: z.string().min(1) }).optional(),
    })
    .optional(),
})

export type PagarmeWebhookPayload = z.infer<typeof pagarmeWebhookPayloadSchema>
