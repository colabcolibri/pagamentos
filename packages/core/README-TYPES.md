# Como gerar os types do Supabase

O `@quitou/core` usa os mesmos types do banco de dados que o `front-pagamento`.

## 📋 Pré-requisitos

1. O Supabase local deve estar rodando no `front-pagamento`
2. Execute o comando de dentro do diretório `packages/core` ou da raiz do workspace

## 🚀 Como gerar

### Opção 1: Comando direto (recomendado)

```bash
# Da raiz do workspace ou de packages/core
cd packages/core
pnpm types:generate
```

### Opção 2: Passo a passo

```bash
# 1. Certifique-se que o Supabase está rodando
cd front-pagamento
pnpm supabase start

# 2. Em outro terminal, gere os types
cd packages/core
pnpm types:generate
```

## 📝 O que o script faz?

1. ✅ Acessa o Supabase local do `front-pagamento` (automaticamente encontra o caminho)
2. ✅ Gera os types TypeScript do schema `payments`
3. ✅ Salva em `packages/core/src/types/supabase-types.ts`

## ⚠️ Importante

- **Os types são gerados a partir do Supabase local** do `front-pagamento`
- Se você adicionar novas migrations no `front-pagamento`, rode `pnpm types:generate` novamente no `@core`
- O arquivo gerado é `src/types/supabase-types.ts` - **não edite manualmente!**
- O script encontra automaticamente o `front-pagamento` na estrutura do workspace

## 🔄 Quando atualizar os types?

Sempre que você:
- ✅ Adicionar uma nova migration no `front-pagamento`
- ✅ Modificar uma tabela existente
- ✅ Adicionar novas colunas ou constraints
- ✅ Criar novas views ou functions

**Rode:** `pnpm types:generate` no `@core`

