import { beforeEach, describe, expect, it, vi } from 'vitest'

import { requireAdmin, requireAuth } from './api-guards'

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))

vi.mock('./session', () => ({
  findActiveSession: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  getLogger: () => ({
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}))

const { cookies } = await import('next/headers')
const { findActiveSession } = await import('./session')

function withCookie() {
  vi.mocked(cookies).mockResolvedValue({
    get: () => ({ value: 'token' }),
  } as never)
}

describe('requireAuth', () => {
  beforeEach(() => {
    vi.mocked(findActiveSession).mockReset()
    withCookie()
  })

  it('retorna o perfil quando a sessão é válida', async () => {
    vi.mocked(findActiveSession).mockResolvedValue({
      profileId: 'u-1',
      email: 'a@b.c',
      isAdmin: false,
    })

    const out = await requireAuth()

    expect(out.success).toBe(true)
    if (out.success) {
      expect(out.user.id).toBe('u-1')
      expect(out.user.email).toBe('a@b.c')
    }
  })

  it('retorna 401 quando não há sessão', async () => {
    vi.mocked(findActiveSession).mockResolvedValue(null)

    const out = await requireAuth()

    expect(out.success).toBe(false)
    if (!out.success) {
      expect(out.response.status).toBe(401)
    }
  })
})

describe('requireAdmin', () => {
  beforeEach(() => {
    vi.mocked(findActiveSession).mockReset()
    withCookie()
  })

  it('retorna 401 sem sessão', async () => {
    vi.mocked(findActiveSession).mockResolvedValue(null)

    const out = await requireAdmin()

    expect(out.success).toBe(false)
    if (!out.success) expect(out.response.status).toBe(401)
  })

  it('retorna 403 quando o perfil não é admin ativo', async () => {
    vi.mocked(findActiveSession).mockResolvedValue({
      profileId: 'u-2',
      email: 'user@exemplo.com',
      isAdmin: false,
    })

    const out = await requireAdmin()

    expect(out.success).toBe(false)
    if (!out.success) {
      expect(out.response.status).toBe(403)
    }
  })

  it('devolve o usuário admin', async () => {
    vi.mocked(findActiveSession).mockResolvedValue({
      profileId: 'admin-1',
      email: 'admin@exemplo.com',
      isAdmin: true,
    })
    const out = await requireAdmin()

    expect(out.success).toBe(true)
    if (out.success) {
      expect(out.user.id).toBe('admin-1')
      expect(out.user.email).toBe('admin@exemplo.com')
    }
  })
})
