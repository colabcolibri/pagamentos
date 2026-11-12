import type { PoolClient } from 'pg'
import { afterEach, describe, expect, it } from 'vitest'

import { allowsProfileCreation, ensureConfiguredAdmin } from './configured-admin'

function memoryClient() {
  const admins: { id: string; email: string; active: boolean }[] = []
  const client = {
    async query(sql: string, params: unknown[] = []) {
      const text = sql.replace(/\s+/g, ' ').trim()
      if (!text.startsWith('INSERT INTO payments.admin_users')) {
        throw new Error(`SQL sem mapa: ${text}`)
      }
      const id = String(params[0])
      const email = String(params[1])
      const existing = admins.find((admin) => admin.id === id)
      if (existing) {
        existing.email = email
        existing.active = true
        return { rows: [], rowCount: 1 }
      }
      admins.push({ id, email, active: true })
      return { rows: [], rowCount: 1 }
    },
  }
  return { client: client as unknown as PoolClient, admins }
}

describe('admin configurado', () => {
  const previous = process.env.ADMIN_EMAIL

  afterEach(() => {
    if (previous === undefined) delete process.env.ADMIN_EMAIL
    else process.env.ADMIN_EMAIL = previous
  })

  it('promove só o e-mail configurado', async () => {
    process.env.ADMIN_EMAIL = 'Admin@Quitou.local'
    const { client, admins } = memoryClient()

    const skipped = await ensureConfiguredAdmin(client, {
      profileId: 'perfil-1',
      email: 'outra@quitou.local',
    })
    const promoted = await ensureConfiguredAdmin(client, {
      profileId: 'perfil-2',
      email: 'admin@quitou.local',
    })

    expect(skipped).toBe(false)
    expect(promoted).toBe(true)
    expect(admins).toEqual([{ id: 'perfil-2', email: 'admin@quitou.local', active: true }])
  })

  it('deixa o e-mail de admin criar perfil no login', () => {
    process.env.ADMIN_EMAIL = 'admin@quitou.local'

    expect(allowsProfileCreation('Admin@Quitou.local', false)).toBe(true)
    expect(allowsProfileCreation('cliente@quitou.local', false)).toBe(false)
    expect(allowsProfileCreation('cliente@quitou.local', undefined)).toBe(true)
  })

  it('não promove quando a variável está vazia', async () => {
    process.env.ADMIN_EMAIL = '   '
    const { client, admins } = memoryClient()

    const promoted = await ensureConfiguredAdmin(client, {
      profileId: 'perfil-1',
      email: 'admin@quitou.local',
    })

    expect(promoted).toBe(false)
    expect(admins).toEqual([])
  })
})
