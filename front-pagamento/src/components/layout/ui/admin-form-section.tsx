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
 * Agrupa campos do admin com título, descrição e contorno visível.
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
      className={cn(
        'min-w-0 rounded-xl border shadow-sm',
        nested
          ? 'border-dashed border-border/70 bg-muted/10 p-3 sm:p-4'
          : 'border-border/80 bg-card p-4 sm:p-5',
        className
      )}
    >
      <header
        className={cn(
          'space-y-1',
          nested ? 'border-b border-border/50 pb-2 mb-3' : 'border-b border-border/60 pb-3 mb-4'
        )}
      >
        <h4
          className={cn(
            'font-semibold text-foreground tracking-tight',
            nested ? 'text-xs' : 'text-sm'
          )}
        >
          {title}
        </h4>
        {description ? (
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        ) : null}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  )
}
