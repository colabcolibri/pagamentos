'use client'

import { useState } from 'react'

import {
  AlertCircle,
  Check,
  ChevronDown,
  Copy,
  CreditCard,
  Loader2,
  Mail,
  Moon,
  Package,
  PanelRight,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Tag,
  Trash2,
  Webhook,
} from 'lucide-react'

import { Field, FieldDescription, FieldLabel } from '@/components/layout/ui/admin-field'
import { Dialog } from '@/components/layout/ui/dialog'
import { Sheet } from '@/components/layout/ui/sheet'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ClipboardButton, CopyableText } from '@/components/ui/clipboard-button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FilterCombobox, type FilterOption } from '@/components/ui/filter-combobox'
import { Input } from '@/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { id: 'marca', label: 'Marca' },
  { id: 'layout', label: 'Larguras' },
  { id: 'cores', label: 'Cores' },
  { id: 'tipografia', label: 'Tipografia' },
  { id: 'botoes', label: 'Botões' },
  { id: 'campos', label: 'Campos' },
  { id: 'dialogs', label: 'Modais & Sheet' },
  { id: 'tabelas', label: 'Tabelas' },
  { id: 'feedback', label: 'Feedback' },
] as const

const WIDTH_SCALE = [
  {
    token: 'max-w-6xl',
    px: '1152px',
    pct: '100%',
    usage: 'Largura padrão de páginas, listagens, dashboards e /stylesheet',
  },
  {
    token: 'max-w-3xl',
    px: '768px',
    pct: '66%',
    usage: 'Formulários, leitura confortável e corpo interno de modais (EditProductDialog)',
  },
  {
    token: 'max-w-lg',
    px: '512px',
    pct: '44%',
    usage: 'Dialogs médios (size="md" / "lg") e Sheet lateral (size="lg")',
  },
  {
    token: 'max-w-md',
    px: '448px',
    pct: '39%',
    usage: 'ConfirmDialog e fluxos de ação única',
  },
] as const

const COLOR_TOKENS = [
  {
    name: 'Background',
    token: '--background',
    className: 'bg-background',
    usage: 'Canvas principal',
  },
  {
    name: 'Card / Surface',
    token: '--card',
    className: 'bg-card',
    usage: 'Superfície elevada única',
  },
  { name: 'Muted', token: '--muted', className: 'bg-muted', usage: 'Fundos sutis e headers' },
  { name: 'Border', token: '--border', className: 'bg-border', usage: 'Linhas hairline 1px' },
  {
    name: 'Primary',
    token: '--primary',
    className: 'bg-primary',
    usage: 'Ação principal (Indigo)',
  },
  {
    name: 'Secondary',
    token: '--secondary',
    className: 'bg-secondary',
    usage: 'Ações secundárias',
  },
  {
    name: 'Destructive',
    token: '--destructive',
    className: 'bg-destructive',
    usage: 'Erros e exclusão',
  },
  { name: 'Success', token: '--success', className: 'bg-success', usage: 'Pago / Ativo / OK' },
  { name: 'Warning', token: '--warning', className: 'bg-warning', usage: 'Pendente / Atenção' },
  { name: 'Info', token: '--info', className: 'bg-info', usage: 'Informação neutra' },
] as const

const COMBOBOX_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'Todos os produtos' },
  { value: 'comunidade', label: 'Comunidade Quitou Mensal' },
  { value: 'curso-next', label: 'Curso Next.js Pro' },
  { value: 'mentoria', label: 'Mentoria de Portfólio' },
]

const SAMPLE_ROWS = [
  { id: 'ORD-9482', customer: 'Mariana Costa', method: 'PIX', status: 'Pago', amount: 'R$ 297,00' },
  {
    id: 'ORD-9481',
    customer: 'Rafael Almeida',
    method: 'Cartão 3x',
    status: 'Pago',
    amount: 'R$ 497,00',
  },
  {
    id: 'ORD-9480',
    customer: 'Camila Ferreira',
    method: 'Boleto',
    status: 'Pendente',
    amount: 'R$ 149,00',
  },
  {
    id: 'ORD-9479',
    customer: 'Lucas Oliveira',
    method: 'PIX',
    status: 'Cancelado',
    amount: 'R$ 49,00',
  },
]

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div className="max-w-2xl space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">{eyebrow}</p>
      <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  )
}

export default function StylesheetPage() {
  const [dark, setDark] = useState(false)
  const [switchActive, setSwitchActive] = useState(true)
  const [switchNotify, setSwitchNotify] = useState(false)
  const [checkPix, setCheckPix] = useState(true)
  const [checkCard, setCheckCard] = useState(true)
  const [radioValue, setRadioValue] = useState('single')
  const [selectValue, setSelectValue] = useState('month')
  const [comboValue, setComboValue] = useState('all')
  const [collapsibleOpen, setCollapsibleOpen] = useState(true)

  const [standardDialogOpen, setStandardDialogOpen] = useState(false)
  const [splitDialogOpen, setSplitDialogOpen] = useState(false)
  const [splitTab, setSplitTab] = useState<'geral' | 'precos' | 'emails' | 'webhook'>('geral')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
  }

  return (
    <TooltipProvider>
      <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
        {/* Topbar minimalista fixa */}
        <header className="shrink-0 border-b border-border/70 bg-background/85 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                Q
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold tracking-tight">Quitou</span>
                <span className="text-xs text-muted-foreground">/ Stylesheet v2.0</span>
              </div>
            </div>

            <nav className="hidden items-center gap-1 lg:flex">
              {NAV_ITEMS.map((item) => (
                <Button
                  key={item.id}
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                  render={<a href={`#${item.id}`} />}
                >
                  {item.label}
                </Button>
              ))}
            </nav>

            <Button variant="outline" size="sm" onClick={toggleTheme} className="gap-2">
              {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              <span className="text-xs">{dark ? 'Claro' : 'Escuro'}</span>
            </Button>
          </div>
        </header>

        <ScrollArea className="min-h-0 flex-1">
          <main className="mx-auto max-w-6xl space-y-20 px-6 py-12">
            {/* Hero — Estudo de Marca */}
            <section id="marca" className="scroll-mt-20 space-y-10">
              <div className="max-w-3xl space-y-4">
                <Badge variant="outline" className="font-mono text-[11px]">
                  Base UI + Tailwind v4 · Confiança Fluida
                </Badge>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  Design System Sóbrio &amp; Minimalista
                </h1>
                <p className="text-base leading-relaxed text-muted-foreground">
                  Ficha técnica completa da linguagem visual da Quitou. Menos bordas, zero ruído
                  estrutural, hierarquia guiada por espaço em branco, tipografia precisa e
                  componentes Base UI consistentes.
                </p>
              </div>

              {/* 4 Princípios sem card-dentro-de-card: grid limpo com linha superior */}
              <div className="grid grid-cols-1 gap-8 border-t border-border/70 pt-8 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <span className="font-mono text-xs text-primary">01</span>
                  <h3 className="text-sm font-semibold">Superfície Única</h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Proibido empilhar card dentro de card. Dentro de modais e painéis, a separação
                    acontece por espaçamento (<code className="font-mono">space-y-6</code>) e
                    divisores sutis, nunca caixas aninhadas.
                  </p>
                </div>
                <div className="space-y-2">
                  <span className="font-mono text-xs text-primary">02</span>
                  <h3 className="text-sm font-semibold">Menos Linhas, Mais Respiro</h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Switches, checkboxes e linhas de resumo não precisam de borda individual. Use
                    alinhamento limpo, contraste tipográfico e bordas apenas onde há agrupamento
                    real.
                  </p>
                </div>
                <div className="space-y-2">
                  <span className="font-mono text-xs text-primary">03</span>
                  <h3 className="text-sm font-semibold">Primitivos Estritos</h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Toda ação interativa usa <code className="font-mono">&lt;Button&gt;</code>,{' '}
                    <code className="font-mono">&lt;Input&gt;</code>,{' '}
                    <code className="font-mono">&lt;Select&gt;</code> e{' '}
                    <code className="font-mono">&lt;Dialog&gt;</code> do kit Base UI. Zero{' '}
                    <code className="font-mono">&lt;button&gt;</code> HTML solto.
                  </p>
                </div>
                <div className="space-y-2">
                  <span className="font-mono text-xs text-primary">04</span>
                  <h3 className="text-sm font-semibold">Precisão Financeira</h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Valores monetários, contadores e datas usam{' '}
                    <code className="font-mono">tabular-nums</code>; referências, slugs e IDs usam{' '}
                    <code className="font-mono">font-mono</code>. Scroll único com barra overlay.
                  </p>
                </div>
              </div>
            </section>

            <Separator />

            {/* Layout & Escala de Larguras */}
            <section id="layout" className="scroll-mt-20 space-y-8">
              <SectionHeader
                eyebrow="01 · Layout & Larguras"
                title="Escala de Largura (max-w) e Ritmo Espacial"
                description="Largura padrão de página em max-w-6xl (1152px), formulários confortáveis em max-w-3xl e modais compactos entre max-w-md e max-w-lg. Padding padrão p-5 sm:p-6 e ritmo vertical space-y-6 / space-y-20."
              />

              <div className="divide-y divide-border/60 border-y border-border/60">
                {WIDTH_SCALE.map((w) => (
                  <div
                    key={w.token}
                    className="grid grid-cols-1 items-center gap-4 py-4 sm:grid-cols-12"
                  >
                    <div className="sm:col-span-3">
                      <code className="font-mono text-xs font-semibold text-foreground">
                        {w.token}
                      </code>
                      <p className="font-mono text-[11px] text-muted-foreground tabular-nums">
                        {w.px}
                      </p>
                    </div>
                    <div className="sm:col-span-4">
                      <div className="h-2.5 w-full rounded-full bg-muted">
                        <div
                          className="h-2.5 rounded-full bg-primary/80"
                          style={{ width: w.pct }}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground sm:col-span-5">{w.usage}</p>
                  </div>
                ))}
              </div>

              {/* KPI Strip minimalista */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">
                  KPI Strip (sem cards aninhados — apenas divisores verticais)
                </p>
                <div className="grid grid-cols-1 divide-y divide-border/60 border-y border-border/60 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
                  {[
                    { label: 'Receita (30d)', value: 'R$ 48.920,00', delta: '+14,2%' },
                    { label: 'Pedidos pagos', value: '312', delta: '+8,1%' },
                    { label: 'Ticket médio', value: 'R$ 156,79', delta: '+2,4%' },
                    { label: 'Conversão PIX', value: '74,5%', delta: '+5,0%' },
                  ].map((kpi) => (
                    <div
                      key={kpi.label}
                      className="space-y-1 py-4 sm:px-5 first:sm:pl-0 last:sm:pr-0"
                    >
                      <p className="text-xs text-muted-foreground">{kpi.label}</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-semibold tracking-tight tabular-nums">
                          {kpi.value}
                        </span>
                        <span className="font-mono text-[11px] font-medium text-success tabular-nums">
                          {kpi.delta}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <Separator />

            {/* Cores */}
            <section id="cores" className="scroll-mt-20 space-y-8">
              <SectionHeader
                eyebrow="01 · Paleta & Tokens"
                title="Cores e Superfícies"
                description="Base Slate para neutros frios e limpos, Indigo como cor primária de ação e tons semânticos reservados exclusivamente para status."
              />

              <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-5">
                {COLOR_TOKENS.map((c) => (
                  <div key={c.token} className="space-y-2">
                    <div
                      className={cn(
                        'h-14 w-full rounded-lg border border-border/80 shadow-xs',
                        c.className
                      )}
                    />
                    <div>
                      <p className="text-xs font-semibold text-foreground">{c.name}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{c.token}</p>
                      <p className="text-[11px] text-muted-foreground/80">{c.usage}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <Separator />

            {/* Tipografia */}
            <section id="tipografia" className="scroll-mt-20 space-y-8">
              <SectionHeader
                eyebrow="02 · Tipografia"
                title="Escala Tipográfica (Geist Sans & Mono)"
                description="Hierarquia enxuta: poucos tamanhos, contraste claro entre título, corpo e metadado."
              />

              <div className="divide-y divide-border/60 border-y border-border/60">
                <div className="flex flex-col justify-between gap-2 py-4 sm:flex-row sm:items-baseline">
                  <div className="w-44 shrink-0 font-mono text-xs text-muted-foreground">
                    Page Title · 24px / 600
                  </div>
                  <p className="flex-1 text-2xl font-semibold tracking-tight">
                    Produtos &amp; Planos
                  </p>
                  <code className="font-mono text-[11px] text-muted-foreground">
                    text-2xl font-semibold tracking-tight
                  </code>
                </div>

                <div className="flex flex-col justify-between gap-2 py-4 sm:flex-row sm:items-baseline">
                  <div className="w-44 shrink-0 font-mono text-xs text-muted-foreground">
                    Dialog / Section · 18px / 600
                  </div>
                  <p className="flex-1 text-lg font-semibold tracking-tight">
                    Configurações de Checkout
                  </p>
                  <code className="font-mono text-[11px] text-muted-foreground">
                    text-lg font-semibold tracking-tight
                  </code>
                </div>

                <div className="flex flex-col justify-between gap-2 py-4 sm:flex-row sm:items-baseline">
                  <div className="w-44 shrink-0 font-mono text-xs text-muted-foreground">
                    Sub-section · 14px / 600
                  </div>
                  <p className="flex-1 text-sm font-semibold">Métodos de pagamento aceitos</p>
                  <code className="font-mono text-[11px] text-muted-foreground">
                    text-sm font-semibold
                  </code>
                </div>

                <div className="flex flex-col justify-between gap-2 py-4 sm:flex-row sm:items-baseline">
                  <div className="w-44 shrink-0 font-mono text-xs text-muted-foreground">
                    Body / Control · 14px / 400
                  </div>
                  <p className="flex-1 text-sm text-foreground">
                    Defina quais formas de pagamento ficam visíveis no link público.
                  </p>
                  <code className="font-mono text-[11px] text-muted-foreground">
                    text-sm text-foreground
                  </code>
                </div>

                <div className="flex flex-col justify-between gap-2 py-4 sm:flex-row sm:items-baseline">
                  <div className="w-44 shrink-0 font-mono text-xs text-muted-foreground">
                    Hint / Caption · 12px / 400
                  </div>
                  <p className="flex-1 text-xs text-muted-foreground">
                    Identificador único usado nas URLs e webhooks de integração.
                  </p>
                  <code className="font-mono text-[11px] text-muted-foreground">
                    text-xs text-muted-foreground
                  </code>
                </div>

                <div className="flex flex-col justify-between gap-2 py-4 sm:flex-row sm:items-baseline">
                  <div className="w-44 shrink-0 font-mono text-xs text-muted-foreground">
                    Money &amp; Ref · Tabular / Mono
                  </div>
                  <div className="flex flex-1 items-center gap-4">
                    <span className="text-base font-semibold tabular-nums">R$ 1.297,00</span>
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                      curso-nextjs-pro
                    </code>
                  </div>
                  <code className="font-mono text-[11px] text-muted-foreground">
                    tabular-nums · font-mono
                  </code>
                </div>
              </div>
            </section>

            <Separator />

            {/* Botões */}
            <section id="botoes" className="scroll-mt-20 space-y-8">
              <SectionHeader
                eyebrow="03 · Ações"
                title="Botões & Estados"
                description="Sempre usando o componente Button do kit. Apenas 1 ação Primary por bloco; demais ações usam Outline, Secondary ou Ghost."
              />

              <div className="space-y-8">
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">Variantes</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button variant="default">Primary (Salvar)</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="destructive">Destructive</Button>
                    <Button variant="link">Link</Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">Tamanhos &amp; Ícones</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button size="sm">
                      <Plus className="h-3.5 w-3.5" />
                      Small (h-8)
                    </Button>
                    <Button size="default">
                      <Sparkles className="h-4 w-4" />
                      Default (h-9)
                    </Button>
                    <Button size="lg">Large (h-10)</Button>
                    <Button size="icon-sm" variant="outline" aria-label="Copiar">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="outline" aria-label="Buscar">
                      <Search className="h-4 w-4" />
                    </Button>
                    <Button size="icon-lg" variant="outline" aria-label="Excluir">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Estados &amp; Utilitários
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button disabled>Disabled</Button>
                    <Button disabled>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Salvando...
                    </Button>
                    <ClipboardButton
                      text="https://pay.quitou.com.br/p/curso-nextjs"
                      variant="outline"
                      size="sm"
                    />
                    <CopyableText text="prod_9f8a7b6c" />
                  </div>
                </div>
              </div>
            </section>

            <Separator />

            {/* Campos, Seletores & Controles */}
            <section id="campos" className="scroll-mt-20 space-y-8">
              <SectionHeader
                eyebrow="04 · Formulários"
                title="Campos, Seletores & Controles"
                description="Grid limpo de 2 colunas para campos relacionados, labels diretos e switches em linha sem bordas redundantes."
              />

              <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
                {/* Coluna esquerda: Inputs & Textarea */}
                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="ss-name">Nome do produto *</FieldLabel>
                      <Input id="ss-name" defaultValue="Curso Next.js Pro" />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="ss-ref">Referência (slug) *</FieldLabel>
                      <Input id="ss-ref" defaultValue="curso-nextjs-pro" className="font-mono" />
                      <FieldDescription>Usado na URL pública.</FieldDescription>
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel htmlFor="ss-error">Campo com validação de erro</FieldLabel>
                    <Input
                      id="ss-error"
                      defaultValue="slug invalido!"
                      aria-invalid="true"
                      className="border-destructive"
                    />
                    <p className="text-xs text-destructive">
                      Use apenas letras minúsculas, números e hífen.
                    </p>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="ss-price">InputGroup (Valor &amp; Busca)</FieldLabel>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <InputGroup>
                        <InputGroupAddon align="inline-start">
                          <InputGroupText>R$</InputGroupText>
                        </InputGroupAddon>
                        <InputGroupInput
                          id="ss-price"
                          defaultValue="297,00"
                          className="tabular-nums"
                        />
                      </InputGroup>

                      <InputGroup>
                        <InputGroupAddon align="inline-start">
                          <Search className="h-3.5 w-3.5" />
                        </InputGroupAddon>
                        <InputGroupInput
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Buscar..."
                        />
                        {searchTerm && (
                          <InputGroupAddon align="inline-end">
                            <InputGroupButton onClick={() => setSearchTerm('')}>
                              Limpar
                            </InputGroupButton>
                          </InputGroupAddon>
                        )}
                      </InputGroup>
                    </div>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="ss-desc">Descrição</FieldLabel>
                    <Textarea
                      id="ss-desc"
                      rows={3}
                      placeholder="Resumo claro que aparece no checkout..."
                    />
                  </Field>
                </div>

                {/* Coluna direita: Selects, Switches, Checkboxes, Radio */}
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel>Recorrência (Select)</FieldLabel>
                      <Select value={selectValue} onValueChange={(v) => v && setSelectValue(v)}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="day">Diária</SelectItem>
                          <SelectItem value="week">Semanal</SelectItem>
                          <SelectItem value="month">Mensal</SelectItem>
                          <SelectItem value="year">Anual</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field>
                      <FieldLabel>Filtro com busca (Combobox)</FieldLabel>
                      <FilterCombobox
                        value={comboValue}
                        onValueChange={(v) => setComboValue(v ?? 'all')}
                        options={COMBOBOX_OPTIONS}
                        placeholder="Filtrar produto..."
                        emptyText="Nenhum produto encontrado."
                      />
                    </Field>
                  </div>

                  {/* Switches em lista limpa com hairline divider (sem card!) */}
                  <div className="divide-y divide-border/60 border-y border-border/60">
                    <div className="flex items-center justify-between gap-4 py-3">
                      <div className="space-y-0.5">
                        <Label htmlFor="ss-active" className="text-sm font-medium">
                          Produto ativo no checkout
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Permite novas vendas imediatamente.
                        </p>
                      </div>
                      <Switch
                        id="ss-active"
                        checked={switchActive}
                        onCheckedChange={setSwitchActive}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4 py-3">
                      <div className="space-y-0.5">
                        <Label htmlFor="ss-notify" className="text-sm font-medium">
                          Notificar webhook em tempo real
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Dispara POST assíncrono na confirmação.
                        </p>
                      </div>
                      <Switch
                        id="ss-notify"
                        checked={switchNotify}
                        onCheckedChange={setSwitchNotify}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="space-y-2.5">
                      <Label className="text-xs font-medium text-muted-foreground">
                        Checkboxes
                      </Label>
                      <div className="space-y-2">
                        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                          <Checkbox
                            checked={checkPix}
                            onCheckedChange={(v) => setCheckPix(Boolean(v))}
                          />
                          <span>PIX instantâneo</span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                          <Checkbox
                            checked={checkCard}
                            onCheckedChange={(v) => setCheckCard(Boolean(v))}
                          />
                          <span>Cartão de crédito</span>
                        </label>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <Label className="text-xs font-medium text-muted-foreground">
                        RadioGroup
                      </Label>
                      <RadioGroup value={radioValue} onValueChange={setRadioValue}>
                        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                          <RadioGroupItem value="single" id="r-single" />
                          <span>Pagamento único</span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                          <RadioGroupItem value="recurring" id="r-recurring" />
                          <span>Assinatura recorrente</span>
                        </label>
                      </RadioGroup>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <Separator />

            {/* Dialogs & Modals */}
            <section id="dialogs" className="scroll-mt-20 space-y-8">
              <SectionHeader
                eyebrow="05 · Modais & Painéis"
                title="Dialogs, Split-Pane & Confirm"
                description="Header fixo com título claro, 1 único ScrollArea interno (scrollable={false} em modais com sidebar), footer alinhado à direita e zero bordas duplicadas."
              />

              <div className="flex flex-wrap items-center gap-3">
                <Button variant="default" onClick={() => setSplitDialogOpen(true)}>
                  Abrir Modal Split-Pane (Editor)
                </Button>
                <Button variant="outline" onClick={() => setStandardDialogOpen(true)}>
                  Abrir Dialog Padrão (md)
                </Button>
                <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
                  Abrir ConfirmDialog
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => setSheetOpen(true)}>
                  <PanelRight className="h-4 w-4" />
                  Abrir Sheet (Template)
                </Button>
              </div>
            </section>

            <Separator />

            {/* Tabelas & Scroll */}
            <section id="tabelas" className="scroll-mt-20 space-y-8">
              <SectionHeader
                eyebrow="06 · Dados"
                title="Tabelas & ScrollArea Overlay"
                description="Cabeçalhos compactos, linhas com hover sutil, valores numéricos alinhados à direita em tabular-nums e scroll horizontal/vertical em overlay."
              />

              <div className="rounded-lg border border-border/70 bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {SAMPLE_ROWS.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {row.id}
                        </TableCell>
                        <TableCell className="font-medium">{row.customer}</TableCell>
                        <TableCell className="text-muted-foreground">{row.method}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              row.status === 'Pago'
                                ? 'default'
                                : row.status === 'Pendente'
                                  ? 'secondary'
                                  : 'destructive'
                            }
                          >
                            {row.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {row.amount}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>

            <Separator />

            {/* Feedback, Badges, Tabs, Collapsible */}
            <section id="feedback" className="scroll-mt-20 space-y-8">
              <SectionHeader
                eyebrow="07 · Feedback & Navegação"
                title="Badges, Alerts, Tabs, Collapsible & Skeleton"
                description="Componentes de apoio seguindo a mesma sobriedade: sem sombras pesadas e usando Button em triggers interativos."
              />

              <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="default">Default</Badge>
                    <Badge variant="secondary">Secondary</Badge>
                    <Badge variant="outline">Outline</Badge>
                    <Badge variant="destructive">Destructive</Badge>
                    <Tooltip>
                      <TooltipTrigger render={<Button variant="outline" size="sm" />}>
                        Passe o mouse (Tooltip)
                      </TooltipTrigger>
                      <TooltipContent>Tooltip Base UI posicionado automaticamente</TooltipContent>
                    </Tooltip>
                  </div>

                  <Alert>
                    <CreditCard className="h-4 w-4" />
                    <AlertTitle>Gateway conectado</AlertTitle>
                    <AlertDescription>
                      Asaas e Pagar.me estão operacionais no ambiente atual.
                    </AlertDescription>
                  </Alert>

                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Webhook sem resposta</AlertTitle>
                    <AlertDescription>
                      O endpoint retornou status 500 nas últimas 3 tentativas.
                    </AlertDescription>
                  </Alert>
                </div>

                <div className="space-y-6">
                  <Tabs defaultValue="resumo">
                    <TabsList>
                      <TabsTrigger value="resumo">Resumo</TabsTrigger>
                      <TabsTrigger value="regras">Regras</TabsTrigger>
                      <TabsTrigger value="historico">Histórico</TabsTrigger>
                    </TabsList>
                    <TabsContent value="resumo" className="pt-3 text-sm text-muted-foreground">
                      Conteúdo limpo abaixo das tabs sem caixa extra em volta.
                    </TabsContent>
                    <TabsContent value="regras" className="pt-3 text-sm text-muted-foreground">
                      Regras de validação e limites aplicados ao formulário.
                    </TabsContent>
                    <TabsContent value="historico" className="pt-3 text-sm text-muted-foreground">
                      Registro cronológico de alterações.
                    </TabsContent>
                  </Tabs>

                  <Collapsible
                    open={collapsibleOpen}
                    onOpenChange={setCollapsibleOpen}
                    className="border-y border-border/60"
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        className="flex h-auto w-full items-center justify-between rounded-none px-0 py-3 font-medium hover:bg-transparent"
                      >
                        <span>Seção retrátil com &lt;Button&gt;</span>
                        <ChevronDown
                          className={cn(
                            'h-4 w-4 text-muted-foreground transition-transform',
                            collapsibleOpen && 'rotate-180'
                          )}
                        />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pb-4 text-xs leading-relaxed text-muted-foreground">
                      O trigger usa o próprio Button do kit via{' '}
                      <code className="font-mono">asChild</code>, garantindo semântica nativa de
                      botão e zero erros do Base UI.
                    </CollapsibleContent>
                  </Collapsible>

                  <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-3.5 w-44" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Key-Value List, Empty State & Pagination */}
              <div className="grid grid-cols-1 gap-10 border-t border-border/60 pt-10 lg:grid-cols-2">
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Lista Key-Value (Resumo de transação)
                  </p>
                  <dl className="divide-y divide-border/60 border-y border-border/60 text-sm">
                    <div className="flex items-center justify-between py-2.5">
                      <dt className="text-muted-foreground">Identificador</dt>
                      <dd className="font-mono text-xs">pay_9f8a7b6c</dd>
                    </div>
                    <div className="flex items-center justify-between py-2.5">
                      <dt className="text-muted-foreground">Gateway</dt>
                      <dd className="font-medium">Asaas · PIX</dd>
                    </div>
                    <div className="flex items-center justify-between py-2.5">
                      <dt className="text-muted-foreground">Valor líquido</dt>
                      <dd className="font-semibold tabular-nums">R$ 294,10</dd>
                    </div>
                  </dl>
                </div>

                <div className="space-y-6">
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/80 px-6 py-8 text-center">
                    <Package className="mb-2.5 h-6 w-6 text-muted-foreground/70" />
                    <p className="text-sm font-medium">Nenhum webhook configurado</p>
                    <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                      Adicione uma URL para receber eventos de pagamento em tempo real.
                    </p>
                    <Button variant="outline" size="sm" className="mt-4 gap-1.5">
                      <Plus className="h-3.5 w-3.5" />
                      Adicionar endpoint
                    </Button>
                  </div>

                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious href="#feedback" />
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationLink href="#feedback" isActive>
                          1
                        </PaginationLink>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationLink href="#feedback">2</PaginationLink>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationNext href="#feedback" />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </div>
            </section>
          </main>
        </ScrollArea>

        {/* Dialog Padrão */}
        <Dialog
          open={standardDialogOpen}
          onOpenChange={setStandardDialogOpen}
          title="Criar novo cupom"
          description="Exemplo de modal compacto (size='md') com fluxo direto."
          confirmText="Criar cupom"
          onConfirm={() => setStandardDialogOpen(false)}
          onCancel={() => setStandardDialogOpen(false)}
          showIcon={false}
        >
          <div className="space-y-4">
            <Field>
              <FieldLabel htmlFor="dlg-code">Código</FieldLabel>
              <Input id="dlg-code" defaultValue="QUITOU20" className="font-mono uppercase" />
            </Field>
            <Field>
              <FieldLabel htmlFor="dlg-pct">Desconto (%)</FieldLabel>
              <Input id="dlg-pct" type="number" defaultValue="20" className="tabular-nums" />
            </Field>
          </div>
        </Dialog>

        {/* Modal Split-Pane Sóbrio (sem card dentro de card) */}
        <Dialog
          open={splitDialogOpen}
          onOpenChange={setSplitDialogOpen}
          title="Editar produto"
          description="Modelo de layout split-pane sóbrio: sidebar fixa, scroll único e zero caixas aninhadas."
          size="full"
          height="screen"
          scrollable={false}
          contentPadding={null}
          showIcon={false}
          confirmText="Salvar alterações"
          onConfirm={() => setSplitDialogOpen(false)}
          onCancel={() => setSplitDialogOpen(false)}
        >
          <div className="flex h-full min-h-0 flex-col sm:flex-row">
            <nav className="hidden w-52 shrink-0 flex-col gap-1 border-r border-border bg-muted/20 p-3 sm:flex">
              {[
                { id: 'geral' as const, label: 'Geral', icon: Package },
                { id: 'precos' as const, label: 'Preços', icon: Tag },
                { id: 'emails' as const, label: 'Emails', icon: Mail },
                { id: 'webhook' as const, label: 'Webhook', icon: Webhook },
              ].map((item) => {
                const Icon = item.icon
                const active = splitTab === item.id
                return (
                  <Button
                    key={item.id}
                    type="button"
                    variant={active ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setSplitTab(item.id)}
                    className={cn(
                      'h-9 w-full justify-start gap-2.5 px-3',
                      active
                        ? 'border border-border/70 bg-background text-foreground shadow-xs hover:bg-background'
                        : 'text-muted-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </Button>
                )
              })}
            </nav>

            <ScrollArea className="flex-1 min-h-0 min-w-0">
              <div className="mx-auto max-w-2xl space-y-8 p-6">
                <div className="space-y-1 border-b border-border/60 pb-4">
                  <h3 className="text-base font-semibold">
                    {splitTab === 'geral' && 'Dados gerais do produto'}
                    {splitTab === 'precos' && 'Preços configurados'}
                    {splitTab === 'emails' && 'Remetente e notificações'}
                    {splitTab === 'webhook' && 'Integração via Webhook'}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Sem card dentro de card: apenas título, divisor sutil e campos respirando.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>Nome</FieldLabel>
                    <Input defaultValue="Comunidade Quitou Mensal" />
                  </Field>
                  <Field>
                    <FieldLabel>Referência</FieldLabel>
                    <Input defaultValue="comunidade-quitou" className="font-mono" />
                  </Field>
                </div>

                <div className="flex items-center justify-between border-y border-border/60 py-3.5">
                  <div>
                    <p className="text-sm font-medium">Checkout ativo</p>
                    <p className="text-xs text-muted-foreground">
                      Disponível para novas compras públicas.
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span>Padrão validado no Stylesheet v2.0</span>
                  <Check className="h-3.5 w-3.5 text-success" />
                </div>
              </div>
            </ScrollArea>
          </div>
        </Dialog>

        {/* ConfirmDialog */}
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Excluir produto?"
          description="Esta ação remove o produto e arquiva os links de checkout vinculados."
          confirmText="Excluir"
          variant="destructive"
          onConfirm={() => setConfirmOpen(false)}
        />

        {/* Sheet Template */}
        <Sheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          title="Detalhes do pedido ORD-9482"
          description="Template padrão @/components/layout/ui/sheet com ScrollArea único e footer alinhado."
          size="md"
          confirmText="Reenviar e-mail"
          onConfirm={() => setSheetOpen(false)}
          onCancel={() => setSheetOpen(false)}
        >
          <dl className="divide-y divide-border/60 border-y border-border/60 text-sm">
            <div className="flex items-center justify-between py-3">
              <dt className="text-muted-foreground">Cliente</dt>
              <dd className="font-medium">Mariana Costa</dd>
            </div>
            <div className="flex items-center justify-between py-3">
              <dt className="text-muted-foreground">Produto</dt>
              <dd className="font-medium">Curso Next.js Pro</dd>
            </div>
            <div className="flex items-center justify-between py-3">
              <dt className="text-muted-foreground">Método</dt>
              <dd>PIX instantâneo</dd>
            </div>
            <div className="flex items-center justify-between py-3">
              <dt className="text-muted-foreground">Valor pago</dt>
              <dd className="font-semibold tabular-nums">R$ 297,00</dd>
            </div>
          </dl>
        </Sheet>
      </div>
    </TooltipProvider>
  )
}
