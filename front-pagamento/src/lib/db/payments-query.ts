import type { Pool, QueryResultRow } from 'pg'

import { getPool } from '@/lib/db/pool'

type Field =
  | { kind: 'column'; name: string }
  | { kind: 'relation'; name: string; inner: boolean; fields: Field[] }

type Filter = { column: string; value: unknown }

const FOREIGN_KEY: Record<string, string> = {
  subscriptions: 'subscription_id',
  prices: 'price_id',
  products: 'product_id',
  orders: 'order_id',
  profiles: 'user_id',
}

const IDENTIFIER = /^[a-z_][a-z0-9_]*$/

function ident(value: string): string {
  if (!IDENTIFIER.test(value)) {
    throw new Error(`Identificador SQL inválido: ${value}`)
  }
  return value
}

function parseFields(source: string): Field[] {
  const fields: Field[] = []
  const text = source.trim()
  let index = 0
  while (index < text.length) {
    while (text[index] === ' ' || text[index] === ',') index += 1
    if (index >= text.length) break
    const start = index
    while (index < text.length && /[A-Za-z0-9_]/.test(text[index] ?? '')) index += 1
    const name = text.slice(start, index)
    if (!IDENTIFIER.test(name)) throw new Error(`Coluna inválida: ${name}`)
    let inner = false
    if (text.slice(index, index + 6) === '!inner') {
      inner = true
      index += 6
    }
    if (text[index] === '(') {
      let depth = 1
      index += 1
      const bodyStart = index
      while (index < text.length && depth > 0) {
        if (text[index] === '(') depth += 1
        else if (text[index] === ')') depth -= 1
        index += 1
      }
      fields.push({
        kind: 'relation',
        name,
        inner,
        fields: parseFields(text.slice(bodyStart, index - 1)),
      })
    } else {
      fields.push({ kind: 'column', name })
    }
  }
  return fields
}

function normalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(normalize)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, normalize(item)])
    )
  }
  return value
}

function dbError(error: unknown): { message: string; code?: string } {
  const code =
    typeof (error as { code?: string }).code === 'string'
      ? (error as { code: string }).code
      : undefined
  const message = error instanceof Error ? error.message : 'Erro no banco'
  return { message, code }
}

class PaymentsQuery {
  private action: 'select' | 'insert' | 'update' | 'delete' = 'select'
  private fields: Field[] = [{ kind: 'column', name: '*' }]
  private filters: Filter[] = []
  private comparisons: { column: string; op: '>=' | 'in' | 'is null'; value: unknown }[] = []
  private payload: Record<string, unknown> | null = null
  private returning = false
  private head = false
  private orderSql = ''
  private limitSql = ''

  constructor(
    private readonly pool: Pool,
    private readonly table: string
  ) {}

  select(columns = '*', options?: { head?: boolean; count?: 'exact' }): this {
    this.fields = columns.trim() === '*' ? [{ kind: 'column', name: '*' }] : parseFields(columns)
    this.returning = true
    this.head = options?.head === true
    return this
  }

  order(column: string, options?: { ascending?: boolean }): this {
    const direction = options?.ascending === false ? 'DESC' : 'ASC'
    this.orderSql = ` ORDER BY t0.${ident(column)} ${direction}`
    return this
  }

  limit(count: number): this {
    this.limitSql = ` LIMIT ${Number(count)}`
    return this
  }

  range(from: number, to: number): this {
    const start = Number(from)
    const end = Number(to)
    this.limitSql = ` OFFSET ${start} LIMIT ${end - start + 1}`
    return this
  }

  gte(column: string, value: unknown): this {
    this.comparisons.push({ column: ident(column), op: '>=', value })
    return this
  }

  in(column: string, values: unknown[]): this {
    this.comparisons.push({ column: ident(column), op: 'in', value: values })
    return this
  }

  is(column: string, value: null): this {
    if (value !== null) throw new Error('Filtro is só aceita null')
    this.comparisons.push({ column: ident(column), op: 'is null', value: null })
    return this
  }

  delete(): this {
    this.action = 'delete'
    return this
  }

  eq(column: string, value: unknown): this {
    this.filters.push({ column: ident(column), value })
    return this
  }

  insert(payload: Record<string, unknown>): this {
    this.action = 'insert'
    this.payload = payload
    return this
  }

  update(payload: Record<string, unknown>): this {
    this.action = 'update'
    this.payload = payload
    return this
  }

  maybeSingle(): Promise<{
    data: QueryResultRow | null
    error: { message: string; code?: string } | null
  }> {
    return this.finish('maybe')
  }

  single(): Promise<{
    data: QueryResultRow | null
    error: { message: string; code?: string } | null
  }> {
    return this.finish('one')
  }

  then<T>(onFulfilled: (value: any) => T, onRejected?: (reason: unknown) => T): Promise<T> {
    return this.finish('many').then(onFulfilled, onRejected)
  }

  private async finish(mode: 'maybe' | 'one' | 'many') {
    try {
      if (this.head) {
        const count = await this.count()
        return { data: null, count, error: null }
      }
      const rows = await this.run()
      if (mode === 'many')
        return { data: this.returning || this.action === 'select' ? rows : null, error: null }
      if (mode === 'maybe') return { data: rows[0] ?? null, error: null }
      if (rows.length !== 1) {
        return { data: null, error: { message: 'Nenhuma ou várias linhas', code: 'PGRST116' } }
      }
      return { data: rows[0] ?? null, error: null }
    } catch (error) {
      return { data: null, error: dbError(error) }
    }
  }

  private async run(): Promise<QueryResultRow[]> {
    const table = ident(this.table)
    const values: unknown[] = []
    const where = this.whereSql(values)

    if (this.action === 'insert') {
      const payload = this.payload ?? {}
      const columns = Object.keys(payload)
      columns.forEach((column) => ident(column))
      const names = columns.map((column) => ident(column)).join(', ')
      const params = columns.map((column) => {
        values.push(payload[column])
        return `$${values.length}`
      })
      const returning = this.returning ? ` RETURNING ${this.columnNames()}` : ' RETURNING id'
      const result = await this.pool.query(
        `INSERT INTO payments.${table} (${names}) VALUES (${params.join(', ')})${returning}`,
        values
      )
      return result.rows.map((row) => normalize(row) as QueryResultRow)
    }

    if (this.action === 'update') {
      const payload = this.payload ?? {}
      const assignments = Object.keys(payload).map((column) => {
        ident(column)
        values.push(payload[column])
        return `${ident(column)} = $${values.length}`
      })
      const returning = this.returning ? ` RETURNING ${this.columnNames()}` : ''
      const result = await this.pool.query(
        `UPDATE payments.${table} AS t0 SET ${assignments.join(', ')}${where ? ` WHERE ${where}` : ''}${returning}`,
        values
      )
      return result.rows.map((row) => normalize(row) as QueryResultRow)
    }

    if (this.action === 'delete') {
      await this.pool.query(
        `DELETE FROM payments.${table} AS t0${where ? ` WHERE ${where}` : ''}`,
        values
      )
      return []
    }

    const { select, joins } = this.fromClause()
    const result = await this.pool.query(
      `SELECT ${select} FROM payments.${table} AS t0${joins}${where ? ` WHERE ${where}` : ''}${this.orderSql}${this.limitSql}`,
      values
    )
    return result.rows.map((row) => normalize(row) as QueryResultRow)
  }

  private whereSql(values: unknown[]): string {
    const parts = this.filters.map((filter) => {
      values.push(filter.value)
      return `t0.${filter.column} = $${values.length}`
    })
    for (const comparison of this.comparisons) {
      if (comparison.op === 'is null') {
        parts.push(`t0.${comparison.column} IS NULL`)
        continue
      }
      values.push(comparison.value)
      if (comparison.op === 'in') {
        parts.push(`t0.${comparison.column} = ANY($${values.length})`)
        continue
      }
      parts.push(`t0.${comparison.column} >= $${values.length}`)
    }
    return parts.join(' AND ')
  }

  private async count(): Promise<number> {
    const table = ident(this.table)
    const values: unknown[] = []
    const where = this.whereSql(values)
    const result = await this.pool.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM payments.${table} AS t0${where ? ` WHERE ${where}` : ''}`,
      values
    )
    return result.rows[0]?.count ?? 0
  }

  private columnNames(): string {
    return this.fields
      .filter((field): field is { kind: 'column'; name: string } => field.kind === 'column')
      .map((field) => ident(field.name))
      .join(', ')
  }

  private fromClause(): { select: string; joins: string } {
    let joinIndex = 0
    const joins: string[] = []

    const valueOf = (expression: string): { key: string; sql: string } => {
      const marker = ' AS '
      const at = expression.lastIndexOf(marker)
      if (at === -1) {
        const column = expression.split('.').pop() ?? expression
        return { key: column, sql: expression }
      }
      return { key: expression.slice(at + marker.length), sql: expression.slice(0, at) }
    }

    const render = (fields: Field[], parent: string): string[] => {
      const parts: string[] = []
      for (const field of fields) {
        if (field.kind === 'column') {
          parts.push(field.name === '*' ? `${parent}.*` : `${parent}.${ident(field.name)}`)
          continue
        }
        joinIndex += 1
        const alias = `t${joinIndex}`
        const key = FOREIGN_KEY[field.name]
        if (!key) throw new Error(`Relação não mapeada: ${field.name}`)
        joins.push(
          ` ${field.inner ? 'INNER' : 'LEFT'} JOIN payments.${ident(field.name)} AS ${alias} ON ${alias}.id = ${parent}.${ident(key)}`
        )
        const nested = render(field.fields, alias).map(valueOf)
        const objectFields = nested.map((item) => `'${item.key}', ${item.sql}`).join(', ')
        parts.push(
          `CASE WHEN ${alias}.id IS NULL THEN NULL ELSE json_build_object(${objectFields}) END AS ${ident(field.name)}`
        )
      }
      return parts
    }

    return { select: render(this.fields, 't0').join(', '), joins: joins.join('') }
  }
}

export type PaymentsQueryClient = {
  schema: (name: string) => PaymentsQueryClient
  from: (table: string) => PaymentsQuery
  rpc: (
    name: string,
    args: Record<string, unknown>
  ) => Promise<{ data: null; error: { message: string; code?: string } | null }>
}

export function createAdminPaymentsClient(): PaymentsQueryClient {
  return createPaymentsQueryClient(getPool())
}

export function createPaymentsQueryClient(pool: Pool): PaymentsQueryClient {
  const client: PaymentsQueryClient = {
    schema() {
      return client
    },
    from(table: string) {
      return new PaymentsQuery(pool, table)
    },
    async rpc(name: string, args: Record<string, unknown>) {
      try {
        const values = Object.values(args)
        const params = values.map((_, index) => `$${index + 1}`).join(', ')
        await pool.query(`SELECT payments.${ident(name)}(${params})`, values)
        return { data: null, error: null }
      } catch (error) {
        return { data: null, error: dbError(error) }
      }
    },
  }
  return client
}
