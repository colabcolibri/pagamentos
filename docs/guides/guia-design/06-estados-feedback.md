# Parte 6: Estados e feedback

## 🎯 Visão Geral

Estados visuais e feedbacks do Quitou são projetados para serem **claros, elegantes e imediatos**. Usamos cores semânticas refinadas (Rose, Emerald, Amber) em vez de cores puras, transmitindo sofisticação mesmo em momentos de erro.

> **Conceito**: Feedback que guia, não assusta. Mesmo erros são apresentados com elegância.

---

## 🔄 Estados de Componentes

### Loading (Carregando)

#### Spinner

```tsx
import { Loader2 } from 'lucide-react'

;<div className="flex items-center justify-center p-8">
  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  <span className="ml-2 text-muted-foreground">{CONTENT.loading}</span>
</div>
```

#### Skeleton

```tsx
import { Skeleton } from '@/components/ui/skeleton'

;<div className="space-y-4">
  <Skeleton className="h-4 w-[250px]" />
  <Skeleton className="h-4 w-[200px]" />
  <Skeleton className="h-4 w-[150px]" />
</div>
```

### Disabled (Desabilitado)

```tsx
<Button disabled>
  {CONTENT.button}
</Button>

<Input disabled placeholder={CONTENT.placeholder} />
```

### Error (Erro)

```tsx
import { AlertCircle } from 'lucide-react'

;<div className="rounded-md border border-destructive bg-destructive/10 p-4">
  <div className="flex items-center gap-2">
    <AlertCircle className="h-4 w-4 text-destructive" />
    <p className="text-sm text-destructive">{CONTENT.error}</p>
  </div>
</div>
```

### Success (Sucesso)

```tsx
import { CheckCircle2 } from 'lucide-react'

;<div className="rounded-md border border-success/50 bg-success/10 p-4">
  <div className="flex items-center gap-2">
    <CheckCircle2 className="h-4 w-4 text-success" />
    <p className="text-sm text-success">{CONTENT.success}</p>
  </div>
</div>
```

> **Nota**: Use a variável `--success` (Emerald) definida em `globals.css` para consistência.

---

## 📢 Feedback ao Usuário

### Toast Notifications

```tsx
import { useToast } from '@/hooks/use-toast'

const { toast } = useToast()

// Sucesso
toast({
  title: CONTENT.toast.success.title,
  description: CONTENT.toast.success.description,
})

// Erro
toast({
  title: CONTENT.toast.error.title,
  description: CONTENT.toast.error.description,
  variant: 'destructive',
})
```

### Alert Dialog

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

;<AlertDialog>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>{CONTENT.dialog.title}</AlertDialogTitle>
      <AlertDialogDescription>{CONTENT.dialog.description}</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>{CONTENT.dialog.cancel}</AlertDialogCancel>
      <AlertDialogAction>{CONTENT.dialog.confirm}</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## 📝 Estados de Formulário

### Validação

```tsx
import { AlertCircle } from 'lucide-react'

;<div>
  <Label>Email</Label>
  <Input className={errors.email ? 'border-destructive' : ''} />
  {errors.email && (
    <p className="mt-1 text-sm text-destructive flex items-center gap-1">
      <AlertCircle className="h-3 w-3" />
      {errors.email.message}
    </p>
  )}
</div>
```

### Submitting

```tsx
<Button disabled={isSubmitting}>
  {isSubmitting ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      {CONTENT.submitting}
    </>
  ) : (
    CONTENT.submit
  )}
</Button>
```

---

## 🎯 Estados de Dados

### Empty (Vazio)

```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <p className="text-muted-foreground">{CONTENT.empty.message}</p>
  <Button className="mt-4" onClick={handleAction}>
    {CONTENT.empty.action}
  </Button>
</div>
```

### No Results (Sem Resultados)

```tsx
<div className="py-8 text-center">
  <p className="text-muted-foreground">{CONTENT.noResults}</p>
</div>
```

---

## ✅ Regras Obrigatórias

1. **Feedback imediato**: O usuário nunca deve ficar na dúvida
2. **Cores semânticas**: Use `--destructive`, `--success`, `--warning` (não cores puras)
3. **Ícones contextuais**: Combine cor + ícone para máximo entendimento
4. **Elegância no erro**: Evite linguagem alarmista, seja construtivo
5. **Skeletons, não spinners**: Para carregamentos de conteúdo, prefira skeletons
6. **Mensagens em português**: Use o objeto `CONTENT` para centralizar textos
7. **Dark mode**: Cores devem ser levemente mais luminosas no tema escuro

---

## 📚 Próximos passos

- [Estrutura e layout](01-estrutura-layout.md)
- [Sistema de cores](02-sistema-cores.md)

---

**Versão**: 1.0  
**Última atualização**: Janeiro 2025  
**Projeto**: Quitou
