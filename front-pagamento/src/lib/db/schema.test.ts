import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '../../../db/migrations')

describe('schema payments', () => {
  it('o boot não cria papéis do Supabase e pode rodar de novo', () => {
    const files = readdirSync(migrationsDir).filter((name) => name.endsWith('.sql'))
    const boot = files.find((name) => name.includes('payments_schema'))
    expect(boot).toMatch(/^\d{14}_payments_schema\.sql$/)

    const sql = readFileSync(join(migrationsDir, boot!), 'utf8')
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n')
      .toLowerCase()

    expect(sql).not.toContain('auth.users')
    expect(sql).not.toContain('enable row level security')
    expect(sql).not.toContain('service_role')
    expect(sql).not.toContain('authenticated')
    expect(sql).not.toContain(' anon')
    expect(sql).toContain('create schema if not exists payments')
    expect(sql).toContain('create table if not exists payments.profiles')
    expect(sql).toContain('create table if not exists payments.orders')
    expect(sql).toContain('create table if not exists payments.webhook_events')
    expect(sql).toContain('create table if not exists payments.email_logs')
    expect(sql).not.toMatch(/create table payments\./)
  })
})
