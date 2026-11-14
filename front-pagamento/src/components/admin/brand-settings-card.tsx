'use client'

import { type ChangeEvent, useEffect, useState } from 'react'

import { Building2, Loader2, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'

import { useBrandUpdate } from '@/components/brand/brand-provider'
import { Field, FieldDescription, FieldLabel } from '@/components/layout/ui/admin-field'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { usePlatformSettings } from '@/hooks/admin/use-platform-settings'
import { compressLogoFile, formatBytesCompact } from '@/lib/brand/compress-logo'

export function BrandSettingsCard({ onSaved }: { onSaved?: () => void } = {}) {
  const updateBrand = useBrandUpdate()
  const { settings, isLoading, save, isSaving } = usePlatformSettings()

  const [brandName, setBrandName] = useState('')
  const [tagline, setTagline] = useState('')
  const [copyrightName, setCopyrightName] = useState('')
  const [legalName, setLegalName] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [supportEmail, setSupportEmail] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [privacyUrl, setPrivacyUrl] = useState('')
  const [termsUrl, setTermsUrl] = useState('')
  const [pendingLogo, setPendingLogo] = useState<{
    mime: string
    base64: string
    preview: string
  } | null>(null)
  const [clearLogo, setClearLogo] = useState(false)

  useEffect(() => {
    if (!settings) return
    setBrandName(settings.brand_name ?? '')
    setTagline(settings.brand_tagline ?? '')
    setCopyrightName(settings.brand_copyright_name ?? '')
    setLegalName(settings.brand_legal_name ?? '')
    setCnpj(settings.brand_cnpj ?? '')
    setSupportEmail(settings.brand_support_email ?? '')
    setContactEmail(settings.brand_contact_email ?? '')
    setPrivacyUrl(settings.brand_privacy_url ?? '')
    setTermsUrl(settings.brand_terms_url ?? '')
    setPendingLogo(null)
    setClearLogo(false)
  }, [settings])

  async function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const result = await compressLogoFile(file)
      setPendingLogo({ mime: result.mime, base64: result.base64, preview: result.preview })
      setClearLogo(false)
      if (result.compressedBytes < result.originalBytes) {
        toast.success(
          `Logo otimizada (${formatBytesCompact(result.originalBytes)} → ${formatBytesCompact(result.compressedBytes)}).`
        )
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível processar a logo.')
    }
  }

  async function handleSave() {
    try {
      const updated = await save({
        brand_name: brandName.trim() || null,
        brand_tagline: tagline.trim() || null,
        brand_copyright_name: copyrightName.trim() || null,
        brand_legal_name: legalName.trim() || null,
        brand_cnpj: cnpj.trim() || null,
        brand_support_email: supportEmail.trim() || null,
        brand_contact_email: contactEmail.trim() || null,
        brand_privacy_url: privacyUrl.trim() || null,
        brand_terms_url: termsUrl.trim() || null,
        ...(pendingLogo
          ? { brand_logo_mime: pendingLogo.mime, brand_logo_base64: pendingLogo.base64 }
          : clearLogo
            ? { brand_logo_clear: true }
            : {}),
      })
      setPendingLogo(null)
      setClearLogo(false)
      updateBrand({
        name: updated.brand_name,
        tagline: updated.brand_tagline,
        logoSrc: updated.logo_src,
        copyrightName: updated.brand_copyright_name,
        legalName: updated.brand_legal_name,
        cnpj: updated.brand_cnpj,
        supportEmail: updated.brand_support_email,
        contactEmail: updated.brand_contact_email,
        privacyUrl: updated.brand_privacy_url,
        termsUrl: updated.brand_terms_url,
      })
      toast.success('Identidade e dados da empresa atualizados.')
      onSaved?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar identidade.')
    }
  }

  const previewSrc = clearLogo ? null : (pendingLogo?.preview ?? settings?.logo_src ?? null)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base">Identidade & Empresa</CardTitle>
        </div>
        <CardDescription>
          Nome, logo, razão social, CNPJ e contatos exibidos no checkout, rodapé e e-mails.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-muted/30 p-3">
          <div className="flex h-12 min-w-28 items-center justify-center rounded-md border bg-background px-3">
            {previewSrc ? (
              <img
                src={previewSrc}
                alt={brandName || 'Logo'}
                className="h-8 w-auto max-w-36 object-contain"
              />
            ) : (
              <span className="text-xs text-muted-foreground">Sem logo</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent">
              <Upload className="h-4 w-4" />
              Enviar logo (PNG, SVG, WebP)
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="sr-only"
                onChange={handleLogoChange}
                disabled={isLoading || isSaving}
              />
            </label>
            {(settings?.has_custom_logo || pendingLogo) && !clearLogo && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPendingLogo(null)
                  setClearLogo(true)
                }}
                disabled={isSaving}
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Remover logo
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="brand-name">Nome da marca</FieldLabel>
            <Input
              id="brand-name"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="Ex.: Minha Empresa"
              disabled={isLoading || isSaving}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="brand-copyright">Nome no copyright</FieldLabel>
            <Input
              id="brand-copyright"
              value={copyrightName}
              onChange={(e) => setCopyrightName(e.target.value)}
              placeholder="Se vazio, usa o nome da marca"
              disabled={isLoading || isSaving}
            />
          </Field>

          <Field className="md:col-span-2">
            <FieldLabel htmlFor="brand-tagline">Descrição / Tagline</FieldLabel>
            <Input
              id="brand-tagline"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Pague com Pix, boleto ou cartão e acompanhe seus pedidos."
              disabled={isLoading || isSaving}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="brand-legal-name">Razão social</FieldLabel>
            <Input
              id="brand-legal-name"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              placeholder="Minha Empresa Tecnologia Ltda"
              disabled={isLoading || isSaving}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="brand-cnpj">CNPJ</FieldLabel>
            <Input
              id="brand-cnpj"
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              placeholder="00.000.000/0001-00"
              disabled={isLoading || isSaving}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="brand-support-email">E-mail de suporte</FieldLabel>
            <Input
              id="brand-support-email"
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              placeholder="suporte@suaempresa.com"
              disabled={isLoading || isSaving}
            />
            <FieldDescription>
              Usado nos links de ajuda, checkout e políticas de reembolso.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="brand-contact-email">E-mail do Fale Conosco</FieldLabel>
            <Input
              id="brand-contact-email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="contato@suaempresa.com"
              disabled={isLoading || isSaving}
            />
            <FieldDescription>
              Destino das mensagens enviadas pelo botão Fale Conosco.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="brand-privacy-url">URL da Política de Privacidade</FieldLabel>
            <Input
              id="brand-privacy-url"
              value={privacyUrl}
              onChange={(e) => setPrivacyUrl(e.target.value)}
              placeholder="https://suaempresa.com/privacidade"
              disabled={isLoading || isSaving}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="brand-terms-url">URL dos Termos de Uso</FieldLabel>
            <Input
              id="brand-terms-url"
              value={termsUrl}
              onChange={(e) => setTermsUrl(e.target.value)}
              placeholder="https://suaempresa.com/termos"
              disabled={isLoading || isSaving}
            />
          </Field>
        </div>

        <div className="flex justify-end">
          <Button type="button" onClick={handleSave} disabled={isLoading || isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar identidade
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
