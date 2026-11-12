# Parte 2: Sistema de Cores (Premium Fintech)

## 🎯 Visão Geral

O Quitou adota uma paleta **Premium Fintech**, fugindo do cinza neutro padrão para tons com mais personalidade e profundidade. Utilizamos o sistema **OKLCH** para garantir vibração e acessibilidade consistentes.

> **Conceito**: "Confiança Fluida" - Bases sólidas (Slate) com ações vibrantes (Indigo).

---

## 🎨 Paleta Semântica

### 1. Cores de Marca (Brand)

#### Primary (Ação & Identidade)

A cor principal da marca. Usada em botões de CTA, links ativos e elementos de destaque.

- **Tom**: Indigo Vibrante
- **Light**: `oklch(0.5 0.25 265)` (Vibrante e legível)
- **Dark**: `oklch(0.65 0.25 265)` (Luminoso para fundo escuro)

#### Secondary (Suporte)

Usada para elementos de apoio, fundos secundários e ações de menor peso.

- **Tom**: Slate Azulado
- **Light**: `oklch(0.96 0.01 260)` (Quase branco, leve toque frio)
- **Dark**: `oklch(0.25 0.02 260)` (Cinza escuro profundo)

#### Accent (Interação)

Usada para hover states, seleções e destaques sutis.

- **Tom**: Slate Claro
- **Light**: `oklch(0.94 0.02 260)`
- **Dark**: `oklch(0.30 0.03 260)`

---

### 2. Cores de Feedback (Status)

#### Destructive (Erro/Perigo)

- **Tom**: Rose (Mais elegante que o vermelho puro)
- **Valor**: `oklch(0.6 0.2 15)`

#### Success (Sucesso/Confirmação)

- **Tom**: Emerald (Mais sofisticado que o verde puro)
- **Valor**: `oklch(0.6 0.18 145)`

#### Warning (Atenção)

- **Tom**: Amber
- **Valor**: `oklch(0.75 0.15 85)`

---

### 3. Cores Neutras (Base)

A base da interface não é cinza puro, mas sim **Slate** (cinza com toque de azul), conferindo um ar mais tecnológico e moderno.

#### Background

- **Light**: `oklch(0.99 0.005 260)` (Branco frio)
- **Dark**: `oklch(0.12 0.02 260)` (Deep Navy/Slate quase preto)

#### Foreground (Texto)

- **Light**: `oklch(0.15 0.04 260)` (Slate muito escuro, não preto puro)
- **Dark**: `oklch(0.98 0.01 260)` (Branco off-white)

#### Muted (Texto Secundário)

- **Light**: `oklch(0.55 0.03 260)`
- **Dark**: `oklch(0.65 0.03 260)`

#### Border & Input

- **Light**: `oklch(0.90 0.02 260)`
- **Dark**: `oklch(0.25 0.02 260)`

---

## 🌓 Mapeamento de Variáveis (Shadcn/UI)

| Variável        | Função                  | Referência Visual               |
| :-------------- | :---------------------- | :------------------------------ |
| `--background`  | Fundo da página         | White / Deep Slate              |
| `--foreground`  | Texto principal         | Slate 900 / Slate 50            |
| `--card`        | Fundo de cards          | White / Slate 900               |
| `--popover`     | Fundo de dropdowns      | White / Slate 900               |
| `--primary`     | Ações principais        | **Indigo 600** / **Indigo 500** |
| `--secondary`   | Ações secundárias       | Slate 100 / Slate 800           |
| `--muted`       | Elementos desabilitados | Slate 100 / Slate 800           |
| `--accent`      | Hover e seleção         | Slate 100 / Slate 800           |
| `--destructive` | Erros                   | Rose 600 / Rose 500             |
| `--border`      | Bordas sutis            | Slate 200 / Slate 800           |
| `--input`       | Bordas de input         | Slate 200 / Slate 800           |
| `--ring`        | Focus ring              | Indigo 600 (com opacidade)      |

---

## ✅ Regras de Uso

1.  **Evite Preto Puro (`#000`)**: Use o `--foreground` (Slate escuro) para textos. É mais agradável aos olhos.
2.  **Evite Cinza Puro**: Nossos neutros têm um leve toque de azul (Slate). Isso unifica a identidade visual.
3.  **Contraste**: O `--primary` deve sempre ter contraste suficiente com o `--primary-foreground` (geralmente branco no light mode).
4.  **Dark Mode**: No modo escuro, as cores saturadas (como Primary) devem ser levemente mais claras/luminosas para brilhar contra o fundo escuro.
