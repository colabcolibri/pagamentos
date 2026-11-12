import { type NextRequest, NextResponse } from 'next/server'

import { safeMcpReturnPath } from '@/lib/mcp/auth/safe-return-path'
import {
  allowRequest,
  authAttemptAllowed,
  clientAddress,
  isApiRateLimitDisabled,
} from '@/lib/security/api-rate-limit'

/**
 * Rate limit por IP (janela deslizante em memória — reinicia com cold start).
 *
 * | Rota / grupo | Limite | Janela | Observação |
 * |--------------|--------|--------|------------|
 * | POST checkout (Pagar.me / Asaas) | 30 | 1 min | Tentativas de pagamento |
 * | POST /api/contact | 12 | 1 min | Formulário fale conosco |
 * | /api/admin/* | 240 | 1 min | Painel (muitas requisições em paralelo) |
 * | GET CEP + /api/products/* + GET payment status/confirmation | 400 | 1 min | Mesmo balde: catálogo + polling |
 * | POST /api/payments/coupon/preview | 90 | 1 min | Testar cupom no checkout |
 * | POST webhook Pagar.me / Asaas | 60 | 1 min | Entrada do gateway |
 * | POST código de acesso e verificação | 10/min por IP; 5 pedidos ou 10 verificações por e-mail em 10 min | `authAttemptAllowed` | `X-Forwarded-For` só com `TRUSTED_PROXY` |
 *
 * Desativa o limite da API quando:
 * - NODE_ENV !== 'production' (ex.: next dev — testes locais e e2e contra localhost)
 * - DISABLE_API_RATE_LIMIT=1 ou true (CI/e2e contra `next start` ou preview com NODE_ENV=production)
 */
const CHECKOUT_LIMIT = 30
const CHECKOUT_WINDOW_MS = 60_000
const ADMIN_LIMIT = 240
const ADMIN_WINDOW_MS = 60_000
const CONTACT_LIMIT = 12
const CONTACT_WINDOW_MS = 60_000
const PUBLIC_READ_LIMIT = 400
const PUBLIC_READ_WINDOW_MS = 60_000
const COUPON_PREVIEW_LIMIT = 90
const COUPON_PREVIEW_WINDOW_MS = 60_000
const WEBHOOK_LIMIT = 60
const WEBHOOK_WINDOW_MS = 60_000
const MCP_OAUTH_REGISTER_LIMIT = 10
const MCP_OAUTH_TOKEN_LIMIT = 30
const MCP_OAUTH_WINDOW_MS = 60_000
const CHECKOUT_POST_PATHS = new Set([
  '/api/payments/pagarme/checkout',
  '/api/payments/asaas/checkout/avista',
  '/api/payments/asaas/checkout/parcelado',
])

const PAYMENT_READ_PATH =
  /^\/api\/payments\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/(status|confirmation)$/i

function isPublicReadApiRoute(method: string, pathname: string): boolean {
  if (method !== 'GET') return false
  if (pathname === '/api/cep') return true
  if (pathname.startsWith('/api/products')) return true
  return PAYMENT_READ_PATH.test(pathname)
}

/**
 * IP do cliente para rate limit (memória por chave).
 *
 * **Proxy confiável:** usamos o primeiro valor de `X-Forwarded-For` (cliente original
 * quando o nginx **substitui** a cadeia). Se um cliente pudesse
 * enviar `X-Forwarded-For` direto ao Node **sem** um proxy que descarte ou sobrescreva
 * a lista, poderia inflar contadores de outro IP. Com nginx na frente e `TRUSTED_PROXY=1`,
 * o header é o do proxy, não o do cliente.
 *
 * Em desenvolvimento local (sem proxy), não há XFF → cai em `127.0.0.1` para todos.
 */
function getClientIp(request: NextRequest): string {
  const connectionIp = 'ip' in request ? ((request as { ip?: string | null }).ip ?? null) : null
  return clientAddress(request.headers, connectionIp)
}

function limited(bucket: string, key: string, limit: number, windowMs: number): boolean {
  return allowRequest(bucket, key, limit, windowMs)
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const method = request.method
  const ip = getClientIp(request)
  const skipRateLimit = isApiRateLimitDisabled()

  if (!skipRateLimit && method === 'POST' && CHECKOUT_POST_PATHS.has(pathname)) {
    const allowed = limited('checkout', ip, CHECKOUT_LIMIT, CHECKOUT_WINDOW_MS)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente em alguns minutos.', code: 'RATE_LIMITED' },
        { status: 429 }
      )
    }
  }

  if (!skipRateLimit && method === 'POST' && pathname === '/api/contact') {
    const allowed = limited('contact', ip, CONTACT_LIMIT, CONTACT_WINDOW_MS)
    if (!allowed) {
      return NextResponse.json(
        {
          error: 'Muitas mensagens enviadas. Aguarde um minuto e tente novamente.',
          code: 'RATE_LIMITED',
        },
        { status: 429 }
      )
    }
  }

  if (!skipRateLimit && method === 'POST' && pathname === '/api/mcp/oauth/register') {
    const allowed = limited('mcp-oauth-register', ip, MCP_OAUTH_REGISTER_LIMIT, MCP_OAUTH_WINDOW_MS)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas de registro OAuth. Aguarde um minuto.', code: 'RATE_LIMITED' },
        { status: 429 }
      )
    }
  }

  if (!skipRateLimit && method === 'POST' && pathname === '/api/mcp/oauth/token') {
    const allowed = limited('mcp-oauth-token', ip, MCP_OAUTH_TOKEN_LIMIT, MCP_OAUTH_WINDOW_MS)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas de token OAuth. Aguarde um minuto.', code: 'RATE_LIMITED' },
        { status: 429 }
      )
    }
  }

  if (!skipRateLimit && (pathname.startsWith('/api/admin/') || pathname.startsWith('/api/mcp'))) {
    const allowed = limited('admin', ip, ADMIN_LIMIT, ADMIN_WINDOW_MS)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Muitas requisições. Aguarde um momento.', code: 'RATE_LIMITED' },
        { status: 429 }
      )
    }
  }

  if (!skipRateLimit && isPublicReadApiRoute(method, pathname)) {
    const allowed = limited('public-read', ip, PUBLIC_READ_LIMIT, PUBLIC_READ_WINDOW_MS)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Muitas requisições. Aguarde um momento.', code: 'RATE_LIMITED' },
        { status: 429 }
      )
    }
  }

  if (!skipRateLimit && method === 'POST' && pathname === '/api/payments/coupon/preview') {
    const allowed = limited('coupon', ip, COUPON_PREVIEW_LIMIT, COUPON_PREVIEW_WINDOW_MS)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas de cupom. Aguarde um minuto.', code: 'RATE_LIMITED' },
        { status: 429 }
      )
    }
  }

  if (
    !skipRateLimit &&
    method === 'POST' &&
    (pathname === '/api/payments/pagarme/webhook' || pathname === '/api/payments/asaas/webhook')
  ) {
    const bucket = pathname.endsWith('/pagarme/webhook') ? 'webhook-pagarme' : 'webhook-asaas'
    if (!limited(bucket, ip, WEBHOOK_LIMIT, WEBHOOK_WINDOW_MS)) {
      return NextResponse.json(
        { error: 'Muitas requisições. Aguarde um momento.', code: 'RATE_LIMITED' },
        { status: 429 }
      )
    }
  }

  if (
    !skipRateLimit &&
    method === 'POST' &&
    (pathname === '/api/auth/access-code' || pathname === '/api/auth/access-code/verify')
  ) {
    let email = ''
    try {
      const body = (await request.clone().json()) as { email?: unknown }
      if (typeof body?.email === 'string') email = body.email
    } catch {
      email = ''
    }
    const kind = pathname.endsWith('/verify') ? 'verify' : 'request'
    if (!authAttemptAllowed(kind, ip, email)) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Aguarde alguns minutos.', code: 'RATE_LIMITED' },
        { status: 429 }
      )
    }
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-quitou-path', `${pathname}${request.nextUrl.search}`)
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  const cookieName = process.env.NEXT_PUBLIC_AUTH_COOKIE_NAME || 'quitou_token'
  const hasSessionCookie = Boolean(request.cookies.get(cookieName)?.value)

  const publicRoutes = ['/', '/login', '/unauthorized']
  const isPublicRoute = publicRoutes.some((route) => request.nextUrl.pathname === route)
  const isCheckoutRoute = request.nextUrl.pathname.startsWith('/checkout')
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')
  const isProfileRoute = request.nextUrl.pathname === '/profile'

  if (isPublicRoute || isCheckoutRoute) {
    return response
  }

  if (!hasSessionCookie && (isAdminRoute || isProfileRoute)) {
    const login = new URL('/login', request.url)
    const next = safeMcpReturnPath(`${pathname}${request.nextUrl.search}`)
    if (next) login.searchParams.set('next', next)
    return NextResponse.redirect(login)
  }

  return response
}
