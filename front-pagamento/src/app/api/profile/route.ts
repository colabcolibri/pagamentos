import { NextResponse } from 'next/server'

import { asaasCustomerFullNameMessage, nameHasAtLeastTwoParts } from '@quitou/core/pricing'
import { z } from 'zod'

import { getApiContext } from '@/lib/auth/api-context'
import { createApiHandler } from '@/lib/errors'
import { readOwnProfile, updateOwnProfile } from '@/lib/profile/profile-store'

const patchProfileBodySchema = z
  .object({
    name: z
      .string()
      .min(1, 'Nome é obrigatório')
      .max(200)
      .transform((s) => s.trim()),
    phone: z.string().max(30).default(''),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!nameHasAtLeastTwoParts(data.name)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: asaasCustomerFullNameMessage,
        path: ['name'],
      })
    }
    const digits = data.phone.replace(/\D/g, '')
    if (data.phone.trim() !== '' && digits.length < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Telefone deve ter pelo menos 10 dígitos',
        path: ['phone'],
      })
    }
  })

/**
 * GET /api/profile
 * Retorna o perfil do usuário autenticado
 * - Requer autenticação
 */
export const GET = createApiHandler(
  async (_request: Request) => {
    const context = await getApiContext()
    if (context instanceof NextResponse) {
      return context
    }

    const { user } = context
    const profile = await readOwnProfile(user.id)

    return NextResponse.json({
      profile: profile || null,
      user: {
        id: user.id,
        email: user.email,
      },
    })
  },
  { module: 'profile', action: 'get_profile' }
)

/**
 * PATCH /api/profile
 * Atualiza nome e telefone do usuário autenticado apenas.
 * - Identidade sempre da sessão (sem userId no body — evita IDOR).
 * - Email não é aceito aqui; use o fluxo do Supabase Auth.
 */
export const PATCH = createApiHandler(
  async (request: Request) => {
    const context = await getApiContext()
    if (context instanceof NextResponse) {
      return context
    }

    const { user } = context

    let json: unknown
    try {
      json = await request.json()
    } catch {
      return NextResponse.json({ error: 'JSON inválido', code: 'BAD_REQUEST' }, { status: 400 })
    }

    const parsed = patchProfileBodySchema.safeParse(json)
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      const message = Object.values(fieldErrors).flat().filter(Boolean)[0] ?? 'Dados inválidos'
      return NextResponse.json(
        { error: message, code: 'VALIDATION_ERROR', details: fieldErrors },
        { status: 400 }
      )
    }

    const digits = parsed.data.phone.replace(/\D/g, '')
    const phone = digits.length >= 10 ? digits : null

    const profile = await updateOwnProfile(user.id, parsed.data.name, phone)
    if (!profile) {
      return NextResponse.json(
        { error: 'Perfil não encontrado', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      profile: profile ?? null,
      user: {
        id: user.id,
        email: user.email,
      },
    })
  },
  { module: 'profile', action: 'patch_profile' }
)
