# Parte 1: Estrutura e Layout (Premium Fintech)

## 🎯 Visão Geral

A estrutura do Quitou deve refletir solidez e fluidez. Nossos layouts são **Mobile-First**, mas escalam para experiências desktop ricas e imersivas. O uso inteligente de **espaço negativo (whitespace)** é crucial para a sensação premium.

---

## 📐 Estrutura de Páginas

### Template Base - Página Pública (Marketing/Checkout)

Foco total na conversão e clareza. Sem distrações.

```tsx
'use client'

// ============================================================================
// CONTEÚDO
// ============================================================================
const CONTENT = {
  // ... conteúdo centralizado
} as const

// ============================================================================
// COMPONENTE
// ============================================================================
export default function PublicPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header Minimalista */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center">{/* Logo e Nav */}</div>
      </header>

      {/* Conteúdo principal com foco */}
      <main className="flex-1">
        <div className="container relative max-w-screen-xl px-4 md:px-8 py-12 md:py-24">
          {/* Seções com respiro */}
        </div>
      </main>

      {/* Footer Limpo */}
      <footer className="border-t border-border/40 py-6 md:py-0">{/* Footer content */}</footer>
    </div>
  )
}
```

### Template Base - Aplicação (Dashboard)

Foco na eficiência e densidade de informação controlada.

```tsx
'use client'

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      {/* Sidebar (Desktop) / Drawer (Mobile) */}
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
        {/* Nav Icons */}
      </aside>

      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
        {/* Header da Aplicação */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          {/* Breadcrumbs, Search, User Nav */}
        </header>

        {/* Área de Trabalho */}
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
          {/* Cards, Charts, Tables */}
        </main>
      </div>
    </div>
  )
}
```

---

## 🏗️ Componentes de Layout Premium

### Container Fluido

Nossos containers respiram. Evite colar conteúdo nas bordas.

```tsx
// Padrão para conteúdo
<div className="container mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">{/* Conteúdo */}</div>
```

### Seções com Profundidade

Use cores de fundo sutis para separar seções sem linhas duras.

```tsx
// Seção Hero
<section className="relative overflow-hidden pt-16 md:pt-24 lg:pt-32 pb-16">
  {/* Gradientes de fundo sutis */}
  <div className="absolute inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>

  <div className="container">{/* Conteúdo Hero */}</div>
</section>
```

---

## 📦 Cards e Superfícies

Cards no Quitou não são apenas caixas com borda. Eles têm elevação sutil e interatividade.

### Card Interativo (Glassmorphism Touch)

```tsx
<Card className="group relative overflow-hidden border-border/50 bg-background/50 transition-all hover:border-primary/20 hover:shadow-md hover:shadow-primary/5">
  <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

  <CardHeader>
    <CardTitle className="text-xl font-medium tracking-tight">Título</CardTitle>
  </CardHeader>
  <CardContent>{/* Conteúdo */}</CardContent>
</Card>
```

---

## 📊 Grids e Listas Modernas

### Grid Responsivo Inteligente

```tsx
<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  {/* Cards auto-ajustáveis */}
</div>
```

### Lista "Clean"

Para listas de dados, menos é mais. Remova bordas verticais desnecessárias.

```tsx
<div className="rounded-xl border bg-card text-card-foreground shadow-sm">
  <Table>
    <TableHeader>
      <TableRow className="hover:bg-transparent border-b border-border/50">
        <TableHead className="w-[100px]">ID</TableHead>
        <TableHead>Status</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {/* Rows com hover sutil */}
      <TableRow className="hover:bg-muted/50 border-b border-border/40 last:border-0">
        {/* Cells */}
      </TableRow>
    </TableBody>
  </Table>
</div>
```

---

## ✅ Regras de Ouro

1.  **Respiro é Luxo**: Não tenha medo de espaços em branco (whitespace). Eles aumentam a percepção de valor.
2.  **Bordas Sutis**: Use `border-border/40` ou `border-border/50` para linhas mais suaves, não `border-border` sólido sempre.
3.  **Backdrop Blur**: Use `backdrop-blur` em elementos flutuantes (headers, modais) para contexto visual.
4.  **Mobile First Real**: Projete a experiência de toque (touch targets) primeiro. Botões e inputs devem ter altura adequada (min 44px).
