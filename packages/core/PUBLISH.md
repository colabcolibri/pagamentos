# 📦 Guia de Publicação - @quitou/core

## 🚀 Como Publicar no NPM

### Pré-requisitos

1. **Conta NPM**
   ```bash
   pnpm login
   ```

2. **Organização @quitou** criada no NPM
   - Acesse: https://www.npmjs.com/settings/quitou/packages
   - Ou crie com: `npm org create quitou`

### Passos para Publicar

#### 1. Build do projeto
```bash
pnpm build
```

Isso irá:
- Limpar pasta `dist/`
- Compilar TypeScript
- Gerar arquivos `.js` e `.d.ts`

#### 2. Testar localmente (opcional)
```bash
# Em outro projeto, instale localmente
pnpm install /path/to/pagamento-core
```

#### 3. Publicar
```bash
pnpm publish --access public
```

> **Nota:** `--access public` é necessário para pacotes scoped (@quitou/...)

### Versioning (Semver)

Seguimos [Semantic Versioning](https://semver.org/):

```bash
# Patch (bug fixes)
pnpm version patch   # 1.0.0 → 1.0.1

# Minor (new features, backward compatible)
pnpm version minor   # 1.0.0 → 1.1.0

# Major (breaking changes)
pnpm version major   # 1.0.0 → 2.0.0
```

Após atualizar versão:
```bash
git push --tags
pnpm publish --access public
```

## 📝 Checklist Pré-Publicação

### Código
- [ ] Build funciona (`pnpm build`)
- [ ] Sem erros de TypeScript
- [ ] Exports corretos em `src/index.ts`
- [ ] Types gerados em `dist/`

### Arquivos
- [ ] README.md atualizado
- [ ] package.json com versão correta
- [ ] .npmignore configurado
- [ ] LICENSE presente

### Testes
- [ ] Testar import em projeto externo
- [ ] Verificar tipos TypeScript
- [ ] Validar que funciona sem Next.js/React

### Documentação
- [ ] README com exemplos claros
- [ ] CHANGELOG.md atualizado (se houver)
- [ ] Breaking changes documentados

## 📦 O que será publicado?

Conforme `.npmignore`:

✅ **Incluído:**
- `dist/` - Código compilado
- `templates/` - Templates opcionais
- `README.md`
- `ARCHITECTURE.md`
- `DESIGN_DECISIONS.md`
- `STATUS.md`
- `VALIDACAO.md`
- `SUMMARY.md`
- `INSTALLATION.md`
- `LICENSE`

❌ **Excluído:**
- `src/` - Código fonte (já compilado)
- `node_modules/`
- `.git/`
- `tsconfig.json`
- Arquivos de desenvolvimento

## 🔍 Verificar antes de publicar

```bash
# Ver o que será publicado
pnpm pack --dry-run

# Gerar tarball local
pnpm pack
# Isso cria: quitou-core-1.0.0.tgz

# Testar instalação do tarball
cd /tmp/test-project
npm init -y
pnpm install /path/to/quitou-core-1.0.0.tgz
```

## 🌐 Após Publicar

### 1. Verificar no NPM
- https://www.npmjs.com/package/@quitou/core
- Confira README, versão, files

### 2. Testar instalação
```bash
pnpm install @quitou/core
```

### 3. Atualizar documentação
- Adicionar badge no README
- Atualizar CHANGELOG.md

### 4. Git tag
```bash
git tag v1.0.0
git push origin v1.0.0
```

## 🔄 Atualizações Futuras

### Publicando uma atualização

```bash
# 1. Fazer mudanças
# 2. Commit
git add .
git commit -m "feat: nova funcionalidade"

# 3. Atualizar versão
pnpm version minor  # ou patch/major

# 4. Build
pnpm build

# 5. Publicar
pnpm publish --access public

# 6. Push com tags
git push --follow-tags
```

## 🚨 Unpublish (Emergência)

**Cuidado!** Só use em casos extremos (ex: publicou credenciais por engano)

```bash
# Unpublish versão específica (primeiras 72h)
pnpm unpublish @quitou/core@1.0.0

# Deprecate (melhor opção)
pnpm deprecate @quitou/core@1.0.0 "Use versão 1.0.1"
```

## 📊 Estatísticas

Após publicar, você pode ver:
- Downloads: https://npm-stat.com/charts.html?package=@quitou/core
- Dependents: https://www.npmjs.com/package/@quitou/core?activeTab=dependents

## 🔐 Segurança

### .npmrc (local)
```
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
```

### GitHub Actions (CI/CD futuro)
```yaml
- name: Publish to NPM
  run: pnpm publish --access public
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## 🎯 Comandos Rápidos

```bash
# Build e publicar
pnpm build && pnpm publish --access public

# Atualizar patch e publicar
pnpm version patch && pnpm build && pnpm publish --access public

# Ver info do pacote publicado
pnpm view @quitou/core

# Ver versões publicadas
pnpm view @quitou/core versions
```

---

## 📋 Template de CHANGELOG.md

```markdown
# Changelog

## [1.0.0] - 2025-10-10

### Added
- Serviço Pagar.me
- Serviço Asaas
- Utilitários de formatação
- Schema Supabase genérico
- Templates Next.js

### Changed
- Schema `public` → `payments`
- Campos específicos → `metadata` JSONB

### Removed
- Email service do core (movido para templates)
```

---

**Status:** 📦 Pronto para publicação  
**Comando:** `pnpm build && pnpm publish --access public`

