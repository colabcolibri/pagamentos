'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { SecretStatus } from '@/hooks/admin/use-platform-settings'

export function SecretField({
  id,
  label,
  hint,
  envName,
  status,
  value,
  onChange,
  disabled,
}: {
  id: string
  label: string
  hint?: string
  envName: string
  status: SecretStatus | undefined
  value: string
  onChange: (value: string) => void
  disabled: boolean
}) {
  const locked = status?.source === 'env'

  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <p className="break-all font-mono text-sm text-foreground">
        {status?.preview ?? 'Não inserida'}
      </p>
      {locked ? (
        <p className="text-xs text-muted-foreground">
          Travada por <span className="font-medium text-foreground">{envName}</span>. Para trocar
          aqui, tire essa variável do ambiente.
        </p>
      ) : (
        <Input
          id={id}
          type="password"
          autoComplete="new-password"
          value={value}
          placeholder={status?.configured ? 'Em branco mantém a chave salva' : 'Cole a chave'}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}
