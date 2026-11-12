import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()

// Hashes SHA-256 (lowercase) de domínios, CNPJ, e-mails e marcas internas de operador
// que nunca devem aparecer em arquivos públicos do repositório open-source.
const FORBIDDEN_TOKEN_HASHES = new Set([
  '85a3aaaa6c23aef5a8127bed7a256417b90ac0302401a98ce98885322c501305',
  '34abca85012215c53c65f0fe88dc4b78607fb710dc99428907f3beb6b7e2e82a',
  '2521856cdafbb1fa618f1b04c4934d9bde19ab61985f5d122804ad45b32bf715',
  '74ea55f49d329606cb28bc9d4af11caddf444ea22187743e71be652727db889d',
  '84196a89aa2d26aabf2ef991d055ce175453711328e7dde28330437393bac784',
  '42ec6450b3cb4bc3dc66db4b39a58d17038d8b1266f9c350b914b3d5fcd96376',
  'cece3bbffe9d73b7ed9da967be8ec2fef2e4a50abda7fdfd5dbd393e8eead41b',
])

const TOKEN_REGEX = /[a-z0-9._@/-]{4,}/gi

const skipDirs = new Set(['node_modules', '.git', '.next', 'dist', 'coverage'])
const starts = [
  'front-pagamento',
  'deploy',
  'packages/core',
  'scripts',
  'README.md',
  'COMO-PUBLICAR.md',
  'docs/08_environments.md',
  'docs/RELATORIO-SEGURANCA.md',
]

function sha256(value) {
  return createHash('sha256').update(value.toLowerCase()).digest('hex')
}

function walk(target, hits) {
  const stat = statSync(target)
  if (stat.isDirectory()) {
    if (skipDirs.has(path.basename(target))) return
    for (const name of readdirSync(target)) {
      if (name === '.env' || name === '.env.local') continue
      walk(path.join(target, name), hits)
    }
    return
  }
  if (!stat.isFile() || stat.size > 1_000_000) return
  const text = readFileSync(target, 'utf8')
  const rel = path.relative(root, target)

  const matches = text.match(TOKEN_REGEX) || []
  for (const raw of matches) {
    const cleaned = raw.replace(/^[./@-]+|[./@-]+$/g, '')
    if (cleaned && FORBIDDEN_TOKEN_HASHES.has(sha256(cleaned))) {
      hits.push(`${rel}: forbidden operator token (${cleaned.slice(0, 3)}***)`)
    }
  }

  const localPathPrefix = ['file://', '/Users/'].join('')
  if (text.includes(localPathPrefix)) {
    hits.push(`${rel}: contains local machine path`)
  }
}

const hits = []
for (const start of starts) {
  walk(path.join(root, start), hits)
}

if (hits.length) {
  console.error(hits.join('\n'))
  process.exit(1)
}

console.log('ok')
