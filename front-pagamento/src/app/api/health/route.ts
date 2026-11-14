import { NextResponse } from 'next/server'

import { getPool } from '@/lib/db/pool'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    await getPool().query('SELECT 1')
    return NextResponse.json({ ok: true, db: 'ok' }, { status: 200 })
  } catch {
    return NextResponse.json({ ok: false, db: 'error' }, { status: 503 })
  }
}
