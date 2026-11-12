'use client'

import { useBrand } from '@/components/brand/brand-provider'
import { cn } from '@/lib/utils'

export interface PublicFooterProps {
  copyright?: string
  /** Razão social / CNPJ quando configurado em env */
  companyLine?: string | null
  links?: Array<{
    label: string
    href: string
  }>
  /** Texto auxiliar (ex.: canal de contato) */
  footnote?: string | null
  children?: React.ReactNode
  className?: string
}

// ============================================================================
// COMPONENTE
// ============================================================================
function linkRel(href: string): string | undefined {
  if (href.startsWith('mailto:') || href.startsWith('http://') || href.startsWith('https://')) {
    return 'noopener noreferrer'
  }
  return undefined
}

export function PublicFooter({
  copyright,
  companyLine,
  links,
  footnote,
  children,
  className,
}: PublicFooterProps) {
  const brand = useBrand()
  const year = new Date().getFullYear()
  const copyrightText = copyright ?? `© ${year} ${brand.copyrightName}`
  const line = companyLine === undefined ? brand.companyLine : companyLine
  const navLinks = links ?? brand.links

  return (
    <footer className={cn('border-t border-border/40 py-6 md:py-8', className)}>
      <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-full overflow-x-hidden">
        {children || (
          <div className="flex flex-col gap-4 md:gap-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6">
              <div className="text-center sm:text-left min-w-0 space-y-1">
                <p className="text-sm text-muted-foreground wrap-break-word">{copyrightText}</p>
                {line ? (
                  <p className="text-xs text-muted-foreground/90 wrap-break-word">{line}</p>
                ) : null}
              </div>
              {navLinks.length > 0 ? (
                <nav
                  aria-label="Links institucionais"
                  className="flex flex-wrap items-center justify-center sm:justify-end gap-x-6 gap-y-2 sm:max-w-[min(100%,28rem)] sm:text-right"
                >
                  {navLinks.map((link) => (
                    <a
                      key={`${link.label}-${link.href}`}
                      href={link.href}
                      rel={linkRel(link.href)}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground text-center sm:text-left"
                    >
                      {link.label}
                    </a>
                  ))}
                </nav>
              ) : null}
            </div>
            {footnote ? (
              <p className="text-xs text-muted-foreground text-center sm:text-left leading-relaxed max-w-prose mx-auto sm:mx-0">
                {footnote}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </footer>
  )
}
