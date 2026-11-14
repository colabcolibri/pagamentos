'use client'

import { useEffect, useMemo, useState } from 'react'

import { type ColumnDef } from '@tanstack/react-table'
import { ScrollText } from 'lucide-react'

import { AdminPageLayout } from '@/components/admin/admin-page-layout'
import { AppDataTable } from '@/components/admin/app-data-table'
import { Sheet } from '@/components/layout/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { CopyableText } from '@/components/ui/clipboard-button'

const CONTENT = {
  title: 'Trilha de admin',
  subtitle: 'Últimas marcações de pago, cancelamentos, exclusões e chamadas do MCP.',
  ariaLabel: 'Trilha de auditoria do admin',
  emptyTitle: 'Nenhuma ação registrada',
  loadError: 'Não foi possível carregar a trilha',
  genericError: 'Erro ao carregar',
  columns: {
    when: 'Quando',
    action: 'Ação',
    detail: 'Detalhe',
    target: 'Alvo',
    actor: 'Admin',
  },
  sheet: {
    title: 'Detalhes do evento',
    subtitle: 'Registro completo da trilha de auditoria',
    action: 'Ação',
    when: 'Data e hora',
    detail: 'Detalhe',
    targetType: 'Tipo de alvo',
    targetId: 'ID do alvo',
    actorId: 'Admin (actor)',
    eventId: 'ID do evento',
  },
} as const

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
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null)

  useEffect(() => {
    let active = true
    fetch('/api/admin/audit-events')
      .then(async (response) => {
        if (!response.ok) throw new Error(CONTENT.loadError)
        return response.json() as Promise<{ events: AuditEvent[] }>
      })
      .then((body) => {
        if (active) setEvents(body.events)
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : CONTENT.genericError)
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
    <AdminPageLayout title={CONTENT.title} subtitle={CONTENT.subtitle}>
      <AppDataTable
        ariaLabel={CONTENT.ariaLabel}
        columns={columns}
        data={events}
        isLoading={isLoading}
        error={error}
        emptyIcon={<ScrollText className="size-10 text-muted-foreground/60" />}
        emptyTitle={CONTENT.emptyTitle}
        onRowClick={(row) => setSelectedEvent(row)}
        getRowId={(row) => row.id}
      />

      <Sheet
        open={selectedEvent !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedEvent(null)
        }}
        title={CONTENT.sheet.title}
        description={selectedEvent ? selectedEvent.action : CONTENT.sheet.subtitle}
        size="md"
        hideFooter
      >
        {selectedEvent && (
          <div className="space-y-5">
            <dl className="divide-y divide-border/60 border-y border-border/60 text-sm">
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-muted-foreground">{CONTENT.sheet.action}</dt>
                <dd>
                  <Badge variant="outline" className="font-mono text-xs">
                    {selectedEvent.action}
                  </Badge>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-muted-foreground">{CONTENT.sheet.when}</dt>
                <dd className="tabular-nums text-xs">
                  {new Date(selectedEvent.created_at).toLocaleString('pt-BR')}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-muted-foreground">{CONTENT.sheet.targetType}</dt>
                <dd className="font-mono text-xs">{selectedEvent.target_type}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-muted-foreground">{CONTENT.sheet.targetId}</dt>
                <dd>
                  <CopyableText text={selectedEvent.target_id} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-muted-foreground">{CONTENT.sheet.actorId}</dt>
                <dd>
                  <CopyableText text={selectedEvent.actor_id} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-muted-foreground">{CONTENT.sheet.eventId}</dt>
                <dd>
                  <CopyableText text={selectedEvent.id} />
                </dd>
              </div>
            </dl>

            {selectedEvent.detail && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">{CONTENT.sheet.detail}</p>
                <pre className="whitespace-pre-wrap break-words rounded-md bg-muted/50 p-3 font-mono text-xs text-foreground">
                  {selectedEvent.detail}
                </pre>
              </div>
            )}
          </div>
        )}
      </Sheet>
    </AdminPageLayout>
  )
}
