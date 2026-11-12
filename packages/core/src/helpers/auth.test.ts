import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { sendOtpAndCreateUserIfNeeded, upsertUserProfile } from './auth'

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('upsertUserProfile', () => {
  it('chama payments.upsert_profile com user_id e dados básicos', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { id: 'user-uuid', email: 'x@y.z' }, error: null })
    const supabase = {
      schema: (_schema: string) => ({ rpc }),
    }

    const result = await upsertUserProfile(supabase as any, 'user-uuid', {
      email: 'x@y.z',
      name: 'Nome',
      phone: '11999999999',
      document: '12345678901',
    })

    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('upsert_profile', {
      user_id: 'user-uuid',
      user_email: 'x@y.z',
      user_name: 'Nome',
      user_phone: '11999999999',
      user_document: '12345678901',
      user_person_type: 'individual',
    })
    expect(result.error).toBeUndefined()
    expect(result.profile).toEqual({ id: 'user-uuid', email: 'x@y.z' })
  })

  it('define person_type company quando documento tem mais de 14 caracteres', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { id: 'u1' }, error: null })
    const supabase = { schema: () => ({ rpc }) }

    await upsertUserProfile(supabase as any, 'u1', {
      email: 'e@co.com',
      name: 'PJ',
      document: '123456780001991',
    })

    expect(rpc).toHaveBeenCalledWith(
      'upsert_profile',
      expect.objectContaining({
        user_person_type: 'company',
      })
    )
  })

  it('propaga erro quando rpc retorna profileError', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'forbidden' },
    })
    const supabase = { schema: () => ({ rpc }) }

    const result = await upsertUserProfile(supabase as any, 'u1', {
      email: 'a@b.c',
      name: 'N',
    })

    expect(result.profile).toBeNull()
    expect(result.error).toBeInstanceOf(Error)
    expect(result.error?.message).toBe('Erro ao processar dados do cliente')
  })
})

describe('sendOtpAndCreateUserIfNeeded', () => {
  it('delega ao gateway e não chama auth do Supabase', async () => {
    const request = vi.fn().mockResolvedValue({
      userExists: true,
      emailSent: true,
      message: 'enviado',
    })
    const listUsers = vi.fn()
    const createUser = vi.fn()
    const signInWithOtp = vi.fn()

    const out = await sendOtpAndCreateUserIfNeeded(
      { request },
      'velho@exemplo.com',
      'Nome',
      'https://app/callback'
    )

    expect(request).toHaveBeenCalledWith({
      email: 'velho@exemplo.com',
      name: 'Nome',
      redirectUrl: 'https://app/callback',
      phone: undefined,
      document: undefined,
    })
    expect(listUsers).not.toHaveBeenCalled()
    expect(createUser).not.toHaveBeenCalled()
    expect(signInWithOtp).not.toHaveBeenCalled()
    expect(out.emailSent).toBe(true)
    expect(out.userExists).toBe(true)
  })

  it('devolve erro quando o gateway falha, sem o código em claro', async () => {
    const out = await sendOtpAndCreateUserIfNeeded(
      {
        request: vi.fn().mockRejectedValue(new Error('smtp indisponível')),
      },
      'ok@exemplo.com',
      'Nome',
      'https://cb'
    )

    expect(out.emailSent).toBe(false)
    expect(out.error?.message).toBe('smtp indisponível')
    expect(JSON.stringify(out)).not.toMatch(/\d{6}/)
  })
})
