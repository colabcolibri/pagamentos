'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import {
  Activity,
  CreditCard,
  FileText,
  Home,
  Mail,
  Package,
  ScrollText,
  Settings,
  ShoppingCart,
  TicketPercent,
  Users,
  Webhook,
} from 'lucide-react'

import { useBrand } from '@/components/brand/brand-provider'
import { LogoutButton } from '@/components/logout-button'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { useCurrentAdmin } from '@/hooks/use-admin'

const CONTENT = {
  subtitle: 'Painel administrativo',

  nav: {
    main: 'Principal',
    management: 'Gerenciamento',
    system: 'Sistema',
  },

  items: {
    dashboard: 'Dashboard',
    products: 'Produtos',
    payments: 'Pagamentos',
    orders: 'Pedidos',
    coupons: 'Cupons',
    subscriptions: 'Assinaturas',
    webhooks: 'Webhooks',
    audit: 'Trilha',
    emails: 'Emails enviados',
    admins: 'Administradores',
    settings: 'Configurações',
  },

  user: {
    loading: 'Carregando...',
    notFound: 'Usuário não encontrado',
  },
} as const

const mainNavItems = [
  {
    title: CONTENT.items.dashboard,
    url: '/admin',
    icon: Home,
  },
]

const managementItems = [
  {
    title: CONTENT.items.products,
    url: '/admin/products',
    icon: Package,
  },
  {
    title: CONTENT.items.payments,
    url: '/admin/payments',
    icon: CreditCard,
  },
  {
    title: CONTENT.items.orders,
    url: '/admin/orders',
    icon: ShoppingCart,
  },
  {
    title: CONTENT.items.coupons,
    url: '/admin/coupons',
    icon: TicketPercent,
  },
  {
    title: CONTENT.items.subscriptions,
    url: '/admin/subscriptions',
    icon: Activity,
  },
]

const systemItems = [
  {
    title: CONTENT.items.webhooks,
    url: '/admin/webhooks',
    icon: Webhook,
  },
  {
    title: CONTENT.items.audit,
    url: '/admin/audit',
    icon: ScrollText,
  },
  {
    title: CONTENT.items.emails,
    url: '/admin/emails',
    icon: Mail,
  },
  {
    title: CONTENT.items.admins,
    url: '/admin/admins',
    icon: Users,
  },
  {
    title: CONTENT.items.settings,
    url: '/admin/settings',
    icon: Settings,
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const brand = useBrand()
  const { data: adminInfo, isLoading } = useCurrentAdmin()

  return (
    <Sidebar className="overflow-x-hidden">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex flex-col gap-2 py-2 px-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-6 w-6 shrink-0" />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-semibold text-sm wrap-break-word line-clamp-2">
                {brand.name}
              </span>
              <span className="text-xs text-muted-foreground truncate">{CONTENT.subtitle}</span>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="overflow-x-hidden">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>{CONTENT.nav.main}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => {
                const isActive = pathname === item.url
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.url} prefetch={false}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Management Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>{CONTENT.nav.management}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementItems.map((item) => {
                const isActive = pathname === item.url
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.url} prefetch={false}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* System Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>{CONTENT.nav.system}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemItems.map((item) => {
                const isActive = pathname === item.url
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.url} prefetch={false}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex flex-col gap-2 p-2 min-w-0">
          {isLoading ? (
            <div className="text-xs text-muted-foreground">{CONTENT.user.loading}</div>
          ) : adminInfo ? (
            <>
              <div className="flex flex-col gap-1 px-2 min-w-0">
                <span className="text-sm font-medium truncate">{adminInfo.name}</span>
                <span className="text-xs text-muted-foreground truncate">{adminInfo.email}</span>
                <span className="text-xs text-primary capitalize truncate">{adminInfo.role}</span>
              </div>
              <LogoutButton />
            </>
          ) : (
            <div className="text-xs text-muted-foreground">{CONTENT.user.notFound}</div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
