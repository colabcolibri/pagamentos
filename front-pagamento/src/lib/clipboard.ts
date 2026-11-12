'use client'

import { useState } from 'react'

import { toast } from 'sonner'

import { devError } from '@/lib/dev-log'

/**
 * Copia texto para a área de transferência
 * @param text - Texto a ser copiado
 * @param options - Opções de configuração
 * @returns Promise<boolean> - true se copiou com sucesso, false caso contrário
 */
export async function copyToClipboard(
  text: string,
  options?: {
    showToast?: boolean
    successMessage?: string
    errorMessage?: string
  }
): Promise<boolean> {
  const {
    showToast = true,
    successMessage = 'Copiado!',
    errorMessage = 'Erro ao copiar',
  } = options || {}

  try {
    // Tenta usar a API moderna do clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      if (showToast) {
        toast.success(successMessage)
      }
      return true
    }

    // Fallback para navegadores mais antigos
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()

    const successful = document.execCommand('copy')
    document.body.removeChild(textArea)

    if (successful) {
      if (showToast) {
        toast.success(successMessage)
      }
      return true
    } else {
      throw new Error('execCommand failed')
    }
  } catch (error) {
    devError('Erro ao copiar para clipboard:', error)
    if (showToast) {
      toast.error(errorMessage)
    }
    return false
  }
}

/**
 * Hook para gerenciar estado de "copiado" temporário
 * Útil para mostrar feedback visual (ex: mudar ícone temporariamente)
 */
export function useCopyState() {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const setCopied = (id: string, duration = 2000) => {
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), duration)
  }

  const isCopied = (id: string) => copiedId === id

  return { setCopied, isCopied, copiedId }
}
