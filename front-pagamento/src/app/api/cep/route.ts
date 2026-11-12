import { NextResponse } from 'next/server'

import { apiErrorResponse } from '@/lib/errors/error-handler'

const VIACEP_URL = 'https://viacep.com.br/ws'

/**
 * GET /api/cep?cep=00000000
 * Busca endereço no ViaCEP (server-side). Fase 9.6 — CORS e controle centralizados.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const raw = searchParams.get('cep')
  const cep = raw?.replace(/\D/g, '') ?? ''

  if (cep.length !== 8 || !/^\d{8}$/.test(cep)) {
    return apiErrorResponse({
      error: 'CEP deve ter 8 dígitos',
      code: 'INVALID_REQUEST',
      status: 400,
    })
  }

  try {
    const res = await fetch(`${VIACEP_URL}/${cep}/json/`, {
      next: { revalidate: 86400 },
    })
    const data = (await res.json()) as Record<string, unknown>

    if (!res.ok) {
      return apiErrorResponse({
        error: 'Erro ao consultar CEP',
        code: 'CEP_SERVICE_ERROR',
        status: 502,
      })
    }

    return NextResponse.json(data)
  } catch (e) {
    return apiErrorResponse({
      error: 'Erro ao buscar CEP',
      code: 'CEP_SERVICE_ERROR',
      status: 502,
    })
  }
}
