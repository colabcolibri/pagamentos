import 'server-only'

import { serverEnv } from '@/lib/config/env'

const DEFAULT_DEV_MAILBOX = 'http://127.0.0.1:8025'

export type DevMailbox = {
  email: string
  base: string
}

/** Caixa local do Mailpit. Em produção não existe. */
export function devMailboxForAdmin(): DevMailbox | null {
  if (serverEnv.NODE_ENV === 'production') return null
  const email = serverEnv.ADMIN_EMAIL
  if (!email) return null
  const base = (process.env.DEV_MAILBOX_URL?.trim() || DEFAULT_DEV_MAILBOX).replace(/\/$/, '')
  return { email, base }
}
