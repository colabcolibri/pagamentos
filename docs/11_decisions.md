---
title: Decision Log
status: draft
version: 1.0
updated: 2026-11-09
depends_on: []
blocks: []
---

# 11 — Decision log

Decisões ficam no **SQLite**: `.meridian/meridian.db`, tabela `decisions`.

Este arquivo é o índice humano. A fonte canônica é o banco, não JSON em `docs/decisions/`.

## Entry shape

Cada linha guarda `decision_date`, `entry_index` (0 = a mais nova do dia) e `payload_json`:

```json
{
  "time": "HH:MM",
  "title": "Objective title",
  "affected_document": "path/to/doc.md",
  "what_changed": "factual description",
  "why_changed": "context and motivation",
  "impact": "affected docs; mark review",
  "responsible": "role or person"
}
```

- `time` é o relógio real de `date +"%H:%M"`. Não arredondar.
- Entrada nova entra no topo do dia (`entry_index` 0).
- Não editar nem apagar linha antiga.

## Write

```bash
date +"%Y-%m-%d"
date +"%H:%M"
python3 .agent/scripts/meridian_delivery.py prepend-decision \
  --date "YYYY-MM-DD" \
  --time "HH:MM" \
  --title "…" \
  --affected-document "docs/…" \
  --what-changed "…" \
  --why-changed "…" \
  --impact "…" \
  --responsible "manager"
```

Fluxo: `/update-decisions-log`.

## When to log

| Event | Log? |
| ----- | ---- |
| Projeto entrou no Meridian | sim. Primeira entrada |
| Documento `approved` volta para `review` | sim |
| Mudança material de segurança ou arquitetura | sim |
| Escopo de história muda depois do refine | sim |
| Correção de typo | não |
| Criar user story de código que já existe | não. Legado fica no inventário e, depois do gate, em épico `complete` |

## Recent decisions (index)

Índice opcional. Se divergir, vale o SQLite.

| Date | Title | Affected |
| ---- | ----- | -------- |
| 2026-11-09 | Projeto passou a usar o Meridian | `docs/` |

## Gate

`status: approved` neste arquivo significa que as regras foram entendidas. Não significa que o histórico acabou.
