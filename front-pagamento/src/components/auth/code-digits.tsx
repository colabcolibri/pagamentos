'use client'

import { useRef } from 'react'

const LENGTH = 6

type CodeDigitsProps = {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  id?: string
}

export function CodeDigits({ value, onChange, disabled = false, id = 'code' }: CodeDigitsProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([])
  const digits = Array.from({ length: LENGTH }, (_, index) => value[index] ?? '')

  function commit(next: string) {
    onChange(next.replace(/\D/g, '').slice(0, LENGTH))
  }

  function focusAt(index: number) {
    refs.current[Math.max(0, Math.min(index, LENGTH - 1))]?.focus()
  }

  function handleChange(index: number, raw: string) {
    const clean = raw.replace(/\D/g, '')
    if (!clean) {
      const next = digits.slice()
      next[index] = ''
      commit(next.join(''))
      return
    }
    if (clean.length > 1) {
      const merged = `${digits.join('').slice(0, index)}${clean}`.slice(0, LENGTH)
      commit(merged)
      focusAt(Math.min(merged.length, LENGTH - 1))
      return
    }
    const next = digits.slice()
    next[index] = clean
    commit(next.join(''))
    if (index < LENGTH - 1) focusAt(index + 1)
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      event.preventDefault()
      const next = digits.slice()
      next[index - 1] = ''
      commit(next.join(''))
      focusAt(index - 1)
    }
    if (event.key === 'ArrowLeft' && index > 0) focusAt(index - 1)
    if (event.key === 'ArrowRight' && index < LENGTH - 1) focusAt(index + 1)
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    event.preventDefault()
    const text = event.clipboardData.getData('text')
    const clean = text.replace(/\D/g, '').slice(0, LENGTH)
    commit(clean)
    focusAt(Math.max(clean.length - 1, 0))
  }

  return (
    <div className="flex max-w-full justify-center gap-1.5 sm:gap-2">
      {digits.map((digit, index) => (
        <input
          key={index}
          id={index === 0 ? id : undefined}
          ref={(node) => {
            refs.current[index] = node
          }}
          value={digit}
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          aria-label={`Dígito ${index + 1} de 6`}
          maxLength={1}
          disabled={disabled}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          className="h-12 w-10 min-w-0 rounded-md border border-input bg-background text-center text-lg font-semibold tabular-nums text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 sm:h-14 sm:w-12"
        />
      ))}
    </div>
  )
}
