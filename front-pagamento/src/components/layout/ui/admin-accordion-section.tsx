'use client'

import type { ReactNode } from 'react'

import { ChevronDown } from 'lucide-react'

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

type AdminAccordionSectionProps = {
  title: string
  description?: string
  /** Aberto ao montar (útil para blocos que quase sempre se editam) */
  defaultOpen?: boolean
  /** Se false, título e conteúdo ficam sempre visíveis (sem acordeão) */
  collapsible?: boolean
  /** Dentro de outro acordeão — borda tracejada e tipografia menor */
  variant?: 'default' | 'nested'
  children: ReactNode
  className?: string
}

/**
 * Seção expansível para formulários admin (um bloco por vez visível quando fechado).
 */
export function AdminAccordionSection({
  title,
  description,
  defaultOpen = false,
  collapsible = true,
  variant = 'default',
  children,
  className,
}: AdminAccordionSectionProps) {
  const nested = variant === 'nested'

  const shellClass = cn(
    'min-w-0 overflow-visible rounded-none border-0 bg-transparent shadow-none',
    nested &&
      'overflow-hidden rounded-lg border border-dashed border-border/55 bg-muted/6 shadow-none',
    className
  )

  const collapsibleBodyClass = cn(
    'border-t border-border/50 bg-transparent',
    nested ? 'space-y-3 px-3 py-2 sm:px-4 sm:py-2.5' : 'space-y-3 px-0 py-2 sm:py-2.5'
  )

  /** Seções sempre abertas: sem linha entre título e campos — a separação é só entre seções no pai. */
  const staticBodyClass = cn(
    'border-0 bg-transparent',
    nested ? 'space-y-3 px-3 pb-0 pt-2 sm:px-4 sm:pt-2.5' : 'space-y-4 px-0 pb-0 pt-2 sm:pt-2.5'
  )

  const titleClass = cn(
    'font-semibold tracking-tight text-foreground',
    nested ? 'text-xs' : 'text-sm'
  )

  const descriptionClass = cn(
    'leading-relaxed text-muted-foreground',
    nested ? 'text-[11px] sm:text-xs' : 'text-xs'
  )

  if (!collapsible) {
    return (
      <div className={shellClass}>
        <div className={cn(nested ? 'px-3 pt-2.5 sm:px-3.5 sm:pt-3' : 'pt-0.5')}>
          <div className="min-w-0 space-y-0.5">
            <h4 className={titleClass}>{title}</h4>
            {description ? <p className={descriptionClass}>{description}</p> : null}
          </div>
        </div>
        <div className={staticBodyClass}>{children}</div>
      </div>
    )
  }

  return (
    <Collapsible defaultOpen={defaultOpen} className={cn('group', shellClass)}>
      <CollapsibleTrigger
        className={cn(
          'flex w-full cursor-pointer items-center gap-3 text-left outline-none transition-colors hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          nested ? 'px-3 py-2 sm:px-3.5 sm:py-2.5' : 'px-0 py-2 sm:py-2.5'
        )}
      >
        <ChevronDown
          className={cn(
            'shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180',
            nested ? 'h-3.5 w-3.5' : 'h-4 w-4'
          )}
          aria-hidden
        />
        <div className="min-w-0 flex-1 space-y-0.5">
          <h4 className={titleClass}>{title}</h4>
          {description ? <p className={descriptionClass}>{description}</p> : null}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className={collapsibleBodyClass}>{children}</div>
      </CollapsibleContent>
    </Collapsible>
  )
}
