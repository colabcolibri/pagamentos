import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import pg from 'pg'

export function pendingMigrationFiles(names, applied) {
  const done = new Set(applied)
  return names
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .filter((name) => !done.has(name))
}

export async function applyMigrations({ databaseUrl, migrationsDir }) {
  const client = new pg.Client({ connectionString: databaseUrl })
  await client.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.quitou_schema_migrations (
        filename text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `)
    const applied = await client.query('SELECT filename FROM public.quitou_schema_migrations')
    const pending = pendingMigrationFiles(
      readdirSync(migrationsDir),
      applied.rows.map((row) => row.filename)
    )
    for (const filename of pending) {
      const sql = readFileSync(path.join(migrationsDir, filename), 'utf8')
      await client.query('BEGIN')
      try {
        await client.query(sql)
        await client.query('INSERT INTO public.quitou_schema_migrations (filename) VALUES ($1)', [
          filename,
        ])
        await client.query('COMMIT')
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      }
    }
    return pending
  } finally {
    await client.end()
  }
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href

if (isDirectRun) {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('DATABASE_URL ausente')
    process.exit(1)
  }
  const migrationsDir = process.env.MIGRATIONS_DIR || path.join(process.cwd(), 'db/migrations')
  applyMigrations({ databaseUrl, migrationsDir })
    .then((pending) => {
      console.log(pending.length ? `aplicadas: ${pending.join(', ')}` : 'nada pendente')
    })
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}
