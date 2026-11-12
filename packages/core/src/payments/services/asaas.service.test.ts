import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { InternalServerError, ValidationError } from '../../errors'

import { createAsaasService } from './asaas.service'

const baseUrl = 'https://api-sandbox.asaas.com/v3'

describe('AsaasService', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response()))
    )
    process.env = { ...originalEnv, ASAAS_API_KEY: '$fake_key' }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.unstubAllGlobals()
  })

  describe('deletePayment', () => {
    it('lança ValidationError quando paymentId está vazio', async () => {
      const service = createAsaasService('$fake', 'sandbox')
      await expect(service.deletePayment('')).rejects.toThrow(ValidationError)
      await expect(service.deletePayment('')).rejects.toThrow(
        /ID do pagamento é obrigatório/
      )
    })

    it('chama DELETE .../payments/:id e não lança em sucesso', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ deleted: true, id: 'pay_123' }), {
          status: 200,
        })
      )
      vi.stubGlobal('fetch', fetchMock)

      const service = createAsaasService('$fake', 'sandbox')
      await service.deletePayment('pay_123')

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(
        `${baseUrl}/payments/pay_123`,
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.any(Object),
        })
      )
    })

    it('lança InternalServerError quando a API retorna erro', async () => {
      const fetchMock = vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({ errors: [{ description: 'Cobrança não encontrada' }] }),
            { status: 404 }
          )
        )
      )
      vi.stubGlobal('fetch', fetchMock)

      const service = createAsaasService('$fake', 'sandbox')
      await expect(service.deletePayment('pay_invalid')).rejects.toThrow(
        InternalServerError
      )
      await expect(service.deletePayment('pay_invalid')).rejects.toThrow(
        /remover cobrança/
      )
    })
  })

  describe('createPayment', () => {
    it('chama POST .../payments e retorna payment', async () => {
      const paymentResponse = {
        id: 'pay_abc123',
        invoiceUrl: 'https://www.asaas.com/i/abc123',
        bankSlipUrl: null,
        status: 'PENDING',
        value: 99.9,
        netValue: 97.9,
        dueDate: '2025-04-01',
      }
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(paymentResponse), { status: 200 })
      )
      vi.stubGlobal('fetch', fetchMock)

      const service = createAsaasService('$fake', 'sandbox')
      const result = await service.createPayment({
        customer: 'cus_xyz',
        billingType: 'PIX',
        value: 99.9,
        dueDate: '2025-04-01',
        description: 'Teste',
      })

      expect(fetchMock).toHaveBeenCalledWith(
        `${baseUrl}/payments`,
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"billingType":"PIX"'),
        })
      )
      expect(result.id).toBe('pay_abc123')
      expect(result.invoiceUrl).toBe('https://www.asaas.com/i/abc123')
    })

    it('lança InternalServerError quando API retorna erro', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ errors: [{ description: 'Cliente inválido' }] }),
          { status: 400 }
        )
      )
      vi.stubGlobal('fetch', fetchMock)

      const service = createAsaasService('$fake', 'sandbox')
      await expect(
        service.createPayment({
          customer: 'cus_invalid',
          billingType: 'BOLETO',
          value: 100,
          dueDate: '2025-04-01',
        })
      ).rejects.toThrow(InternalServerError)
    })
  })

  describe('getPixQrCode', () => {
    it('lança ValidationError quando paymentId está vazio', async () => {
      const service = createAsaasService('$fake', 'sandbox')
      await expect(service.getPixQrCode('')).rejects.toThrow(ValidationError)
    })

    it('chama GET .../payments/:id/pixQrCode e retorna encodedImage e payload', async () => {
      const pixResponse = {
        encodedImage: 'data:image/png;base64,iVBORw0KGgo=',
        payload: '00020126580014br.gov.bcb.pix...',
      }
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(pixResponse), { status: 200 })
      )
      vi.stubGlobal('fetch', fetchMock)

      const service = createAsaasService('$fake', 'sandbox')
      const result = await service.getPixQrCode('pay_pix123')

      expect(fetchMock).toHaveBeenCalledWith(
        `${baseUrl}/payments/pay_pix123/pixQrCode`,
        expect.objectContaining({ method: 'GET' })
      )
      expect(result.encodedImage).toBe(pixResponse.encodedImage)
      expect(result.payload).toBe(pixResponse.payload)
    })
  })

  describe('cancelInstallmentPayments', () => {
    it('lança ValidationError quando installmentId está vazio', async () => {
      const service = createAsaasService('$fake', 'sandbox')
      await expect(
        service.cancelInstallmentPayments('')
      ).rejects.toThrow(ValidationError)
      await expect(
        service.cancelInstallmentPayments('')
      ).rejects.toThrow(/ID do parcelamento é obrigatório/)
    })

    it('chama DELETE .../installments/:id/payments e não lança em sucesso', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            deleted: true,
            id: 'inst_abc',
            deletedPayments: [],
          }),
          { status: 200 }
        )
      )
      vi.stubGlobal('fetch', fetchMock)

      const service = createAsaasService('$fake', 'sandbox')
      await service.cancelInstallmentPayments('inst_abc')

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(
        `${baseUrl}/installments/inst_abc/payments`,
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.any(Object),
        })
      )
    })

    it('lança InternalServerError quando a API retorna erro', async () => {
      const fetchMock = vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({ errors: [{ description: 'Parcelamento não encontrado' }] }),
            { status: 404 }
          )
        )
      )
      vi.stubGlobal('fetch', fetchMock)

      const service = createAsaasService('$fake', 'sandbox')
      await expect(
        service.cancelInstallmentPayments('inst_invalid')
      ).rejects.toThrow(InternalServerError)
      await expect(
        service.cancelInstallmentPayments('inst_invalid')
      ).rejects.toThrow(/cancelar parcelamento/)
    })
  })
})
