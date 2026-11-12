import 'server-only'

import { publicEnv } from '@/lib/config/env'

import { createDispatcher } from './core/dispatcher'
import { MCP_TOOLS } from './tools/catalog'

export const dispatchMcp = createDispatcher(MCP_TOOLS)

export function mcpResourceMetadataUrl() {
  return `${publicEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/.well-known/oauth-protected-resource`
}

export function mcpWwwAuthenticate() {
  return `Bearer realm="quitou", resource_metadata="${mcpResourceMetadataUrl()}"`
}
