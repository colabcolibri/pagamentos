import { NextResponse } from 'next/server'

import { authorizationServerMetadata } from '@/lib/mcp/oauth-metadata'

export function GET() {
  return NextResponse.json(authorizationServerMetadata())
}
