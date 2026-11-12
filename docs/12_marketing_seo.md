---
title: Marketing SEO
status: draft
version: 1.0
updated: 2026-11-09
depends_on: [00_scope.md, 01_tech_stack.md, 05_architecture.md]
blocks: []
---

# 12 — Marketing SEO

> Superfície pública existe (página inicial e checkout). Este arquivo é rascunho. Aprofundar com `/seo-pass` só se o manager quiser indexação. Checkout e admin não devem virar landing.

## Indexable surfaces

| Route / path | Page type | Index? | Canonical URL pattern |
| ------------ | --------- | ------ | --------------------- |
| `/` | página inicial | desconhecido | `NEXT_PUBLIC_APP_URL` |
| `/checkout/[priceId]` | compra | não, até decisão | — |
| `/login`, `/profile`, `/admin` | conta e operação | não | — |

Não li `robots.ts` nem metadata de `layout.tsx` nesta init. A coluna Index da home está desconhecida de propósito.

## Metadata policy

| Page type | Title pattern | Description pattern | OG image |
| --------- | ------------- | ------------------- | -------- |
| home | não lido | não lido | não lido |
| checkout | não indexar por padrão | — | — |

## Technical SEO

| Concern | Approach |
| ------- | -------- |
| Sitemap | não encontrado nesta passagem |
| robots.txt | não confirmado |
| SSR/SSG/CSR | App Router. Checkout é página com dados. Não classifiquei cada rota |
| Canonical tags | não confirmado |
| hreflang | N/A. UI em português do Brasil |

## Core Web Vitals targets

| Metric | Target | Measurement |
| ------ | ------ | ----------- |
| LCP | não definido | — |
| INP | não definido | — |
| CLS | não definido | — |

## Structured data

| Page type | Schema.org type | Notes |
| --------- | --------------- | ----- |
| home | não aplicado no que foi lido | não inventar JSON-LD |

## Gaps / open questions

| # | Gap | Owner |
| - | --- | ----- |
| 1 | A home deve ser indexada? | manager |
| 2 | Há `metadata` export nas páginas? | `/seo-pass` se a resposta for sim |

## Gate

Humano aprova antes de go-live de marketing, e só se SEO entrar no escopo. O produto de pagamento não depende deste arquivo para o corte de banco.
