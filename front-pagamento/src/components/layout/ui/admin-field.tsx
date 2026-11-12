'use client'

import {
  Field as BaseField,
  FieldDescription as BaseFieldDescription,
  FieldError as BaseFieldError,
  FieldLabel as BaseFieldLabel,
} from '@/components/ui/field'
import { cn } from '@/lib/utils'

/**
 * Field customizado para admin com espaçamento reduzido e estilo ajustado
 */
function Field({ className, ...props }: React.ComponentProps<typeof BaseField>) {
  return <BaseField className={className} {...props} />
}

/**
 * FieldLabel com estilo padrão do admin
 */
function FieldLabel({ className, ...props }: React.ComponentProps<typeof BaseFieldLabel>) {
  return <BaseFieldLabel className={className} {...props} />
}

/**
 * FieldDescription customizado:
 * - Espaçamento reduzido (!-mt-2 ao invés do gap-3 padrão)
 * - Texto em itálico para melhor distinção visual
 * - Menor e mais próximo do campo
 */
function FieldDescription({
  className,
  ...props
}: React.ComponentProps<typeof BaseFieldDescription>) {
  return <BaseFieldDescription className={cn('!-mt-1 italic text-xs', className)} {...props} />
}

/**
 * FieldError mantém comportamento padrão
 */
function FieldError({ className, ...props }: React.ComponentProps<typeof BaseFieldError>) {
  return <BaseFieldError className={className} {...props} />
}

export { Field, FieldDescription, FieldError, FieldLabel }
