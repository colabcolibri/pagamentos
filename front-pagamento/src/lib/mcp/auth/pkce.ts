import { createHash, timingSafeEqual } from 'node:crypto'

export function pkceChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url')
}

export function verifyPkce(verifier: string, challenge: string): boolean {
  const actual = pkceChallenge(verifier)
  const left = Buffer.from(actual)
  const right = Buffer.from(challenge)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}
