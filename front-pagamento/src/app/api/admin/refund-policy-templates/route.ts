import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth'
import { loadBrandConfig } from '@/lib/brand/load-brand-config'
import { createApiHandler } from '@/lib/errors'
import { apiErrorResponse } from '@/lib/errors/error-handler'
import { REFUND_TEMPLATES, presentRefundTemplate } from '@/lib/payments/refund-templates'

/**
 * GET /api/admin/refund-policy-templates
 * Lista templates de política de reembolso ou retorna um template específico
 */
export const GET = createApiHandler(
  async (request: Request) => {
    // Verificar autenticação e admin
    const authResult = await requireAdmin()
    if (!authResult.success) {
      return authResult.response
    }

    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('id')

    // Se um ID específico foi solicitado, retornar apenas esse template
    if (templateId) {
      const template = REFUND_TEMPLATES.find((t) => t.id === templateId)
      if (!template) {
        return apiErrorResponse({
          error: 'Template não encontrado',
          code: 'NOT_FOUND',
          status: 404,
        })
      }

      return NextResponse.json({
        id: template.id,
        name: template.name,
        description: template.description,
        data: presentRefundTemplate(template, loadBrandConfig().supportEmail).data,
      })
    }

    // Caso contrário, retornar lista de templates disponíveis
    return NextResponse.json({
      templates: REFUND_TEMPLATES.map((template) => ({
        id: template.id,
        name: template.name,
        description: template.description,
      })),
    })
  },
  { module: 'admin', action: 'get_refund_policy_templates' }
)
