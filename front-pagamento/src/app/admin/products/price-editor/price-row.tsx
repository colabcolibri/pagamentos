'use client'

import { ChevronDown, ChevronUp, Copy, Pencil, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import type { Price } from './types'
import type { UsePricesEditorReturn } from './use-prices-editor'

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
      className={cn(
        'flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0 bg-card hover:bg-muted/30 transition-colors min-w-0'
      )}
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
          title="Mover para cima"
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
          title="Mover para baixo"
        >
          <ChevronDown className="h-3 w-3" />
        </Button>
      </div>

      {/* Info principal */}
      <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-sm font-semibold truncate">{title || `Preço ${index + 1}`}</span>
        {price.ref && (
          <span className="text-xs text-muted-foreground font-mono truncate">{price.ref}</span>
        )}
        <span className="text-sm font-bold text-primary tabular-nums">
          {formatMoney(price.amount)}
        </span>
        <span className="text-xs text-muted-foreground">{formatPriceDescription(price)}</span>
        {!price.active && (
          <Badge variant="secondary" className="text-[10px]">
            Inativo
          </Badge>
        )}
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
          Editar
        </Button>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={onCopyLink}
          title="Copiar link de checkout"
        >
          <Copy className={cn('h-3.5 w-3.5', isCopied && 'text-green-600')} />
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
