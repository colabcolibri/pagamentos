#!/usr/bin/env node
/**
 * Script de smoke test para o checkout do Quitou.
 *
 * Pré-requisitos:
 * 1. Supabase rodando (supabase start) com seed aplicado
 * 2. Dev server rodando (pnpm dev)
 * 3. .env.local configurado
 *
 * Uso:
 *   pnpm test:checkout                    # busca price_id automaticamente
 *   PRICE_ID=uuid pnpm test:checkout      # usa price_id específico
 *   APP_URL=http://localhost:3004 pnpm test:checkout  # override URL (default: 3004)
 *   GATEWAY=asaas pnpm test:checkout      # testar Asaas em vez de Pagar.me
 */

import pg from 'pg'
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

// Quitou roda na porta 3004; NEXT_PUBLIC_APP_URL pode ser 3000 no .env
const APP_URL = process.env.APP_URL || process.env.TEST_CHECKOUT_URL || 'http://localhost:3004'
const CUSTOMER = {
  name: 'Teste Checkout Script',
  email: 'teste-checkout@example.com',
  cpf: '529.982.247-25',
}

async function getFirstPriceId() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL é obrigatória no .env.local')
    process.exit(1)
  }
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  try {
    const result = await client.query(
      'SELECT id FROM payments.prices WHERE active IS TRUE LIMIT 1'
    )
    const id = result.rows[0]?.id
    if (!id) {
      console.error('❌ Nenhum preço ativo encontrado')
      process.exit(1)
    }
    return id
  } finally {
    await client.end()
  }
}

async function testCheckout(priceId, gateway = 'pagarme') {
  const url = `${APP_URL.replace(/\/$/, '')}/api/payments/${gateway}/checkout`
  const body = {
    price_id: priceId,
    customer_info: CUSTOMER,
    billing_type: 'PIX',
  }

  console.log(`\n📤 POST ${url}`)
  console.log('   Body:', JSON.stringify(body, null, 2).split('\n').map((l) => '   ' + l).join('\n'))

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = { raw: text }
  }

  console.log(`\n📥 Status: ${res.status}`)
  console.log('   Response:', JSON.stringify(json, null, 2).split('\n').map((l) => '   ' + l).join('\n'))

  return { status: res.status, json }
}

async function main() {
  console.log('🧪 Quitou — smoke test do checkout')
  console.log('   APP_URL:', APP_URL)

  let priceId = process.env.PRICE_ID
  if (!priceId) {
    console.log('\n🔍 Buscando primeiro preço ativo no Postgres...')
    priceId = await getFirstPriceId()
    console.log('   Price ID:', priceId)
  }

  const gateway = process.env.GATEWAY || 'pagarme'

  const { status, json } = await testCheckout(priceId, gateway)

  if (status === 400) {
    console.log('\n⚠️  400 = body inválido ou validação falhou. Verifique os detalhes acima.')
    process.exit(1)
  }

  if (status === 404) {
    console.log('\n⚠️  404 = preço ou produto não encontrado.')
    process.exit(1)
  }

  if (status === 202 && json?.action === 'email_verification_required') {
    console.log('\n✅ Checkout OK! Resposta esperada: OTP enviado para verificação de email.')
    console.log('   (Usuário não autenticado — fluxo de magic link/OTP acionado)')
    process.exit(0)
  }

  if (status >= 200 && status < 300) {
    console.log('\n✅ Checkout OK! Resposta de sucesso.')
    if (json?.order_id) console.log('   Order ID:', json.order_id)
    if (json?.payment_id) console.log('   Payment ID:', json.payment_id)
    process.exit(0)
  }

  if (status >= 500) {
    console.log('\n❌ Erro no servidor. Verifique logs do dev server.')
    process.exit(1)
  }

  console.log('\n⚠️  Resposta inesperada. Verifique os detalhes acima.')
  process.exit(1)
}

main().catch((err) => {
  console.error('❌ Erro:', err.message)
  if (err.cause) console.error('   Cause:', err.cause)
  process.exit(1)
})
