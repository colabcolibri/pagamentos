import { NextResponse } from 'next/server'

import { requestAccessCode } from '@/lib/auth/access-code'
import { allowsProfileCreation } from '@/lib/auth/configured-admin'
import { LOGIN_CODE_NOTICE } from '@/lib/auth/login-notice'
import { serverEnv } from '@/lib/config/env'
import { withTransaction } from '@/lib/db/pool'
import { sendAccessCodeEmail } from '@/lib/email-helpers'
import { databaseErrorResponse } from '@/lib/errors/error-handler'
import { getLogger } from '@/lib/logger'

function loggedCause(error: unknown): unknown {
  if (!(error instanceof Error)) return error
  return new Error(error.message.replace(/[^\s@]+@[^\s@]+/g, '[email]'))
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: string
    name?: string
    phone?: string
    document?: string
    createIfMissing?: boolean
  } | null

  if (!body?.email) {
    return NextResponse.json({ error: 'E-mail é obrigatório' }, { status: 400 })
  }

  const email = body.email.trim().toLowerCase()

  try {
    const result = await withTransaction((client) =>
      requestAccessCode(client, sendAccessCodeEmail, {
        email,
        name: body.name,
        phone: body.phone,
        document: body.document,
        createIfMissing: allowsProfileCreation(email, body.createIfMissing),
        codeSecret: serverEnv.ACCESS_CODE_SECRET,
      })
    )
    if (result.message === 'E-mail ou nome inválido') {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }
    getLogger().info('Código de acesso solicitado')
    return NextResponse.json({ message: LOGIN_CODE_NOTICE })
  } catch (error) {
    getLogger().error('Falha ao enviar código de acesso', loggedCause(error))
    return databaseErrorResponse()
  }
}
