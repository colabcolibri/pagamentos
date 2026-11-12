'use client'

import { CheckCircle2, FileText, Info } from 'lucide-react'

import { Dialog } from '@/components/layout/ui/dialog'
import { sanitizeRefundPolicyHtml } from '@/lib/sanitize-html'

import type { RefundPolicyContent } from './types'

// ==========================================
// CONTENT
// ==========================================

const CONTENT = {
  footer: {
    disclaimer:
      'Ao continuar com a compra, você declara estar de acordo com todos os termos desta política.',
  },
  defaultConfirmText: 'Entendi',
} as const

// ==========================================
// TIPOS
// ==========================================

interface RefundPolicyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  policy: RefundPolicyContent
  confirmText?: string
  onConfirm?: () => void
  showConfirmButton?: boolean
}

interface RefundPolicyButtonProps {
  onOpenRefundPolicy: () => void
  policy: RefundPolicyContent
  className?: string
  children?: React.ReactNode
}

interface PolicySectionProps {
  section: RefundPolicyContent['sections'][number]
  index: number
}

// ==========================================
// COMPONENTES AUXILIARES
// ==========================================

function PolicySection({ section, index }: PolicySectionProps) {
  return (
    <div
      className={`rounded-lg border p-5 ${
        section.highlighted ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white'
      }`}
    >
      <h3
        className={`flex items-center gap-3 text-lg font-semibold mb-3 ${
          section.highlighted ? 'text-primary' : 'text-foreground'
        }`}
      >
        {section.highlighted ? (
          <Info className="h-5 w-5 flex-shrink-0 text-primary" />
        ) : (
          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
            {index + 1}
          </div>
        )}
        <span>{section.title}</span>
      </h3>
      <ul className="space-y-3">
        {section.content
          .filter((p) => p.trim() !== '')
          .map((paragraph, pIndex) => (
            <li key={pIndex} className="flex items-start gap-2">
              <CheckCircle2
                className={`mt-0.5 h-4 w-4 flex-shrink-0 ${
                  section.highlighted ? 'text-primary' : 'text-muted-foreground'
                }`}
              />
              <p
                className={`text-sm leading-relaxed ${
                  section.highlighted ? 'text-primary/80' : 'text-foreground'
                }`}
                dangerouslySetInnerHTML={{
                  __html: sanitizeRefundPolicyHtml(String(paragraph)),
                }}
              />
            </li>
          ))}
      </ul>
    </div>
  )
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export function RefundPolicyModal({
  open,
  onOpenChange,
  policy,
  confirmText = CONTENT.defaultConfirmText,
  onConfirm,
  showConfirmButton = true,
}: RefundPolicyModalProps) {
  const handleConfirm = () => {
    onConfirm?.()
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={policy.title}
      description={policy.subtitle}
      size="4xl"
      intent="info"
      customIcon={<FileText className="h-5 w-5" />}
      confirmText={confirmText}
      onConfirm={showConfirmButton ? handleConfirm : undefined}
      hideCloseButton={false}
      footerContent={
        showConfirmButton ? (
          <p className="text-xs text-gray-500 mr-auto">{CONTENT.footer.disclaimer}</p>
        ) : null
      }
    >
      <div className="space-y-4">
        {policy.sections.map((section, index) => (
          <PolicySection key={index} section={section} index={index} />
        ))}
      </div>
    </Dialog>
  )
}

// ==========================================
// COMPONENTE DE BOTÃO SIMPLES
// ==========================================

export function RefundPolicyButton({
  onOpenRefundPolicy,
  policy,
  className = 'text-sm text-gray-600 hover:text-blue-600 transition-colors underline decoration-dotted underline-offset-2',
  children,
}: RefundPolicyButtonProps) {
  return (
    <button type="button" onClick={onOpenRefundPolicy} className={className}>
      {children || policy.checkout.buttonText}
    </button>
  )
}
