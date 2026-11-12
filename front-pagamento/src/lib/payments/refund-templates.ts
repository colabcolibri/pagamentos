import coursePolicy from '@/data/templates/refund-policies/course-policy.json'
import digitalProductPolicy from '@/data/templates/refund-policies/digital-product-policy.json'
import subscriptionPolicy from '@/data/templates/refund-policies/subscription-policy.json'
import { applySupportEmailDeep } from '@/lib/brand/apply-support-email'

export const REFUND_TEMPLATES = [
  {
    id: 'course-policy',
    name: 'Curso Online',
    description: 'Política para cursos com encontros ao vivo e acesso por período',
    data: coursePolicy,
  },
  {
    id: 'digital-product-policy',
    name: 'Produto Digital',
    description: 'Política para produtos digitais (download)',
    data: digitalProductPolicy,
  },
  {
    id: 'subscription-policy',
    name: 'Assinatura Digital',
    description: 'Política para assinaturas e planos de acesso contínuo',
    data: subscriptionPolicy,
  },
] as const

export function presentRefundTemplate<T extends { data: unknown }>(
  template: T,
  supportEmail: string | null
): T {
  return { ...template, data: applySupportEmailDeep(template.data, supportEmail) }
}
