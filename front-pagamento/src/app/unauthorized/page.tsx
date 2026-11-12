import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl">🚫</span>
          </div>
          <CardTitle className="text-xl font-semibold text-red-600">Acesso negado</CardTitle>
          <CardDescription>
            Você não tem permissão para acessar o painel administrativo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600">
            <p>Para ter acesso, você precisa:</p>
            <ul className="mt-2 space-y-1 text-left">
              <li>• Ser cadastrado como administrador</li>
              <li>• Ter permissões ativas no sistema</li>
              <li>• Usar o email correto para login</li>
            </ul>
          </div>

          <div className="pt-4 space-y-2">
            <Button asChild className="w-full">
              <Link href="/login">Fazer login com outra conta</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/profile">Ir para minha área</Link>
            </Button>

            <p className="text-xs text-gray-500 pt-2">
              Entre em contato com o administrador do sistema se você acredita que isso é um erro
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
