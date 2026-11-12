import { z } from 'zod'

/**
 * O Asaas (Checkout API) rejeita `customerData.name` com uma única palavra.
 * Aplica-se ao nome de PF e, no fluxo PJ, à razão social enviada no lugar do nome.
 */
export const asaasCustomerFullNameMessage =
  'Informe nome e sobrenome (pelo menos duas palavras separadas por espaço).'

export function nameHasAtLeastTwoParts(value: string): boolean {
  return value.trim().split(/\s+/).filter(Boolean).length >= 2
}

type AsaasCustomerNameFields = {
  name: string
  person_type?: 'fisica' | 'juridica'
  razao_social?: string | null | undefined
}

/**
 * Refina `customer_info` dos bodies Asaas (paths relativos ao objeto pai).
 */
export function refineAsaasCustomerFullName(
  customer: AsaasCustomerNameFields,
  ctx: z.RefinementCtx,
  pathPrefix: (string | number)[] = []
): void {
  const isPJ = customer.person_type === 'juridica'
  if (isPJ) {
    const s = (customer.razao_social ?? '').trim()
    if (!nameHasAtLeastTwoParts(s)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: asaasCustomerFullNameMessage,
        path: [...pathPrefix, 'razao_social'],
      })
    }
  } else {
    const s = customer.name.trim()
    if (!nameHasAtLeastTwoParts(s)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: asaasCustomerFullNameMessage,
        path: [...pathPrefix, 'name'],
      })
    }
  }
}
