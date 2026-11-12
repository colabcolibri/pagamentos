'use client'

import { Fragment, useMemo, useRef, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react'

import { AdminPageLayout } from '@/components/admin/admin-page-layout'
import { AdminTableWrapper } from '@/components/admin/admin-table-wrapper'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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

const CONTENT = {
  title: 'Produtos',
  subtitle: 'Gerencie produtos e preços do sistema',
  actions: {
    generateWithAi: 'Gerar com IA',
    newProduct: 'Novo produto',
    uploadJson: 'Subir JSON',
  },
  downloadJson: 'Baixar JSON',
  uploadJsonError: 'Erro ao importar JSON. Verifique o arquivo e tente novamente.',
  uploadJsonSuccess: 'Produto importado com sucesso.',
  table: {
    name: 'Nome',
    ref: 'Referência',
    status: 'Status',
    prices: 'Preços',
    created: 'Criado',
    header: {
      ref: 'Referência',
      type: 'Tipo',
      recurrence: 'Recorr.',
      currency: 'Moeda',
      status: 'Status',
      prices: 'Preços',
      created: 'Criado',
    },
  },
  pricesTable: {
    name: 'Nome',
    value: 'Valor',
    cash: 'À vista',
    installmentMax: 'Parcela (máx.)',
    link: 'Link',
    copyLink: 'Copiar link',
    copied: 'Copiado!',
    priceLabel: 'Preço',
  },
  status: {
    active: 'Ativo',
    inactive: 'Inativo',
  },
  price: {
    oneTime: 'Único',
    recurring: 'Recorrente',
  },
  empty: {
    title: 'Nenhum produto encontrado',
    description: 'Não há produtos cadastrados no sistema.',
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
    ungrouped: 'Sem grupo',
  },
} as const

export default function ProductsPage() {
  const queryClient = useQueryClient()
  const { data: products, isLoading, error } = useProducts()
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const deleteProduct = useDeleteProduct()
  const deletePriceMutation = useDeletePrice()
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set())
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

  const groupedProducts = useMemo(() => {
    if (!products?.length) return [] as { label: string; items: Product[] }[]
    const map = new Map<string, Product[]>()
    for (const p of products) {
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
  }, [products])

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

  const toggleExpand = (productId: string) => {
    setExpandedProducts((prev) => {
      const next = new Set(prev)
      if (next.has(productId)) {
        next.delete(productId)
      } else {
        next.add(productId)
      }
      return next
    })
  }

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100)
  }

  const getCashPrice = (amount: number, meta: Record<string, unknown>) => {
    const pct = typeof meta?.cash_discount === 'number' ? meta.cash_discount : 0
    if (pct <= 0) return null
    const cashCents = Math.round(amount * (1 - pct / 100))
    return { cashCents, pct }
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
        <div className="flex flex-col gap-2 min-w-0">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setGenerateDialogOpen(true)} size="sm">
              <Sparkles className="h-4 w-4 mr-2 shrink-0" />
              {CONTENT.actions.generateWithAi}
            </Button>
            <Button onClick={() => setCreatingNew(true)} size="sm">
              <Plus className="h-4 w-4 mr-2 shrink-0" />
              {CONTENT.actions.newProduct}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={createProduct.isPending}
            >
              <Upload className="h-4 w-4 mr-2 shrink-0" />
              {CONTENT.actions.uploadJson}
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
            <p className="text-sm text-destructive truncate" role="alert">
              {uploadError}
            </p>
          )}
        </div>
      }
    >
      <AdminTableWrapper aria-label="Lista de produtos">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-8 md:p-12 text-center border-t border-destructive/20 bg-destructive/10">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="scroll-m-20 text-lg font-semibold tracking-tight text-foreground mb-2">
              {CONTENT.error.title}
            </h3>
            <p className="text-sm text-muted-foreground">{CONTENT.error.description}</p>
          </div>
        ) : !products || products.length === 0 ? (
          <div className="p-8 md:p-12 text-center">
            <div className="text-4xl mb-4">📦</div>
            <h3 className="scroll-m-20 text-lg font-semibold tracking-tight text-foreground mb-2">
              {CONTENT.empty.title}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">{CONTENT.empty.description}</p>
            <Button onClick={() => setCreatingNew(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo produto
            </Button>
          </div>
        ) : (
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 shrink-0 pl-2 md:pl-4"></TableHead>
                <TableHead className="w-[28%] min-w-0">{CONTENT.table.name}</TableHead>
                <TableHead className="w-[18%] min-w-0">{CONTENT.table.ref}</TableHead>
                <TableHead className="w-20 shrink-0">{CONTENT.table.status}</TableHead>
                <TableHead className="w-16 shrink-0 text-right">{CONTENT.table.prices}</TableHead>
                <TableHead className="w-36 shrink-0 text-right">{CONTENT.table.created}</TableHead>
                <TableHead className="w-24 shrink-0 pr-2 md:pr-4"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedProducts.map(({ label: groupLabel, items: groupItems }) => (
                <Fragment key={groupLabel || '__ungrouped'}>
                  {(groupedProducts.length > 1 || !!groupLabel) && (
                    <TableRow className="bg-muted/50 hover:bg-muted/50 border-b-border/60">
                      <TableCell
                        colSpan={7}
                        className="py-2.5 pl-4 md:pl-6 pr-4 text-xs sm:text-sm font-semibold text-muted-foreground min-w-0"
                      >
                        <span
                          className="block truncate"
                          title={groupLabel || CONTENT.groups.ungrouped}
                        >
                          {groupLabel || CONTENT.groups.ungrouped}
                        </span>
                      </TableCell>
                    </TableRow>
                  )}
                  {groupItems.map((product: Product) => {
                    const isExpanded = expandedProducts.has(product.id)
                    const hasPrices = product.prices && product.prices.length > 0

                    return (
                      <Fragment key={product.id}>
                        <TableRow
                          className={`cursor-pointer hover:bg-muted/50 ${
                            isExpanded ? 'bg-muted/30' : ''
                          }`}
                          onClick={() => hasPrices && toggleExpand(product.id)}
                        >
                          <TableCell className="pl-4 md:pl-6 shrink-0">
                            {hasPrices && (
                              <button className="hover:bg-muted rounded p-1">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </button>
                            )}
                          </TableCell>
                          <TableCell className="font-medium min-w-0 overflow-hidden">
                            <span className="block truncate" title={product.name}>
                              {product.name}
                            </span>
                          </TableCell>
                          <TableCell className="min-w-0 overflow-hidden">
                            <code
                              className="text-xs bg-muted px-2 py-1 rounded truncate block"
                              title={product.ref}
                            >
                              {product.ref}
                            </code>
                          </TableCell>
                          <TableCell className="shrink-0">
                            <Badge
                              variant={product.active ? 'default' : 'secondary'}
                              className={
                                product.active
                                  ? 'bg-success/10 text-success hover:bg-success/20'
                                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
                              }
                            >
                              {product.active ? (
                                <>
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  {CONTENT.status.active}
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-3 w-3 mr-1" />
                                  {CONTENT.status.inactive}
                                </>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right shrink-0">
                            <Badge variant="outline">{product.prices?.length || 0}</Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground shrink-0 overflow-hidden">
                            <span
                              className="block truncate"
                              title={
                                product.created_at
                                  ? formatDistanceToNow(new Date(product.created_at), {
                                      addSuffix: true,
                                      locale: ptBR,
                                    })
                                  : ''
                              }
                            >
                              {product.created_at
                                ? formatDistanceToNow(new Date(product.created_at), {
                                    addSuffix: true,
                                    locale: ptBR,
                                  })
                                : '—'}
                            </span>
                          </TableCell>
                          <TableCell className="pr-2 md:pr-4 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation()
                                downloadProductJson(product)
                              }}
                              className="h-8 w-8"
                              title={CONTENT.downloadJson}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation()
                                setCreatingNew(false)
                                setEditingProduct(product)
                              }}
                              className="h-8 w-8"
                              title={CONTENT.edit}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation()
                                setProductToDelete(product)
                              }}
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              title={CONTENT.delete.confirm}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>

                        {/* Expanded row with prices */}
                        {isExpanded && hasPrices && (
                          <TableRow key={`${product.id}-prices`} className="border-b">
                            <TableCell colSpan={7} className="bg-muted/20 p-0">
                              <div className="px-2 md:px-4 py-4 min-w-0">
                                <Table className="w-full table-fixed">
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="w-[18%] min-w-0">
                                        {CONTENT.pricesTable.name}
                                      </TableHead>
                                      <TableHead className="w-[12%] shrink-0">
                                        {CONTENT.pricesTable.value}
                                      </TableHead>
                                      <TableHead className="w-[17%] shrink-0">
                                        {CONTENT.pricesTable.cash}
                                      </TableHead>
                                      <TableHead className="w-[17%] shrink-0">
                                        {CONTENT.pricesTable.installmentMax}
                                      </TableHead>
                                      <TableHead className="w-[10%] shrink-0">
                                        {CONTENT.table.header.type}
                                      </TableHead>
                                      <TableHead className="w-[9%] min-w-0">
                                        {CONTENT.table.header.recurrence}
                                      </TableHead>
                                      <TableHead className="w-10 shrink-0">
                                        {CONTENT.table.header.status}
                                      </TableHead>
                                      <TableHead className="w-20 shrink-0 text-right">
                                        {CONTENT.pricesTable.link}
                                      </TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {product.prices!.map((price, priceIndex) => {
                                      const meta = (price.metadata as Record<string, unknown>) || {}
                                      const priceName =
                                        (typeof meta.title === 'string' && meta.title.trim()) ||
                                        price.ref ||
                                        `${CONTENT.pricesTable.priceLabel} ${priceIndex + 1}`
                                      return (
                                        <TableRow key={price.id}>
                                          <TableCell className="font-medium min-w-0 overflow-hidden">
                                            <span className="block truncate" title={priceName}>
                                              {priceName}
                                            </span>
                                          </TableCell>
                                          <TableCell className="font-mono font-bold text-sm shrink-0 overflow-hidden">
                                            <span
                                              className="block truncate"
                                              title={formatPrice(price.amount)}
                                            >
                                              {formatPrice(price.amount)}
                                            </span>
                                          </TableCell>
                                          <TableCell className="shrink-0 overflow-hidden">
                                            {(() => {
                                              const cash = getCashPrice(price.amount, meta)
                                              if (!cash)
                                                return (
                                                  <span className="text-muted-foreground">—</span>
                                                )
                                              return (
                                                <span
                                                  className="text-sm font-medium text-primary"
                                                  title={`${cash.pct}% de desconto`}
                                                >
                                                  {formatPrice(cash.cashCents)} ({cash.pct}%)
                                                </span>
                                              )
                                            })()}
                                          </TableCell>
                                          <TableCell className="shrink-0 overflow-hidden">
                                            {(() => {
                                              const maxInst =
                                                typeof meta?.max_installments === 'number' &&
                                                meta.max_installments > 1
                                                  ? meta.max_installments
                                                  : 0
                                              if (!maxInst)
                                                return (
                                                  <span className="text-muted-foreground">—</span>
                                                )
                                              const parcelCents = Math.round(price.amount / maxInst)
                                              return (
                                                <span
                                                  className="text-sm"
                                                  title={`${maxInst}x ${formatPrice(parcelCents)}`}
                                                >
                                                  {maxInst}x {formatPrice(parcelCents)}
                                                </span>
                                              )
                                            })()}
                                          </TableCell>
                                          <TableCell className="shrink-0 overflow-hidden">
                                            <Badge
                                              variant="secondary"
                                              className="text-xs truncate max-w-full"
                                            >
                                              {price.recurring
                                                ? CONTENT.price.recurring
                                                : CONTENT.price.oneTime}
                                            </Badge>
                                          </TableCell>
                                          <TableCell className="min-w-0 overflow-hidden">
                                            {price.recurring && price.interval ? (
                                              <span
                                                className="text-sm truncate block"
                                                title={
                                                  price.interval_count && price.interval_count > 1
                                                    ? `A cada ${price.interval_count} ${price.interval}s`
                                                    : `A cada ${price.interval}`
                                                }
                                              >
                                                {price.interval_count && price.interval_count > 1
                                                  ? `A cada ${price.interval_count} ${price.interval}s`
                                                  : `A cada ${price.interval}`}
                                              </span>
                                            ) : (
                                              <span className="text-sm text-muted-foreground">
                                                —
                                              </span>
                                            )}
                                          </TableCell>
                                          <TableCell className="shrink-0">
                                            <Badge
                                              variant={price.active ? 'default' : 'secondary'}
                                              className={
                                                price.active
                                                  ? 'bg-success/10 text-success'
                                                  : 'bg-muted text-muted-foreground'
                                              }
                                            >
                                              {price.active
                                                ? CONTENT.status.active
                                                : CONTENT.status.inactive}
                                            </Badge>
                                          </TableCell>
                                          <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => copyCheckoutLink(price.id)}
                                                className="h-8"
                                                title={
                                                  copiedPriceId === price.id
                                                    ? CONTENT.pricesTable.copied
                                                    : CONTENT.pricesTable.copyLink
                                                }
                                              >
                                                <Copy className="h-3 w-3" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                title={CONTENT.deletePrice.title}
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  setPriceToDelete({
                                                    productId: product.id,
                                                    priceId: price.id,
                                                  })
                                                }}
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          </TableCell>
                                        </TableRow>
                                      )
                                    })}
                                  </TableBody>
                                </Table>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    )
                  })}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        )}
      </AdminTableWrapper>

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
