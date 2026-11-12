#!/usr/bin/env node
/**
 * Script para simular pagamento PIX no sandbox do Asaas.
 *
 * O endpoint POST /v3/pix/qrCodes/pay simula o pagamento de um QR Code PIX,
 * permitindo testar o fluxo completo sem usar app de banco real.
 *
 * Pré-requisitos:
 * - Chave PIX cadastrada na conta Asaas (sandbox)
 * - Cobrança criada com QR Code gerado pelo Asaas
 * - API Key com permissão PIX_TRANSACTION:WRITE (operações de saque)
 *   → Asaas > Configurações > Integrações > API > Editar chave
 *
 * Uso:
 *   pnpm test:pix-pay
 *   pnpm test:pix-pay --payload "00020126..." --value 50
 *
 * Para testar com QR Code de uma cobrança criada no checkout:
 *   pnpm test:pix-pay --payload "<pix_code do payment>" --value <valor_em_reais>
 *
 * O payload e value padrão são do exemplo da documentação Asaas.
 */

import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')

function loadEnvLocal() {
  const envPath = resolve(rootDir, '.env.local')
  if (!existsSync(envPath)) return
  const content = readFileSync(envPath, 'utf8')
  content.split('\n').forEach((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) process.env[key] = value
    }
  })
}

loadEnvLocal()

const ASAAS_API_KEY = process.env.ASAAS_API_KEY
const ASAAS_ENV = process.env.ASAAS_ENVIRONMENT || 'sandbox'
const BASE_URL =
  ASAAS_ENV === 'production'
    ? 'https://api.asaas.com/v3'
    : 'https://api-sandbox.asaas.com/v3'

// Payload e valor do exemplo da documentação Asaas
const DEFAULT_PAYLOAD =
  '00020126710014br.gov.bcb.pix01362ae3db4c-9f04-44de-9a39-adcc98a334c20209Churrasco520400005303986540550.005802BR5913John Doe6009Joinville62290525JHOND00000000465493ASA6304DB5E'
const DEFAULT_VALUE = 50

function getArg(name) {
  const idx = process.argv.indexOf(`--${name}`)
  if (idx === -1) return null
  return process.argv[idx + 1] ?? null
}

const payload = getArg('payload') || DEFAULT_PAYLOAD
const value = parseFloat(getArg('value') || String(DEFAULT_VALUE))

async function main() {
  if (!ASAAS_API_KEY) {
    console.error('❌ ASAAS_API_KEY não encontrada. Configure em .env.local')
    process.exit(1)
  }

  const accessToken = ASAAS_API_KEY.startsWith('$') ? ASAAS_API_KEY : `$${ASAAS_API_KEY}`

  const body = {
    qrCode: { payload },
    value,
  }

  console.log('🔄 Simulando pagamento PIX no Asaas sandbox...')
  console.log('   URL:', `${BASE_URL}/pix/qrCodes/pay`)
  console.log('   Valor: R$', value.toFixed(2))
  console.log('   Payload (início):', payload.substring(0, 50) + '...')
  console.log('')

  try {
    const res = await fetch(`${BASE_URL}/pix/qrCodes/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        access_token: accessToken,
      },
      body: JSON.stringify(body),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      console.error('❌ Erro:', res.status, res.statusText)
      console.error('   Resposta:', JSON.stringify(data, null, 2))
      if (data?.errors) {
        data.errors.forEach((e) => console.error('   -', e.description || e.code))
      }
      if (res.status === 403 && data?.errors?.[0]?.code === 'insufficient_permission') {
        console.error('')
        console.error('💡 A chave de API precisa da permissão PIX_TRANSACTION:WRITE.')
        console.error('   Asaas > Configurações > Integrações > API > Editar chave')
      }
      process.exit(1)
    }

    console.log('✅ Pagamento PIX simulado com sucesso!')
    console.log('   ID transação:', data.id)
    console.log('   Status:', data.status)
    console.log('   Valor:', data.value)
    if (data.payment) console.log('   Cobrança (payment):', data.payment)
    if (data.endToEndIdentifier) console.log('   End-to-end:', data.endToEndIdentifier)
    console.log('')
    console.log('Resposta completa:', JSON.stringify(data, null, 2))
  } catch (err) {
    console.error('❌ Erro de rede:', err.message)
    process.exit(1)
  }
}

main()
