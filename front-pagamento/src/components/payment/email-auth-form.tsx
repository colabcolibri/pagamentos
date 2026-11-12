'use client'

import { useId, useState } from 'react'

import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

import { CodeDigits } from '@/components/auth/code-digits'
import { RequiredFieldMark } from '@/components/checkout/required-field-mark'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { devError } from '@/lib/dev-log'

const CONTENT = {
  email: {
    title: 'Autenticação',
    subtitle: 'Entre ou cadastre-se para continuar',
    placeholder: 'seu@email.com',
    submitButton: 'Entrar / Cadastrar',
    submitting: 'Enviando código...',
    successPrefix: '📧 Código enviado para',
    successSuffix: 'Verifique seu e-mail!',
    errorPrefix: 'Erro ao enviar código:',
    errorInvalid: 'Por favor, insira um e-mail válido',
    fieldLabel: 'E-mail',
  },

  otp: {
    title: 'Verificação de e-mail',
    subtitle: 'Digite o código de 6 dígitos enviado para seu e-mail',
    placeholder: '000000',
    verify: 'Verificar e continuar',
    verifying: 'Verificando...',
    success: '✅ Autenticado com sucesso!',
    errorPrefix: '❌ Código inválido:',
    fieldLabel: 'Código de verificação',
  },
} as const

interface EmailAuthFormProps {
  onSuccess: (email: string) => void
  disabled?: boolean
}

export function EmailAuthForm({ onSuccess, disabled = false }: EmailAuthFormProps) {
  const formId = useId()
  const emailInputId = `${formId}-email`
  const otpInputId = `${formId}-otp`
  const [authEmail, setAuthEmail] = useState('')
  const [showOtpInput, setShowOtpInput] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [sendingOtp, setSendingOtp] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleSendOtp = async () => {
    if (!authEmail || !authEmail.includes('@')) {
      setResult({
        success: false,
        message: CONTENT.email.errorInvalid,
      })
      return
    }

    setSendingOtp(true)
    setResult(null)

    try {
      const response = await fetch('/api/auth/access-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, name: authEmail.split('@')[0] }),
      })
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(payload.error || 'Erro ao enviar código')
      }

      setShowOtpInput(true)
      setResult({
        success: true,
        message: `${CONTENT.email.successPrefix} ${authEmail}. ${CONTENT.email.successSuffix}`,
      })
    } catch (err) {
      devError('Erro ao enviar OTP:', err)
      setResult({
        success: false,
        message: `${CONTENT.email.errorPrefix} ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
      })
    } finally {
      setSendingOtp(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) return

    setVerifying(true)
    setResult(null)

    try {
      const response = await fetch('/api/auth/access-code/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, code: otpCode }),
      })
      if (!response.ok) {
        throw new Error('Código inválido ou expirado')
      }

      onSuccess(authEmail)

      setResult({
        success: true,
        message: CONTENT.otp.success,
      })
    } catch (err) {
      devError('Erro ao verificar OTP:', err)
      setResult({
        success: false,
        message: `${CONTENT.otp.errorPrefix} ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
      })
    } finally {
      setVerifying(false)
    }
  }

  // Se ainda não enviou OTP - mostrar campo de email
  if (!showOtpInput) {
    return (
      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle>{CONTENT.email.title}</CardTitle>
          <CardDescription>{CONTENT.email.subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor={emailInputId}
              className="text-sm font-medium text-foreground flex items-baseline gap-0.5"
            >
              {CONTENT.email.fieldLabel}
              <RequiredFieldMark />
            </label>
            <input
              id={emailInputId}
              type="email"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              placeholder={CONTENT.email.placeholder}
              disabled={disabled || sendingOtp}
              autoComplete="email"
              className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
          <Button
            onClick={handleSendOtp}
            disabled={sendingOtp || !authEmail || disabled}
            className="w-full"
            size="lg"
          >
            {sendingOtp ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {CONTENT.email.submitting}
              </>
            ) : (
              CONTENT.email.submitButton
            )}
          </Button>

          {/* Resultado */}
          {result && (
            <div
              className={`flex items-start gap-3 p-3 rounded-lg ${
                result.success
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              {result.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className={`text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                {result.message}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Se já enviou OTP - mostrar campo de verificação
  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="text-blue-900">{CONTENT.otp.title}</CardTitle>
        <CardDescription>{CONTENT.otp.subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor={otpInputId}
            className="text-sm font-medium text-foreground flex items-baseline gap-0.5 justify-center sm:justify-start"
          >
            {CONTENT.otp.fieldLabel}
            <RequiredFieldMark />
          </label>
          <CodeDigits
            id={otpInputId}
            value={otpCode}
            onChange={setOtpCode}
            disabled={disabled || verifying}
          />
        </div>
        <Button
          onClick={handleVerifyOtp}
          disabled={otpCode.length !== 6 || verifying || disabled}
          className="w-full"
          size="lg"
        >
          {verifying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              {CONTENT.otp.verifying}
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {CONTENT.otp.verify}
            </>
          )}
        </Button>

        {/* Resultado */}
        {result && (
          <div
            className={`flex items-start gap-3 p-3 rounded-lg ${
              result.success
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            {result.success ? (
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            )}
            <div className={`text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
              {result.message}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
