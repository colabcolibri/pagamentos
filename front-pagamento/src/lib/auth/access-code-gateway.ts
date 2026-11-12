import type { AccessCodeGateway } from '@quitou/core'
import 'server-only'

import { serverEnv } from '@/lib/config/env'
import { withTransaction } from '@/lib/db/pool'
import { sendAccessCodeEmail } from '@/lib/email-helpers'
import { getLogger } from '@/lib/logger'

import { requestAccessCode } from './access-code'

export const accessCodeGateway: AccessCodeGateway = {
  async request(input) {
    const logger = getLogger()
    try {
      const result = await withTransaction((client) =>
        requestAccessCode(client, sendAccessCodeEmail, {
          ...input,
          codeSecret: serverEnv.ACCESS_CODE_SECRET,
        })
      )
      logger.info('Código de acesso solicitado')
      return result
    } catch (error) {
      logger.error('Falha ao enviar código de acesso', error)
      return {
        userExists: false,
        emailSent: false,
        message: 'Erro ao enviar código de verificação',
        error: error instanceof Error ? error : new Error('Erro ao enviar código'),
      }
    }
  },
}
