'use client'

import { useMemo, useState } from 'react'

import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'

import { PriceEditModal } from './price-edit-modal'
import { PriceRow } from './price-row'
import { isPersistedPriceId } from './sections/price-relations-section'
import type { CatalogPriceOption, Price, PricesEditorProps } from './types'
import { usePricesEditor } from './use-prices-editor'

function priceRowLabel(p: Price): string {
  const title = p.metadata?.title
  const t = typeof title === 'string' && title.trim() ? title.trim() : ''
  return t ? `${t} (${p.ref})` : p.ref
}

export function PricesEditor(props: PricesEditorProps) {
  const editor = usePricesEditor(props)
  const { prices, addPrice, copiedIndex, copyCheckoutLink, removePrice, movePrice, updatePrice } =
    editor
  const { catalogProducts, productId } = props

  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  const catalogAddonOptions: CatalogPriceOption[] = useMemo(() => {
    const out: CatalogPriceOption[] = []
    for (const prod of catalogProducts) {
      for (const pr of prod.prices ?? []) {
        if (!isPersistedPriceId(pr.id)) continue
        const title = pr.metadata?.title
        const t = typeof title === 'string' && title.trim() ? title.trim() : ''
        const row = t ? `${t} (${pr.ref})` : pr.ref
        out.push({ id: pr.id, label: `${prod.name} — ${row}` })
      }
    }
    return out
  }, [catalogProducts])

  const editingPrice = editingIndex !== null ? prices[editingIndex] : null

  const upgradeOptions: CatalogPriceOption[] =
    editingIndex !== null
      ? prices
          .filter((p, i) => i !== editingIndex && isPersistedPriceId(p.id))
          .map((p) => ({ id: p.id, label: priceRowLabel(p) }))
      : []

  const addonOptions: CatalogPriceOption[] =
    editingIndex !== null ? catalogAddonOptions.filter((o) => o.id !== editingPrice?.id) : []

  return (
    <div className="space-y-4 min-w-0">
      {/* Lista */}
      {prices.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 py-10 text-center">
          <p className="text-sm text-muted-foreground mb-3">Nenhum preço configurado.</p>
          <Button type="button" size="sm" variant="outline" onClick={addPrice}>
            <Plus className="h-4 w-4 mr-1.5" />
            Adicionar primeiro preço
          </Button>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border/60 overflow-hidden">
            {prices.map((price, index) => (
              <PriceRow
                key={price.id}
                price={price}
                index={index}
                pricesCount={prices.length}
                copiedIndex={copiedIndex}
                onEdit={() => setEditingIndex(index)}
                onCopyLink={() => copyCheckoutLink(price.id, index)}
                onMoveUp={() => movePrice(index, 'up')}
                onMoveDown={() => movePrice(index, 'down')}
                onRemove={() => removePrice(index)}
                editor={editor}
              />
            ))}
          </div>

          <div className="flex justify-end">
            <Button type="button" size="sm" variant="outline" onClick={addPrice}>
              <Plus className="h-4 w-4 mr-1.5" />
              Adicionar preço
            </Button>
          </div>
        </>
      )}

      {/* Modal de edição de preço */}
      {editingIndex !== null && editingPrice && (
        <PriceEditModal
          open
          onClose={() => setEditingIndex(null)}
          productId={productId}
          price={editingPrice}
          index={editingIndex}
          editor={editor}
          upgradeOptions={upgradeOptions}
          addonOptions={addonOptions}
          onSaved={(savedPrice) => {
            // Substitui o preço no estado local com os dados vindos da API
            updatePrice(editingIndex, savedPrice)
          }}
        />
      )}
    </div>
  )
}
