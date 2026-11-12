import { execSync } from 'child_process'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')
const workspaceRoot = resolve(__dirname, '../..')
const frontendDir = resolve(workspaceRoot, 'front-pagamento')

// Gerar tipos do front-pagamento e copiar para o core
const command = `cd ${frontendDir} && pnpm supabase gen types typescript --local --schema payments > ${rootDir}/src/types/supabase-types.ts`

try {
  console.log('🔄 Gerando tipos do Supabase a partir do front-pagamento...')
  execSync(command, { stdio: 'inherit', shell: '/bin/bash' })
  console.log('✅ Tipos gerados e copiados para @quitou/core!')
} catch (error) {
  console.error('❌ Erro ao gerar tipos:', error.message)
  process.exit(1)
}

