import { cn } from '@/lib/utils'

/** Asterisco visual para campos obrigatórios (cor de erro do tema). */
export function RequiredFieldMark({ className }: { className?: string }) {
  return (
    <span className={cn('text-destructive font-semibold', className)} aria-hidden>
      *
    </span>
  )
}
