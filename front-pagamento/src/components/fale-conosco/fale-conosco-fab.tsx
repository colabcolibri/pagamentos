'use client'

import { useEffect, useId, useState } from 'react'

import { Loader2, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'

import { Dialog } from '@/components/layout/ui/dialog'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const CONTENT = {
  fabLabelMobile: 'Contato',
  fabLabelDesktop: 'Fale conosco',
  ariaLabel: 'Fale conosco',
  modalTitle: 'Fale conosco',
  modalDescription: 'Responderemos em breve.',
  nameLabel: 'Nome',
  namePlaceholder: 'Seu nome',
  emailLabel: 'Email',
  emailPlaceholder: 'Seu email',
  messageLabel: 'Mensagem',
  messagePlaceholder: 'Escreva sua dúvida ou mensagem...',
  submitCta: 'Enviar mensagem',
  successMessage: 'Mensagem enviada! Responderemos em breve.',
} as const

export function FaleConoscoFab() {
  const formId = useId()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [identityLocked, setIdentityLocked] = useState(false)
  const [sessionChecked, setSessionChecked] = useState(false)
  const [errors, setErrors] = useState<{ name?: string; email?: string; message?: string }>({})
  const [formData, setFormData] = useState({ name: '', email: '', message: '' })

  const handleClose = () => {
    setOpen(false)
    setErrors({})
    setIdentityLocked(false)
    setSessionChecked(false)
    setFormData({ name: '', email: '', message: '' })
  }

  useEffect(() => {
    if (!open) return

    const loadUserData = async () => {
      setIdentityLocked(false)
      setSessionChecked(false)

      try {
        const sessionResponse = await fetch('/api/auth/session', { credentials: 'include' })
        const session = sessionResponse.ok
          ? ((await sessionResponse.json()) as {
              user: { email?: string; name?: string } | null
            })
          : { user: null }

        if (session.user?.email) {
          setIdentityLocked(true)
          const sessionName = session.user.name ?? ''

          setFormData((prev) => ({
            ...prev,
            email: session.user?.email ?? '',
            name: sessionName || prev.name,
          }))

          try {
            const res = await fetch('/api/profile', { credentials: 'include' })
            if (res.ok) {
              const data = await res.json()
              const name = data.profile?.name ?? ''
              if (name) {
                setFormData((prev) => ({ ...prev, name }))
              }
            }
          } catch {
            // Ignora erro na busca do perfil
          }
        }
      } finally {
        setSessionChecked(true)
      }
    }

    loadUserData()
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const newErrors: typeof errors = {}
    if (!formData.name.trim() || formData.name.length < 2) {
      newErrors.name = 'Nome deve ter pelo menos 2 caracteres'
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório'
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Email inválido'
    }
    if (!formData.message.trim() || formData.message.length < 10) {
      newErrors.message = 'Mensagem deve ter pelo menos 10 caracteres'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Erro ao enviar mensagem')
        return
      }

      toast.success(CONTENT.successMessage)
      handleClose()
    } catch {
      toast.error('Erro ao enviar mensagem. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] z-40 flex min-h-11 items-center gap-2 rounded-full border border-border bg-background px-4 py-3 shadow-lg transition-colors hover:border-primary hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] sm:right-6 sm:gap-2.5 sm:px-5 sm:py-3.5"
        aria-label={CONTENT.ariaLabel}
      >
        <MessageCircle
          className="h-5 w-5 shrink-0 text-primary transition-colors group-hover:text-primary/90 sm:h-5.5 sm:w-5.5"
          aria-hidden
        />
        <span className="font-sans text-sm font-semibold text-foreground transition-colors group-hover:text-primary sm:text-base">
          <span className="sm:hidden">{CONTENT.fabLabelMobile}</span>
          <span className="hidden sm:inline">{CONTENT.fabLabelDesktop}</span>
        </span>
      </button>

      <Dialog
        open={open}
        onOpenChange={(o) => !o && handleClose()}
        title={CONTENT.modalTitle}
        description={CONTENT.modalDescription}
        size="md"
        intent="info"
        customIcon={<MessageCircle className="h-5 w-5" />}
        footerContent={
          <Button type="submit" form={formId} className="w-full sm:w-auto" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {CONTENT.submitCta}
          </Button>
        }
      >
        <form id={formId} onSubmit={handleSubmit} className="space-y-4">
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="fale-conosco-name">{CONTENT.nameLabel}</FieldLabel>
            <Input
              id="fale-conosco-name"
              type="text"
              placeholder={CONTENT.namePlaceholder}
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              readOnly={identityLocked}
              className={identityLocked ? 'cursor-default bg-muted/40' : undefined}
              disabled={loading || !sessionChecked}
              autoComplete="name"
            />
            {errors.name && <FieldError>{errors.name}</FieldError>}
          </Field>

          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="fale-conosco-email">{CONTENT.emailLabel}</FieldLabel>
            <Input
              id="fale-conosco-email"
              type="email"
              placeholder={CONTENT.emailPlaceholder}
              value={formData.email}
              onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
              readOnly={identityLocked}
              className={identityLocked ? 'cursor-default bg-muted/40' : undefined}
              disabled={loading || !sessionChecked}
              autoComplete="email"
            />
            {errors.email && <FieldError>{errors.email}</FieldError>}
          </Field>

          <Field data-invalid={!!errors.message}>
            <FieldLabel htmlFor="fale-conosco-message">{CONTENT.messageLabel}</FieldLabel>
            <Textarea
              id="fale-conosco-message"
              placeholder={CONTENT.messagePlaceholder}
              value={formData.message}
              onChange={(e) => setFormData((p) => ({ ...p, message: e.target.value }))}
              disabled={loading}
              rows={6}
            />
            {errors.message && <FieldError>{errors.message}</FieldError>}
          </Field>
        </form>
      </Dialog>
    </>
  )
}
