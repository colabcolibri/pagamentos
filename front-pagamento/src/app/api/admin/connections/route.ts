/**
 * GET /api/admin/connections
 * Testa conexões com APIs e webhooks (admin only)
 * Nunca expõe chaves ou dados sensíveis
 */
import { NextResponse } from 'next/server'

import { runAllConnectionTests } from '@/lib/admin/connection-tests'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  const authResult = await requireAdmin()
  if (!authResult.success) {
    return authResult.response
  }

  try {
    const results = await runAllConnectionTests()
    return NextResponse.json({ connections: results })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao executar testes de conexão' }, { status: 500 })
  }
}
