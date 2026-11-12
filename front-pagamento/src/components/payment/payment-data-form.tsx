'use client'

import { Loader2, LogOut, Play } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const CONTENT = {
  title: 'Dados do cliente',
  titleTest: 'Dados do cliente (teste)',
  description: 'Dados para o pagamento',
  descriptionTest: 'Dados fictícios para simulação',

  fields: {
    name: 'Nome',
    email: 'E-mail',
    emailLocked: 'E-mail (logado)',
    document: 'CPF',
    phone: 'Telefone',
  },

  logout: {
    hint: 'Conta conectada. Para outro e-mail, saia e entre de novo.',
    button: 'Sair',
    title: 'Sair da conta?',
    description: 'Você precisará confirmar o e-mail de novo para pagar com outra conta.',
    cancel: 'Cancelar',
    confirm: 'Sim, sair',
  },

  submit: {
    default: 'Simular pagamento',
    processing: 'Processando...',
  },
} as const

interface CustomerData {
  name: string
  email: string
  document: string
  phone: string
}

interface PaymentDataFormProps {
  customerData: CustomerData
  onCustomerDataChange: (data: CustomerData) => void
  onSubmit: () => void | Promise<void>
  isProcessing?: boolean
  isLoggedIn?: boolean
  onLogout?: () => void | Promise<void>
  disabled?: boolean
  submitButtonText?: string
}

export function PaymentDataForm({
  customerData,
  onCustomerDataChange,
  onSubmit,
  isProcessing = false,
  isLoggedIn = false,
  onLogout,
  disabled = false,
  submitButtonText = 'Simular pagamento',
}: PaymentDataFormProps) {
  const handleInputChange = (field: keyof CustomerData, value: string) => {
    onCustomerDataChange({ ...customerData, [field]: value })
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    onLogout?.()
  }

  return (
    <div className="space-y-6">
      {/* Dados do cliente */}
      <Card>
        <CardHeader>
          <CardTitle>{isLoggedIn ? CONTENT.title : CONTENT.titleTest}</CardTitle>
          <CardDescription>
            {isLoggedIn ? CONTENT.description : CONTENT.descriptionTest}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Nome */}
          <div>
            <label className="text-sm font-medium text-gray-900">{CONTENT.fields.name}</label>
            <input
              type="text"
              value={customerData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              disabled={disabled}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* Email */}
          <div>
            <label className="text-sm font-medium text-gray-900">
              {isLoggedIn ? CONTENT.fields.emailLocked : CONTENT.fields.email}
            </label>
            <input
              type="email"
              value={customerData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              disabled={isLoggedIn || disabled}
              className={`mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isLoggedIn || disabled
                  ? 'bg-gray-100 cursor-not-allowed text-gray-600'
                  : 'border-gray-300'
              }`}
            />
            {isLoggedIn && onLogout && (
              <div className="mt-2 space-y-2">
                <p className="text-xs text-gray-500">{CONTENT.logout.hint}</p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full" disabled={disabled}>
                      <LogOut className="h-3 w-3 mr-2" />
                      {CONTENT.logout.button}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{CONTENT.logout.title}</AlertDialogTitle>
                      <AlertDialogDescription>{CONTENT.logout.description}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{CONTENT.logout.cancel}</AlertDialogCancel>
                      <AlertDialogAction onClick={handleLogout}>
                        {CONTENT.logout.confirm}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>

          {/* Documento */}
          <div>
            <label className="text-sm font-medium text-gray-900">{CONTENT.fields.document}</label>
            <input
              type="text"
              value={customerData.document}
              onChange={(e) => handleInputChange('document', e.target.value)}
              disabled={disabled}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* Telefone */}
          <div>
            <label className="text-sm font-medium text-gray-900">{CONTENT.fields.phone}</label>
            <input
              type="text"
              value={customerData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              disabled={disabled}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
        </CardContent>
      </Card>

      {/* Botão de ação */}
      <Card>
        <CardContent className="pt-6">
          <Button
            onClick={onSubmit}
            disabled={disabled || isProcessing}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {CONTENT.submit.processing}
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                {submitButtonText || CONTENT.submit.default}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
