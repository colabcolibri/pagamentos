// ==========================================
// VALIDADORES COM ZOD
// ==========================================

import { z } from 'zod';

// Schema de validação do formulário de checkout
export const checkoutFormSchema = z
  .object({
    name: z.string().min(1, 'Nome é obrigatório'),
    email: z.string().email('Email inválido'),
    acceptedRefundPolicy: z
      .boolean()
      .refine(
        (val) => val,
        'Você deve aceitar a política de compra para continuar'
      ),
    paymentMethod: z.enum(['pagarme', 'asaas_boleto_parcelado']).optional(),

    // Campos ASAAS (condicionais)
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

    installments: z.number().min(1).max(12).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.paymentMethod === 'asaas_boleto_parcelado') {
      if (!data.personType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Selecione o tipo de pessoa',
          path: ['personType'],
        });
      }
      if (data.personType === 'fisica' && (!data.cpf || data.cpf.length < 14)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'CPF inválido',
          path: ['cpf'],
        });
      }
      if (
        data.personType === 'juridica' &&
        (!data.cnpj || data.cnpj.length < 18)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'CNPJ inválido',
          path: ['cnpj'],
        });
      }
      if (data.personType === 'juridica' && !data.razaoSocial) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Razão Social é obrigatória',
          path: ['razaoSocial'],
        });
      }
      if (!data.cep || data.cep.length < 9) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'CEP inválido',
          path: ['cep'],
        });
      }
      if (!data.address) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Endereço é obrigatório',
          path: ['address'],
        });
      }
      if (!data.addressNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Número é obrigatório',
          path: ['addressNumber'],
        });
      }
    }
  });

export type CheckoutFormData = z.infer<typeof checkoutFormSchema>;

