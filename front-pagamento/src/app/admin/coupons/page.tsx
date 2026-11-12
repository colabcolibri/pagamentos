'use client'

import { AdminPageLayout } from '@/components/admin/admin-page-layout'

import { CouponsTable } from './coupons-table'

const CONTENT = {
  title: 'Cupons de desconto',
  subtitle: 'Crie e gerencie cupons (à vista, parcelado ou ambos). O checkout valida no servidor.',
} as const

export default function AdminCouponsPage() {
  return (
    <AdminPageLayout title={CONTENT.title} subtitle={CONTENT.subtitle}>
      <CouponsTable />
    </AdminPageLayout>
  )
}
