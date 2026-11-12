'use client'

import { cn } from '@/lib/utils'

interface AdminTableWrapperProps {
  children: React.ReactNode
  className?: string
  role?: string
  'aria-label'?: string
}

/**
 * Wrapper padronizado para tabelas no admin.
 * Garante que tabelas com muitas colunas tenham scroll interno (overflow-x-auto)
 * no container, nunca na página inteira.
 * Usa min-w-0 para funcionar corretamente em contextos flex.
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
        'w-full max-w-full min-w-0 rounded-xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden',
        className
      )}
      role={role}
      aria-label={ariaLabel}
    >
      <div className="min-w-0 overflow-x-auto">{children}</div>
    </div>
  )
}
