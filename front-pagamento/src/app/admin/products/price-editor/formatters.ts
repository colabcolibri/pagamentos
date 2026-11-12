import { CONTENT } from './content'
import type { Price } from './types'

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100)
}

/** Valor editável no input (pt-BR, vírgula decimal). */
export function formatCentsAsEditableMoney(cents: number): string {
  if (cents === 0) return ''
  return (cents / 100).toFixed(2).replace('.', ',')
}

/**
 * Interpreta texto livre (49,90 | 49.90 | 1.234,56) em centavos.
 * Vazio → 0. Apenas dígitos/vírgula/ponto.
 */
export function parseMoneyInputToCents(raw: string): number {
  const t = raw.trim().replace(/\s/g, '')
  if (!t) return 0
  let normalized: string
  if (t.includes(',')) {
    const [intRaw, decRaw = ''] = t.split(',')
    const intPart = intRaw.replace(/\./g, '').replace(/\D/g, '')
    const decPart = decRaw.replace(/\D/g, '').slice(0, 2)
    normalized = decPart ? `${intPart}.${decPart}` : intPart
  } else {
    normalized = t.replace(/[^\d.]/g, '')
  }
  const n = parseFloat(normalized)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.round(n * 100)
}

/** Ex.: 10,5 ou 10.5 → número; vazio → null. */
export function parsePercentInput(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, '')
  if (!t) return null
  let normalized: string
  if (t.includes(',')) {
    const [intRaw, decRaw = ''] = t.split(',', 2)
    const intPart = intRaw.replace(/\./g, '').replace(/\D/g, '')
    const decPart = decRaw.replace(/\D/g, '').slice(0, 4)
    normalized = decPart ? `${intPart || '0'}.${decPart}` : intPart
  } else {
    normalized = t.replace(/[^\d.]/g, '')
  }
  if (normalized === '' || normalized === '.') return null
  const n = parseFloat(normalized)
  return Number.isFinite(n) ? n : null
}

/** Durante a digitação: só dígitos e um separador decimal (, ou .). */
export function sanitizePercentDraftInput(raw: string): string {
  let s = raw.replace(/[^\d.,]/g, '')
  const c = s.indexOf(',')
  if (c !== -1) {
    s = s.slice(0, c + 1) + s.slice(c + 1).replace(/,/g, '')
  }
  const d = s.indexOf('.')
  if (d !== -1) {
    s = s.slice(0, d + 1) + s.slice(d + 1).replace(/\./g, '')
  }
  return s
}

/** Valor armazenado → texto do input (vírgula decimal no pt-BR). */
export function formatPercentForInputDisplay(n: number): string {
  if (!Number.isFinite(n)) return '0'
  return String(n).replace('.', ',')
}

export function formatPriceDescription(price: Price): string {
  if (!price.recurring) return CONTENT.uniquePayment

  const interval =
    CONTENT.intervals[price.interval as keyof typeof CONTENT.intervals] || price.interval
  return `${price.interval_count > 1 ? `A cada ${price.interval_count}` : ''} ${interval}`.trim()
}
