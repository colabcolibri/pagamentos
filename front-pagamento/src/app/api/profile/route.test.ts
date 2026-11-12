import { NextResponse } from 'next/server'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GET, PATCH } from './route'

vi.mock('@/lib/auth/api-context', () => ({
  getApiContext: vi.fn(),
}))

vi.mock('@/lib/profile/profile-store', () => ({
  readOwnProfile: vi.fn(),
  updateOwnProfile: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  getLogger: () => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}))

const { getApiContext } = await import('@/lib/auth/api-context')
const { readOwnProfile, updateOwnProfile } = await import('@/lib/profile/profile-store')

describe('GET /api/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('propaga 401 quando não autenticado', async () => {
    vi.mocked(getApiContext).mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )

    const res = await GET(new Request('http://localhost/api/profile'))
    expect(res.status).toBe(401)
  })

  it('retorna o perfil da sessão', async () => {
    const profile = { id: 'u1', name: 'Maria Souza', phone: '11999999999' }
    vi.mocked(readOwnProfile).mockResolvedValue(profile)
    vi.mocked(getApiContext).mockResolvedValue({
      user: { id: 'u1', email: 'm@example.com' },
    })

    const res = await GET(new Request('http://localhost/api/profile'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.profile).toEqual(profile)
    expect(readOwnProfile).toHaveBeenCalledWith('u1')
  })
})

describe('PATCH /api/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna 400 para JSON inválido', async () => {
    vi.mocked(getApiContext).mockResolvedValue({
      user: { id: 'u1', email: 'm@example.com' },
    })

    const res = await PATCH(
      new Request('http://localhost/api/profile', {
        method: 'PATCH',
        body: 'not-json',
        headers: { 'Content-Type': 'application/json' },
      })
    )
    expect(res.status).toBe(400)
  })

  it('retorna 400 quando nome não tem duas partes', async () => {
    vi.mocked(getApiContext).mockResolvedValue({
      user: { id: 'u1', email: 'm@example.com' },
    })

    const res = await PATCH(
      new Request('http://localhost/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Somente', phone: '' }),
      })
    )
    expect(res.status).toBe(400)
  })

  it('atualiza só o perfil da sessão', async () => {
    const updated = { id: 'u1', name: 'Maria Souza', phone: '11988887777' }
    vi.mocked(updateOwnProfile).mockResolvedValue(updated)
    vi.mocked(getApiContext).mockResolvedValue({
      user: { id: 'u1', email: 'm@example.com' },
    })

    const res = await PATCH(
      new Request('http://localhost/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Maria Souza', phone: '(11) 98888-7777' }),
      })
    )
    expect(res.status).toBe(200)
    expect(updateOwnProfile).toHaveBeenCalledWith('u1', 'Maria Souza', '11988887777')
  })
})
