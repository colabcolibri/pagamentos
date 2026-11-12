'use client'

import { useState } from 'react'

import { useRouter } from 'next/navigation'

import { LogOut } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { devError } from '@/lib/dev-log'

const CONTENT = {
  button: {
    loading: 'Saindo...',
    default: 'Logout',
    compact: 'Sair',
  },
} as const

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    setLoading(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/')
    } catch (error) {
      devError('Erro ao fazer logout:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant={compact ? 'outline' : 'default'}
      size="sm"
      onClick={handleLogout}
      disabled={loading}
      className={
        compact
          ? 'flex items-center gap-1.5 whitespace-nowrap shrink-0'
          : 'flex items-center gap-2 whitespace-nowrap w-full justify-start bg-secondary text-secondary-foreground hover:bg-secondary/80'
      }
    >
      <LogOut className="h-4 w-4 shrink-0" aria-hidden />
      {loading ? CONTENT.button.loading : compact ? CONTENT.button.compact : CONTENT.button.default}
    </Button>
  )
}
