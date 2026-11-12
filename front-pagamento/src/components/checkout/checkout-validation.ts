import { isValidCNPJ, isValidCPF } from '@brazilian-utils/brazilian-utils'
import { z } from 'zod'

import { CHECKOUT_FORM_CONTENT, type CheckoutFormData } from './checkout-form-content'

const CONTENT = CHECKOUT_FORM_CONTENT.validation

function nameWordCount(trimmed: string): number {
  return trimmed.split(/\s+/).filter(Boolean).length
}

/**
 * Schema Zod para validação do checkout (mensagem de política dinâmica).
 * Com Asaas, exige nome e sobrenome (ou razão social com duas+ palavras para PJ).
 */
export function createCheckoutSchema(
  policyRequiredMessage: string,
  selectedGateway: 'pagarme' | 'asaas'
) {
  return z
    .object({
      email: z.email(CONTENT.emailInvalid),
      /** PF: validado no superRefine; PJ usa razão social na nota (nome do contato pode vir do perfil). */
      name: z.string().optional(),
      selectedGateway: z.enum(['pagarme', 'asaas']),
      installments: z.number().optional(),
      acceptedRefundPolicy: z.boolean().refine((val: boolean) => val === true, {
        message: policyRequiredMessage,
      }),
      personType: z.enum(['fisica', 'juridica']).optional(),
      cpf: z.string().optional(),
      cnpj: z.string().optional(),
      razaoSocial: z.string().optional(),
      ie: z.string().optional(),
      im: z.string().optional(),
      cep: z.string().optional(),
      address: z.string().optional(),
      addressNumber: z.string().optional(),
      complement: z.string().optional(),
      province: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (selectedGateway !== 'asaas') return
      const msg = CONTENT.fullNameTwoWords
      if (data.personType === 'juridica') {
        const s = (data.razaoSocial ?? '').trim()
        if (s.length > 0 && nameWordCount(s) < 2) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg, path: ['razaoSocial'] })
        }
      } else {
        const s = (data.name ?? '').trim()
        if (s.length < 3) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: CONTENT.nameMin, path: ['name'] })
        } else if (nameWordCount(s) < 2) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg, path: ['name'] })
        }
      }
    })
}

export interface ValidateCheckoutParams {
  refundPolicyAcceptanceRequired: string
  formData: Partial<CheckoutFormData>
  userEmail: string
  selectedGateway: 'pagarme' | 'asaas'
  installments: number
}

/**
 * Valida dados do checkout e retorna erros por campo.
 * Inclui validação específica Asaas (CPF/CNPJ, endereço).
 */
export function validateCheckoutForm(params: ValidateCheckoutParams): {
  valid: boolean
  errors: Partial<Record<keyof CheckoutFormData, string>>
} {
  const { refundPolicyAcceptanceRequired, formData, userEmail, selectedGateway, installments } =
    params
  const newErrors: Partial<Record<keyof CheckoutFormData, string>> = {}

  try {
    const schema = createCheckoutSchema(refundPolicyAcceptanceRequired, selectedGateway)
    schema.parse({
      email: userEmail,
      name: formData.name,
      selectedGateway,
      installments,
      acceptedRefundPolicy: formData.acceptedRefundPolicy,
      personType: formData.personType,
      cpf: formData.cpf,
      cnpj: formData.cnpj,
      razaoSocial: formData.razaoSocial,
      cep: formData.cep,
      address: formData.address,
      addressNumber: formData.addressNumber,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof CheckoutFormData
        newErrors[field] = issue.message
      })
    }
  }

  // CPF/CNPJ e endereço são sempre obrigatórios (Asaas é o gateway primário)
  if (!formData.personType) {
    newErrors.personType = CONTENT.personTypeRequired
  }
  if (formData.personType === 'fisica') {
    const cleanCpf = formData.cpf?.replace(/\D/g, '') || ''
    if (!formData.cpf || cleanCpf.length !== 11) {
      newErrors.cpf = CONTENT.cpfRequired
    } else if (!isValidCPF(cleanCpf)) {
      newErrors.cpf = CONTENT.cpfInvalidDigits
    }
  } else if (formData.personType === 'juridica') {
    const cleanCnpj = formData.cnpj?.replace(/\D/g, '') || ''
    if (!formData.cnpj || cleanCnpj.length !== 14) {
      newErrors.cnpj = CONTENT.cnpjRequired
    } else if (!isValidCNPJ(cleanCnpj)) {
      newErrors.cnpj = CONTENT.cnpjInvalidDigits
    }
    if (!formData.razaoSocial) {
      newErrors.razaoSocial = CONTENT.razaoSocialRequired
    }
  }
  if (!formData.cep || formData.cep.replace(/\D/g, '').length < 8) {
    newErrors.cep = CONTENT.cepInvalid
  }
  if (!formData.address) {
    newErrors.address = CONTENT.addressRequired
  }
  if (!formData.addressNumber) {
    newErrors.addressNumber = CONTENT.addressNumberRequired
  }

  // Telefone obrigatório para Asaas (Checkout API exige)
  if (selectedGateway === 'asaas') {
    const phoneDigits = formData.phone?.replace(/\D/g, '') || ''
    if (!formData.phone || phoneDigits.length < 10) {
      newErrors.phone = CONTENT.phoneRequired
    }

    const province = formData.province?.trim() || ''
    if (province.length < 2) {
      newErrors.province = CONTENT.provinceRequired
    }

    const city = formData.city?.trim() || ''
    if (city.length < 2) {
      newErrors.city = CONTENT.cityRequired
    }

    const uf = formData.state?.trim().toUpperCase() || ''
    if (uf.length !== 2 || !/^[A-Z]{2}$/.test(uf)) {
      newErrors.state = uf.length === 0 ? CONTENT.stateRequired : CONTENT.stateInvalidUf
    }
  }

  return {
    valid: Object.keys(newErrors).length === 0,
    errors: newErrors,
  }
}

/**
 * Faz scroll suave até o primeiro campo com erro no formulário.
 */
export function scrollToFirstError(): void {
  setTimeout(() => {
    // React costuma serializar data-invalid={true} sem valor "true" literal — usar [data-invalid]
    const first =
      document.querySelector('[data-slot="field"][data-invalid]') ??
      document.querySelector('[data-invalid]')
    first?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, 100)
}
