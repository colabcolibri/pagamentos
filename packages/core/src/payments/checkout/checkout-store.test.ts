import { describe, expect, it } from 'vitest'

import { insertOrderAndPayment, type CheckoutDatabase } from './checkout-store'

describe('insertOrderAndPayment', () => {
  it('grava pedido e pagamento no mesmo cliente', async () => {
    const statements: string[] = []
    const db: CheckoutDatabase = {
      query: async () => ({ rows: [] }),
      transaction: async (fn) => {
        await fn({
          query: async (sql) => {
            statements.push(sql)
            return { rows: [] }
          },
        })
      },
    }

    await insertOrderAndPayment(
      db,
      'asaas_payments',
      { id: 'order-1', user_id: 'user-1', status: 'pending' },
      { id: 'pay-1', order_id: 'order-1', billing_type: 'PIX' }
    )

    expect(statements[0]).toContain('INSERT INTO payments.orders')
    expect(statements[1]).toContain('INSERT INTO payments.asaas_payments')
  })

  it('não confirma o pedido quando o pagamento falha', async () => {
    const committed: string[] = []
    const db: CheckoutDatabase = {
      query: async () => ({ rows: [] }),
      transaction: async (fn) => {
        const pending: string[] = []
        try {
          await fn({
            query: async (sql) => {
              if (sql.includes('asaas_payments')) throw new Error('pagamento falhou')
              pending.push(sql)
              return { rows: [] }
            },
          })
          committed.push(...pending)
        } catch (error) {
          throw error
        }
      },
    }

    await expect(
      insertOrderAndPayment(
        db,
        'asaas_payments',
        { id: 'order-1', user_id: 'user-1' },
        { id: 'pay-1', order_id: 'order-1' }
      )
    ).rejects.toThrow('pagamento falhou')
    expect(committed).toEqual([])
  })
})
