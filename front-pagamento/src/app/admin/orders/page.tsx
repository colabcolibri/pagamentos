'use client'

import { AdminPageLayout } from '@/components/admin/admin-page-layout'

import { OrdersTable } from './orders-table'

const CONTENT = {
  title: 'Pedidos',
  subtitle: 'Visualize e gerencie todos os pedidos do sistema',
} as const

export default function OrdersPage() {
  return (
    <AdminPageLayout title={CONTENT.title} subtitle={CONTENT.subtitle}>
      <OrdersTable />
    </AdminPageLayout>
  )
}
