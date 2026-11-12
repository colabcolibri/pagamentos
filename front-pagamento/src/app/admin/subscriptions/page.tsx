'use client'

import { AdminPageLayout } from '@/components/admin/admin-page-layout'

import { SubscriptionsTable } from './subscriptions-table'

const CONTENT = {
  title: 'Assinaturas',
  subtitle: 'Visualize e gerencie todas as assinaturas do sistema',
} as const

export default function SubscriptionsPage() {
  return (
    <AdminPageLayout title={CONTENT.title} subtitle={CONTENT.subtitle}>
      <SubscriptionsTable />
    </AdminPageLayout>
  )
}
