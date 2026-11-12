# Admin Field Components

Componentes Field customizados para a área administrativa, baseados nos componentes base do Shadcn UI.

## Por que existe?

O componente `Field` base usa `gap-3` (12px) entre elementos, o que é muito espaçado para formulários administrativos. Além disso, o `FieldDescription` base tem regras CSS complexas (`nth-last-2:-mt-1`) que dificultam customização.

## Diferenças do base

### FieldDescription

**Base (`@/components/ui/field`):**

- Espaçamento padrão de 12px (gap-3)
- Texto normal
- nth-last-2:-mt-1 automático

**Admin (`@/components/ui/admin-field`):**

- Espaçamento reduzido: `!-mt-2` (4px ao invés de 12px)
- Texto em **itálico** para melhor distinção visual
- Usa `!important` para sobrescrever regras do base

### Field, FieldLabel, FieldError

Mantêm o comportamento padrão, apenas reexportados para consistência de imports.

## Uso

```tsx
import { Field, FieldDescription, FieldLabel } from '@/components/layout/ui/admin-field'

<Field>
  <FieldLabel htmlFor="name">Nome do produto</FieldLabel>
  <Input
    id="name"
    value={formData.name}
    onChange={...}
  />
  <FieldDescription>
    Identificador único usado nas URLs
  </FieldDescription>
</Field>
```

## Customização adicional

Você pode adicionar classes extras se necessário:

```tsx
<FieldDescription className="ml-6">
  Texto com margem adicional
</FieldDescription>

<FieldDescription className="!-mt-4">
  Texto com ainda menos espaçamento (sobrescreve o -mt-2 padrão)
</FieldDescription>

<FieldDescription className="not-italic">
  Texto sem itálico (remove o italic padrão)
</FieldDescription>
```

## Onde usar

✅ **Use `admin-field` em:**

- Formulários do admin (`/admin/**`)
- Dialogs de edição
- Configurações avançadas

❌ **Use `field` base em:**

- Checkout público (`/checkout`)
- Login/autenticação
- Componentes de UI genéricos

## Estrutura de arquivos

```
src/components/
├── ui/
│   └── field.tsx              # Componente base do Shadcn
└── layout/ui/
    ├── dialog.tsx             # Dialog customizado
    ├── admin-field.tsx        # Field customizado para admin
    └── admin-field.md         # Esta documentação
```

## Exemplo completo

```tsx
import { Field, FieldDescription, FieldLabel } from '@/components/layout/ui/admin-field'
import { Input } from '@/components/ui/input'

function ProductForm() {
  return (
    <div className="space-y-6">
      <Field>
        <FieldLabel htmlFor="name">Nome do produto *</FieldLabel>
        <Input id="name" placeholder="Ex: Curso de programação" />
        <FieldDescription>Este nome será exibido no checkout</FieldDescription>
      </Field>

      <Field>
        <FieldLabel htmlFor="ref">Referência *</FieldLabel>
        <Input id="ref" placeholder="Ex: curso-001" />
        <FieldDescription>Identificador único usado nas URLs e integrações</FieldDescription>
      </Field>
    </div>
  )
}
```

## Padrão visual

```
┌─────────────────────────────┐
│ Nome do produto *           │  <- FieldLabel (normal)
├─────────────────────────────┤
│ [Curso de programação    ]  │  <- Input
│                             │
│ Este nome será exibido...   │  <- FieldDescription (italic, 4px acima)
└─────────────────────────────┘
     ↑ 4px (ao invés de 12px)
```
