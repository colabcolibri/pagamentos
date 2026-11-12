# Estrutura de Edição Replicável para Admin

## Conceito

Criar componentes genéricos que funcionem para qualquer tipo de dado, usando uma estrutura declarativa baseada em schemas.

---

## Componentes Base

### 1. `DataTable` (Genérico)

- Props: `columns`, `data`, `onEdit`, `onDelete`, `expandable`
- Suporta ordenação, filtros, paginação
- Expandir linhas (opcional)
- Ações por linha (editar, deletar, visualizar)

### 2. `EditDialog` ou `EditSheet` (Genérico)

- Props: `schema`, `data`, `onSave`, `title`
- Renderiza formulário baseado no schema
- Validação com Zod
- Suporta diferentes tipos de campo

### 3. `DetailPanel` (Genérico)

- Props: `schema`, `data`
- Renderiza detalhes em formato "label: valor"
- Usado para expandir linhas ou visualizar

---

## Schema Definition (JSON/TypeScript)

```typescript
interface FieldSchema {
  key: string
  label: string
  type: 'text' | 'number' | 'select' | 'boolean' | 'date' | 'textarea' | 'relation'
  editable?: boolean
  required?: boolean
  options?: Array<{ value: any; label: string }> // Para select
  relation?: {
    table: string
    displayField: string
    valueField: string
  }
  render?: (value: any) => React.ReactNode // Custom render
  validate?: (value: any) => string | null // Custom validation
}

interface TableSchema {
  name: string
  tableName: string
  primaryKey: string
  fields: FieldSchema[]
  actions?: {
    create?: boolean
    edit?: boolean
    delete?: boolean
    view?: boolean
  }
}
```

---

## Exemplo de Uso: Produtos

```typescript
const productSchema: TableSchema = {
  name: 'Produtos',
  tableName: 'products',
  primaryKey: 'id',
  fields: [
    {
      key: 'name',
      label: 'Nome',
      type: 'text',
      editable: true,
      required: true,
    },
    {
      key: 'ref',
      label: 'Referência',
      type: 'text',
      editable: true,
      required: true,
    },
    {
      key: 'active',
      label: 'Ativo',
      type: 'boolean',
      editable: true,
      render: (value) => (
        <Badge variant={value ? 'success' : 'secondary'}>
          {value ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      key: 'description',
      label: 'Descrição',
      type: 'textarea',
      editable: true,
    },
    {
      key: 'created_at',
      label: 'Criado em',
      type: 'date',
      editable: false,
      render: (value) => formatDistanceToNow(new Date(value), { locale: ptBR }),
    },
  ],
  actions: {
    create: true,
    edit: true,
    delete: false,
    view: true,
  },
}
```

---

## Página Genérica

```typescript
// src/app/admin/generic/page.tsx
interface GenericAdminPageProps {
  schema: TableSchema
  fetchData: () => Promise<any[]>
  saveData: (data: any) => Promise<void>
  deleteData: (id: string) => Promise<void>
}

export function GenericAdminPage({ schema, fetchData, saveData, deleteData }: GenericAdminPageProps) {
  const { data, isLoading } = useQuery(['admin', schema.tableName], fetchData)
  const [editingItem, setEditingItem] = useState<any>(null)

  return (
    <AdminPageLayout title={schema.name}>
      <DataTable
        columns={schema.fields}
        data={data}
        onEdit={(item) => setEditingItem(item)}
        actions={schema.actions}
      />

      {editingItem && (
        <EditDialog
          schema={schema}
          data={editingItem}
          onSave={async (updated) => {
            await saveData(updated)
            setEditingItem(null)
          }}
          onClose={() => setEditingItem(null)}
        />
      )}
    </AdminPageLayout>
  )
}
```

---

## Vantagens

1. **DRY**: Não repetir código para cada entidade
2. **Consistência**: Todas as páginas seguem o mesmo padrão
3. **Manutenível**: Mudanças em um lugar afetam todas as páginas
4. **Rápido**: Criar nova página admin é só definir o schema
5. **Type-safe**: TypeScript valida tudo

---

## Próximos Passos

1. Criar `DataTable` genérico
2. Criar `EditDialog` genérico
3. Criar `DetailPanel` genérico
4. Migrar página de Produtos para usar estrutura genérica
5. Criar schemas para Orders, Payments, Webhooks, etc

---

## Alternativas

### Opção A: Biblioteca Pronta

- **React Admin**: https://marmelab.com/react-admin/
- **Refine**: https://refine.dev/
- Pros: Tudo pronto, muito rápido
- Cons: Menos controle, curva de aprendizado

### Opção B: Shadcn Data Table

- **Shadcn**: https://ui.shadcn.com/docs/components/data-table
- Usar os exemplos deles como base
- Pros: Integra perfeitamente, controlado
- Cons: Precisa customizar tudo

### Opção C: Nosso próprio (recomendado)

- Baseado em Shadcn mas com nossa estrutura
- Componentes específicos para nosso caso
- Pros: Máximo controle e personalização
- Cons: Mais trabalho inicial
