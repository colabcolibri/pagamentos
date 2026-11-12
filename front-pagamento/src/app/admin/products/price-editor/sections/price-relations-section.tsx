'use client'

import { AdminFormSection } from '@/components/layout/ui/admin-form-section'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

import { CONTENT } from '../content'
import type { CatalogPriceOption, Price } from '../types'
import type { UsePricesEditorReturn } from '../use-prices-editor'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isPersistedPriceId(id: string): boolean {
  return UUID_RE.test(id)
}

type Props = {
  index: number
  price: Price
  upgradeOptions: CatalogPriceOption[]
  addonOptions: CatalogPriceOption[]
  editor: UsePricesEditorReturn
}

export function PriceRelationsSection({
  index,
  price,
  upgradeOptions,
  addonOptions,
  editor,
}: Props) {
  const { updatePrice } = editor
  const persisted = isPersistedPriceId(price.id)
  const selectedUp = new Set(price.upgrade_to_price_ids ?? [])
  const selectedAddon = new Set(price.addon_price_ids ?? [])

  const toggleUpgrade = (targetId: string, checked: boolean) => {
    const cur = [...(price.upgrade_to_price_ids ?? [])]
    if (checked) {
      if (!cur.includes(targetId)) cur.push(targetId)
    } else {
      const i = cur.indexOf(targetId)
      if (i >= 0) cur.splice(i, 1)
    }
    updatePrice(index, { upgrade_to_price_ids: cur })
  }

  const toggleAddon = (addonId: string, checked: boolean) => {
    const cur = [...(price.addon_price_ids ?? [])]
    if (checked) {
      if (!cur.includes(addonId)) cur.push(addonId)
    } else {
      const i = cur.indexOf(addonId)
      if (i >= 0) cur.splice(i, 1)
    }
    updatePrice(index, { addon_price_ids: cur })
  }

  return (
    <AdminFormSection
      title={CONTENT.sections.relations.title}
      description={CONTENT.sections.relations.description}
    >
      {!persisted ? (
        <p className="text-xs text-muted-foreground leading-relaxed">
          {CONTENT.sections.relations.needSave}
        </p>
      ) : (
        <div className="space-y-6 min-w-0">
          <div className="space-y-2 min-w-0">
            <p className="text-xs font-medium text-foreground">
              {CONTENT.sections.relations.upgradeTitle}
            </p>
            <p className="text-xs text-muted-foreground">
              {CONTENT.sections.relations.upgradeHint}
            </p>
            {upgradeOptions.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {CONTENT.sections.relations.noSiblings}
              </p>
            ) : (
              <ul className="space-y-2 max-h-48 overflow-y-auto rounded-md border border-border/80 p-3 min-w-0">
                {upgradeOptions.map((opt) => (
                  <li key={opt.id} className="flex items-start gap-2 min-w-0">
                    <Checkbox
                      id={`up-${price.id}-${opt.id}`}
                      checked={selectedUp.has(opt.id)}
                      onCheckedChange={(v) => toggleUpgrade(opt.id, v === true)}
                      className="mt-0.5 shrink-0"
                    />
                    <Label
                      htmlFor={`up-${price.id}-${opt.id}`}
                      className="text-xs font-normal leading-snug cursor-pointer min-w-0 wrap-break-word"
                    >
                      {opt.label}
                    </Label>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2 min-w-0">
            <p className="text-xs font-medium text-foreground">
              {CONTENT.sections.relations.addonTitle}
            </p>
            <p className="text-xs text-muted-foreground">{CONTENT.sections.relations.addonHint}</p>
            {addonOptions.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {CONTENT.sections.relations.noCatalog}
              </p>
            ) : (
              <ul className="space-y-2 max-h-56 overflow-y-auto rounded-md border border-border/80 p-3 min-w-0">
                {addonOptions.map((opt) => (
                  <li key={opt.id} className="flex items-start gap-2 min-w-0">
                    <Checkbox
                      id={`ad-${price.id}-${opt.id}`}
                      checked={selectedAddon.has(opt.id)}
                      onCheckedChange={(v) => toggleAddon(opt.id, v === true)}
                      className="mt-0.5 shrink-0"
                    />
                    <Label
                      htmlFor={`ad-${price.id}-${opt.id}`}
                      className="text-xs font-normal leading-snug cursor-pointer min-w-0 wrap-break-word"
                    >
                      {opt.label}
                    </Label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </AdminFormSection>
  )
}
