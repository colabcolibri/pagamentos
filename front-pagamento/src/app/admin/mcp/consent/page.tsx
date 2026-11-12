import { cookies } from 'next/headers'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { findActiveSession } from '@/lib/auth/session'
import { publicEnv } from '@/lib/config/env'
import { signMcpConsentToken } from '@/lib/mcp/auth/consent-csrf'

export default async function McpConsentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const clientId = typeof params.client_id === 'string' ? params.client_id : ''
  const redirectUri = typeof params.redirect_uri === 'string' ? params.redirect_uri : ''
  const challenge = typeof params.code_challenge === 'string' ? params.code_challenge : ''
  const state = typeof params.state === 'string' ? params.state : ''

  const cookieStore = await cookies()
  const session = await findActiveSession(
    cookieStore.get(publicEnv.NEXT_PUBLIC_AUTH_COOKIE_NAME)?.value
  )
  const csrfToken = session?.isAdmin
    ? signMcpConsentToken({
        profileId: session.profileId,
        clientId,
        redirectUri,
        codeChallenge: challenge,
        state,
      })
    : ''

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8 md:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Conectar o Quitou ao cliente MCP</CardTitle>
          <CardDescription className="break-all">
            O cliente quer agir como você, {redirectUri || 'sem endereço de retorno'}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action="/api/mcp/oauth/consent"
            method="post"
            className="flex flex-col gap-3 sm:flex-row"
          >
            <input type="hidden" name="client_id" value={clientId} />
            <input type="hidden" name="redirect_uri" value={redirectUri} />
            <input type="hidden" name="code_challenge" value={challenge} />
            <input type="hidden" name="state" value={state} />
            <input type="hidden" name="csrf_token" value={csrfToken} />
            <Button type="submit" name="decision" value="allow" className="w-full sm:w-auto">
              Permitir
            </Button>
            <Button
              type="submit"
              name="decision"
              value="deny"
              variant="outline"
              className="w-full sm:w-auto"
            >
              Recusar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
