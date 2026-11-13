import 'server-only'

import type { McpTool } from '../core/types'
import { ADMIN_TOOLS } from './admin/admin-tools'
import { AUDIT_TOOLS } from './audit/audit-tools'
import { CONNECTION_TOOLS } from './connections/connection-tools'
import { COUPON_TOOLS } from './coupon/coupon-tools'
import { DASHBOARD_TOOLS } from './dashboard/dashboard-tools'
import { EMAIL_TOOLS } from './email/email-tools'
import { ORDER_TOOLS } from './order/order-tools'
import { PAYMENT_TOOLS } from './payment/payment-tools'
import { PRODUCT_AI_TOOLS } from './product/product-ai-tools'
import { PRODUCT_TOOLS } from './product/product-tools'
import { REFUND_TOOLS } from './refund/refund-template-tools'
import { SETTINGS_TOOLS } from './settings/settings-tools'
import { SUBSCRIPTION_TOOLS } from './subscription/subscription-tools'
import { IDENTITY_TOOLS } from './system/identity-tools'
import { WEBHOOK_TOOLS } from './webhook/webhook-tools'

export const MCP_TOOLS: McpTool[] = [
  ...IDENTITY_TOOLS,
  ...PRODUCT_TOOLS,
  ...PRODUCT_AI_TOOLS,
  ...ORDER_TOOLS,
  ...PAYMENT_TOOLS,
  ...COUPON_TOOLS,
  ...SUBSCRIPTION_TOOLS,
  ...EMAIL_TOOLS,
  ...ADMIN_TOOLS,
  ...SETTINGS_TOOLS,
  ...WEBHOOK_TOOLS,
  ...AUDIT_TOOLS,
  ...REFUND_TOOLS,
  ...CONNECTION_TOOLS,
  ...DASHBOARD_TOOLS,
]
