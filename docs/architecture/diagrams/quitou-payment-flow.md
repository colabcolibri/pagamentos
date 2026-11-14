---
title: Fluxo Completo de Pagamento
subtitle: Criação de catálogo, geração de checkout, confirmação por webhook/admin e pós-venda
kind: flow
source_doc: 05_architecture.md
updated: 2026-11-14
---

```mermaid
flowchart LR
  classDef actor fill:#e0f2fe,stroke:#0284c7,color:#0c4a6e
  classDef app fill:#dcfce7,stroke:#16a34a,color:#14532d
  classDef core fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef db fill:#f3e8ff,stroke:#9333ea,color:#581c87
  classDef ext fill:#ffe4e6,stroke:#e11d48,color:#881337

  Admin["Admin / MCP"]:::actor
  Cliente["Cliente (Browser)"]:::actor
  Catalogo["Catálogo & Cupons (API/Repo)"]:::app
  Auth["Sessão OTP (httpOnly)"]:::app
  Checkout["Checkout Handler (@quitou/core)"]:::core
  Gateway["Pagar.me / Asaas"]:::ext
  Webhook["Webhook Handler (timingSafe + idempotente)"]:::core
  MarkPaid["Conciliação Manual (/mark-paid)"]:::app
  DB[("Postgres 16 (payments.*)")]:::db
  PosVenda["Pós-venda (Promo + E-mail + Webhook Produto)"]:::app

  Admin -->|1. Cria produto, preço e cupom| Catalogo
  Catalogo --> DB

  Cliente -->|2. Verifica e-mail (OTP)| Auth
  Auth --> DB
  Cliente -->|3. Solicita checkout| Checkout
  Checkout -->|4. Valida preço, cupom e estoque| DB
  Checkout -->|5. Cria link de pagamento| Gateway
  Checkout -->|6. Grava subscription + order + payment (TX)| DB

  Cliente -->|7. Paga no link hospedado| Gateway
  Gateway -->|8. Envia webhook| Webhook
  Webhook -->|9. Atualiza status paid/refunded + trigger stock_sold| DB
  Webhook --> PosVenda

  Admin -->|8b. Aprova manual| MarkPaid
  MarkPaid -->|9b. Atualiza status + promo| DB
  MarkPaid --> PosVenda
```
