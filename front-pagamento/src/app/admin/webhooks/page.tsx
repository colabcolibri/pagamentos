'use client'

import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'

import { AdminPageLayout } from '@/components/admin/admin-page-layout'
import { WebhookDeliveriesCard } from '@/components/admin/webhook-deliveries-card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { WebhooksTable } from './webhooks-table'

const CONTENT = {
  title: 'Webhooks',
  subtitle: 'Acompanhe os webhooks enviados para seu sistema e os eventos recebidos dos gateways',
  tabs: {
    outbound: 'Enviados (Meu sistema)',
    inbound: 'Recebidos (Gateways)',
  },
} as const

export default function AdminWebhooksPage() {
  return (
    <AdminPageLayout title={CONTENT.title} subtitle={CONTENT.subtitle}>
      <Tabs defaultValue="outbound" className="space-y-4">
        <TabsList>
          <TabsTrigger value="outbound" className="gap-1.5">
            <ArrowUpRight className="h-4 w-4" />
            {CONTENT.tabs.outbound}
          </TabsTrigger>
          <TabsTrigger value="inbound" className="gap-1.5">
            <ArrowDownLeft className="h-4 w-4" />
            {CONTENT.tabs.inbound}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="outbound">
          <WebhookDeliveriesCard />
        </TabsContent>

        <TabsContent value="inbound">
          <WebhooksTable />
        </TabsContent>
      </Tabs>
    </AdminPageLayout>
  )
}
