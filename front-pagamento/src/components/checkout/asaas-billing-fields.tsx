'use client'

import { Loader2 } from 'lucide-react'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { devError } from '@/lib/dev-log'
import { cn } from '@/lib/utils'

import { CHECKOUT_FORM_CONTENT, type CheckoutFormData } from './checkout-form-content'
import { RequiredFieldMark } from './required-field-mark'

const CONTENT = CHECKOUT_FORM_CONTENT.asaasFields
const FORM_FIELDS = CHECKOUT_FORM_CONTENT.fields
const VALIDATION = CHECKOUT_FORM_CONTENT.validation

export interface AsaasBillingFieldsProps {
  formData: Partial<CheckoutFormData>
  errors: Partial<Record<keyof CheckoutFormData, string>>
  onFieldChange: (field: keyof CheckoutFormData, value: string | boolean) => void
  onCpfChange: (cpf: string) => void
  onCnpjChange: (cnpj: string) => void
  /** Validação ao sair do campo (ex.: nome completo na razão social) */
  onFieldBlur?: (field: keyof CheckoutFormData) => void
  disabled?: boolean
  isLoading?: boolean
  isLoadingCep: boolean
  setLoadingCep: (v: boolean) => void
  onCepError?: (message: string | null) => void
}

export function AsaasBillingFields({
  formData,
  errors,
  onFieldChange,
  onCpfChange,
  onCnpjChange,
  onFieldBlur,
  disabled,
  isLoading,
  isLoadingCep,
  setLoadingCep,
  onCepError,
}: AsaasBillingFieldsProps) {
  const handleCepChange = async (cep: string) => {
    let masked = cep.replace(/\D/g, '')
    if (masked.length > 5) masked = masked.slice(0, 5) + '-' + masked.slice(5, 8)
    onFieldChange('cep', masked)
    onCepError?.(null)
    if (masked.replace(/\D/g, '').length === 8) {
      setLoadingCep(true)
      try {
        const cepDigits = masked.replace(/\D/g, '')
        const res = await fetch(`/api/cep?cep=${encodeURIComponent(cepDigits)}`)
        const json = (await res.json()) as Record<string, unknown>
        if (!res.ok) {
          const msg = typeof json.error === 'string' ? json.error : VALIDATION.cepError
          onCepError?.(msg)
        } else if (json.erro === true || json.erro === 'true') {
          onCepError?.(VALIDATION.cepNotFound)
        } else {
          onCepError?.(null)
          const str = (k: string) => (typeof json[k] === 'string' ? (json[k] as string) : '')
          onFieldChange('address', str('logradouro'))
          onFieldChange('province', str('bairro'))
          onFieldChange('city', str('localidade'))
          onFieldChange('state', str('uf'))
          const complemento = str('complemento').trim()
          if (complemento) onFieldChange('complement', complemento)
        }
      } catch (e) {
        devError('Erro ao buscar CEP:', e)
        onCepError?.(VALIDATION.cepError)
      } finally {
        setLoadingCep(false)
      }
    }
  }

  return (
    <Card className="border-info/20 bg-info/10">
      <CardHeader className="pb-4">
        <h3 className="scroll-m-20 text-xl font-semibold tracking-tight text-info">
          {CONTENT.title}
        </h3>
        <p className="mt-1 text-sm text-info/80">{CONTENT.subtitle}</p>
        <p className="mt-2 text-xs text-muted-foreground">{CONTENT.requiredLegend}</p>
      </CardHeader>
      <CardContent className="space-y-4 md:space-y-5">
        {/* 1 — Tipo + documento: grid com rótulos na mesma linha (md+) e controles alinhados; mobile em ordem lógica */}
        <div
          className={cn(
            'grid w-full grid-cols-1 gap-y-2',
            /* inline-grid: bloco só largura do conteúdo; CPF/CNPJ fica colado ao tipo, sem ir até a outra ponta */
            'md:inline-grid md:w-auto md:max-w-full md:grid-cols-[auto_minmax(11rem,20rem)] md:gap-x-6 md:gap-y-1.5 md:items-start'
          )}
        >
          <FieldLabel
            id="billing-person-type-lbl"
            className={cn('col-span-1 row-start-1', errors.personType && 'text-destructive')}
          >
            {CONTENT.personType.label}
            <RequiredFieldMark className="ml-0.5" />
          </FieldLabel>

          <FieldLabel
            htmlFor={formData.personType === 'juridica' ? 'cnpj' : 'cpf'}
            className={cn(
              'col-span-1 row-start-3 md:col-start-2 md:row-start-1',
              formData.personType === 'juridica'
                ? errors.cnpj && 'text-destructive'
                : errors.cpf && 'text-destructive'
            )}
          >
            {formData.personType === 'juridica' ? CONTENT.cnpj : CONTENT.cpf}
            <RequiredFieldMark className="ml-0.5" />
          </FieldLabel>

          <div className="col-span-1 row-start-2 min-w-0 md:col-start-1 md:row-start-2 md:max-w-[min(100%,22rem)]">
            <RadioGroup
              aria-labelledby="billing-person-type-lbl"
              value={formData.personType || 'fisica'}
              onValueChange={(v) => onFieldChange('personType', v)}
              disabled={disabled || isLoading}
              className="flex flex-col gap-0"
            >
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                <FieldLabel className="flex cursor-pointer items-center gap-2 font-normal">
                  <RadioGroupItem value="fisica" />
                  {CONTENT.personType.fisica}
                </FieldLabel>
                <FieldLabel className="flex cursor-pointer items-center gap-2 font-normal">
                  <RadioGroupItem value="juridica" />
                  {CONTENT.personType.juridica}
                </FieldLabel>
              </div>
            </RadioGroup>
            <FieldError className="mt-1">{errors.personType}</FieldError>
          </div>

          <div className="col-span-1 row-start-4 min-w-0 w-full md:col-start-2 md:row-start-2">
            {formData.personType === 'fisica' ? (
              <>
                <InputGroup>
                  <InputGroupInput
                    id="cpf"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={formData.cpf || ''}
                    onChange={(e) => onCpfChange(e.target.value)}
                    placeholder={CONTENT.cpfPlaceholder}
                    maxLength={14}
                    disabled={disabled || isLoading}
                    aria-invalid={!!errors.cpf}
                    className="min-w-0"
                  />
                </InputGroup>
                <FieldError className="mt-1">{errors.cpf}</FieldError>
              </>
            ) : (
              <>
                <InputGroup>
                  <InputGroupInput
                    id="cnpj"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={formData.cnpj || ''}
                    onChange={(e) => onCnpjChange(e.target.value)}
                    placeholder={CONTENT.cnpjPlaceholder}
                    maxLength={18}
                    disabled={disabled || isLoading}
                    aria-invalid={!!errors.cnpj}
                    className="min-w-0"
                  />
                </InputGroup>
                <FieldError className="mt-1">{errors.cnpj}</FieldError>
              </>
            )}
          </div>
        </div>

        {/* 2 — PF: nome completo (mesmo lugar da razão social no PJ) */}
        {formData.personType === 'fisica' ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-x-4">
            <Field className="min-w-0 lg:col-span-6" data-invalid={!!errors.name}>
              <FieldLabel htmlFor="name">
                {FORM_FIELDS.name}
                <RequiredFieldMark className="ml-0.5" />
              </FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="name"
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => onFieldChange('name', e.target.value)}
                  onBlur={() => onFieldBlur?.('name')}
                  placeholder={FORM_FIELDS.namePlaceholder}
                  disabled={disabled || isLoading}
                  aria-invalid={!!errors.name}
                  className="min-w-0"
                />
              </InputGroup>
              <FieldError>{errors.name}</FieldError>
            </Field>
          </div>
        ) : null}

        {/* 2b — Razão social + IE + IM (PJ) */}
        {formData.personType === 'juridica' ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-12 lg:gap-x-4">
            <Field className="min-w-0 col-span-2 lg:col-span-6" data-invalid={!!errors.razaoSocial}>
              <FieldLabel htmlFor="razaoSocial">
                {CONTENT.razaoSocial}
                <RequiredFieldMark className="ml-0.5" />
              </FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="razaoSocial"
                  type="text"
                  value={formData.razaoSocial || ''}
                  onChange={(e) => onFieldChange('razaoSocial', e.target.value)}
                  onBlur={() => onFieldBlur?.('razaoSocial')}
                  placeholder={CONTENT.razaoSocialPlaceholder}
                  disabled={disabled || isLoading}
                  aria-invalid={!!errors.razaoSocial}
                  className="min-w-0"
                />
              </InputGroup>
              <FieldError>{errors.razaoSocial}</FieldError>
            </Field>
            <Field className="min-w-0 lg:col-span-3">
              <FieldLabel className="text-xs leading-snug sm:text-sm" htmlFor="ie">
                {CONTENT.ie}
              </FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="ie"
                  type="text"
                  value={formData.ie || ''}
                  onChange={(e) => onFieldChange('ie', e.target.value)}
                  disabled={disabled || isLoading}
                  className="min-w-0"
                />
              </InputGroup>
            </Field>
            <Field className="min-w-0 lg:col-span-3">
              <FieldLabel className="text-xs leading-snug sm:text-sm" htmlFor="im">
                {CONTENT.im}
              </FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="im"
                  type="text"
                  value={formData.im || ''}
                  onChange={(e) => onFieldChange('im', e.target.value)}
                  disabled={disabled || isLoading}
                  className="min-w-0"
                />
              </InputGroup>
            </Field>
          </div>
        ) : null}

        {/* 3 — Telefone + CEP (mobile: mesma linha; sm+: flex com larguras máximas) */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-3 min-w-0 items-start sm:flex sm:flex-row sm:flex-wrap sm:items-end sm:gap-x-8 sm:gap-y-3">
            <Field
              className="min-w-0 sm:w-[min(100%,16rem)] sm:shrink-0"
              data-invalid={!!errors.phone}
            >
              <FieldLabel htmlFor="phone">
                {CONTENT.phone}
                <RequiredFieldMark className="ml-0.5" />
              </FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="phone"
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => onFieldChange('phone', e.target.value)}
                  placeholder={CONTENT.phonePlaceholder}
                  maxLength={16}
                  disabled={disabled || isLoading}
                  aria-invalid={!!errors.phone}
                  className="min-w-0"
                />
              </InputGroup>
              <FieldError>{errors.phone}</FieldError>
            </Field>

            <Field
              className="min-w-0 sm:w-[min(100%,10.5rem)] sm:shrink-0"
              data-invalid={!!errors.cep}
            >
              <FieldLabel htmlFor="cep">
                {CONTENT.cep}
                <RequiredFieldMark className="ml-0.5" />
              </FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="cep"
                  type="text"
                  inputMode="numeric"
                  value={formData.cep || ''}
                  onChange={(e) => handleCepChange(e.target.value)}
                  placeholder={CONTENT.cepPlaceholder}
                  maxLength={9}
                  disabled={disabled || isLoading || isLoadingCep}
                  aria-invalid={!!errors.cep}
                  className="min-w-0"
                />
                {isLoadingCep && (
                  <InputGroupAddon align="inline-end">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </InputGroupAddon>
                )}
              </InputGroup>
              <FieldError>{errors.cep}</FieldError>
            </Field>
          </div>
          <FieldDescription className="max-w-none">{CONTENT.cepHint}</FieldDescription>
          {!errors.cep && formData.cep && formData.cep.replace(/\D/g, '').length === 8 && (
            <FieldDescription className="mt-1! max-w-none text-success">
              Endereço preenchido a partir do CEP.
            </FieldDescription>
          )}
        </div>

        {/* 4 — Logradouro (largura total) + número + complemento (mobile: num | compl na mesma linha) */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-12 md:items-start md:gap-x-4 md:gap-y-4">
          <Field className="min-w-0 col-span-2 md:col-span-6" data-invalid={!!errors.address}>
            <FieldLabel htmlFor="address">
              {CONTENT.address}
              <RequiredFieldMark className="ml-0.5" />
            </FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="address"
                type="text"
                value={formData.address || ''}
                onChange={(e) => onFieldChange('address', e.target.value)}
                disabled={disabled || isLoading}
                aria-invalid={!!errors.address}
                className="min-w-0"
              />
            </InputGroup>
            <FieldError>{errors.address}</FieldError>
          </Field>
          <Field className="min-w-0 col-span-1 md:col-span-2" data-invalid={!!errors.addressNumber}>
            <FieldLabel htmlFor="addressNumber">
              {CONTENT.addressNumber}
              <RequiredFieldMark className="ml-0.5" />
            </FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="addressNumber"
                type="text"
                value={formData.addressNumber || ''}
                onChange={(e) => onFieldChange('addressNumber', e.target.value)}
                disabled={disabled || isLoading}
                aria-invalid={!!errors.addressNumber}
                className="min-w-0"
              />
            </InputGroup>
            <FieldError>{errors.addressNumber}</FieldError>
          </Field>
          <Field className="min-w-0 col-span-1 md:col-span-4">
            <FieldLabel htmlFor="complement">{CONTENT.complement}</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="complement"
                type="text"
                value={formData.complement || ''}
                onChange={(e) => onFieldChange('complement', e.target.value)}
                disabled={disabled || isLoading}
                className="min-w-0"
              />
            </InputGroup>
          </Field>
        </div>

        {/* 5 — Bairro (largura total no mobile) + cidade | UF na mesma linha no mobile */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-12 sm:items-start sm:gap-x-4 sm:gap-y-4">
          <Field className="min-w-0 col-span-2 sm:col-span-4" data-invalid={!!errors.province}>
            <FieldLabel htmlFor="province">
              {CONTENT.province}
              <RequiredFieldMark className="ml-0.5" />
            </FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="province"
                type="text"
                value={formData.province || ''}
                onChange={(e) => onFieldChange('province', e.target.value)}
                disabled={disabled || isLoading}
                aria-invalid={!!errors.province}
                className="min-w-0"
              />
            </InputGroup>
            <FieldError>{errors.province}</FieldError>
          </Field>
          <div className="col-span-2 grid min-w-0 grid-cols-[7fr_3fr] gap-3 sm:col-span-8 sm:gap-x-4">
            <Field className="min-w-0" data-invalid={!!errors.city}>
              <FieldLabel htmlFor="city">
                {CONTENT.city}
                <RequiredFieldMark className="ml-0.5" />
              </FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="city"
                  type="text"
                  value={formData.city || ''}
                  onChange={(e) => onFieldChange('city', e.target.value)}
                  disabled={disabled || isLoading}
                  aria-invalid={!!errors.city}
                  className="min-w-0"
                />
              </InputGroup>
              <FieldError>{errors.city}</FieldError>
            </Field>
            <Field className="min-w-0" data-invalid={!!errors.state}>
              <FieldLabel htmlFor="state">
                {CONTENT.state}
                <RequiredFieldMark className="ml-0.5" />
              </FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="state"
                  type="text"
                  value={formData.state || ''}
                  onChange={(e) => onFieldChange('state', e.target.value.toUpperCase())}
                  placeholder={CONTENT.statePlaceholder}
                  maxLength={2}
                  disabled={disabled || isLoading}
                  aria-invalid={!!errors.state}
                  className="min-w-0 max-w-[5rem] uppercase sm:max-w-none"
                />
              </InputGroup>
              <FieldError>{errors.state}</FieldError>
            </Field>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
