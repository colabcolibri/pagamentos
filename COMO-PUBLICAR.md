# 🚀 Como Publicar no GitHub e GitHub Packages

## 1. Publicar o Repositório Open-Source no GitHub

1. Crie um repositório público no GitHub (ex.: `https://github.com/SEU_USUARIO/quitou`).
2. Atualize o campo `repository.url` em `packages/core/package.json` e `front-pagamento/package.json` caso queira vincular ao seu usuário/organização.
3. Antes de enviar, rode a verificação de higiene para garantir que não há dados de operador ou segredos:

```bash
node scripts/check-no-operator-brand.mjs
pnpm test
pnpm --filter @quitou/admin lint
```

> **Dica de privacidade para abertura de código:** Caso o repositório local possua commits históricos antigos da sua operação privada, crie um branch órfão limpo para a publicação pública:
>
> ```bash
> git checkout --orphan open-source-main
> git add -A
> git commit -m "feat: initial open-source release of Quitou"
> git remote add public https://github.com/SEU_USUARIO/quitou.git
> git push -u public open-source-main:main
> ```

---

## 2. Publicar `@quitou/core` no GitHub Packages (Opcional)

Dentro deste monorepo, `front-pagamento` já consome `@quitou/core` automaticamente via `workspace:*` (sem precisar publicar pacote externo). Caso queira publicar `@quitou/core` no GitHub Packages para consumo em outros repositórios:

### Passo 1 — Criar Personal Access Token (PAT)
1. Acesse `https://github.com/settings/tokens` → **Generate new token (classic)**.
2. Marque as permissões `write:packages` e `read:packages`.
3. Exporte o token na sua sessão:

```bash
export GITHUB_TOKEN=seu_token_aqui
```

### Passo 2 — Habilitar o registry no `.npmrc` e publicar
1. Descomente as linhas de `@quitou:registry` no arquivo `.npmrc` da raiz.
2. Execute:

```bash
pnpm --filter @quitou/core build
pnpm publish:core
```
