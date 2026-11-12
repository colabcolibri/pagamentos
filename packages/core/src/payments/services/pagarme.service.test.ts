import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { InternalServerError, ValidationError } from '../../errors'

import { createPagarmeService } from './pagarme.service'

const baseUrl = 'https://sdx-api.pagar.me/core/v5'

describe('PagarmeService', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response()))
    )
    process.env = { ...originalEnv, PAGARME_SECRET_KEY: 'sk_test_fake' }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.unstubAllGlobals()
  })

  describe('cancelPaymentLink', () => {
    it('lança ValidationError quando paymentLinkId está vazio', async () => {
      const service = createPagarmeService('sk_test_fake', 'sandbox')
      await expect(service.cancelPaymentLink('')).rejects.toThrow(ValidationError)
      await expect(service.cancelPaymentLink('')).rejects.toThrow(
        /ID do payment link é obrigatório/
      )
    })

    it('chama PATCH .../paymentlinks/:id/cancel e não lança em sucesso (204)', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(null, { status: 204 })
      )
      vi.stubGlobal('fetch', fetchMock)

      const service = createPagarmeService('sk_test_fake', 'sandbox')
      const linkId = 'pl_abc123'
      await service.cancelPaymentLink(linkId)

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(
        `${baseUrl}/paymentlinks/${linkId}/cancel`,
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.any(Object),
        })
      )
    })

    it('lança InternalServerError quando a API retorna erro', async () => {
      const fetchMock = vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ errors: ['Link já cancelado'] }), {
            status: 400,
          })
        )
      )
      vi.stubGlobal('fetch', fetchMock)

      const service = createPagarmeService('sk_test_fake', 'sandbox')
      await expect(
        service.cancelPaymentLink('pl_abc123')
      ).rejects.toThrow(InternalServerError)
      await expect(
        service.cancelPaymentLink('pl_abc123')
      ).rejects.toThrow(/cancelar link de pagamento/)
    })
  })
})
