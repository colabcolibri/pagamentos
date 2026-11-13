'use client'

import { useMemo, useRef, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Package,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
  XCircle,
} from 'lucide-react'

import { AdminPageLayout } from '@/components/admin/admin-page-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FilterCombobox, type FilterOption } from '@/components/ui/filter-combobox'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useCreateProduct,
  useDeletePrice,
  useDeleteProduct,
  useProducts,
  useUpdateProduct,
} from '@/hooks/admin/use-products'
import { copyToClipboard } from '@/lib/clipboard'
import {
  type Product,
  type UpdateProductDTO,
  downloadProductJson,
  getProductAdminGroupLabel,
  parseProductImportJson,
} from '@/lib/payments/product'

import { EditProductDialog } from './edit-product-dialog'
import { GenerateProductDialog } from './generate-product-dialog'
import type { CatalogProductLite } from './price-editor'

const STATUS_FILTER_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Ativos' },
  { value: 'inactive', label: 'Inativos' },
]

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  pix: 'PIX',
  boleto: 'Boleto',
  boleto_parcelado: 'Boleto Parcelado',
  credit_card: 'Cartão',
}

const CONTENT = {
  title: 'Produtos',
  subtitle: 'Gerencie seu catálogo de produtos, ofertas e links de checkout',
  actions: {
    generateWithAi: 'Gerar com IA',
    newProduct: 'Novo produto',
    uploadJson: 'Subir JSON',
  },
  downloadJson: 'Baixar JSON',
  uploadJsonError: 'Erro ao importar JSON. Verifique o arquivo e tente novamente.',
  prices: {
    title: 'Preços e ofertas',
    copyLink: 'Copiar link',
    copied: 'Link copiado!',
    empty: 'Nenhum preço cadastrado neste produto.',
    addPrice: 'Configurar preços',
    priceLabel: 'Preço',
  },
  status: {
    active: 'Ativo',
    inactive: 'Inativo',
  },
  empty: {
    title: 'Nenhum produto encontrado',
    description: 'Cadastre seu primeiro produto ou gere um catálogo com IA.',
  },
  error: {
    title: 'Erro ao carregar produtos',
    description: 'Tente recarregar a página',
  },
  edit: 'Editar',
  delete: {
    title: 'Excluir produto',
    description:
      'Tem certeza? Esta ação não pode ser desfeita. Os preços vinculados também serão excluídos.',
    confirm: 'Excluir',
    deleting: 'Excluindo...',
  },
  deletePrice: {
    title: 'Excluir preço',
    description: 'Tem certeza? Este preço será removido do produto.',
    confirm: 'Excluir',
    deleting: 'Excluindo...',
  },
  cancel: 'Cancelar',
  copyCheckoutSuccess: 'Link de checkout copiado!',
  groups: {
    ungrouped: 'Catálogo geral',
  },
} as const

function formatPrice(cents: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100)
}

function formatRecurrenceBadge(
  recurring: boolean | null | undefined,
  interval: string | null | undefined,
  count: number | null | undefined
) {
  if (!recurring) return 'Pagamento único'
  if (!interval) return 'Recorrente'
  const n = count && count > 1 ? count : 1
  if (n === 1) {
    const single: Record<string, string> = {
      day: 'Diário',
      week: 'Semanal',
      month: 'Mensal',
      year: 'Anual',
    }
    return single[interval] ?? `A cada ${interval}`
  }
  const plural: Record<string, string> = {
    day: 'dias',
    week: 'semanas',
    month: 'meses',
    year: 'anos',
  }
  return `A cada ${n} ${plural[interval] ?? `${interval}s`}`
}

function formatRecurrenceSuffix(
  recurring: boolean | null | undefined,
  interval: string | null | undefined,
  count: number | null | undefined
) {
  if (!recurring || !interval) return null
  const n = count && count > 1 ? count : 1
  if (n === 1) {
    const short: Record<string, string> = {
      day: '/dia',
      week: '/sem',
      month: '/mês',
      year: '/ano',
    }
    return short[interval] ?? `/${interval}`
  }
  const plural: Record<string, string> = {
    day: 'dias',
    week: 'sem',
    month: 'meses',
    year: 'anos',
  }
  return `/${n} ${plural[interval] ?? interval}`
}

function getCashPrice(amount: number, meta: Record<string, unknown>) {
  const pct = typeof meta?.cash_discount === 'number' ? meta.cash_discount : 0
  if (pct <= 0) return null
  const cashCents = Math.round(amount * (1 - pct / 100))
  return { cashCents, pct }
}

export default function ProductsPage() {
  const queryClient = useQueryClient()
  const { data: products, isLoading, error } = useProducts()
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const deleteProduct = useDeleteProduct()
  const deletePriceMutation = useDeletePrice()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [collapsedProducts, setCollapsedProducts] = useState<Set<string>>(new Set())
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [creatingNew, setCreatingNew] = useState(false)
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)
  const [copiedPriceId, setCopiedPriceId] = useState<string | null>(null)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [priceToDelete, setPriceToDelete] = useState<{
    productId: string
    priceId: string
  } | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isDialogOpen = creatingNew || !!editingProduct

  const filteredProducts = useMemo(() => {
    if (!products?.length) return []
    const q = search.trim().toLowerCase()
    return products.filter((p) => {
      if (statusFilter === 'active' && !p.active) return false
      if (statusFilter === 'inactive' && p.active) return false
      if (!q) return true
      return p.name.toLowerCase().includes(q) || p.ref.toLowerCase().includes(q)
    })
  }, [products, search, statusFilter])

  const groupedProducts = useMemo(() => {
    if (!filteredProducts.length) return [] as { label: string; items: Product[] }[]
    const map = new Map<string, Product[]>()
    for (const p of filteredProducts) {
      const label = getProductAdminGroupLabel(p.metadata)
      const key = label || '\0'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(p)
    }
    const entries = [...map.entries()].map(([key, items]) => ({
      label: key === '\0' ? '' : key,
      items: [...items].sort((a, b) =>
        a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
      ),
    }))
    entries.sort((a, b) => {
      if (!a.label && b.label) return 1
      if (!b.label && a.label) return -1
      return a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base' })
    })
    return entries
  }, [filteredProducts])

  const catalogProductsForEditor = useMemo((): CatalogProductLite[] => {
    if (!products?.length) return []
    return products.map((p) => ({
      id: p.id,
      name: p.name,
      prices: p.prices?.map((pr) => ({
        id: pr.id,
        ref: pr.ref,
        metadata: pr.metadata as Record<string, unknown> | null,
      })),
    }))
  }, [products])

  const toggleCollapse = (productId: string) => {
    setCollapsedProducts((prev) => {
      const next = new Set(prev)
      if (next.has(productId)) {
        next.delete(productId)
      } else {
        next.add(productId)
      }
      return next
    })
  }

  const handleSave = async (updated: Partial<Product>) => {
    if (creatingNew) {
      await createProduct.mutateAsync({
        name: updated.name!,
        ref: updated.ref!,
        description: updated.description ?? null,
        active: updated.active ?? true,
        payment_methods: updated.payment_methods ?? [],
        refund_policy: updated.refund_policy ?? null,
        email_config: updated.email_config ?? null,
        metadata: updated.metadata ?? undefined,
      })
      setCreatingNew(false)
    } else if (editingProduct) {
      await updateProduct.mutateAsync({
        id: editingProduct.id,
        data: updated as UpdateProductDTO,
      })
    }
  }

  const copyCheckoutLink = async (priceId: string) => {
    const baseUrl = window.location.origin
    const checkoutUrl = `${baseUrl}/checkout/${priceId}`

    const success = await copyToClipboard(checkoutUrl, {
      successMessage: CONTENT.copyCheckoutSuccess,
    })

    if (success) {
      setCopiedPriceId(priceId)
      setTimeout(() => setCopiedPriceId(null), 2000)
    }
  }

  const handleUploadJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null)
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const dto = parseProductImportJson(text)
      await createProduct.mutateAsync({
        ...dto,
        payment_methods: dto.payment_methods ?? undefined,
      })
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
      e.target.value = ''
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : CONTENT.uploadJsonError)
    }
  }

  return (
    <AdminPageLayout
      title={CONTENT.title}
      subtitle={CONTENT.subtitle}
      action={
        <div className="flex flex-col items-end gap-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={createProduct.isPending}
            >
              <Upload className="size-4" />
              {CONTENT.actions.uploadJson}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setGenerateDialogOpen(true)}>
              <Sparkles className="size-4" />
              {CONTENT.actions.generateWithAi}
            </Button>
            <Button size="sm" onClick={() => setCreatingNew(true)}>
              <Plus className="size-4" />
              {CONTENT.actions.newProduct}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              aria-hidden
              onChange={handleUploadJson}
            />
          </div>
          {uploadError && (
            <p className="text-xs text-destructive" role="alert">
              {uploadError}
            </p>
          )}
        </div>
      }
    >
      <div className="space-y-6 min-w-0">
        {/* Toolbar de busca e filtro */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar produto ou referência..."
                className="pl-9 h-9 bg-card"
              />
            </div>
            <FilterCombobox
              placeholder="Status"
              emptyText="—"
              options={STATUS_FILTER_OPTIONS}
              value={statusFilter}
              onValueChange={(v) =>
                setStatusFilter((v as 'all' | 'active' | 'inactive' | null) ?? 'all')
              }
            />
            {(search.trim() !== '' || statusFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('')
                  setStatusFilter('all')
                }}
              >
                <X className="size-4" />
                Limpar
              </Button>
            )}
          </div>
          {!isLoading && products && (
            <span className="text-xs text-muted-foreground tabular-nums shrink-0">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'produto' : 'produtos'}
            </span>
          )}
        </div>

        {/* Conteúdo principal */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="p-6 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-4 w-1/4" />
                  </div>
                  <Skeleton className="h-8 w-32" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 pt-2">
                  <Skeleton className="h-28 rounded-lg" />
                  <Skeleton className="h-28 rounded-lg" />
                </div>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="p-8 md:p-12 text-center border-destructive/20 bg-destructive/5">
            <XCircle className="size-10 text-destructive mx-auto mb-3" />
            <h3 className="text-base font-semibold text-foreground mb-1">{CONTENT.error.title}</h3>
            <p className="text-sm text-muted-foreground">{CONTENT.error.description}</p>
          </Card>
        ) : filteredProducts.length === 0 ? (
          <Card className="p-8 md:p-12 text-center">
            <Package className="size-10 text-muted-foreground/60 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-foreground mb-1">{CONTENT.empty.title}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {products && products.length > 0
                ? 'Nenhum produto corresponde aos filtros atuais.'
                : CONTENT.empty.description}
            </p>
            {products && products.length > 0 ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearch('')
                  setStatusFilter('all')
                }}
              >
                Limpar filtros
              </Button>
            ) : (
              <Button onClick={() => setCreatingNew(true)}>
                <Plus className="size-4" />
                {CONTENT.actions.newProduct}
              </Button>
            )}
          </Card>
        ) : (
          <div className="space-y-8">
            {groupedProducts.map(({ label: groupLabel, items: groupItems }) => (
              <section key={groupLabel || '__ungrouped'} className="space-y-3">
                {(groupedProducts.length > 1 || !!groupLabel) && (
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {groupLabel || CONTENT.groups.ungrouped}
                    </h2>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {groupItems.length}
                    </span>
                  </div>
                )}

                <div className="space-y-4">
                  {groupItems.map((product: Product) => {
                    const prices = product.prices ?? []
                    const isCollapsed = collapsedProducts.has(product.id)
                    const methods = Array.isArray(product.payment_methods)
                      ? product.payment_methods
                      : []

                    return (
                      <Card key={product.id} className="py-0 gap-0 overflow-hidden">
                        {/* Cabeçalho do Produto */}
                        <CardHeader className="p-4 sm:p-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-semibold tracking-tight text-foreground">
                                {product.name}
                              </h3>
                              <Badge
                                variant={product.active ? 'default' : 'secondary'}
                                className={
                                  product.active
                                    ? 'bg-success/10 text-success border-transparent'
                                    : 'bg-muted text-muted-foreground border-transparent'
                                }
                              >
                                <span
                                  className={`size-1.5 rounded-full ${
                                    product.active ? 'bg-success' : 'bg-muted-foreground'
                                  }`}
                                />
                                {product.active ? CONTENT.status.active : CONTENT.status.inactive}
                              </Badge>
                              <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono text-muted-foreground">
                                {product.ref}
                              </code>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              <span className="tabular-nums">
                                {prices.length} {prices.length === 1 ? 'preço' : 'preços'}
                              </span>
                              {methods.length > 0 && (
                                <>
                                  <span>·</span>
                                  <span>
                                    {methods.map((m) => PAYMENT_METHOD_LABEL[m] ?? m).join(', ')}
                                  </span>
                                </>
                              )}
                              {product.created_at && (
                                <>
                                  <span>·</span>
                                  <span>
                                    Criado{' '}
                                    {formatDistanceToNow(new Date(product.created_at), {
                                      addSuffix: true,
                                      locale: ptBR,
                                    })}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Ações do produto */}
                          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                            {prices.length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleCollapse(product.id)}
                                className="text-muted-foreground"
                              >
                                {isCollapsed ? (
                                  <>
                                    <ChevronDown className="size-4" />
                                    Mostrar preços
                                  </>
                                ) : (
                                  <>
                                    <ChevronUp className="size-4" />
                                    Ocultar preços
                                  </>
                                )}
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setCreatingNew(false)
                                setEditingProduct(product)
                              }}
                            >
                              <Pencil className="size-3.5" />
                              {CONTENT.edit}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => downloadProductJson(product)}
                              title={CONTENT.downloadJson}
                              aria-label={CONTENT.downloadJson}
                            >
                              <Download className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setProductToDelete(product)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              title={CONTENT.delete.confirm}
                              aria-label={CONTENT.delete.title}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </CardHeader>

                        {/* Grid de Preços do Produto */}
                        {!isCollapsed && (
                          <CardContent className="border-t border-border/70 bg-muted/25 p-4 sm:p-5">
                            {prices.length === 0 ? (
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-dashed border-border bg-background/60 px-4 py-3">
                                <span className="text-sm text-muted-foreground">
                                  {CONTENT.prices.empty}
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setCreatingNew(false)
                                    setEditingProduct(product)
                                  }}
                                >
                                  <Plus className="size-3.5" />
                                  {CONTENT.prices.addPrice}
                                </Button>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                {prices.map((price, priceIndex) => {
                                  const meta = (price.metadata as Record<string, unknown>) || {}
                                  const priceName =
                                    (typeof meta.title === 'string' && meta.title.trim()) ||
                                    price.ref ||
                                    `${CONTENT.prices.priceLabel} ${priceIndex + 1}`
                                  const cash = getCashPrice(price.amount, meta)
                                  const maxInst =
                                    typeof meta?.max_installments === 'number' &&
                                    meta.max_installments > 1
                                      ? meta.max_installments
                                      : 0
                                  const parcelCents = maxInst
                                    ? Math.round(price.amount / maxInst)
                                    : 0
                                  const suffix = formatRecurrenceSuffix(
                                    price.recurring,
                                    price.interval,
                                    price.interval_count
                                  )
                                  const isCopied = copiedPriceId === price.id

                                  return (
                                    <div
                                      key={price.id}
                                      className="flex flex-col justify-between gap-3 rounded-lg border border-border bg-card p-4 shadow-2xs transition-colors hover:border-border/90"
                                    >
                                      <div className="space-y-2.5">
                                        {/* Topo do card de preço */}
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="min-w-0">
                                            <p
                                              className="font-medium text-sm text-foreground truncate"
                                              title={priceName}
                                            >
                                              {priceName}
                                            </p>
                                            {price.ref && price.ref !== priceName && (
                                              <code className="text-[11px] text-muted-foreground font-mono truncate block">
                                                {price.ref}
                                              </code>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-1.5 shrink-0">
                                            <Badge variant="outline" className="text-[11px]">
                                              {formatRecurrenceBadge(
                                                price.recurring,
                                                price.interval,
                                                price.interval_count
                                              )}
                                            </Badge>
                                            {!price.active && (
                                              <Badge variant="secondary" className="text-[11px]">
                                                {CONTENT.status.inactive}
                                              </Badge>
                                            )}
                                          </div>
                                        </div>

                                        {/* Valor e condições */}
                                        <div className="space-y-1">
                                          <div className="flex items-baseline gap-1">
                                            <span className="text-xl font-bold tracking-tight tabular-nums text-foreground">
                                              {formatPrice(price.amount)}
                                            </span>
                                            {suffix && (
                                              <span className="text-xs text-muted-foreground">
                                                {suffix}
                                              </span>
                                            )}
                                          </div>

                                          {(cash || maxInst > 0) && (
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground tabular-nums">
                                              {cash && (
                                                <span className="text-primary font-medium">
                                                  À vista: {formatPrice(cash.cashCents)} (-
                                                  {cash.pct}%)
                                                </span>
                                              )}
                                              {maxInst > 0 && (
                                                <span>
                                                  Até {maxInst}x de {formatPrice(parcelCents)}
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* Rodapé com ação principal de copiar link */}
                                      <div className="flex items-center gap-1.5 pt-2 border-t border-border/50">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="flex-1 h-8 text-xs"
                                          onClick={() => copyCheckoutLink(price.id)}
                                        >
                                          {isCopied ? (
                                            <>
                                              <Check className="size-3.5 text-success" />
                                              <span className="text-success">
                                                {CONTENT.prices.copied}
                                              </span>
                                            </>
                                          ) : (
                                            <>
                                              <Copy className="size-3.5" />
                                              <span>{CONTENT.prices.copyLink}</span>
                                            </>
                                          )}
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon-sm"
                                          className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                                          title={CONTENT.deletePrice.title}
                                          aria-label={CONTENT.deletePrice.title}
                                          onClick={() =>
                                            setPriceToDelete({
                                              productId: product.id,
                                              priceId: price.id,
                                            })
                                          }
                                        >
                                          <Trash2 className="size-3.5" />
                                        </Button>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </CardContent>
                        )}
                      </Card>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <EditProductDialog
        product={creatingNew ? null : editingProduct}
        open={isDialogOpen}
        onClose={() => {
          setCreatingNew(false)
          setEditingProduct(null)
        }}
        onSave={handleSave}
        catalogProducts={catalogProductsForEditor}
      />

      <GenerateProductDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
        onRegistered={() => {
          queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
        }}
      />

      <ConfirmDialog
        open={!!productToDelete}
        onOpenChange={(open) => !open && setProductToDelete(null)}
        title={CONTENT.delete.title}
        description={CONTENT.delete.description}
        confirmText={deleteProduct.isPending ? CONTENT.delete.deleting : CONTENT.delete.confirm}
        cancelText={CONTENT.cancel}
        variant="destructive"
        onConfirm={async () => {
          if (!productToDelete) return
          await deleteProduct.mutateAsync(productToDelete.id)
          setProductToDelete(null)
        }}
      />

      <ConfirmDialog
        open={!!priceToDelete}
        onOpenChange={(open) => !open && setPriceToDelete(null)}
        title={CONTENT.deletePrice.title}
        description={CONTENT.deletePrice.description}
        confirmText={
          deletePriceMutation.isPending ? CONTENT.deletePrice.deleting : CONTENT.deletePrice.confirm
        }
        cancelText={CONTENT.cancel}
        variant="destructive"
        onConfirm={async () => {
          if (!priceToDelete) return
          await deletePriceMutation.mutateAsync(priceToDelete)
          setPriceToDelete(null)
        }}
      />
    </AdminPageLayout>
  )
}
