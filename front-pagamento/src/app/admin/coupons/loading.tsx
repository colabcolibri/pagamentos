import { AdminPageLayout } from '@/components/admin/admin-page-layout'
import { Skeleton } from '@/components/ui/skeleton'

export default function AdminCouponsLoading() {
  return (
    <AdminPageLayout title="Cupons" subtitle="Carregando…">
      <div className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-32" />
        </div>
        <Skeleton className="h-[320px] w-full rounded-lg" />
      </div>
    </AdminPageLayout>
  )
}
