import { createHash, timingSafeEqual } from 'node:crypto'

/**
 * Compara duas strings em tempo aproximadamente constante (via hash SHA-256),
 * evitando vazamento de comprimento e comparação byte-a-byte direta de segredos.
 */
export function timingSafeStringEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a, 'utf8').digest()
  const hb = createHash('sha256').update(b, 'utf8').digest()
  return timingSafeEqual(ha, hb)
}
