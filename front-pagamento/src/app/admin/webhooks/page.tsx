'use client'

import { AdminPageLayout } from '@/components/admin/admin-page-layout'

import { WebhooksTable } from './webhooks-table'

const CONTENT = {
  title: 'Webhooks',
  subtitle: 'Logs de eventos recebidos dos gateways de pagamento',
} as const

export default function AdminWebhooksPage() {
  return (
    <AdminPageLayout title={CONTENT.title} subtitle={CONTENT.subtitle}>
      <WebhooksTable />
    </AdminPageLayout>
  )
}
