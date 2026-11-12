'use client'

import { Badge } from '@/components/ui/badge'

/**
 * Status de pedido suportado (alinhado com Order em admin/orders/types e lib/payments/order).
 */
export type OrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded' | 'expired'

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  expired: 'Expirado',
  cancelled: 'Cancelado',
  failed: 'Falhou',
  refunded: 'Reembolsado',
}

const ORDER_STATUS_ICONS: Record<OrderStatus, string> = {
  pending: '⏳',
  paid: '✅',
  expired: '⌛',
  cancelled: '❌',
  failed: '❌',
  refunded: '↩️',
}

/** Classes por status (semânticas: funcionam em tema claro/escuro e em profile/admin). */
const ORDER_STATUS_CLASSES: Record<OrderStatus, string> = {
  pending: 'bg-warning/10 text-warning hover:bg-warning/20',
  paid: 'bg-success/10 text-success hover:bg-success/20',
  expired: 'bg-muted text-muted-foreground hover:bg-muted/80',
  cancelled: 'bg-destructive/10 text-destructive hover:bg-destructive/20',
  failed: 'bg-destructive/10 text-destructive hover:bg-destructive/20',
  refunded: 'bg-warning/10 text-warning hover:bg-warning/20',
}

export interface OrderStatusBadgeProps {
  status: OrderStatus
  /** Se true, mostra apenas o ícone (útil em tabelas compactas). Default: false. */
  iconOnly?: boolean
}

/**
 * Badge unificado para status de pedido (profile e admin). Fase 9.2.
 */
export function OrderStatusBadge({ status, iconOnly = false }: OrderStatusBadgeProps) {
  const label = ORDER_STATUS_LABELS[status]
  const icon = ORDER_STATUS_ICONS[status]
  const className = ORDER_STATUS_CLASSES[status]

  return (
    <Badge className={className}>
      <span className="mr-1" aria-hidden>
        {icon}
      </span>
      {!iconOnly && label}
    </Badge>
  )
}
