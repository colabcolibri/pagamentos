'use client'

import { useState } from 'react'

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Pencil, Plus, Power, PowerOff, TicketPercent, Trash2, X, XCircle } from 'lucide-react'
import { toast } from 'sonner'

import { AdminTableWrapper } from '@/components/admin/admin-table-wrapper'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FilterCombobox, type FilterOption } from '@/components/ui/filter-combobox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { AdminDiscountCoupon } from '@/hooks/admin/use-coupons'
import { useCouponMutations, useCoupons } from '@/hooks/admin/use-coupons'

import { CouponFormDialog } from './coupon-form-dialog'

const ACTIVE_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'Todos' },
  { value: 'true', label: 'Ativos' },
  { value: 'false', label: 'Inativos' },
]

const CONTENT = {
  new: 'Novo cupom',
  filters: { status: 'Situação', clear: 'Limpar' },
  table: {
    code: 'Código',
    discount: 'Desconto',
    applies: 'Fluxo',
    scope: 'Escopo',
    limits: 'Limites',
    period: 'Período',
    status: 'Status',
    actions: 'Ações',
    empty: 'Nenhum cupom cadastrado',
    error: 'Erro ao carregar cupons',
  },
  applies: {
    avista: 'À vista',
    parcelado: 'Parcelado',
    both: 'Ambos',
  },
  delete: {
    title: 'Excluir cupom?',
    description:
      'Esta ação não pode ser desfeita. Só é permitido se o cupom nunca tiver sido usado em um pedido.',
    confirm: 'Excluir',
    cancel: 'Cancelar',
  },
  toggleActive: {
    deactivateAria: 'Desativar cupom',
    activateAria: 'Ativar cupom',
    deactivatedToast: 'Cupom desativado',
    activatedToast: 'Cupom ativado',
  },
} as const

function formatDiscount(c: AdminDiscountCoupon): string {
  if (c.discount_type === 'percent' && c.discount_percent != null) {
    const p = parseFloat(String(c.discount_percent))
    return `${Number.isFinite(p) ? p : 0}%`
  }
  if (c.discount_type === 'fixed_cents' && c.discount_amount_cents != null) {
    return (c.discount_amount_cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }
  return '—'
}

function productScopeSummary(c: AdminDiscountCoupon): { label: string; count: number } {
  const rows = Array.isArray(c.discount_coupon_products) ? c.discount_coupon_products : []
  const countFromJunction = rows.length
  const count = countFromJunction > 0 ? countFromJunction : c.product_id ? 1 : 0
  if (count === 0) return { label: 'Global', count: 0 }
  if (count > 1) return { label: `${count} produtos`, count }
  if (countFromJunction === 1) {
    const row = rows[0]
    let n: string | null =
      row?.products && typeof row.products === 'object' && 'name' in row.products
        ? String((row.products as { name: string }).name)
        : null
    if (!n && c.products && typeof c.products === 'object' && 'name' in c.products) {
      n = String(c.products.name)
    }
    return { label: n ?? '1 produto', count: 1 }
  }
  if (c.products && typeof c.products === 'object' && 'name' in c.products) {
    return { label: String(c.products.name), count: 1 }
  }
  return { label: '1 produto', count: 1 }
}

function priceScopeSummary(c: AdminDiscountCoupon): { label: string; count: number } {
  const rows = Array.isArray(c.discount_coupon_prices) ? c.discount_coupon_prices : []
  const countFromJunction = rows.length
  const count = countFromJunction > 0 ? countFromJunction : c.price_id ? 1 : 0
  if (count === 0) return { label: '', count: 0 }
  if (count > 1) return { label: `${count} preços`, count }
  if (countFromJunction === 1) {
    const row = rows[0]
    const emb = row?.prices && typeof row.prices === 'object' && 'amount' in row.prices
    if (emb) {
      const pr = row.prices as { amount: number }
      return {
        label: (pr.amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        count: 1,
      }
    }
  }
  if (c.prices && typeof c.prices === 'object' && 'amount' in c.prices) {
    const pr = c.prices as { amount: number }
    return {
      label: (pr.amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      count: 1,
    }
  }
  return { label: '1 preço', count: 1 }
}

function scopeLabel(c: AdminDiscountCoupon): string {
  const prod = productScopeSummary(c)
  const price = priceScopeSummary(c)
  if (prod.count === 0 && price.count === 0) return 'Global'
  if (prod.count > 0 && price.count === 0) return prod.label
  if (prod.count === 0 && price.count > 0) return price.label
  const shortProd = prod.label.length > 18 ? prod.label.slice(0, 18) + '…' : prod.label
  return `${shortProd} · ${price.label}`
}

function limitsLabel(c: AdminDiscountCoupon): string {
  const parts: string[] = []
  if (c.max_redemptions_total != null) parts.push(`total ${c.max_redemptions_total}`)
  if (c.max_redemptions_per_user != null) parts.push(`/ usuário ${c.max_redemptions_per_user}`)
  return parts.length ? parts.join(' · ') : '—'
}

function periodLabel(c: AdminDiscountCoupon): string {
  if (!c.starts_at && !c.ends_at) return '—'
  const fmt = (iso: string) => format(new Date(iso), 'dd/MM/yy HH:mm', { locale: ptBR })
  if (c.starts_at && c.ends_at) return `${fmt(c.starts_at)} → ${fmt(c.ends_at)}`
  if (c.starts_at) return `de ${fmt(c.starts_at)}`
  return `até ${fmt(c.ends_at!)}`
}

export function CouponsTable() {
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editing, setEditing] = useState<AdminDiscountCoupon | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminDiscountCoupon | null>(null)

  const activeParam =
    activeFilter === 'all'
      ? 'all'
      : activeFilter === 'true'
        ? true
        : activeFilter === 'false'
          ? false
          : 'all'

  const { data, isLoading, error } = useCoupons({ active: activeParam, limit: 500 })
  const { remove, setActive } = useCouponMutations()

  const coupons = data?.coupons ?? []

  const openCreate = () => {
    setEditing(null)
    setFormMode('create')
    setFormOpen(true)
  }

  const openEdit = (c: AdminDiscountCoupon) => {
    setEditing(c)
    setFormMode('edit')
    setFormOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await remove.mutateAsync(deleteTarget.id)
      toast.success('Cupom excluído')
      setDeleteTarget(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível excluir')
    }
  }

  const handleToggleActive = async (c: AdminDiscountCoupon) => {
    const next = !c.active
    try {
      await setActive.mutateAsync({ id: c.id, active: next })
      toast.success(
        next ? CONTENT.toggleActive.activatedToast : CONTENT.toggleActive.deactivatedToast
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível alterar a situação')
    }
  }

  return (
    <div className="space-y-4 min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <FilterCombobox
            options={ACTIVE_OPTIONS}
            value={activeFilter || null}
            onValueChange={(v) => setActiveFilter(v ?? 'all')}
            placeholder={CONTENT.filters.status}
            emptyText="—"
          />
          {activeFilter !== 'all' && (
            <Button variant="outline" size="sm" onClick={() => setActiveFilter('all')}>
              <X className="h-4 w-4 mr-2" />
              {CONTENT.filters.clear}
            </Button>
          )}
        </div>
        <Button type="button" onClick={openCreate} className="w-full sm:w-auto shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          {CONTENT.new}
        </Button>
      </div>

      <AdminTableWrapper aria-label="Lista de cupons">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{CONTENT.table.code}</TableHead>
              <TableHead>{CONTENT.table.discount}</TableHead>
              <TableHead>{CONTENT.table.applies}</TableHead>
              <TableHead className="hidden lg:table-cell">{CONTENT.table.scope}</TableHead>
              <TableHead className="hidden md:table-cell">{CONTENT.table.limits}</TableHead>
              <TableHead className="hidden xl:table-cell">{CONTENT.table.period}</TableHead>
              <TableHead>{CONTENT.table.status}</TableHead>
              <TableHead className="text-right w-[1%]">{CONTENT.table.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full max-w-[8rem]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="p-8 md:p-12 text-center border-t border-destructive/20 bg-destructive/10"
                >
                  <XCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
                  <p className="text-destructive font-medium">{CONTENT.table.error}</p>
                </TableCell>
              </TableRow>
            ) : coupons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="p-8 md:p-12 text-center text-muted-foreground">
                  <TicketPercent className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  {CONTENT.table.empty}
                </TableCell>
              </TableRow>
            ) : (
              coupons.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono font-medium">{c.code}</TableCell>
                  <TableCell>{formatDiscount(c)}</TableCell>
                  <TableCell>{CONTENT.applies[c.applies_to]}</TableCell>
                  <TableCell
                    className="hidden lg:table-cell max-w-[14rem] truncate"
                    title={scopeLabel(c)}
                  >
                    {scopeLabel(c)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                    {limitsLabel(c)}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell text-muted-foreground text-sm whitespace-nowrap">
                    {periodLabel(c)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.active ? 'default' : 'secondary'}>
                      {c.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={setActive.isPending && setActive.variables?.id === c.id}
                      onClick={() => void handleToggleActive(c)}
                      aria-label={
                        c.active
                          ? CONTENT.toggleActive.deactivateAria
                          : CONTENT.toggleActive.activateAria
                      }
                    >
                      {c.active ? (
                        <PowerOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Power className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(c)}
                      aria-label="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(c)}
                      aria-label="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </AdminTableWrapper>

      <CouponFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        coupon={editing}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={CONTENT.delete.title}
        description={CONTENT.delete.description}
        confirmText={CONTENT.delete.confirm}
        cancelText={CONTENT.delete.cancel}
        variant="destructive"
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}
