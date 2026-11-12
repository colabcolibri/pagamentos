import type { GeneratedProduct } from '@/lib/ai/product-generation-prompt'

/**
 * Extrai o primeiro objeto JSON balanceado (respeitando strings e escapes).
 * Útil quando o modelo prefixa texto ou fecha com comentário fora do JSON.
 */
export function extractBalancedJsonObject(text: string): string | null {
  const start = text.indexOf('{')
  if (start === -1) return null
  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (escape) {
      escape = false
      continue
    }
    if (inString) {
      if (c === '\\') {
        escape = true
        continue
      }
      if (c === '"') {
        inString = false
      }
      continue
    }
    if (c === '"') {
      inString = true
      continue
    }
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) {
        return text.slice(start, i + 1)
      }
    }
  }
  return null
}

function stripJsonFence(s: string): string {
  return s
    .replace(/^\uFEFF/, '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/g, '')
    .trim()
}

function stripTrailingCommas(s: string): string {
  return s.replace(/,(\s*[}\]])/g, '$1')
}

function collectParseCandidates(raw: string): string[] {
  const trimmed = raw.trim().replace(/^\uFEFF/, '')
  const seen = new Set<string>()
  const add = (s: string) => {
    const t = s.trim()
    if (t.length > 0) seen.add(t)
  }

  add(trimmed)
  add(stripJsonFence(trimmed))

  const balanced = extractBalancedJsonObject(trimmed)
  if (balanced) {
    add(balanced)
    add(stripJsonFence(balanced))
  }

  const fenced = stripJsonFence(trimmed)
  if (fenced !== trimmed) {
    const b2 = extractBalancedJsonObject(fenced)
    if (b2) {
      add(b2)
    }
  }

  const out: string[] = []
  for (const base of seen) {
    out.push(base, stripTrailingCommas(base))
  }
  return [...new Set(out)]
}

/**
 * Tenta obter um {@link GeneratedProduct} a partir do texto bruto da IA.
 */
export function tryParseGeneratedProduct(raw: string): GeneratedProduct | null {
  for (const candidate of collectParseCandidates(raw)) {
    try {
      const result = JSON.parse(candidate) as GeneratedProduct
      if (result?.product && Array.isArray(result?.prices)) {
        return result
      }
    } catch {
      /* tenta próximo candidato */
    }
  }
  return null
}
