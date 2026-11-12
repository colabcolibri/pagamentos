'use client'

import { Check, Copy } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { copyToClipboard } from '@/lib/clipboard'
import { cn } from '@/lib/utils'

interface ClipboardButtonProps {
  text: string
  successMessage?: string
  errorMessage?: string
  showToast?: boolean
  size?: 'icon' | 'sm' | 'default'
  variant?: 'ghost' | 'outline' | 'default'
  className?: string
  copied?: boolean
  onCopy?: (text: string) => void
}

export function ClipboardButton({
  text,
  successMessage,
  errorMessage,
  showToast = true,
  size = 'icon',
  variant = 'ghost',
  className,
  copied = false,
  onCopy,
}: ClipboardButtonProps) {
  const handleCopy = async () => {
    // Se há onCopy callback, não mostra toast aqui (deixa o callback controlar)
    const shouldShowToast = onCopy ? false : showToast
    const success = await copyToClipboard(text, {
      showToast: shouldShowToast,
      successMessage,
      errorMessage,
    })
    if (success && onCopy) {
      onCopy(text)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={cn(className)}
      onClick={handleCopy}
      title="Copiar"
    >
      {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
    </Button>
  )
}

interface CopyableTextProps {
  text: string
  className?: string
  textClassName?: string
  successMessage?: string
  showToast?: boolean
  copied?: boolean
  onCopy?: (text: string) => void
}

export function CopyableText({
  text,
  className,
  textClassName = 'font-mono text-xs',
  successMessage,
  showToast = true,
  copied = false,
  onCopy,
}: CopyableTextProps) {
  // Se há onCopy callback, não mostra toast aqui (deixa o callback controlar)
  const shouldShowToast = onCopy ? false : showToast
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className={textClassName}>{text}</span>
      <ClipboardButton
        text={text}
        successMessage={successMessage}
        showToast={shouldShowToast}
        copied={copied}
        onCopy={onCopy}
      />
    </div>
  )
}
