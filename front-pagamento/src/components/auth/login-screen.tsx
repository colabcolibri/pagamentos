'use client'

import { useRouter } from 'next/navigation'

import { LoginForm } from '@/components/auth/login-form'
import { useBrand } from '@/components/brand/brand-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const CONTENT = {
  subtitle: 'Entre com seu email',
  security: {
    title: 'Acesso por código de 6 dígitos',
    subtitle: 'Sem senha e sem link',
  },
} as const

export function LoginScreen({ nextPath }: { nextPath: string | null }) {
  const router = useRouter()
  const brand = useBrand()

  const handleSuccess = async () => {
    if (nextPath) {
      router.push(nextPath)
      return
    }
    const response = await fetch('/api/auth/session')
    const session = (await response.json().catch(() => null)) as { isAdmin?: boolean } | null
    router.push(session?.isAdmin === true ? '/admin' : '/profile')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4 md:px-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="scroll-m-20 text-2xl font-semibold tracking-tight wrap-break-word">
            {brand.name}
          </CardTitle>
          <CardDescription>{CONTENT.subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 md:space-y-6">
          <LoginForm
            onSuccess={handleSuccess}
            allowRegister={true}
            allowCreateUser={false}
            initialMode="login"
            showHeader={false}
          />
          <div className="text-center text-sm text-muted-foreground">
            <p>{CONTENT.security.title}</p>
            <p>{CONTENT.security.subtitle}</p>
          </div>
          {brand.companyLine ? (
            <p className="text-center text-xs text-muted-foreground wrap-break-word">
              {brand.companyLine}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
