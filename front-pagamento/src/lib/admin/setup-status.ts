import 'server-only'

import { getPool } from '@/lib/db/pool'
import { loadGatewayConfig, publicGatewayAvailability } from '@/lib/payments/gateway-config'
import { loadInstanceConfig } from '@/lib/platform/instance-config'

export type SetupStepId = 'environment' | 'brand' | 'email' | 'gateways' | 'catalog' | 'operations'

export type SetupStepStatus = {
  id: SetupStepId
  title: string
  description: string
  required: boolean
  completed: boolean
  missing: string[]
}

export type SetupStatusReport = {
  percent: number
  requiredPercent: number
  completedCount: number
  totalCount: number
  requiredCompletedCount: number
  requiredTotalCount: number
  readyToOperate: boolean
  appUrl: string
  steps: SetupStepStatus[]
}

export async function computeSetupStatus(): Promise<SetupStatusReport> {
  const [instance, gateway, dbCheck] = await Promise.all([
    loadInstanceConfig(),
    loadGatewayConfig(),
    (async () => {
      try {
        const res = await getPool().query<{ active_products: number }>(
          'SELECT count(*)::int AS active_products FROM payments.products WHERE active = true'
        )
        return { ok: true, activeProducts: res.rows[0]?.active_products ?? 0 }
      } catch {
        return { ok: false, activeProducts: 0 }
      }
    })(),
  ])

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || ''
  const hasAccessSecret = Boolean(process.env.ACCESS_CODE_SECRET?.trim())
  const hasAdminEmail = Boolean(process.env.ADMIN_EMAIL?.trim())

  const envMissing: string[] = []
  if (!dbCheck.ok) envMissing.push('Conexão com Postgres')
  if (!hasAccessSecret) envMissing.push('ACCESS_CODE_SECRET')
  if (!appUrl) envMissing.push('NEXT_PUBLIC_APP_URL')
  if (!hasAdminEmail) envMissing.push('ADMIN_EMAIL')

  const brandMissing: string[] = []
  if (!instance.brand.name || instance.brand.name === 'Quitou') {
    brandMissing.push('Nome da marca personalizado')
  }
  if (!instance.brand.legalName && !instance.brand.cnpj) {
    brandMissing.push('Razão social ou CNPJ')
  }
  if (!instance.brand.supportEmail) {
    brandMissing.push('E-mail de suporte')
  }

  const emailMissing: string[] = []
  if (!instance.smtp.host) emailMissing.push('Servidor SMTP (host)')
  if (!instance.smtp.emailFrom && !instance.smtp.user) emailMissing.push('E-mail remetente')
  if (process.env.NODE_ENV === 'production' && (!instance.smtp.user || !instance.smtp.pass)) {
    emailMissing.push('Usuário e senha SMTP')
  }

  const availability = publicGatewayAvailability(gateway)
  const gatewaysMissing: string[] = []
  if (!availability.asaas && !availability.pagarme) {
    gatewaysMissing.push('Pelo menos 1 gateway ativo com chave de API (Asaas ou Pagar.me)')
  } else {
    if (availability.asaas && !gateway.asaasWebhookSecret) {
      gatewaysMissing.push('Segredo do webhook Asaas')
    }
    if (availability.pagarme && (!gateway.pagarmeWebhookUser || !gateway.pagarmeWebhookSecret)) {
      gatewaysMissing.push('Usuário/segredo do webhook Pagar.me')
    }
  }

  const catalogMissing: string[] = []
  if (dbCheck.activeProducts === 0) {
    catalogMissing.push('Pelo menos 1 produto ativo')
  }

  const operationsMissing: string[] = []
  if (!gateway.saleNotificationRecipients?.trim()) {
    operationsMissing.push('Destinatários de aviso interno de venda')
  }

  const steps: SetupStepStatus[] = [
    {
      id: 'environment',
      title: 'Banco & Segurança',
      description: 'Postgres conectado, URL pública e segredos de autenticação configurados.',
      required: true,
      completed: envMissing.length === 0,
      missing: envMissing,
    },
    {
      id: 'brand',
      title: 'Identidade & Empresa',
      description: 'Nome, logo, razão social, CNPJ, links legais e e-mail de suporte.',
      required: true,
      completed: brandMissing.length === 0,
      missing: brandMissing,
    },
    {
      id: 'email',
      title: 'E-mail, SMTP & Rodapé',
      description: 'Servidor SMTP, remetente e rodapé personalizado nos e-mails.',
      required: true,
      completed: emailMissing.length === 0,
      missing: emailMissing,
    },
    {
      id: 'gateways',
      title: 'Gateway de Pagamento',
      description: 'Asaas e/ou Pagar.me com chave de API e segredo de webhook.',
      required: true,
      completed: gatewaysMissing.length === 0,
      missing: gatewaysMissing,
    },
    {
      id: 'catalog',
      title: 'Primeiro Produto',
      description: 'Cadastre pelo menos um produto ativo com preço para gerar links de checkout.',
      required: false,
      completed: catalogMissing.length === 0,
      missing: catalogMissing,
    },
    {
      id: 'operations',
      title: 'Avisos & Operação',
      description: 'E-mails internos para receber notificação a cada venda confirmada.',
      required: false,
      completed: operationsMissing.length === 0,
      missing: operationsMissing,
    },
  ]

  const completedCount = steps.filter((s) => s.completed).length
  const totalCount = steps.length
  const requiredSteps = steps.filter((s) => s.required)
  const requiredCompletedCount = requiredSteps.filter((s) => s.completed).length
  const requiredTotalCount = requiredSteps.length

  return {
    percent: Math.round((completedCount / totalCount) * 100),
    requiredPercent: Math.round((requiredCompletedCount / requiredTotalCount) * 100),
    completedCount,
    totalCount,
    requiredCompletedCount,
    requiredTotalCount,
    readyToOperate: requiredCompletedCount === requiredTotalCount,
    appUrl,
    steps,
  }
}
