import type { Metadata } from 'next'
import { headers } from 'next/headers'
import Link from 'next/link'

import { CheckCircle2 } from 'lucide-react'

import { PageContainer } from '@/components/layout/page-container'
import { PublicFooter } from '@/components/layout/public-footer'
import { PublicHeader } from '@/components/layout/public-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { publicEnv } from '@/lib/config/env'

export const metadata: Metadata = {
  title: 'Pagamento confirmado',
  description:
    'Seu pagamento foi registrado. Guarde os dados do pedido; em caso de dúvida, use o suporte.',
}

const DEFAULT_SUCCESS_MESSAGE = 'Seu pagamento foi confirmado com sucesso.'

const CONTENT = {
  title: 'Pagamento confirmado!',
  message: DEFAULT_SUCCESS_MESSAGE,
  summary: {
    title: 'Resumo do pedido',
    product: 'Produto',
    value: 'Valor',
    installments: 'Parcelas',
    paymentMethod: 'Forma de pagamento',
    orderId: 'Número do pedido',
  },
  cta: 'Ir para o início',
  footer: {
    supportHint: 'Dúvidas sobre este pedido? Use o botão "Fale conosco" no canto da tela.',
  },
} as const

function getParam(value: string | string[] | undefined): string | null {
  if (!value) return null
  const s = typeof value === 'string' ? value : value[0]
  return s?.trim() || null
}

async function fetchConfirmationData(
  paymentId: string,
  gateway: string
): Promise<{
  product_name: string | null
  formatted_price: string
  installments: number | null
  payment_method: string
  order_id_short: string | null
  success_message: string | null
} | null> {
  try {
    const headersList = await headers()
    const baseUrl = publicEnv.NEXT_PUBLIC_APP_URL
    const url = `${baseUrl}/api/payments/${encodeURIComponent(paymentId)}/confirmation?gateway=${encodeURIComponent(gateway)}`
    const res = await fetch(url, {
      headers: { cookie: headersList.get('cookie') ?? '' },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const json = await res.json()
    return {
      product_name: json.product_name ?? null,
      formatted_price: json.formatted_price ?? '',
      installments: json.installments ?? null,
      payment_method: json.payment_method ?? 'PIX ou Boleto',
      order_id_short: json.order_id_short ?? null,
      success_message: json.success_message ?? null,
    }
  } catch {
    return null
  }
}

interface CheckoutConfirmationPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function CheckoutConfirmationPage({
  searchParams,
}: CheckoutConfirmationPageProps) {
  const params = await searchParams
  const paymentId = getParam(params.payment_id)
  const gateway = getParam(params.gateway)
  const fallbackProductName = getParam(params.product_name)

  let data: Awaited<ReturnType<typeof fetchConfirmationData>> = null
  if (paymentId && gateway) {
    data = await fetchConfirmationData(paymentId, gateway)
  }

  const productName = data?.product_name ?? fallbackProductName
  const hasSummary = data ?? productName

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicHeader />

      <main className="flex-1 flex items-center">
        <PageContainer className="py-8 md:py-12 w-full">
          <Card className="mx-auto max-w-md border-success/20 bg-success/5 shadow-lg overflow-hidden">
            <CardContent className="pt-6 pb-6 px-4 sm:px-6">
              <div className="flex flex-col items-center text-center space-y-4 md:space-y-6">
                <div className="rounded-full bg-success/20 p-3 shrink-0" aria-hidden>
                  <CheckCircle2 className="h-12 w-12 sm:h-14 sm:w-14 text-success" aria-hidden />
                </div>
                <div className="space-y-2 min-w-0">
                  <h1 className="scroll-m-20 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                    {CONTENT.title}
                  </h1>
                  <p className="text-muted-foreground text-sm sm:text-base">
                    {data?.success_message?.trim() || DEFAULT_SUCCESS_MESSAGE}
                  </p>
                </div>

                {hasSummary && (
                  <div className="w-full text-left border-t border-border/40 pt-4 mt-2 space-y-3">
                    <h2 className="text-sm font-semibold text-foreground">
                      {CONTENT.summary.title}
                    </h2>
                    <dl className="space-y-2 text-sm">
                      {productName && (
                        <div className="flex justify-between gap-4">
                          <dt className="text-muted-foreground">{CONTENT.summary.product}</dt>
                          <dd className="font-medium text-foreground text-right wrap-break-word">
                            {productName}
                          </dd>
                        </div>
                      )}
                      {data?.formatted_price && (
                        <div className="flex justify-between gap-4">
                          <dt className="text-muted-foreground">{CONTENT.summary.value}</dt>
                          <dd className="font-medium text-foreground">{data.formatted_price}</dd>
                        </div>
                      )}
                      {data?.installments && data.installments > 1 && (
                        <div className="flex justify-between gap-4">
                          <dt className="text-muted-foreground">{CONTENT.summary.installments}</dt>
                          <dd className="font-medium text-foreground">{data.installments}x</dd>
                        </div>
                      )}
                      {data?.payment_method && (
                        <div className="flex justify-between gap-4">
                          <dt className="text-muted-foreground">{CONTENT.summary.paymentMethod}</dt>
                          <dd className="font-medium text-foreground">{data.payment_method}</dd>
                        </div>
                      )}
                      {data?.order_id_short && (
                        <div className="flex justify-between gap-4">
                          <dt className="text-muted-foreground">{CONTENT.summary.orderId}</dt>
                          <dd className="font-mono text-foreground text-xs">
                            #{data.order_id_short}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                )}

                <Link href="/" className="w-full sm:w-auto pt-2">
                  <Button size="lg" className="w-full sm:w-auto">
                    {CONTENT.cta}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </PageContainer>
      </main>

      <PublicFooter footnote={CONTENT.footer.supportHint} />
    </div>
  )
}
