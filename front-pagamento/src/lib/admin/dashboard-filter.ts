import { z } from 'zod'

export const DASHBOARD_PERIODS = ['today', '7d', '30d', 'month', '90d', 'all'] as const
export const DASHBOARD_GATEWAYS = ['all', 'asaas', 'pagarme'] as const

export const dashboardPeriodSchema = z.enum(DASHBOARD_PERIODS)
export const dashboardGatewaySchema = z.enum(DASHBOARD_GATEWAYS)

export const dashboardFilterSchema = z.object({
  period: dashboardPeriodSchema.default('30d'),
  gateway: dashboardGatewaySchema.default('all'),
})

export type DashboardPeriod = z.infer<typeof dashboardPeriodSchema>
export type DashboardGateway = z.infer<typeof dashboardGatewaySchema>
export type DashboardFilter = z.infer<typeof dashboardFilterSchema>
