'use client'

import { AdminPageLayout } from '@/components/admin/admin-page-layout'

import { EmailLogsTable } from './email-logs-table'

const CONTENT = {
  title: 'Emails enviados',
  subtitle: 'Histórico e pré-visualização do HTML enviado pelo sistema',
} as const

export default function AdminEmailsPage() {
  return (
    <AdminPageLayout title={CONTENT.title} subtitle={CONTENT.subtitle}>
      <EmailLogsTable />
    </AdminPageLayout>
  )
}
