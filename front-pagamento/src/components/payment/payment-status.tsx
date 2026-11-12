'use client'

import { useState } from 'react'

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  Loader2,
  QrCode,
  RefreshCw,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { usePaymentPolling } from '@/hooks/use-payment-polling'
import { copyToClipboard } from '@/lib/clipboard'
import { devLog } from '@/lib/dev-log'

function openInNewTabSecure(url: string) {
  const w = window.open(url, '_blank')
  if (w) w.opener = null
}

const DEFAULT_SUCCESS_MESSAGE = 'Seu pagamento foi confirmado com sucesso.'

const CONTENT = {
  title: {
    processing: 'Processando pagamento...',
    pending: 'Aguardando pagamento',
    success: 'Pagamento confirmado!',
  },
  description: {
    processing: 'Estamos gerando seu link de pagamento. Isso pode levar alguns segundos.',
    pendingLink: 'O link abre em uma nova aba. Conclua o pagamento na página segura do provedor.',
    pix: 'Escaneie o QR Code ou copie o código abaixo para pagar',
    boleto: 'Use a linha digitável abaixo ou abra o boleto completo',
    boletoGenerated: 'Boleto gerado com sucesso! Clique no botão para visualizar.',
    boletoInstallment: 'Abra a primeira parcela abaixo. As demais foram enviadas para seu e-mail.',
    success: DEFAULT_SUCCESS_MESSAGE,
    redirecting: 'Redirecionando...',
  },
  buttons: {
    openPaymentLink: 'Abrir link de pagamento',
    openBoleto: 'Abrir boleto completo',
    openFirstInstallment: 'Abrir 1ª parcela',
    downloadPaymentBook: 'Baixar carnê completo',
    copyPix: 'Copiar código PIX',
    copyLine: 'Copiar linha digitável',
    copied: 'Copiado!',
    back: 'Voltar',
  },
  status: {
    monitoring: 'Monitorando status do pagamento em tempo real...',
    pending: 'Aguardando confirmação de pagamento',
  },
  error: {
    title: 'Problema na conexão',
    description:
      'Não foi possível acompanhar o status em tempo real. Recarregue a página ou abra o link de pagamento para continuar.',
    reload: 'Recarregar página',
    openLink: 'Abrir link de pagamento',
  },
  info: {
    boletoInstructions: 'Após pagar o boleto, a confirmação pode levar até 2 dias úteis.',
    boletoInstallmentInfo:
      'As demais parcelas serão enviadas automaticamente para seu e-mail cadastrado.',
    pixInstructions: 'Após pagar o PIX, a confirmação é instantânea.',
    pixCodeUnavailable: 'Código PIX não disponível. Use o QR Code acima para pagar.',
    installmentQuestion: 'Precisa de todas as parcelas?',
  },
  labels: {
    boletoLine: 'Linha digitável',
    pixCode: 'Código PIX',
    barcode: 'Código de barras',
    chargeReference: 'Referência da cobrança',
  },
  externalPay: {
    noticeTitle: 'Próxima etapa: pagamento seguro',
    noticeBody:
      'Ao clicar no botão, abrimos uma nova aba na página oficial de pagamento. Nela você escolhe PIX, boleto ou cartão e finaliza com segurança.',
    antiPhishing:
      'Por segurança, confira se o endereço do site corresponde ao link que você recebeu antes de informar dados sensíveis.',
  },
  pix: {
    title: 'PIX - Pagamento instantâneo',
  },
  boleto: {
    title: 'Boleto bancário',
  },
} as const

// Formatar linha digitável do boleto (adicionar espaços)
function formatBoletoLine(line: string): string {
  if (!line) return ''
  // Formato padrão: 5 blocos - 11111.11111 22222.222222 33333.333333 4 55555555555555
  return line.replace(
    /(\d{5})(\d{5})(\d{5})(\d{6})(\d{5})(\d{6})(\d{1})(\d{14})/,
    '$1.$2 $3.$4 $5.$6 $7 $8'
  )
}

interface PaymentStatusProps {
  paymentId: string | null
  paymentLinkUrl: string | null
  gateway: 'pagarme' | 'asaas'
  productName?: string
  amount?: number
  installments?: number
  billingType?: string
  /** Mensagem personalizada após confirmação. Default: "Seu pagamento foi confirmado com sucesso." */
  successMessage?: string
  onSuccess?: () => void
  onBack?: () => void
}

export function PaymentStatus({
  paymentId,
  paymentLinkUrl,
  gateway,
  productName,
  amount,
  installments,
  billingType: billingTypeProp,
  successMessage,
  onSuccess,
  onBack,
}: PaymentStatusProps) {
  const [pixQrCodeUrl, setPixQrCodeUrl] = useState<string | null>(null)
  const [pixCode, setPixCode] = useState<string | null>(null)
  const [boletoUrl, setBoletoUrl] = useState<string | null>(null)
  const [copiedPix, setCopiedPix] = useState(false)
  const [copiedBoleto, setCopiedBoleto] = useState(false)
  const [pollingError, setPollingError] = useState(false)

  const { paymentStatus, paymentInfo } = usePaymentPolling({
    paymentId,
    enabled: !!paymentId,
    gateway,
    onSuccess: () => {
      devLog('✅ Pagamento confirmado via polling!')
      onSuccess?.()
    },
    onError: () => setPollingError(true),
    onPixGenerated: (data) => {
      devLog('📱 PIX gerado:', data)
      setPixQrCodeUrl(data.qrCodeUrl)
      setPixCode(data.pixCode)
    },
    onBoletoGenerated: (url) => {
      devLog('🧾 Boleto gerado:', url)
      setBoletoUrl(url)
    },
  })

  const handleCopyPix = async () => {
    const code = paymentInfo?.pix_code || pixCode
    if (!code) return
    const success = await copyToClipboard(code, {
      successMessage: 'Código PIX copiado!',
      showToast: false, // Não mostrar toast aqui, já tem feedback visual
    })
    if (success) {
      setCopiedPix(true)
      setTimeout(() => setCopiedPix(false), 2000)
    }
  }

  const handleCopyBoletoLine = async () => {
    const line = paymentInfo?.boleto_line
    if (!line) return
    const success = await copyToClipboard(line, {
      successMessage: 'Linha digitável copiada!',
      showToast: false, // Não mostrar toast aqui, já tem feedback visual
    })
    if (success) {
      setCopiedBoleto(true)
      setTimeout(() => setCopiedBoleto(false), 2000)
    }
  }

  const handleOpenPaymentLink = () => {
    if (paymentLinkUrl) {
      openInNewTabSecure(paymentLinkUrl)
    }
  }

  const handleOpenBoleto = () => {
    const url = boletoUrl || paymentInfo?.boleto_url
    if (url) {
      openInNewTabSecure(url)
    }
  }

  const isProcessing = !paymentId || (!paymentLinkUrl && gateway === 'pagarme')
  const isPaid = paymentStatus === 'paid' || paymentStatus === 'approved'
  const hasPix = !!pixQrCodeUrl || !!paymentInfo?.pix_qr_code
  const billingType = paymentInfo?.billing_type ?? billingTypeProp
  // UNDEFINED/CHECKOUT: cliente escolhe na página externa de checkout — exibir apenas o link.
  // Nunca exibir seção de boleto para cartão, PIX, UNDEFINED ou CHECKOUT (só link).
  // Boleto parcelado (installments > 1): exibir apenas o link (invoice_url).
  const isBoletoFlow =
    billingType !== 'CREDIT_CARD' &&
    billingType !== 'PIX' &&
    billingType !== 'UNDEFINED' &&
    billingType !== 'CHECKOUT' &&
    (installments === undefined || installments <= 1)
  const hasBoleto = (!!boletoUrl || !!paymentInfo?.boleto_url) && isBoletoFlow

  // Estado de sucesso (redireciona para /checkout/confirmation; sem botão Voltar)
  if (isPaid) {
    return (
      <Card className="border-success/20 bg-success/10 shadow-lg">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4 md:space-y-6">
            <div className="rounded-full bg-success/20 p-3">
              <CheckCircle2 className="h-12 w-12 text-success" />
            </div>
            <div>
              <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight text-success mb-2">
                {CONTENT.title.success}
              </h2>
              <p className="text-success/80">{successMessage?.trim() || DEFAULT_SUCCESS_MESSAGE}</p>
              <p className="text-success/60 text-sm mt-2">{CONTENT.description.redirecting}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Estado de processamento
  if (isProcessing) {
    return (
      <Card className="border-info/20 bg-info/10 shadow-lg">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4 md:space-y-6">
            <Loader2 className="h-12 w-12 animate-spin text-info" />
            <div>
              <h2 className="scroll-m-20 text-xl font-semibold tracking-tight text-info mb-2">
                {CONTENT.title.processing}
              </h2>
              <p className="text-info/80 text-sm">{CONTENT.description.processing}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Erro de conexão Realtime (Fase 9.4)
  if (pollingError) {
    return (
      <Card className="border-destructive/20 bg-destructive/5 shadow-lg">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4 md:space-y-6">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertCircle className="h-12 w-12 text-destructive" aria-hidden />
            </div>
            <div>
              <h2 className="scroll-m-20 text-xl font-semibold tracking-tight text-foreground mb-2">
                {CONTENT.error.title}
              </h2>
              <p className="text-muted-foreground text-sm">{CONTENT.error.description}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button
                onClick={() => window.location.reload()}
                variant="default"
                className="w-full sm:w-auto"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {CONTENT.error.reload}
              </Button>
              {paymentLinkUrl && (
                <Button
                  onClick={handleOpenPaymentLink}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {CONTENT.error.openLink}
                </Button>
              )}
            </div>
            {onBack && (
              <Button onClick={onBack} variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {CONTENT.buttons.back}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Estado aguardando pagamento
  return (
    <Card className="shadow-lg">
      <CardContent className="pt-6 space-y-4 md:space-y-6">
        {/* Título */}
        <div className="text-center border-b pb-4">
          <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight text-foreground mb-2">
            {CONTENT.title.pending}
          </h2>
          {productName && (
            <p className="text-sm text-muted-foreground">
              {productName}
              {amount &&
                ` • ${new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(amount / 100)}`}
            </p>
          )}
        </div>

        {/* Botões de pagamento */}
        <div className="space-y-3 md:space-y-4">
          {/* Link de pagamento (nova aba no provedor) */}
          {paymentLinkUrl && (
            <div className="space-y-3 md:space-y-4">
              <div
                className="rounded-xl border border-border/60 bg-muted/30 p-4 text-left dark:bg-muted/20"
                role="region"
                aria-label={CONTENT.externalPay.noticeTitle}
              >
                <p className="text-sm font-semibold text-foreground">
                  {CONTENT.externalPay.noticeTitle}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {CONTENT.externalPay.noticeBody}
                </p>
                <p className="mt-2 border-t border-border/40 pt-2 text-xs leading-relaxed text-muted-foreground">
                  {CONTENT.externalPay.antiPhishing}
                </p>
                {paymentId ? (
                  <div className="mt-2 rounded-lg border border-border/50 bg-background/90 px-3 py-2.5">
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {CONTENT.labels.chargeReference}
                    </p>
                    <p className="break-all font-mono text-xs text-foreground">{paymentId}</p>
                  </div>
                ) : null}
              </div>
              <Button onClick={handleOpenPaymentLink} className="w-full" size="lg">
                <ExternalLink className="mr-2 h-4 w-4" />
                {CONTENT.buttons.openPaymentLink}
              </Button>
              <p className="text-xs text-center text-muted-foreground leading-relaxed px-1">
                {CONTENT.description.pendingLink}
              </p>
            </div>
          )}

          {/* PIX */}
          {hasPix && (
            <div className="rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-4 md:p-6 space-y-4 md:space-y-6">
              <div className="flex items-center gap-3 md:gap-4 pb-3 border-b border-primary/20">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <QrCode className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-primary">{CONTENT.pix.title}</h3>
                  <p className="text-sm text-primary/80">{CONTENT.description.pix}</p>
                </div>
              </div>

              {/* QR Code */}
              {(pixQrCodeUrl || paymentInfo?.pix_qr_code) && (
                <div className="flex justify-center p-4 bg-background rounded-lg">
                  <img
                    src={pixQrCodeUrl || paymentInfo?.pix_qr_code || ''}
                    alt="QR Code PIX"
                    width={200}
                    height={200}
                    className="rounded-lg"
                  />
                </div>
              )}

              {/* Código PIX */}
              {hasPix && (
                <div className="space-y-2 md:space-y-3">
                  <label className="text-sm font-medium text-primary">
                    {CONTENT.labels.pixCode}
                  </label>
                  {paymentInfo?.pix_code || pixCode ? (
                    <>
                      <div className="p-3 bg-background rounded-lg border border-primary/20">
                        <code className="text-xs text-primary break-all font-mono">
                          {paymentInfo?.pix_code || pixCode}
                        </code>
                      </div>
                      <Button
                        onClick={handleCopyPix}
                        variant="outline"
                        className="w-full border-primary/30 hover:bg-primary/10 text-primary"
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        {copiedPix ? CONTENT.buttons.copied : CONTENT.buttons.copyPix}
                      </Button>
                    </>
                  ) : (
                    <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                      <p className="text-xs text-primary/80 text-center">
                        {CONTENT.info.pixCodeUnavailable}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <p className="text-xs text-center text-primary/80 pt-2 border-t border-primary/20">
                {CONTENT.info.pixInstructions}
              </p>
            </div>
          )}

          {/* Boleto */}
          {hasBoleto && (
            <div className="rounded-xl border-2 border-warning/20 bg-gradient-to-br from-warning/5 to-warning/10 p-4 md:p-6 space-y-4 md:space-y-6">
              <div className="flex items-center gap-3 pb-3 border-b border-warning/20">
                <div className="p-2 bg-warning/20 rounded-lg">
                  <FileText className="h-6 w-6 text-warning" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-warning">{CONTENT.boleto.title}</h3>
                  <p className="text-sm text-warning/80">{CONTENT.description.boleto}</p>
                </div>
              </div>

              {/* Linha Digitável */}
              {paymentInfo?.boleto_line && (
                <div className="space-y-2 md:space-y-3">
                  <label className="text-sm font-medium text-warning">
                    {CONTENT.labels.boletoLine}
                  </label>
                  <div className="p-3 bg-background rounded-lg border border-warning/20">
                    <code className="text-sm text-warning break-all font-mono font-semibold">
                      {formatBoletoLine(paymentInfo.boleto_line)}
                    </code>
                  </div>
                  <Button
                    onClick={handleCopyBoletoLine}
                    variant="outline"
                    className="w-full border-warning/30 hover:bg-warning/10 text-warning"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    {copiedBoleto ? CONTENT.buttons.copied : CONTENT.buttons.copyLine}
                  </Button>
                </div>
              )}

              {/* Código de Barras */}
              {paymentInfo?.boleto_barcode && (
                <div className="space-y-2 md:space-y-3">
                  <label className="text-sm font-medium text-warning">
                    {CONTENT.labels.barcode}
                  </label>
                  <div className="p-4 bg-background rounded-lg border border-warning/20 flex justify-center">
                    <img
                      src={paymentInfo.boleto_barcode}
                      alt="Código de barras"
                      width={300}
                      height={60}
                      className="h-16 w-auto"
                    />
                  </div>
                </div>
              )}

              {/* Botão para abrir boleto completo */}
              <Button
                onClick={handleOpenBoleto}
                className="w-full bg-warning hover:bg-warning/90 text-warning-foreground"
                size="lg"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                {CONTENT.buttons.openBoleto}
              </Button>

              <p className="text-xs text-center text-warning/80 pt-2 border-t border-warning/20">
                {CONTENT.info.boletoInstructions}
              </p>
            </div>
          )}
        </div>

        {/* Status do polling - Mostrar apenas se não tiver boleto/PIX gerado */}
        {!hasBoleto && !hasPix && (
          <div className="rounded-lg bg-muted/40 border border-border/40 p-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{CONTENT.status.monitoring}</p>
                <p className="text-xs text-muted-foreground mt-1">{CONTENT.status.pending}</p>
              </div>
            </div>
          </div>
        )}

        {/* Botão voltar */}
        {onBack && (
          <div className="pt-4 border-t">
            <Button onClick={onBack} variant="ghost" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {CONTENT.buttons.back}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
