import { Skeleton } from '@/components/ui/skeleton'

export default function AdminPaymentsLoading() {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="h-16 border-b border-border/40 px-4 md:px-6">
        <Skeleton className="h-8 w-8 mt-4 rounded-md" />
      </div>
      <div className="bg-muted/40 border-b border-border/40">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12">
          <Skeleton className="h-9 w-28 mb-2" />
          <Skeleton className="h-5 w-56" />
        </div>
      </div>
      <main className="flex-1 bg-muted/40">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
          <Skeleton className="h-10 w-full max-w-sm mb-6" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </main>
    </div>
  )
}
