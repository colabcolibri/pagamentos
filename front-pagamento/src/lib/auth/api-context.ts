import { NextResponse } from 'next/server'

import { requireAuth } from './api-guards'

export interface ApiContext {
  user: {
    id: string
    email: string | undefined
  }
}

export async function getApiContext(): Promise<ApiContext | NextResponse> {
  const auth = await requireAuth()
  if (!auth.success) {
    return auth.response
  }

  return {
    user: auth.user,
  }
}

export async function requireApiContext(): Promise<ApiContext> {
  const context = await getApiContext()

  if (context instanceof NextResponse) {
    throw new Error('Usuário não autenticado')
  }

  return context
}
