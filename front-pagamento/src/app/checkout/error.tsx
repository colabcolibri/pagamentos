'use client'

import Link from 'next/link'

import { AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'

export default function CheckoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" aria-hidden />
        <h1 className="text-xl font-semibold text-foreground mb-2">Erro no checkout</h1>
        <p className="text-muted-foreground mb-6">
          Não foi possível carregar esta página. Você pode tentar novamente ou voltar ao início.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} variant="default">
            Tentar novamente
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Voltar ao início</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
