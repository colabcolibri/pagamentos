import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type AdminFormSectionProps = {
  title: string
  description?: string
  children: ReactNode
  className?: string
  /** Sub-bloco dentro de outra seção (borda tracejada, tipografia menor) */
  variant?: 'default' | 'nested'
}

/**
 * Agrupa campos do admin com cabeçalho sóbrio e divisor hairline, sem caixas aninhadas.
 */
export function AdminFormSection({
  title,
  description,
  children,
  className,
  variant = 'default',
}: AdminFormSectionProps) {
  const nested = variant === 'nested'
  return (
    <section
      className={cn('min-w-0 space-y-4', nested && 'border-l-2 border-border/60 pl-4', className)}
    >
      <header className={cn('space-y-1 border-b border-border/60', nested ? 'pb-2' : 'pb-3')}>
        <h4
          className={cn(
            'font-semibold tracking-tight text-foreground',
            nested ? 'text-xs' : 'text-sm'
          )}
        >
          {title}
        </h4>
        {description ? (
          <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  )
}
