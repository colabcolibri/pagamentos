'use client'

import Link from 'next/link'

import { AdminPageLayout } from '@/components/admin/admin-page-layout'
import { Alert, AlertDescription } from '@/components/ui/alert'

import { PaymentsTable } from './payments-table'

const CONTENT = {
  title: 'Pagamentos',
  subtitle: 'Visualize todos os pagamentos do sistema',
  info: 'Use "Cancelar link" para cancelar o link no gateway; depois use "Excluir" para remover o registro. Excluir só é permitido após cancelar o link. Para gerenciar pedidos, use a página Pedidos.',
  linkOrders: 'Ir para Pedidos',
} as const

export default function PaymentsPage() {
  return (
    <AdminPageLayout title={CONTENT.title} subtitle={CONTENT.subtitle}>
      <Alert variant="default" className="mb-4">
        <AlertDescription>
          {CONTENT.info}{' '}
          <Link href="/admin/orders" className="text-primary underline underline-offset-2">
            {CONTENT.linkOrders}
          </Link>
        </AlertDescription>
      </Alert>
      <PaymentsTable />
    </AdminPageLayout>
  )
}
