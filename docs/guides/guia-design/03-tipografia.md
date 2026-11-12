# Parte 3: Tipografia (Premium Fintech)

## 🎯 Visão Geral

A tipografia é a voz do Quitou. Usamos a família **Geist** (Sans e Mono) para comunicar precisão técnica e clareza humana. Nossa tipografia é **contrastante**: títulos fortes e confiantes, corpo de texto limpo e legível.

---

## 📝 Hierarquia & Escala

### Display & Títulos

Títulos não devem apenas ser grandes, devem ter **tracking** (espaçamento entre letras) ajustado para parecerem "firmes".

#### H1 - Display (Hero)

Para momentos de impacto máximo.

```tsx
<h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
  {CONTENT.heroTitle}
</h1>
```

#### H2 - Título de Seção

Para dividir grandes blocos de conteúdo.

```tsx
<h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
  {CONTENT.sectionTitle}
</h2>
```

#### H3 - Título de Card/Feature

Para identificar componentes.

```tsx
<h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">{CONTENT.featureTitle}</h3>
```

---

### Corpo de Texto

#### Lead (Introdução)

Para o primeiro parágrafo de uma página ou seção, dando contexto.

```tsx
<p className="text-xl text-muted-foreground">{CONTENT.leadText}</p>
```

#### P (Padrão)

Para a maior parte do texto. Foco em legibilidade (leitura confortável).

```tsx
<p className="leading-7 [&:not(:first-child)]:mt-6">{CONTENT.paragraph}</p>
```

#### Small (Detalhes)

Para legendas, metadados e notas de rodapé.

```tsx
<small className="text-sm font-medium leading-none text-muted-foreground">{CONTENT.metadata}</small>
```

---

### Texto Técnico (Dados)

Para números, códigos, chaves de API e dados financeiros, usamos a fonte monoespaçada para garantir alinhamento e precisão.

```tsx
<code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold text-foreground">
  {transaction.id}
</code>
```

---

## 🎨 Refinamentos Premium

### Tracking (Letter Spacing)

O segredo de títulos elegantes é o tracking negativo ("apertado").

- **Títulos Grandes**: `tracking-tight` (-0.025em) ou `tracking-tighter` (-0.05em).
- **Texto Pequeno/Caps**: `tracking-wide` (0.025em) ou `tracking-widest` (0.1em) para uppercase.

### Leading (Line Height)

- **Títulos**: `leading-tight` (1.25) - Títulos não devem ter entrelinha muito aberta.
- **Corpo**: `leading-relaxed` (1.625) - Para leitura longa e confortável.

### Cores de Texto

Evite preto puro. Use a hierarquia de cores para guiar o olho.

1.  **Primário**: `text-foreground` (Slate 900/50) - Títulos e dados cruciais.
2.  **Secundário**: `text-muted-foreground` (Slate 500/400) - Descrições e metadados.
3.  **Terciário**: `text-muted-foreground/60` - Placeholders e ícones inativos.

---

## 📱 Responsividade Tipográfica

Não use um tamanho único. A tipografia deve fluir com a tela.

```tsx
// Exemplo de título responsivo fluido
<h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
  Pagamentos Simplificados
</h1>
```

---

## ✅ Checklist de Tipografia

1.  [ ] Títulos têm `tracking-tight`?
2.  [ ] Texto secundário usa `text-muted-foreground`?
3.  [ ] Números e IDs usam `font-mono`?
4.  [ ] O contraste está acessível?
5.  [ ] A hierarquia está clara (H1 > H2 > P)?
