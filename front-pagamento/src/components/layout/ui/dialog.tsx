'use client'

import * as React from 'react'
import { ReactNode } from 'react'

import { type VariantProps, cva } from 'class-variance-authority'
import { AlertTriangle, Check, HelpCircle, Loader2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogOverlay,
  DialogPortal,
  Dialog as DialogRoot,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MAX_HEIGHT_SIZES, SizeHeight } from '@/config/sizes'
import { cn } from '@/lib/utils'

export const dialogConfig = {
  variants: {
    intent: {
      default: '',
      warning: 'border-warning',
      danger: 'border-destructive',
      success: 'border-success',
      info: 'border-info',
    },
    size: {
      sm: 'sm:max-w-sm',
      md: 'sm:max-w-md',
      lg: 'sm:max-w-lg',
      xl: 'sm:max-w-xl',
      '2xl': 'sm:max-w-2xl',
      '3xl': 'sm:max-w-3xl',
      '4xl': 'sm:max-w-4xl',
      '5xl': 'sm:max-w-5xl',
      '6xl': 'sm:max-w-6xl',
      '7xl': 'sm:max-w-7xl',
      full: 'sm:max-w-[95vw]',
    },
  },
  defaultVariants: {
    intent: 'default',
    size: 'md',
  },
} as const

export const dialogVariants = cva('', dialogConfig)

type DialogIntent = NonNullable<VariantProps<typeof dialogVariants>['intent']>

const iconMap: Record<DialogIntent, typeof HelpCircle> = {
  default: HelpCircle,
  warning: AlertTriangle,
  danger: X,
  success: Check,
  info: HelpCircle,
}

export interface DialogProps extends VariantProps<typeof dialogVariants> {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string | ReactNode
  description?: string | ReactNode
  headerContent?: ReactNode
  children?: ReactNode
  trigger?: ReactNode
  cancelText?: string
  confirmText?: string
  onConfirm?: () => void
  onCancel?: () => void
  showIcon?: boolean
  customIcon?: React.ComponentType<{ className?: string }> | ReactNode
  hideCloseButton?: boolean
  hideTitle?: boolean
  hideDescription?: boolean
  contentClassName?: string
  overlayClassName?: string
  footerClassName?: string
  loading?: boolean
  disableConfirm?: boolean
  disableOverlayClose?: boolean
  footerContent?: ReactNode
  contentPadding?: string | null
  headerActions?: React.ReactNode
  hideFooter?: boolean
  height?: SizeHeight
  scrollable?: boolean
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  headerContent,
  children,
  trigger,
  cancelText = 'Cancelar',
  confirmText = 'Confirmar',
  onConfirm,
  onCancel,
  showIcon = true,
  customIcon,
  hideCloseButton = false,
  hideTitle = false,
  hideDescription = false,
  contentClassName,
  overlayClassName,
  footerClassName,
  intent = 'default',
  size = 'md',
  loading = false,
  disableConfirm = false,
  disableOverlayClose = false,
  footerContent,
  contentPadding = 'px-4 pt-4 pb-4 sm:px-6',
  headerActions,
  hideFooter = false,
  height,
  scrollable = true,
}: DialogProps) {
  const DefaultIcon = iconMap[intent as DialogIntent]

  const renderIcon = () => {
    if (React.isValidElement(customIcon)) {
      return customIcon
    }
    const IconComponent = (customIcon as React.ComponentType<{ className?: string }>) || DefaultIcon
    return (
      <IconComponent
        className={cn('h-4 w-4', {
          'text-warning': intent === 'warning',
          'text-destructive': intent === 'danger',
          'text-success': intent === 'success',
          'text-info': intent === 'info',
          'text-muted-foreground': intent === 'default',
        })}
      />
    )
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (disableOverlayClose && !newOpen) {
      return
    }
    onOpenChange(newOpen)
  }

  return (
    <DialogRoot
      open={open}
      onOpenChange={handleOpenChange}
      disablePointerDismissal={disableOverlayClose}
    >
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogPortal>
        <DialogOverlay
          className={cn(
            'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0',
            overlayClassName
          )}
        />
        <DialogContent
          onClick={(e) => e.stopPropagation()}
          showCloseButton={false}
          className={cn(
            'fixed top-1/2 left-1/2 z-50 grid max-h-[min(90vh,90dvh)] min-h-0 w-[min(calc(100vw-2rem),calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 grid-cols-1 grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden rounded-lg border bg-background p-0 shadow-lg duration-200 data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 data-[closed]:zoom-out-95 data-[open]:zoom-in-95 overscroll-contain sm:w-[min(calc(100vw-4rem),calc(100%-4rem))]',
            height && MAX_HEIGHT_SIZES[height],
            dialogVariants({ intent, size }),
            contentClassName
          )}
        >
          <div className="w-full min-w-0 shrink-0 border-b border-border bg-background">
            <div className="flex w-full min-w-0 flex-col px-4 pt-4 pb-4 sm:px-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {showIcon && <div className="shrink-0">{renderIcon()}</div>}
                    <DialogTitle className={cn('text-lg font-semibold', hideTitle && 'sr-only')}>
                      {title}
                    </DialogTitle>
                  </div>
                  {description && (
                    <DialogDescription
                      className={cn(
                        'mt-1 text-sm text-muted-foreground',
                        hideDescription && 'sr-only'
                      )}
                    >
                      {description}
                    </DialogDescription>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {headerActions}
                  {!hideCloseButton && (
                    <DialogClose asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 rounded-full"
                        onClick={() => onOpenChange(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </DialogClose>
                  )}
                </div>
              </div>
              {headerContent ? <div className="mt-3">{headerContent}</div> : null}
            </div>
          </div>

          <div className="flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col self-stretch overflow-hidden">
            {scrollable ? (
              <div
                className={cn(
                  'relative flex min-h-0 min-w-0 max-w-full flex-1 flex-row overflow-hidden',
                  '[&_[data-slot=scroll-area-viewport]>div]:!block',
                  '[&_[data-slot=scroll-area-viewport]>div]:min-h-0 [&_[data-slot=scroll-area-viewport]>div]:h-full',
                  '[&_[data-slot=scroll-area-viewport]>div]:min-w-0 [&_[data-slot=scroll-area-viewport]>div]:w-full',
                  '[&_[data-slot=scroll-area-scrollbar]]:border-l-0'
                )}
              >
                <ScrollArea className="flex h-full min-h-0 min-w-0 w-full max-w-full flex-1 flex-row overscroll-contain">
                  <div
                    className={cn(
                      'min-w-0 wrap-break-word',
                      contentPadding === null ? '' : contentPadding
                    )}
                  >
                    {children}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div
                className={cn(
                  'flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col overflow-hidden wrap-break-word',
                  contentPadding === null ? '' : contentPadding
                )}
              >
                {children}
              </div>
            )}

            {!hideFooter && (onCancel || onConfirm || footerContent) && (
              <DialogFooter
                className={cn(
                  'w-full min-w-0 shrink-0 flex-col gap-0 border-t border-border bg-background p-0 sm:flex-col',
                  footerClassName
                )}
              >
                <div className="flex w-full min-w-0 flex-col gap-4 px-4 pt-4 pb-4 sm:px-6">
                  {footerContent}
                  {(onCancel || onConfirm) && (
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      {onCancel && (
                        <Button variant="outline" onClick={onCancel} disabled={loading}>
                          {cancelText}
                        </Button>
                      )}
                      {onConfirm && (
                        <Button
                          onClick={onConfirm}
                          disabled={disableConfirm || loading}
                          className={cn({
                            'bg-warning hover:bg-warning/90 text-warning-foreground':
                              intent === 'warning',
                            'bg-destructive hover:bg-destructive/90 text-destructive-foreground':
                              intent === 'danger',
                            'bg-success hover:bg-success/90 text-success-foreground':
                              intent === 'success',
                            'bg-info hover:bg-info/90 text-info-foreground': intent === 'info',
                          })}
                        >
                          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {confirmText}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </DialogFooter>
            )}
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  )
}
