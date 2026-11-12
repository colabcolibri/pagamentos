'use client'

import { useState } from 'react'

import { Input } from '@/components/ui/input'

import {
  formatPercentForInputDisplay,
  parsePercentInput,
  sanitizePercentDraftInput,
} from './formatters'

/** Inteiro com texto livre; confirma no blur (evita `type="number"` quebrando a digitação). */
export function TextIntInput({
  id,
  className,
  value,
  min,
  max,
  onCommit,
}: {
  id?: string
  className?: string
  value: number
  min: number
  max: number
  onCommit: (v: number) => void
}) {
  const [focused, setFocused] = useState(false)
  const [text, setText] = useState('')

  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      className={className}
      value={focused ? text : String(value)}
      onFocus={() => {
        setFocused(true)
        setText(String(value))
      }}
      onChange={(e) => setText(e.target.value.replace(/\D/g, ''))}
      onBlur={() => {
        setFocused(false)
        const digits = text.replace(/\D/g, '')
        const n = parseInt(digits, 10)
        const v = digits === '' || isNaN(n) ? min : Math.max(min, Math.min(max, n))
        onCommit(v)
      }}
    />
  )
}

/**
 * Percentual 0–100 inteiro no dado; na digitação aceita vírgula ou ponto (ex.: 10,5 → arredonda ao sair).
 */
export function TextPercentIntInput({
  id,
  className,
  value,
  min,
  max,
  onCommit,
}: {
  id?: string
  className?: string
  value: number
  min: number
  max: number
  onCommit: (v: number) => void
}) {
  const [focused, setFocused] = useState(false)
  const [text, setText] = useState('')

  return (
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      className={className}
      value={focused ? text : formatPercentForInputDisplay(value)}
      onFocus={() => {
        setFocused(true)
        setText(formatPercentForInputDisplay(value))
      }}
      onChange={(e) => setText(sanitizePercentDraftInput(e.target.value))}
      onBlur={() => {
        setFocused(false)
        const parsed = parsePercentInput(text)
        const n = parsed == null ? value : parsed
        const v = Number.isFinite(n) ? Math.round(Math.max(min, Math.min(max, n))) : min
        onCommit(v)
      }}
    />
  )
}

/** Inteiro opcional; vazio → null (ex.: limite de vagas / máx. vendas na faixa). */
export function TextOptionalPositiveIntInput({
  id,
  className,
  placeholder,
  value,
  onCommit,
  minWhenSet = 1,
}: {
  id?: string
  className?: string
  placeholder?: string
  value: number | null
  onCommit: (v: number | null) => void
  minWhenSet?: number
}) {
  const [focused, setFocused] = useState(false)
  const [text, setText] = useState('')

  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      className={className}
      placeholder={placeholder}
      value={focused ? text : value != null ? String(value) : ''}
      onFocus={() => {
        setFocused(true)
        setText(value != null ? String(value) : '')
      }}
      onChange={(e) => setText(e.target.value.replace(/\D/g, ''))}
      onBlur={() => {
        setFocused(false)
        const digits = text.replace(/\D/g, '')
        if (digits === '') {
          onCommit(null)
          return
        }
        const n = parseInt(digits, 10)
        onCommit(isNaN(n) ? null : Math.max(minWhenSet, n))
      }}
    />
  )
}
