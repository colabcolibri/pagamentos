import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth'
import { getPool } from '@/lib/db/pool'
import { createApiHandler } from '@/lib/errors'

const DEFAULT_PAGE_SIZE = 48
const MAX_PAGE_SIZE = 96

function sanitizeIlikeSubstring(input: string): string {
  return input.replace(/[%_\\,]/g, '')
}

const LIST_COLUMNS = [
  'id',
  'created_at',
  'updated_at',
  'status',
  'recipient',
  'subject',
  'from_name',
  'from_email',
  'reply_to',
  'cc',
  'error_message',
  'message_id',
  'metadata',
  'order_id',
  'webhook_event_id',
].join(', ')

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
    const status = searchParams.get('status') || undefined
    const qRaw = searchParams.get('q')?.trim()
    const qSanitized = qRaw && qRaw.length > 0 ? sanitizeIlikeSubstring(qRaw) : ''
    const q = qSanitized.length > 0 ? qSanitized : undefined
    const typeRaw = searchParams.get('type')?.trim()
    const typeSanitized = typeRaw && typeRaw.length > 0 ? sanitizeIlikeSubstring(typeRaw) : ''
    const emailType = typeSanitized.length > 0 ? typeSanitized : undefined
    const orderId = searchParams.get('orderId')?.trim() || undefined

    const where: string[] = []
    const params: unknown[] = []
    if (status) {
      params.push(status)
      where.push(`status = $${params.length}`)
    }
    if (q) {
      params.push(`%${q}%`)
      where.push(`(recipient ILIKE $${params.length} OR subject ILIKE $${params.length})`)
    }
    if (emailType) {
      params.push(`%${emailType}%`)
      where.push(`metadata->>'type' ILIKE $${params.length}`)
    }
    if (orderId) {
      params.push(orderId)
      where.push(`order_id = $${params.length}`)
    }
    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''

    const count = await getPool().query<{ total: number }>(
      `SELECT count(*)::int AS total FROM payments.email_logs ${whereSql}`,
      params
    )
    const totalCount = count.rows[0]?.total ?? 0
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
    const currentPage = Math.min(page, totalPages)
    const fromIndex = (currentPage - 1) * pageSize
    const dataParams = [...params, pageSize, fromIndex]
    const data = await getPool().query(
      `SELECT ${LIST_COLUMNS}
       FROM payments.email_logs
       ${whereSql}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      dataParams
    )

    return NextResponse.json({
      emailLogs: data.rows,
      total: totalCount,
      page: currentPage,
      pageSize,
      totalPages,
    })
  },
  { module: 'admin', action: 'list_email_logs' }
)
