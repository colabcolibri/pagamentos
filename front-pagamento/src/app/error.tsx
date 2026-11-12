'use client'

import { useEffect } from 'react'

import { AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { devError } from '@/lib/dev-log'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    devError(error)
  }, [error])

  return (
    <div className="min-h-[50vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" aria-hidden />
        <h1 className="text-xl font-semibold text-foreground mb-2">Algo deu errado</h1>
        <p className="text-muted-foreground mb-6">
          Ocorreu um erro inesperado. Tente recarregar a página.
        </p>
        <Button onClick={reset} variant="default">
          Tentar novamente
        </Button>
      </div>
    </div>
  )
}
