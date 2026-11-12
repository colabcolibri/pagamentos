'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type {
  CreatePriceDTO,
  CreateProductDTO,
  Product,
  UpdatePriceDTO,
  UpdateProductDTO,
} from '@/lib/payments/product'

/**
 * Cria produto via API Route
 */
async function createProduct(data: CreateProductDTO): Promise<{ product: Product }> {
  const response = await fetch('/api/admin/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Erro ao criar produto')
  }

  return response.json()
}

/**
 * Busca produtos via API Route
 */
async function fetchProducts(active?: boolean): Promise<{ products: Product[] }> {
  const params = new URLSearchParams()
  if (active !== undefined) {
    params.append('active', String(active))
  }

  const qs = params.toString()
  const response = await fetch(qs ? `/api/admin/products?${qs}` : '/api/admin/products')

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Erro ao buscar produtos')
  }

  return response.json()
}

/**
 * Atualiza produto via API Route
 */
async function updateProduct(id: string, data: UpdateProductDTO): Promise<{ product: Product }> {
  const response = await fetch(`/api/admin/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Erro ao atualizar produto')
  }

  return response.json()
}

/**
 * Deleta produto via API Route
 */
async function deleteProduct(id: string): Promise<{ success: boolean }> {
  const response = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Erro ao excluir produto')
  }

  return response.json()
}

/**
 * Cria um preço para um produto via API Route
 */
async function createPrice(productId: string, data: CreatePriceDTO): Promise<{ product: Product }> {
  const response = await fetch(`/api/admin/products/${productId}/prices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Erro ao criar preço')
  }

  return response.json()
}

/**
 * Atualiza um preço via API Route
 */
async function updatePrice(
  productId: string,
  priceId: string,
  data: UpdatePriceDTO
): Promise<{ product: Product }> {
  const response = await fetch(`/api/admin/products/${productId}/prices/${priceId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Erro ao atualizar preço')
  }

  return response.json()
}

/**
 * Deleta um preço via API Route
 */
async function deletePrice(productId: string, priceId: string): Promise<{ success: boolean }> {
  const response = await fetch(`/api/admin/products/${productId}/prices/${priceId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Erro ao excluir preço')
  }

  return response.json()
}

/**
 * Hook para buscar produtos
 */
export function useProducts(options?: { active?: boolean }) {
  return useQuery({
    queryKey: ['admin', 'products', options],
    queryFn: () => fetchProducts(options?.active),
    select: (data) => data.products,
    staleTime: 2 * 60 * 1000, // 2 minutos
  })
}

/**
 * Hook para criar produto
 */
export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateProductDTO) => createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
    },
  })
}

/**
 * Hook para atualizar produto
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductDTO }) => updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
    },
  })
}

/**
 * Hook para deletar produto
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
    },
  })
}

/**
 * Hook para deletar um preço
 */
export function useDeletePrice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ productId, priceId }: { productId: string; priceId: string }) =>
      deletePrice(productId, priceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
    },
  })
}

/**
 * Hook para criar um preço
 */
export function useCreatePrice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ productId, data }: { productId: string; data: CreatePriceDTO }) =>
      createPrice(productId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
    },
  })
}

/**
 * Hook para atualizar um preço
 */
export function useUpdatePrice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      productId,
      priceId,
      data,
    }: {
      productId: string
      priceId: string
      data: UpdatePriceDTO
    }) => updatePrice(productId, priceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
    },
  })
}
