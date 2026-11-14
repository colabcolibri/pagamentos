'use client'

import type { ReactNode } from 'react'

import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  Sheet as SheetRoot,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

const SHEET_SIZES = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
} as const

export interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string | ReactNode
  description?: string | ReactNode
  children?: ReactNode
  trigger?: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  size?: keyof typeof SHEET_SIZES
  scrollable?: boolean
  contentPadding?: string | null
  headerActions?: ReactNode
  footerContent?: ReactNode
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void
  onCancel?: () => void
  loading?: boolean
  disableConfirm?: boolean
  hideFooter?: boolean
  className?: string
}

/**
 * Template padrão de Sheet lateral com header fixo, ScrollArea único e footer alinhado.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  trigger,
  side = 'right',
  size = 'md',
  scrollable = true,
  contentPadding = 'p-5 sm:p-6',
  headerActions,
  footerContent,
  confirmText = 'Salvar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  loading = false,
  disableConfirm = false,
  hideFooter = false,
  className,
}: SheetProps) {
  const isHorizontal = side === 'right' || side === 'left'

  return (
    <SheetRoot open={open} onOpenChange={onOpenChange}>
      {trigger && <SheetTrigger render={<span className="inline-flex" />}>{trigger}</SheetTrigger>}
      <SheetContent
        side={side}
        className={cn(
          'flex min-h-0 flex-col gap-0 p-0',
          isHorizontal && 'w-full sm:w-full',
          isHorizontal && SHEET_SIZES[size],
          className
        )}
      >
        <SheetHeader className="shrink-0 border-b border-border/70 px-5 py-4 pr-11 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <SheetTitle className="text-base font-semibold tracking-tight">{title}</SheetTitle>
              {description && (
                <SheetDescription className="text-xs leading-relaxed text-muted-foreground">
                  {description}
                </SheetDescription>
              )}
            </div>
            {headerActions && <div className="shrink-0">{headerActions}</div>}
          </div>
        </SheetHeader>

        {scrollable ? (
          <ScrollArea className="min-h-0 flex-1">
            <div className={cn('min-w-0', contentPadding === null ? '' : contentPadding)}>
              {children}
            </div>
          </ScrollArea>
        ) : (
          <div
            className={cn(
              'flex min-h-0 flex-1 flex-col overflow-hidden',
              contentPadding === null ? '' : contentPadding
            )}
          >
            {children}
          </div>
        )}

        {!hideFooter && (onCancel || onConfirm || footerContent) && (
          <SheetFooter className="shrink-0 flex-row items-center justify-end gap-2 border-t border-border/70 bg-background px-5 py-3.5 sm:px-6">
            {footerContent}
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCancel}
                disabled={loading}
              >
                {cancelText}
              </Button>
            )}
            {onConfirm && (
              <Button
                type="button"
                size="sm"
                onClick={onConfirm}
                disabled={disableConfirm || loading}
              >
                {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                {confirmText}
              </Button>
            )}
          </SheetFooter>
        )}
      </SheetContent>
    </SheetRoot>
  )
}
