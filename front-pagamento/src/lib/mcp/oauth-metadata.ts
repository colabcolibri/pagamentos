import 'server-only'

import { publicEnv } from '@/lib/config/env'

function origin() {
  return publicEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
}

export function protectedResourceMetadata() {
  const base = origin()
  return {
    resource: `${base}/api/mcp`,
    authorization_servers: [base],
    bearer_methods_supported: ['header'],
  }
}

export function authorizationServerMetadata() {
  const base = origin()
  return {
    issuer: base,
    authorization_endpoint: `${base}/api/mcp/oauth/authorize`,
    token_endpoint: `${base}/api/mcp/oauth/token`,
    registration_endpoint: `${base}/api/mcp/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
  }
}
