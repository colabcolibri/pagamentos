# Parte 4: Espaçamento e Composição (Airy & Organizado)

## 🎯 Visão Geral

O sistema de espaçamento do Quitou segue a filosofia **"Airy"**: espaço é um elemento de design ativo, não apenas vazio. Espaçamento generoso transmite profissionalismo e permite que o usuário foque no que importa.

> **Conceito**: Mais espaço = mais confiança. Elementos respiram, conteúdo destaca.

---

## 📐 Sistema de Espaçamento

### Escala de Espaçamento (Tailwind)

```tsx
// Pequeno
className = 'p-1' // 0.25rem (4px)
className = 'p-2' // 0.5rem (8px)
className = 'p-3' // 0.75rem (12px)

// Médio
className = 'p-4' // 1rem (16px) - PADRÃO
className = 'p-6' // 1.5rem (24px)
className = 'p-8' // 2rem (32px)

// Grande
className = 'p-12' // 3rem (48px)
className = 'p-16' // 4rem (64px)
```

### Padding e Margin

```tsx
// Padding interno
className = 'p-4' // Todos os lados
className = 'px-4' // Horizontal
className = 'py-4' // Vertical
className = 'pt-4' // Top
className = 'pb-4' // Bottom
className = 'pl-4' // Left
className = 'pr-4' // Right

// Margin externo
className = 'm-4' // Todos os lados
className = 'mx-4' // Horizontal
className = 'my-4' // Vertical
className = 'mt-4' // Top
className = 'mb-4' // Bottom
```

---

## 🎨 Composição de Componentes

### Espaçamento entre Elementos

#### Stack Vertical

```tsx
<div className="space-y-4">
  <Card>Item 1</Card>
  <Card>Item 2</Card>
  <Card>Item 3</Card>
</div>
```

**Variações:**

```tsx
// Pequeno
className = 'space-y-2' // 0.5rem

// Médio (padrão)
className = 'space-y-4' // 1rem

// Grande
className = 'space-y-6' // 1.5rem
className = 'space-y-8' // 2rem
```

#### Stack Horizontal

```tsx
<div className="flex gap-4">
  <Button>Botão 1</Button>
  <Button>Botão 2</Button>
</div>
```

**Variações:**

```tsx
// Pequeno
className = 'gap-2' // 0.5rem

// Médio (padrão)
className = 'gap-4' // 1rem

// Grande
className = 'gap-6' // 1.5rem
```

---

## 📦 Padding de Containers

### Container Principal

```tsx
<div className="container mx-auto px-4 md:px-6 lg:px-8">{/* Conteúdo */}</div>
```

**Breakpoints:**

- Mobile: `px-4` (1rem)
- Tablet: `md:px-6` (1.5rem)
- Desktop: `lg:px-8` (2rem)

### Cards

```tsx
<Card>
  <CardHeader className="pb-4">{/* Header */}</CardHeader>
  <CardContent className="pt-6">{/* Conteúdo */}</CardContent>
</Card>
```

### Seções

```tsx
<section className="py-8 md:py-12 lg:py-16">{/* Conteúdo */}</section>
```

**Variações:**

```tsx
// Compacta
className = 'py-4 md:py-6'

// Padrão
className = 'py-8 md:py-12'

// Espaçosa
className = 'py-12 md:py-16 lg:py-20'
```

---

## 🎯 Espaçamento de Formulários

### Campos de Formulário

```tsx
<div className="space-y-4">
  <div>
    <Label>Campo 1</Label>
    <Input />
  </div>
  <div>
    <Label>Campo 2</Label>
    <Input />
  </div>
</div>
```

### Botões

```tsx
<div className="flex gap-2 justify-end">
  <Button variant="outline">Cancelar</Button>
  <Button>Salvar</Button>
</div>
```

---

## 📊 Grid e Layout

### Grid Responsivo

```tsx
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">{/* Items */}</div>
```

**Gap:**

- `gap-4`: Padrão (1rem)
- `gap-6`: Maior (1.5rem)
- `gap-8`: Muito maior (2rem)

### Flexbox

```tsx
// Horizontal
<div className="flex items-center gap-4">
  {/* Items */}
</div>

// Vertical
<div className="flex flex-col gap-4">
  {/* Items */}
</div>

// Espaçamento entre
<div className="flex justify-between items-center">
  <div>Item 1</div>
  <div>Item 2</div>
</div>
```

---

## ✅ Regras Obrigatórias

1. **Prefira `gap-*` sobre `space-*`**: Mais flexível com Flexbox/Grid
2. **Seja generoso**: Na dúvida, use mais espaço (ex: `py-6` > `py-4`)
3. **Consistência contextual**: Mesmos valores para contextos similares
4. **Mobile-first**: Comece menor (`gap-4`), expanda (`md:gap-6`)
5. **Padding em containers**: `px-4 md:px-6 lg:px-8` para progressão suave
6. **Hierarquia espacial**: Mais espaço entre seções do que entre itens

---

## 📚 Próximos passos

- [Parte 1: Estrutura e Layout](01-estrutura-layout.md)
- [Parte 3: Tipografia](03-tipografia.md)
- [Parte 2: Sistema de cores](02-sistema-cores.md)

---

**Versão**: 1.0  
**Última atualização**: Janeiro 2025  
**Projeto**: Quitou
