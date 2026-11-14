'use client'

import { Check, ChevronDown, ChevronUp, Copy, Pencil, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import type { Price } from './types'
import type { UsePricesEditorReturn } from './use-prices-editor'

const CONTENT = {
  moveUp: 'Mover para cima',
  moveDown: 'Mover para baixo',
  fallbackTitle: (index: number) => `Preço ${index + 1}`,
  active: 'Ativo',
  inactive: 'Inativo',
  edit: 'Editar',
  copied: 'Link copiado',
  copyLink: 'Copiar link de checkout',
} as const

type PriceRowProps = {
  price: Price
  index: number
  pricesCount: number
  copiedIndex: number | null
  onEdit: () => void
  onCopyLink: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
  editor: UsePricesEditorReturn
}

export function PriceRow({
  price,
  index,
  pricesCount,
  copiedIndex,
  onEdit,
  onCopyLink,
  onMoveUp,
  onMoveDown,
  onRemove,
  editor,
}: PriceRowProps) {
  const { formatMoney, formatPriceDescription, getMetadata } = editor
  const meta = getMetadata(price)
  const title = (meta.title as string | undefined)?.trim()
  const isCopied = copiedIndex === index

  return (
    <div
      className={cn('flex items-center gap-3 py-3.5 hover:bg-muted/20 transition-colors min-w-0')}
    >
      {/* Reordenar */}
      <div className="flex flex-col gap-0.5 shrink-0">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-5 w-5 p-0"
          onClick={onMoveUp}
          disabled={index === 0}
          title={CONTENT.moveUp}
        >
          <ChevronUp className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-5 w-5 p-0"
          onClick={onMoveDown}
          disabled={index === pricesCount - 1}
          title={CONTENT.moveDown}
        >
          <ChevronDown className="h-3 w-3" />
        </Button>
      </div>

      {/* Info principal */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="text-sm font-semibold truncate">
            {title || CONTENT.fallbackTitle(index)}
          </span>
          {price.ref && (
            <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground font-mono truncate max-w-[16rem]">
              {price.ref}
            </code>
          )}
          <Badge
            variant={price.active ? 'default' : 'secondary'}
            className="text-[10px] h-5 px-1.5"
          >
            {price.active ? CONTENT.active : CONTENT.inactive}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs">
          <span className="text-sm font-bold text-primary tabular-nums">
            {formatMoney(price.amount)}
          </span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">{formatPriceDescription(price)}</span>
        </div>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-1 shrink-0">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onEdit}
          className="h-8 px-3 text-xs gap-1.5"
        >
          <Pencil className="h-3 w-3" />
          {CONTENT.edit}
        </Button>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={onCopyLink}
          title={isCopied ? CONTENT.copied : CONTENT.copyLink}
        >
          {isCopied ? (
            <Check className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={onRemove}
          title="Remover preço"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
