# Auditoria de dependências (pnpm audit)

> Atualizar este documento após rodar `pnpm audit` e aplicar correções.  
> Para produção, tratar vulnerabilidades **críticas** e **altas** como bloqueantes.

## Como rodar

```bash
pnpm audit
```

## Resumo (última execução)

- **Crítico:** fast-xml-parser (via @aws-sdk em devDependencies do core) — versões >=5.0.0 <5.3.5; corrigir com >=5.3.5.
- **Alto:** Next.js no front-pagamento (16.0.7) e no core (15.5.7) — DoS com Server Components; atualizar front para >=16.0.11 e core para >=15.5.10 (ou versão patched indicada no advisory).
- **Alto:** fast-xml-parser DoS (RangeError) — patched em >=5.3.4.

## Ações recomendadas

1. **Next.js:** Aplicado: front em ^16.1.0 (16.1.6), core devDep em ^16.1.0. Build com Turbopack funciona após: (a) remoção do reexport de email do barrel do core (importar de `@quitou/core/email` onde necessário); (b) `serverExternalPackages: ['nodemailer', '@quitou/core']` e `turbopack.root` no next.config; (c) cast do client Supabase no proxy para `SupabaseClient<Database>`.
2. **fast-xml-parser:** Aplicado `pnpm.overrides` na raiz: `"fast-xml-parser": ">=5.3.5"`. Resolve o aviso do audit para essa dependência transitiva.
3. **Core (devDep):** Next em `packages/core` atualizado para ^15.5.10.
4. Rodar `pnpm audit` novamente após correções; documentar exceções aceitas (com justificativa) se alguma vulnerabilidade for mantida temporariamente.

## Referências

- [Next.js security advisory (DoS)](https://github.com/advisories/GHSA-mwv6-3258-q52c)
- [Next.js RSC deserialization](https://github.com/advisories/GHSA-h25m-26qc-wcjf)
- [fast-xml-parser GHSA](https://github.com/advisories/GHSA-m7jm-9gc2-mpf2)
