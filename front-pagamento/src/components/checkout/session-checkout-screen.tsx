'use client'

import { useEffect, useMemo, useState } from 'react'

import { AlertCircle, CheckCircle2, Loader2, Lock, ShieldCheck } from 'lucide-react'

import { PaymentStatus } from '@/components/payment/payment-status'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { PublicCheckoutSessionDTO } from '@/lib/checkout-sessions/public-read'

function formatCentsBrl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function SessionCheckoutScreen({ token }: { token: string }) {
  const [session, setSession] = useState<PublicCheckoutSessionDTO | null>(null)
  const [loadError, setLoadError] = useState<{ status: number; message: string } | null>(null)
  const [loading, setLoading] = useState(true)

  const [selectedPriceId, setSelectedPriceId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [cpf, setCpf] = useState('')
  const [billingType, setBillingType] = useState<'PIX' | 'CREDIT_CARD'>('PIX')
  const [installments, setInstallments] = useState(1)

  const [codeRequested, setCodeRequested] = useState(false)
  const [code, setCode] = useState('')
  const [emailProof, setEmailProof] = useState<string | null>(null)
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null)
  const [authMsg, setAuthMsg] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [paymentLinkUrl, setPaymentLinkUrl] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    fetch(`/api/checkout/sessions/${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as PublicCheckoutSessionDTO & {
          error?: string
        }
        if (!active) return
        if (!res.ok) {
          setLoadError({
            status: res.status,
            message: body.error ?? 'Link de pagamento indisponível.',
          })
          return
        }
        setSession(body)
        setEmail(body.customerEmail ?? '')
        setName(body.customerName ?? '')
        setSelectedPriceId(body.selectedPriceId ?? body.prices[0]?.id ?? null)
      })
      .catch(() => {
        if (active) {
          setLoadError({ status: 500, message: 'Não foi possível carregar a sessão de pagamento.' })
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [token])

  const normalizedEmail = email.trim().toLowerCase()
  const emailChanged = Boolean(
    session?.customerEmail && normalizedEmail !== session.customerEmail.toLowerCase()
  )
  const isOriginVerified = Boolean(
    session?.emailVerifiedByOrigin && !emailChanged && normalizedEmail
  )
  const isCodeVerified = Boolean(emailProof && verifiedEmail === normalizedEmail)
  const needsEmailVerification = !isOriginVerified && !isCodeVerified
  const needsCpfInput = Boolean(session?.requiresCpf || emailChanged)

  const displayAmountCents = useMemo(() => {
    if (!session) return 0
    if (session.pricingMode === 'custom') return session.amountCents ?? 0
    const chosen = session.prices.find((p) => p.id === selectedPriceId) ?? session.prices[0]
    return chosen?.amount ?? 0
  }, [selectedPriceId, session])

  const handleRequestCode = async () => {
    if (!normalizedEmail) return
    setAuthMsg(null)
    const res = await fetch('/api/auth/access-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail }),
    })
    if (res.ok) {
      setCodeRequested(true)
      setAuthMsg('Enviamos um código de 6 dígitos para o seu e-mail.')
    } else {
      setAuthMsg('Não foi possível enviar o código agora.')
    }
  }

  const handleVerifyCode = async () => {
    setAuthMsg(null)
    const res = await fetch(`/api/checkout/sessions/${encodeURIComponent(token)}/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, code }),
    })
    const json = (await res.json().catch(() => ({}))) as {
      proof?: string
      email?: string
      error?: string
    }
    if (!res.ok || !json.proof) {
      setAuthMsg(json.error ?? 'Código inválido.')
      return
    }
    setEmailProof(json.proof)
    setVerifiedEmail(normalizedEmail)
    setAuthMsg('E-mail verificado para esta cobrança.')
  }

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) return
    setSubmitError(null)

    if (needsEmailVerification) {
      setSubmitError('Confirme o código de 6 dígitos enviado para o seu e-mail antes de pagar.')
      return
    }
    const cleanCpf = cpf.replace(/\D/g, '')
    if (needsCpfInput && cleanCpf.length !== 11) {
      setSubmitError('Informe um CPF válido com 11 dígitos.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/payments/pagarme/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkoutSessionToken: token,
          price_id: session.pricingMode === 'catalog' ? selectedPriceId : undefined,
          billing_type: billingType,
          installments: billingType === 'CREDIT_CARD' ? installments : 1,
          email_verification_proof: emailProof ?? undefined,
          customer_info: {
            name: name.trim() || normalizedEmail.split('@')[0],
            email: normalizedEmail,
            cpf: needsCpfInput ? cleanCpf : undefined,
          },
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        paymentId?: string
        payment_id?: string
        checkoutUrl?: string
        payment_url?: string
        error?: string
      }
      if (!res.ok) {
        setSubmitError(data.error ?? 'Não foi possível iniciar o pagamento.')
        return
      }
      const resolvedUrl = data.checkoutUrl ?? data.payment_url ?? null
      const resolvedPaymentId = data.paymentId ?? data.payment_id ?? null
      if (resolvedUrl && billingType === 'CREDIT_CARD') {
        window.location.href = resolvedUrl
        return
      }
      setPaymentLinkUrl(resolvedUrl)
      setPaymentId(resolvedPaymentId)
    } catch {
      setSubmitError('Erro de conexão ao processar o pagamento.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (loadError || !session) {
    return (
      <div className="mx-auto max-w-md p-6 pt-16">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Link indisponível
            </CardTitle>
            <CardDescription>{loadError?.message}</CardDescription>
          </CardHeader>
          {session?.cancelUrl && (
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <a href={session.cancelUrl} rel="noreferrer">
                  Voltar
                </a>
              </Button>
            </CardContent>
          )}
        </Card>
      </div>
    )
  }

  if (paymentId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <PaymentStatus
          paymentId={paymentId}
          gateway="pagarme"
          paymentLinkUrl={paymentLinkUrl}
          productName={session.product.name}
          amount={displayAmountCents}
          installments={installments}
          billingType={billingType}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="grid gap-6 md:grid-cols-5">
        <Card className="md:col-span-2 h-fit">
          <CardHeader>
            <CardTitle className="text-lg">{session.product.name}</CardTitle>
            {session.product.description && (
              <CardDescription>{session.product.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {session.pricingMode === 'catalog' && session.prices.length > 0 && (
              <div className="space-y-2">
                <Label>Plano</Label>
                <div className="space-y-2">
                  {session.prices.map((price) => {
                    const locked = Boolean(session.selectedPriceId)
                    const active = price.id === selectedPriceId
                    return (
                      <button
                        key={price.id}
                        type="button"
                        disabled={locked && !active}
                        onClick={() => !locked && setSelectedPriceId(price.id)}
                        className={`w-full rounded-md border p-2.5 text-left text-sm transition ${
                          active ? 'border-primary bg-primary/5 font-medium' : 'border-border'
                        }`}
                      >
                        <div className="flex justify-between">
                          <span>{price.ref}</span>
                          <span>{formatCentsBrl(price.amount)}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="border-t pt-4">
              <p className="text-xs text-muted-foreground">Total a pagar</p>
              <p className="text-2xl font-bold">{formatCentsBrl(displayAmountCents)}</p>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5 shrink-0" />
              <span>Valor protegido no servidor para esta sessão</span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">Finalizar pagamento</CardTitle>
            <CardDescription>
              Pagamento seguro sem necessidade de criar conta no Quitou.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePay} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="session-email">E-mail</Label>
                <Input
                  id="session-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {isOriginVerified && (
                  <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Identidade confirmada pelo sistema de origem
                  </p>
                )}
              </div>

              {needsEmailVerification && (
                <div className="rounded-md border p-3 space-y-2.5 bg-muted/30">
                  <p className="text-xs text-muted-foreground">
                    Confirme seu e-mail com um código de 6 dígitos para continuar:
                  </p>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={handleRequestCode}>
                      {codeRequested ? 'Reenviar código' : 'Enviar código'}
                    </Button>
                    {codeRequested && (
                      <>
                        <Input
                          placeholder="000000"
                          maxLength={6}
                          value={code}
                          onChange={(e) => setCode(e.target.value)}
                          className="w-28 font-mono"
                        />
                        <Button type="button" size="sm" onClick={handleVerifyCode}>
                          Confirmar
                        </Button>
                      </>
                    )}
                  </div>
                  {authMsg && <p className="text-xs text-muted-foreground">{authMsg}</p>}
                </div>
              )}

              {isCodeVerified && (
                <p className="flex items-center gap-1.5 text-xs text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  E-mail verificado para esta cobrança
                </p>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="session-name">Nome completo</Label>
                <Input
                  id="session-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {needsCpfInput && (
                <div className="space-y-1.5">
                  <Label htmlFor="session-cpf">CPF</Label>
                  <Input
                    id="session-cpf"
                    required
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Forma de pagamento</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={billingType === 'PIX' ? 'default' : 'outline'}
                    onClick={() => setBillingType('PIX')}
                  >
                    PIX
                  </Button>
                  <Button
                    type="button"
                    variant={billingType === 'CREDIT_CARD' ? 'default' : 'outline'}
                    onClick={() => setBillingType('CREDIT_CARD')}
                  >
                    Cartão de crédito
                  </Button>
                </div>
              </div>

              {billingType === 'CREDIT_CARD' && (
                <div className="space-y-1.5">
                  <Label htmlFor="session-installments">Parcelas</Label>
                  <Input
                    id="session-installments"
                    type="number"
                    min={1}
                    max={12}
                    value={installments}
                    onChange={(e) => setInstallments(Math.max(1, Number(e.target.value) || 1))}
                  />
                </div>
              )}

              {submitError && <p className="text-sm text-destructive">{submitError}</p>}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Processando...' : `Pagar ${formatCentsBrl(displayAmountCents)}`}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
