'use client'

import { useEffect, useState } from 'react'

import { useRouter } from 'next/navigation'

import {
  Activity,
  CreditCard,
  Home,
  Mail,
  Package,
  ScrollText,
  Search,
  Settings,
  ShoppingCart,
  TicketPercent,
  Users,
  Webhook,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'

const ADMIN_ROUTES = [
  { group: 'Principal', title: 'Dashboard', href: '/admin', icon: Home },
  { group: 'Gerenciamento', title: 'Produtos', href: '/admin/products', icon: Package },
  { group: 'Gerenciamento', title: 'Pagamentos', href: '/admin/payments', icon: CreditCard },
  { group: 'Gerenciamento', title: 'Pedidos', href: '/admin/orders', icon: ShoppingCart },
  { group: 'Gerenciamento', title: 'Cupons', href: '/admin/coupons', icon: TicketPercent },
  { group: 'Gerenciamento', title: 'Assinaturas', href: '/admin/subscriptions', icon: Activity },
  { group: 'Sistema', title: 'Webhooks', href: '/admin/webhooks', icon: Webhook },
  { group: 'Sistema', title: 'Trilha de auditoria', href: '/admin/audit', icon: ScrollText },
  { group: 'Sistema', title: 'Emails enviados', href: '/admin/emails', icon: Mail },
  { group: 'Sistema', title: 'Administradores', href: '/admin/admins', icon: Users },
  { group: 'Sistema', title: 'Configurações', href: '/admin/settings', icon: Settings },
] as const

export function AdminCommandMenu() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const navigate = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-8 gap-2 px-2.5 text-xs text-muted-foreground font-normal sm:w-52 sm:justify-between"
      >
        <span className="flex items-center gap-1.5">
          <Search className="size-3.5" />
          <span className="hidden sm:inline">Ir para página...</span>
        </span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
          ⌘K
        </kbd>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Navegação rápida"
        description="Busque uma seção do painel administrativo"
      >
        <CommandInput placeholder="Buscar seção..." />
        <CommandList>
          <CommandEmpty>Nenhuma página encontrada.</CommandEmpty>
          {(['Principal', 'Gerenciamento', 'Sistema'] as const).map((group) => (
            <CommandGroup key={group} heading={group}>
              {ADMIN_ROUTES.filter((r) => r.group === group).map((route) => (
                <CommandItem
                  key={route.href}
                  value={`${route.title} ${route.href}`}
                  onSelect={() => navigate(route.href)}
                >
                  <route.icon className="size-4 text-muted-foreground" />
                  <span>{route.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  )
}
