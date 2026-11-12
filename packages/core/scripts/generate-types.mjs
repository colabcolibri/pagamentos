import { execSync } from 'child_process'
import { writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const coreDir = resolve(__dirname, '..')
const workspaceRoot = resolve(coreDir, '../..')
const frontendDir = resolve(workspaceRoot, 'front-pagamento')
const outputFile = resolve(coreDir, 'src/types/supabase-types.ts')

// Gerar tipos do Supabase local do front-pagamento
// O core usa os mesmos types do front-pagamento
const command = `pnpm supabase gen types typescript --local --schema payments`

try {
  console.log('🔄 Gerando tipos do Supabase...')
  console.log(`   Frontend: ${frontendDir}`)
  console.log(`   Output: ${outputFile}`)
  
  // Gerar types e salvar no arquivo
  const types = execSync(command, { 
    encoding: 'utf-8',
    cwd: frontendDir,
    stdio: 'pipe'
  })
  
  // Escrever no arquivo do core
  writeFileSync(outputFile, types, 'utf-8')
  
  console.log('✅ Tipos gerados e salvos em src/types/supabase-types.ts!')
} catch (error) {
  console.error('❌ Erro ao gerar tipos:', error.message)
  console.error('\n💡 Certifique-se de que:')
  console.error('   1. O Supabase local está rodando (cd front-pagamento && pnpm supabase start)')
  console.error('   2. O front-pagamento está na raiz do workspace')
  console.error('   3. Você executou o comando da raiz do workspace')
  process.exit(1)
}

