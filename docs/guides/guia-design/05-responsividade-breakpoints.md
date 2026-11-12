# Parte 5: Responsividade e breakpoints

## 🎯 Visão Geral

O Quitou segue uma abordagem **mobile-first** com breakpoints bem definidos. Este guia documenta os breakpoints padrão e como usá-los.

---

## 📱 Breakpoints Tailwind

### Breakpoints Padrão

```tsx
// Mobile (padrão, sem prefixo)
// 0px - 639px

// Small (sm)
// 640px+
sm: '640px'

// Medium (md)
// 768px+
md: '768px'

// Large (lg)
// 1024px+
lg: '1024px'

// Extra Large (xl)
// 1280px+
xl: '1280px'

// 2X Extra Large (2xl)
// 1536px+
2xl: '1536px'
```

---

## 🎨 Abordagem Mobile-First

### ❌ ERRADO - Desktop-First

```tsx
// Começa no desktop e reduz
<div className="p-8 md:p-6 sm:p-4">
```

### ✅ CORRETO - Mobile-First

```tsx
// Começa no mobile e aumenta
<div className="p-4 md:p-6 lg:p-8">
```

**Regra**: Sempre defina o estilo mobile primeiro, depois adicione breakpoints maiores.

---

## 📐 Exemplos Práticos

### Padding Responsivo

```tsx
// Container
<div className="px-4 md:px-6 lg:px-8">
  {/* Conteúdo */}
</div>

// Seção
<section className="py-8 md:py-12 lg:py-16">
  {/* Conteúdo */}
</section>
```

### Tipografia Responsiva

```tsx
// Título
<h1 className="text-2xl md:text-3xl lg:text-4xl">
  {CONTENT.title}
</h1>

// Parágrafo
<p className="text-sm md:text-base lg:text-lg">
  {CONTENT.text}
</p>
```

### Grid Responsivo

```tsx
// 1 coluna mobile, 2 tablet, 3 desktop
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
  {/* Items */}
</div>

// 1 coluna mobile, 2 desktop
<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
  {/* Items */}
</div>
```

### Flexbox Responsivo

```tsx
// Coluna mobile, linha desktop
<div className="flex flex-col gap-4 md:flex-row md:items-center">
  {/* Items */}
</div>

// Centralizado mobile, esquerda desktop
<div className="text-center md:text-left">
  {CONTENT.text}
</div>
```

### Visibilidade Responsiva

```tsx
// Oculto no mobile, visível no desktop
<div className="hidden md:block">
  Conteúdo desktop
</div>

// Visível no mobile, oculto no desktop
<div className="block md:hidden">
  Conteúdo mobile
</div>
```

---

## 🎯 Padrões Comuns

### Container

```tsx
<div className="container mx-auto px-4 md:px-6 lg:px-8">{/* Conteúdo */}</div>
```

### Cards em Grid

```tsx
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  {items.map((item) => (
    <Card key={item.id}>{/* Card content */}</Card>
  ))}
</div>
```

### Sidebar + Conteúdo

```tsx
<div className="flex flex-col lg:flex-row gap-6">
  <aside className="w-full lg:w-64">{/* Sidebar */}</aside>
  <main className="flex-1">{/* Conteúdo principal */}</main>
</div>
```

### Tabela Responsiva

```tsx
// Scroll horizontal no mobile
<div className="overflow-x-auto">
  <Table>{/* Tabela */}</Table>
</div>
```

---

## ✅ Regras Obrigatórias

1. **Sempre mobile-first**: Defina mobile primeiro
2. **Use breakpoints progressivos**: `md:` depois `lg:`
3. **Teste em diferentes tamanhos**: Mobile, tablet, desktop
4. **Evite muitos breakpoints**: Use apenas os necessários
5. **Mantenha consistência**: Use os mesmos breakpoints em contextos similares

---

## 📚 Próximos passos

- [Parte 1: Estrutura e Layout](01-estrutura-layout.md)
- [Parte 4: Espaçamento e Composição](04-espacamento-composicao.md)
- [Estados e feedback](06-estados-feedback.md)

---

**Versão**: 1.0  
**Última atualização**: Janeiro 2025  
**Projeto**: Quitou
