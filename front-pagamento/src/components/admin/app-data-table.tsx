'use client'

import * as React from 'react'

import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { ChevronLeft, ChevronRight, XCircle } from 'lucide-react'

import { AdminTableWrapper } from '@/components/admin/admin-table-wrapper'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

export interface AppDataTablePagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
  onPageChange: (page: number) => void
}

interface AppDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  ariaLabel: string
  isLoading?: boolean
  error?: string | null
  errorTitle?: string
  emptyIcon?: React.ReactNode
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: React.ReactNode
  toolbar?: React.ReactNode
  pagination?: AppDataTablePagination
  onRowClick?: (row: TData) => void
  skeletonRows?: number
  getRowId?: (row: TData, index: number) => string
}

export function AppDataTable<TData, TValue>({
  columns,
  data,
  ariaLabel,
  isLoading = false,
  error = null,
  errorTitle = 'Erro ao carregar dados',
  emptyIcon,
  emptyTitle = 'Nenhum registro encontrado',
  emptyDescription,
  emptyAction,
  toolbar,
  pagination,
  onRowClick,
  skeletonRows = 6,
  getRowId,
}: AppDataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
  })

  const startResult =
    !pagination || pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1
  const endResult = pagination
    ? Math.min(pagination.page * pagination.pageSize, pagination.total)
    : 0

  return (
    <div className="space-y-4 min-w-0">
      {toolbar && <div className="min-w-0">{toolbar}</div>}

      {error ? (
        <AdminTableWrapper aria-label={ariaLabel}>
          <div className="p-8 md:p-12 text-center bg-destructive/5">
            <XCircle className="size-10 text-destructive mx-auto mb-3" />
            <h3 className="text-base font-semibold text-foreground mb-1">{errorTitle}</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </AdminTableWrapper>
      ) : isLoading ? (
        <AdminTableWrapper aria-label={ariaLabel}>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {Array.from({ length: skeletonRows }).map((_, rowIndex) => (
                <TableRow key={rowIndex} className="hover:bg-transparent">
                  {columns.map((_, colIndex) => (
                    <TableCell key={colIndex}>
                      <Skeleton className="h-4 w-full max-w-[140px]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AdminTableWrapper>
      ) : data.length === 0 ? (
        <AdminTableWrapper aria-label={ariaLabel}>
          <div className="p-8 md:p-12 text-center">
            {emptyIcon && <div className="mb-3 flex justify-center">{emptyIcon}</div>}
            <h3 className="text-base font-semibold text-foreground mb-1">{emptyTitle}</h3>
            {emptyDescription && (
              <p className="text-sm text-muted-foreground max-w-md mx-auto">{emptyDescription}</p>
            )}
            {emptyAction && <div className="mt-4">{emptyAction}</div>}
          </div>
        </AdminTableWrapper>
      ) : (
        <AdminTableWrapper aria-label={ariaLabel}>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const meta = header.column.columnDef.meta as
                      | { headerClassName?: string }
                      | undefined
                    return (
                      <TableHead key={header.id} className={meta?.headerClassName}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={cn(onRowClick && 'cursor-pointer')}
                >
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta as
                      | { cellClassName?: string }
                      | undefined
                    return (
                      <TableCell key={cell.id} className={meta?.cellClassName}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AdminTableWrapper>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-1">
          <div className="text-sm text-muted-foreground tabular-nums">
            Mostrando <span className="font-medium text-foreground">{startResult}</span>–
            <span className="font-medium text-foreground">{endResult}</span> de{' '}
            <span className="font-medium text-foreground">{pagination.total}</span> resultados
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              <ChevronLeft className="size-4" />
              Anterior
            </Button>
            <span className="px-2 text-sm font-medium tabular-nums text-muted-foreground">
              Página <span className="text-foreground">{pagination.page}</span> de{' '}
              <span className="text-foreground">{pagination.totalPages}</span>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
            >
              Próxima
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
