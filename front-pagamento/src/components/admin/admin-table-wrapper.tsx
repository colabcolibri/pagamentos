'use client'

import { cn } from '@/lib/utils'

interface AdminTableWrapperProps {
  children: React.ReactNode
  className?: string
  role?: string
  'aria-label'?: string
}

/**
 * Container visual padronizado para tabelas no admin.
 * O scroll horizontal fica exclusivamente no [data-slot="table-container"] do Table,
 * evitando scroll duplo aninhado.
 */
export function AdminTableWrapper({
  children,
  className,
  role = 'region',
  'aria-label': ariaLabel,
}: AdminTableWrapperProps) {
  return (
    <div
      className={cn(
        'w-full min-w-0 overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-xs',
        className
      )}
      role={role}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  )
}
