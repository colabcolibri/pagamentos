'use client'

import { useEffect, useState } from 'react'

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
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="mx-auto w-full max-w-5xl overflow-x-hidden px-4 py-6 sm:px-6">
      <h1 className="text-xl font-semibold text-foreground">Trilha de admin</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Últimas marcações de pago, cancelamentos, exclusões e chamadas do MCP.
      </p>
      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      <div className="mt-4 overflow-x-auto rounded-md border">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2 font-medium">Quando</th>
              <th className="px-3 py-2 font-medium">Ação</th>
              <th className="px-3 py-2 font-medium">Detalhe</th>
              <th className="px-3 py-2 font-medium">Alvo</th>
              <th className="px-3 py-2 font-medium">Admin</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-muted-foreground" colSpan={5}>
                  Nenhuma ação registrada.
                </td>
              </tr>
            ) : (
              events.map((event) => (
                <tr key={event.id} className="border-t">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {new Date(event.created_at).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-3 py-2">{event.action}</td>
                  <td className="px-3 py-2 break-all">{event.detail ?? '—'}</td>
                  <td className="px-3 py-2 break-all">
                    {event.target_type} {event.target_id}
                  </td>
                  <td className="px-3 py-2 break-all">{event.actor_id}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
