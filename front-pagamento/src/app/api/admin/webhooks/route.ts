import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth'
import { getPool } from '@/lib/db/pool'
import { createApiHandler } from '@/lib/errors'

const DEFAULT_PAGE_SIZE = 48
const MAX_PAGE_SIZE = 96

function sanitizeIlikeSubstring(input: string): string {
  return input.replace(/[%_\\]/g, '')
}

export const GET = createApiHandler(
  async (request: Request) => {
    const authResult = await requireAdmin()
    if (!authResult.success) {
      return authResult.response
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1)
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(
        1,
        parseInt(searchParams.get('pageSize') ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE
      )
    )
    const provider = searchParams.get('provider') || undefined
    const status = searchParams.get('status') || undefined
    const eventTypeRaw = searchParams.get('eventType')?.trim()
    const eventTypeSanitized =
      eventTypeRaw && eventTypeRaw.length > 0 ? sanitizeIlikeSubstring(eventTypeRaw) : ''
    const eventType = eventTypeSanitized.length > 0 ? eventTypeSanitized : undefined

    const where: string[] = []
    const params: unknown[] = []
    if (provider) {
      params.push(provider)
      where.push(`provider = $${params.length}`)
    }
    if (status) {
      params.push(status)
      where.push(`processing_status = $${params.length}`)
    }
    if (eventType) {
      params.push(`%${eventType}%`)
      where.push(`event_type ILIKE $${params.length}`)
    }
    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''

    const count = await getPool().query<{ total: number }>(
      `SELECT count(*)::int AS total FROM payments.webhook_events ${whereSql}`,
      params
    )
    const totalCount = count.rows[0]?.total ?? 0
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
    const currentPage = Math.min(page, totalPages)
    const fromIndex = (currentPage - 1) * pageSize
    const data = await getPool().query(
      `SELECT *
       FROM payments.webhook_events
       ${whereSql}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, fromIndex]
    )

    return NextResponse.json({
      webhooks: data.rows,
      total: totalCount,
      page: currentPage,
      pageSize,
      totalPages,
    })
  },
  { module: 'admin', action: 'list_webhooks' }
)
