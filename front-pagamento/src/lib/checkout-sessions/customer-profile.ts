import type { PoolClient } from 'pg'

import { CheckoutSessionError } from './service'
import type { CheckoutCustomerAddress } from './types'

export interface ResolvedCustomerProfile {
  profileId: string
  customerName: string
  customerDocument: string
  personType: 'individual' | 'company'
}

export function normalizeBrazilianDocument(raw: string | null | undefined): {
  digits: string
  personType: 'individual' | 'company'
} | null {
  const digits = (raw ?? '').replace(/\D/g, '')
  if (digits.length === 11) return { digits, personType: 'individual' }
  if (digits.length === 14) return { digits, personType: 'company' }
  return null
}

export async function resolveCheckoutCustomerProfile(
  client: PoolClient,
  input: {
    email: string
    name?: string | null
    document?: string | null
    address?: CheckoutCustomerAddress | null
  }
): Promise<ResolvedCustomerProfile> {
  const normalizedEmail = input.email.trim().toLowerCase()
  const fallbackName = input.name?.trim() || normalizedEmail.split('@')[0] || 'Cliente'
  const parsedDoc = normalizeBrazilianDocument(input.document)

  const profileRes = await client.query<{
    id: string
    name: string | null
    document: string | null
    company_document: string | null
  }>(
    `SELECT id, name, document, company_document
     FROM payments.profiles
     WHERE lower(email) = $1
     LIMIT 1`,
    [normalizedEmail]
  )

  const existing = profileRes.rows[0]
  if (existing) {
    const existingCpf = (existing.document ?? '').replace(/\D/g, '')
    const existingCnpj = (existing.company_document ?? '').replace(/\D/g, '')

    if (existingCpf.length >= 11) {
      return {
        profileId: existing.id,
        customerName: fallbackName || existing.name || 'Cliente',
        customerDocument: existingCpf,
        personType: 'individual',
      }
    }
    if (existingCnpj.length >= 14) {
      return {
        profileId: existing.id,
        customerName: fallbackName || existing.name || 'Cliente',
        customerDocument: existingCnpj,
        personType: 'company',
      }
    }

    if (!parsedDoc) {
      throw new CheckoutSessionError(400, 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido')
    }

    const addr = input.address
    await client.query(
      `UPDATE payments.profiles
       SET document = COALESCE(document, $1),
           company_document = COALESCE(company_document, $2),
           person_type = $3,
           billing_zip = COALESCE(billing_zip, $4),
           billing_street = COALESCE(billing_street, $5),
           billing_number = COALESCE(billing_number, $6),
           billing_complement = COALESCE(billing_complement, $7),
           billing_neighborhood = COALESCE(billing_neighborhood, $8),
           billing_city = COALESCE(billing_city, $9),
           billing_state = COALESCE(billing_state, $10),
           updated_at = now()
       WHERE id = $11`,
      [
        parsedDoc.personType === 'individual' ? parsedDoc.digits : null,
        parsedDoc.personType === 'company' ? parsedDoc.digits : null,
        parsedDoc.personType,
        addr?.cep ?? null,
        addr?.street ?? null,
        addr?.number ?? null,
        addr?.complement ?? null,
        addr?.neighborhood ?? null,
        addr?.city ?? null,
        addr?.state ?? null,
        existing.id,
      ]
    )

    return {
      profileId: existing.id,
      customerName: fallbackName || existing.name || 'Cliente',
      customerDocument: parsedDoc.digits,
      personType: parsedDoc.personType,
    }
  }

  if (!parsedDoc) {
    throw new CheckoutSessionError(400, 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido')
  }

  const addr = input.address
  const inserted = await client.query<{ id: string }>(
    `INSERT INTO payments.profiles (
       email, name, document, company_document, person_type,
       billing_zip, billing_street, billing_number, billing_complement,
       billing_neighborhood, billing_city, billing_state
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING id`,
    [
      normalizedEmail,
      fallbackName,
      parsedDoc.personType === 'individual' ? parsedDoc.digits : null,
      parsedDoc.personType === 'company' ? parsedDoc.digits : null,
      parsedDoc.personType,
      addr?.cep ?? null,
      addr?.street ?? null,
      addr?.number ?? null,
      addr?.complement ?? null,
      addr?.neighborhood ?? null,
      addr?.city ?? null,
      addr?.state ?? null,
    ]
  )

  return {
    profileId: inserted.rows[0]!.id,
    customerName: fallbackName,
    customerDocument: parsedDoc.digits,
    personType: parsedDoc.personType,
  }
}
