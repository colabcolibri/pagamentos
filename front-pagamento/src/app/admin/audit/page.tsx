'use client'

import { useEffect, useMemo, useState } from 'react'

import { type ColumnDef } from '@tanstack/react-table'
import { ScrollText } from 'lucide-react'

import { AdminPageLayout } from '@/components/admin/admin-page-layout'
import { AppDataTable } from '@/components/admin/app-data-table'
import { Badge } from '@/components/ui/badge'

type AuditEvent = {
  id: string
  actor_id: string
  action: string
  target_type: string
  target_id: string
  detail: string | null
  created_at: string
}

export default function AdminAuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetch('/api/admin/audit-events')
      .then(async (response) => {
        if (!response.ok) throw new Error('Não foi possível carregar a trilha')
        return response.json() as Promise<{ events: AuditEvent[] }>
      })
      .then((body) => {
        if (active) setEvents(body.events)
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Erro ao carregar')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const columns = useMemo<ColumnDef<AuditEvent>[]>(
    () => [
      {
        accessorKey: 'created_at',
        header: 'Quando',
        meta: {
          cellClassName: 'text-sm text-muted-foreground tabular-nums whitespace-nowrap',
        },
        cell: ({ row }) => new Date(row.original.created_at).toLocaleString('pt-BR'),
      },
      {
        accessorKey: 'action',
        header: 'Ação',
        cell: ({ row }) => (
          <Badge variant="outline" className="font-mono text-xs">
            {row.original.action}
          </Badge>
        ),
      },
      {
        accessorKey: 'detail',
        header: 'Detalhe',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground block max-w-[260px] truncate">
            {row.original.detail ?? '—'}
          </span>
        ),
      },
      {
        id: 'target',
        header: 'Alvo',
        cell: ({ row }) => (
          <code className="text-xs bg-muted px-2 py-0.5 rounded block max-w-[220px] truncate">
            {row.original.target_type} {row.original.target_id}
          </code>
        ),
      },
      {
        accessorKey: 'actor_id',
        header: 'Admin',
        cell: ({ row }) => (
          <code className="text-xs text-muted-foreground block max-w-[160px] truncate">
            {row.original.actor_id}
          </code>
        ),
      },
    ],
    []
  )

  return (
    <AdminPageLayout
      title="Trilha de admin"
      subtitle="Últimas marcações de pago, cancelamentos, exclusões e chamadas do MCP."
    >
      <AppDataTable
        ariaLabel="Trilha de auditoria do admin"
        columns={columns}
        data={events}
        isLoading={isLoading}
        error={error}
        emptyIcon={<ScrollText className="size-10 text-muted-foreground/60" />}
        emptyTitle="Nenhuma ação registrada"
        getRowId={(row) => row.id}
      />
    </AdminPageLayout>
  )
}
