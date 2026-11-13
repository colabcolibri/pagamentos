'use client'

import { useState } from 'react'

import { Mail } from 'lucide-react'

import { CodeDigits } from '@/components/auth/code-digits'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// ==========================================
// CONTEÚDO E DADOS
// ==========================================

const CONTENT = {
  ui: {
    title: {
      login: 'Entrar',
      register: 'Criar conta',
    },
    description: {
      login: 'Entre com seu e-mail',
      register: 'Cadastre seu e-mail',
    },
    emailSent: {
      title: 'Verifique o e-mail',
      guardedTitle: 'Verifique o e-mail',
      guardedNotice: 'Caso tenha uma conta ou uma compra feita, você recebe o código no e-mail.',
      message: 'Enviamos para',
    },
    toggle: {
      loginPrompt: 'Já tem uma conta?',
      registerPrompt: 'Ainda não tem conta?',
      loginAction: 'Fazer login',
      registerAction: 'Criar conta',
    },
  },

  form: {
    labels: {
      name: 'Nome completo',
      email: 'E-mail',
      otp: 'Código de verificação',
    },
    placeholders: {
      name: 'Seu nome completo',
      email: 'seu@email.com',
    },
    help: {
      otp: 'Digite ou cole o código de 6 dígitos enviado no seu email',
      otpGuarded: 'Digite o código de 6 dígitos, se ele chegou no e-mail.',
    },
  },

  actions: {
    sendEmail: {
      login: 'Continuar',
      register: 'Criar conta',
    },
    verifyCode: 'Verificar código',
    resendEmail: 'Reenviar email',
  },

  states: {
    sending: 'Enviando...',
    verifying: 'Verificando...',
    success: 'Sucesso!',
  },

  messages: {
    errors: {
      rateLimited: 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.',
      codeExpired: 'Código expirado. Clique em "Reenviar email" para receber um novo.',
      codeInvalid: 'Código inválido. Verifique se digitou corretamente.',
      codeInvalidOrExpired: 'Código inválido ou expirado',
      emailNotFound: 'Email não encontrado.\nPor favor, crie uma conta primeiro.',
      generic: 'Erro inesperado. Tente novamente.',
    },
  },
} as const

const CONFIG = {
  styles: {
    container: 'space-y-4 md:space-y-6',
  },
} as const

// ==========================================
// TIPOS E INTERFACES
// ==========================================

type AuthMode = 'login' | 'register'
type AuthStep = 'email' | 'email-sent' | 'success'

interface LoginFormState {
  mode: AuthMode
  step: AuthStep
  email: string
  name: string
  otp: string
  loading: boolean
  message: string
}

interface LoginFormProps {
  onSuccess?: () => void
  className?: string
  showHeader?: boolean
  customTitle?: string
  customDescription?: string
  allowRegister?: boolean // Controla se permite registro
  allowCreateUser?: boolean // Controla se permite criar usuário (false = apenas login para usuários existentes)
  initialMode?: AuthMode
  initialEmail?: string
  devMailboxBase?: string
}

// ==========================================
// COMPONENTES AUXILIARES
// ==========================================

interface MessageDisplayProps {
  message: string
}

const MessageDisplay = ({ message }: MessageDisplayProps) => {
  if (!message) return null

  const isSuccess = message.includes('✅') || message === CONTENT.states.success

  return (
    <div
      className={`p-3 rounded text-sm ${
        isSuccess
          ? 'bg-success/10 text-success border border-success/20'
          : 'bg-destructive/10 text-destructive border border-destructive/20'
      }`}
    >
      {message}
    </div>
  )
}

function devMailboxHref(base: string, email: string): string | null {
  const target = email.trim().toLowerCase()
  if (!target.includes('@')) return null
  return `${base.replace(/\/$/, '')}/?q=${encodeURIComponent(`to:${target}`)}`
}

function DevMailboxLink({ base, email }: { base?: string; email: string }) {
  if (!base) return null
  const href = devMailboxHref(base, email)
  if (!href) return null
  const address = email.trim()

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-block max-w-full text-sm font-medium text-primary underline wrap-break-word"
    >
      Abrir a caixa de {address}
    </a>
  )
}

interface EmailFormProps {
  name: string
  setName: (name: string) => void
  email: string
  setEmail: (email: string) => void
  onSubmit: (e: React.FormEvent) => void
  loading: boolean
  mode: AuthMode
  devMailboxBase?: string
}

const EmailForm = ({
  name,
  setName,
  email,
  setEmail,
  onSubmit,
  loading,
  mode,
  devMailboxBase,
}: EmailFormProps) => (
  <form onSubmit={onSubmit} className="space-y-4">
    {mode === 'register' && (
      <div className="space-y-2">
        <Label htmlFor="name">{CONTENT.form.labels.name}</Label>
        <Input
          id="name"
          type="text"
          placeholder={CONTENT.form.placeholders.name}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={loading}
        />
      </div>
    )}

    <div className="space-y-2">
      <Label htmlFor="email">{CONTENT.form.labels.email}</Label>
      <Input
        id="email"
        type="email"
        placeholder={CONTENT.form.placeholders.email}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        disabled={loading}
      />
      <DevMailboxLink base={devMailboxBase} email={email} />
    </div>

    <Button
      type="submit"
      className="w-full"
      disabled={loading || !email || (mode === 'register' && !name)}
    >
      {loading ? CONTENT.states.sending : CONTENT.actions.sendEmail[mode]}
    </Button>
  </form>
)

interface EmailSentViewProps {
  email: string
  otp: string
  setOtp: (otp: string) => void
  onVerifyOtp: (e: React.FormEvent) => void
  onResendEmail: () => void
  loading: boolean
  guarded: boolean
  devMailboxBase?: string
}

const EmailSentView = ({
  email,
  otp,
  setOtp,
  onVerifyOtp,
  onResendEmail,
  loading,
  guarded,
  devMailboxBase,
}: EmailSentViewProps) => (
  <div className="space-y-4">
    <div className="text-center space-y-2">
      <div className="flex justify-center">
        <div className="rounded-full bg-success/20 p-3">
          <Mail className="h-6 w-6 text-success" />
        </div>
      </div>
      <h3 className="scroll-m-20 text-lg font-semibold tracking-tight text-foreground">
        {guarded ? CONTENT.ui.emailSent.guardedTitle : CONTENT.ui.emailSent.title}
      </h3>
      {guarded ? (
        <p className="text-sm text-muted-foreground text-balance break-words">
          {CONTENT.ui.emailSent.guardedNotice}{' '}
          <strong className="break-all font-medium text-foreground">{email}</strong>
        </p>
      ) : (
        <p className="text-sm text-muted-foreground break-words">
          {CONTENT.ui.emailSent.message} <strong className="break-all">{email}</strong>
        </p>
      )}
      <p className="text-center">
        <DevMailboxLink base={devMailboxBase} email={email} />
      </p>
    </div>

    <form onSubmit={onVerifyOtp} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="otp" className="block text-center sm:text-left">
          {CONTENT.form.labels.otp}
        </Label>
        <CodeDigits id="otp" value={otp} onChange={setOtp} disabled={loading} />
        <p className="text-center text-xs text-muted-foreground text-balance sm:text-left">
          {guarded ? CONTENT.form.help.otpGuarded : CONTENT.form.help.otp}
        </p>
      </div>

      <div className="space-y-2">
        <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
          {loading ? CONTENT.states.verifying : CONTENT.actions.verifyCode}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={onResendEmail}
          disabled={loading}
        >
          {CONTENT.actions.resendEmail}
        </Button>
      </div>
    </form>
  </div>
)

interface ModeToggleProps {
  mode: AuthMode
  onToggle: () => void
  allowRegister: boolean
  allowCreateUser?: boolean
}

const ModeToggle = ({ mode, onToggle, allowRegister, allowCreateUser }: ModeToggleProps) => {
  // Se não permite registro OU não permite criar usuário, não mostrar toggle
  if (!allowRegister || allowCreateUser === false) return null

  return (
    <div className="text-center text-sm">
      <span className="text-muted-foreground">
        {mode === 'login' ? CONTENT.ui.toggle.registerPrompt : CONTENT.ui.toggle.loginPrompt}
      </span>{' '}
      <button
        type="button"
        onClick={onToggle}
        className="text-primary hover:text-primary/80 font-medium"
      >
        {mode === 'login' ? CONTENT.ui.toggle.registerAction : CONTENT.ui.toggle.loginAction}
      </button>
    </div>
  )
}

// ==========================================
// HOOK PRINCIPAL
// ==========================================

const useLoginForm = (props: LoginFormProps) => {
  const [state, setState] = useState<LoginFormState>({
    mode: props.initialMode || 'login',
    step: 'email',
    email: props.initialEmail ?? '',
    name: '',
    otp: '',
    loading: false,
    message: '',
  })

  const updateState = (updates: Partial<LoginFormState>) => {
    setState((prev) => ({ ...prev, ...updates }))
  }

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    updateState({ loading: true, message: '' })

    try {
      // Se allowCreateUser é false e está em modo login, não criar usuário
      const guardedLogin = props.allowCreateUser === false && state.mode === 'login'
      const shouldCreateUser = !guardedLogin
      const response = await fetch('/api/auth/access-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: state.email,
          name: state.mode === 'register' ? state.name : undefined,
          createIfMissing: shouldCreateUser,
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }

      const missingAccount = payload.error?.includes('não encontrado')
      if (guardedLogin && (response.ok || missingAccount)) {
        updateState({ step: 'email-sent', message: '' })
      } else if (!response.ok) {
        updateState({
          message: missingAccount
            ? CONTENT.messages.errors.emailNotFound
            : payload.error || CONTENT.messages.errors.generic,
        })
      } else {
        updateState({
          step: 'email-sent',
          message: '',
        })
      }
    } catch (err) {
      updateState({ message: CONTENT.messages.errors.generic })
    } finally {
      updateState({ loading: false })
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    updateState({ loading: true, message: '' })

    try {
      const response = await fetch('/api/auth/access-code/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: state.email, code: state.otp }),
      })

      if (!response.ok) {
        updateState({ message: CONTENT.messages.errors.codeInvalidOrExpired })
      } else {
        updateState({
          step: 'success',
          message: CONTENT.states.success,
        })
        props.onSuccess?.()
      }
    } catch (err) {
      updateState({ message: CONTENT.messages.errors.generic })
    } finally {
      updateState({ loading: false })
    }
  }

  const handleResendEmail = async () => {
    updateState({ otp: '', message: '' })
    await handleSendEmail({ preventDefault: () => {} } as React.FormEvent)
  }

  const toggleMode = () => {
    updateState({
      mode: state.mode === 'login' ? 'register' : 'login',
      message: '',
      name: '',
    })
  }

  const setName = (name: string) => updateState({ name })
  const setEmail = (email: string) => updateState({ email })
  const setOtp = (otp: string) => updateState({ otp })

  return {
    state,
    handleSendEmail,
    handleVerifyOtp,
    handleResendEmail,
    toggleMode,
    setName,
    setEmail,
    setOtp,
  }
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export function LoginForm(props: LoginFormProps = {}) {
  const {
    state,
    handleSendEmail,
    handleVerifyOtp,
    handleResendEmail,
    toggleMode,
    setName,
    setEmail,
    setOtp,
  } = useLoginForm(props)

  const allowRegister = props.allowRegister ?? false

  return (
    <div className={`${CONFIG.styles.container} ${props.className || ''}`}>
      {props.showHeader === true && (
        <div className="space-y-2 text-center">
          <h1 className="scroll-m-20 text-2xl font-semibold tracking-tight">
            {props.customTitle || CONTENT.ui.title[state.mode]}
          </h1>
          <p className="text-sm text-muted-foreground">
            {props.customDescription || CONTENT.ui.description[state.mode]}
          </p>
        </div>
      )}

      {state.step === 'email' && (
        <EmailForm
          name={state.name}
          setName={setName}
          email={state.email}
          setEmail={setEmail}
          onSubmit={handleSendEmail}
          loading={state.loading}
          mode={state.mode}
          devMailboxBase={props.devMailboxBase}
        />
      )}

      {state.step === 'email-sent' && (
        <EmailSentView
          email={state.email}
          otp={state.otp}
          setOtp={setOtp}
          onVerifyOtp={handleVerifyOtp}
          onResendEmail={handleResendEmail}
          loading={state.loading}
          guarded={props.allowCreateUser === false}
          devMailboxBase={props.devMailboxBase}
        />
      )}

      <MessageDisplay message={state.message} />

      <ModeToggle
        mode={state.mode}
        onToggle={toggleMode}
        allowRegister={allowRegister}
        allowCreateUser={props.allowCreateUser}
      />
    </div>
  )
}
