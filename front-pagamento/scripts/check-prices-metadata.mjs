#!/usr/bin/env node
/**
 * Script para verificar metadata dos preços no banco.
 * Mostra cash_discount e max_installments para diagnosticar por que o desconto não está sendo aplicado.
 *
 * Uso: node scripts/check-prices-metadata.mjs
 * Requer: .env.local com DATABASE_URL
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

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL é obrigatória no .env.local')
    process.exit(1)
  }

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  let prices
  try {
    const result = await client.query(
      `SELECT id, ref, amount, metadata, active
       FROM payments.prices
       WHERE active IS TRUE
       ORDER BY created_at DESC`
    )
    prices = result.rows
  } finally {
    await client.end()
  }

  console.log('\n📋 Preços ativos no banco (payments.prices):\n')
  console.log('─'.repeat(80))

  if (!prices || prices.length === 0) {
    console.log('Nenhum preço ativo encontrado.')
    process.exit(0)
  }

  for (const p of prices) {
    const meta = p.metadata || {}
    const cashDiscount = meta.cash_discount
    const maxInstallments = meta.max_installments
    const cashType = typeof cashDiscount
    const installType = typeof maxInstallments

    console.log(`\nref: ${p.ref}`)
    console.log(`id:  ${p.id}`)
    console.log(`amount: ${p.amount} centavos (R$ ${(p.amount / 100).toFixed(2)})`)
    console.log(`metadata: ${JSON.stringify(meta)}`)
    console.log(`  cash_discount: ${cashDiscount} (tipo: ${cashType})${cashType === 'string' ? ' ⚠️ STRING - deveria ser number' : ''}`)
    console.log(`  max_installments: ${maxInstallments} (tipo: ${installType})${installType === 'string' ? ' ⚠️ STRING - deveria ser number' : ''}`)
    console.log(`  → desconto será aplicado: ${cashDiscount > 0 ? 'SIM' : 'NÃO (0 ou ausente)'}`)
    console.log('─'.repeat(80))
  }

  console.log('\n💡 Se cash_discount ou max_installments estão vazios/0:')
  console.log('   - Edite o produto no admin e preencha "Desconto à vista (%)" e "Parcelas máximas"')
  console.log('   - O seed não inclui metadata nos preços - precisa configurar manualmente')
  console.log('')
}

main().catch((err) => {
  console.error('❌ Erro:', err.message)
  process.exit(1)
})
