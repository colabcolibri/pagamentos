'use client'

import { useEffect, useRef, useState } from 'react'

import { ChevronDown, ChevronUp, Minus, Plus, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'

import type { RefundPolicyContent } from '@/components/refund-policy/types'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { devError } from '@/lib/dev-log'

interface RefundPolicyEditorProps {
  value: RefundPolicyContent | null
  onChange: (policy: RefundPolicyContent | null) => void
}

const CONTENT = {
  import: {
    title: 'Importar política',
    importJson: 'Importar JSON',
    loadTemplate: 'Carregar template',
    selectTemplate: 'Selecionar template',
    templatePlaceholder: 'Escolha um template...',
    success: 'Política importada com sucesso!',
    error: 'Erro ao importar política',
    invalidJson: 'JSON inválido',
    invalidStructure: 'Estrutura do JSON inválida',
    description: 'Importe um arquivo JSON ou carregue um template pré-definido',
  },
  general: {
    title: 'Título da política',
    titlePlaceholder: 'Ex: Política de reembolso',
    subtitle: 'Subtítulo',
    subtitlePlaceholder: 'Ex: Entenda seus direitos',
    footer: 'Rodapé',
    footerPlaceholder: 'Ex: Ao continuar, você aceita os termos',
  },
  sections: {
    title: 'Seções da política',
    add: 'Adicionar seção',
    sectionLabel: 'Seção',
    sectionTitlePlaceholder: 'Ex: Prazo para reembolso',
    contentPlaceholder: 'Digite cada item em uma linha separada',
    highlighted: 'Destacar esta seção',
    empty: 'Nenhuma seção adicionada. Clique em',
    emptyAction: 'para começar.',
    moveUp: 'Mover para cima',
    moveDown: 'Mover para baixo',
    remove: 'Remover seção',
    highlightedBadge: 'Destacada',
  },
  checkout: {
    title: 'Textos do checkout',
    buttonText: 'Texto do botão',
    buttonTextPlaceholder: 'Ex: Ver política de compra',
    acceptanceText: 'Texto de aceitação',
    acceptanceTextPlaceholder: 'Ex: Li e aceito a política',
    acceptanceRequired: 'Mensagem de obrigatoriedade',
    acceptanceRequiredPlaceholder: 'Ex: Você precisa aceitar para continuar',
  },
} as const

interface Template {
  id: string
  name: string
  description: string
}

export function RefundPolicyEditor({ value, onChange }: RefundPolicyEditorProps) {
  const [policy, setPolicy] = useState<RefundPolicyContent>(
    value || {
      title: '',
      subtitle: '',
      sections: [],
      footer: '',
      checkout: {
        buttonText: 'Ver política de compra',
        acceptanceText: 'Li e aceito a política de compra',
        acceptanceRequired: 'Você precisa aceitar a política para continuar',
      },
    }
  )

  // Estado de collapse para cada seção (fora do map)
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({})
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sincronizar com value quando mudar externamente
  useEffect(() => {
    if (value) {
      setPolicy(value)
    }
  }, [value])

  const updatePolicy = (updates: Partial<RefundPolicyContent>) => {
    const updated = { ...policy, ...updates }
    setPolicy(updated)
    onChange(updated)
  }

  const addSection = () => {
    const newSections = [
      ...policy.sections,
      {
        title: '',
        content: [],
        highlighted: false,
      },
    ]
    updatePolicy({ sections: newSections })
  }

  const updateSection = (index: number, updates: Partial<(typeof policy.sections)[0]>) => {
    const newSections = [...policy.sections]
    newSections[index] = { ...newSections[index], ...updates }
    updatePolicy({ sections: newSections })
  }

  const removeSection = (index: number) => {
    const newSections = policy.sections.filter((_, i) => i !== index)
    updatePolicy({ sections: newSections })
  }

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...policy.sections]
    const targetIndex = direction === 'up' ? index - 1 : index + 1

    if (targetIndex < 0 || targetIndex >= newSections.length) return // Swap
    ;[newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]]

    updatePolicy({ sections: newSections })
  }

  const handleContentChange = (index: number, text: string) => {
    // Manter linhas vazias no estado para Enter funcionar como nova linha durante a edição.
    const content = text.split('\n')
    updateSection(index, { content })
  }

  // Carregar templates disponíveis
  useEffect(() => {
    const loadTemplates = async () => {
      setIsLoadingTemplates(true)
      try {
        const response = await fetch('/api/admin/refund-policy-templates')
        if (!response.ok) throw new Error('Erro ao carregar templates')
        const data = await response.json()
        setTemplates(data.templates || [])
      } catch (error) {
        devError('Erro ao carregar templates:', error)
        toast.error('Erro ao carregar templates')
      } finally {
        setIsLoadingTemplates(false)
      }
    }
    loadTemplates()
  }, [])

  // Validar estrutura do JSON
  const validatePolicyStructure = (data: any): data is RefundPolicyContent => {
    if (!data || typeof data !== 'object') return false
    if (typeof data.title !== 'string') return false
    if (typeof data.subtitle !== 'string') return false
    if (typeof data.footer !== 'string') return false
    if (!Array.isArray(data.sections)) return false
    if (!data.checkout || typeof data.checkout !== 'object') return false
    if (typeof data.checkout.buttonText !== 'string') return false
    if (typeof data.checkout.acceptanceText !== 'string') return false
    if (typeof data.checkout.acceptanceRequired !== 'string') return false

    // Validar seções
    for (const section of data.sections) {
      if (typeof section.title !== 'string') return false
      if (!Array.isArray(section.content)) return false
      if (!section.content.every((item: any) => typeof item === 'string')) return false
    }

    return true
  }

  // Carregar template selecionado
  const handleLoadTemplate = async (templateId: string) => {
    if (!templateId) return

    setIsLoadingTemplates(true)
    try {
      const response = await fetch(`/api/admin/refund-policy-templates?id=${templateId}`)
      if (!response.ok) throw new Error('Erro ao carregar template')

      const data = await response.json()
      if (!validatePolicyStructure(data.data)) {
        toast.error(CONTENT.import.invalidStructure)
        return
      }

      setPolicy(data.data)
      onChange(data.data)
      toast.success(CONTENT.import.success)
      setSelectedTemplate('')
    } catch (error) {
      devError('Erro ao carregar template:', error)
      toast.error(CONTENT.import.error)
    } finally {
      setIsLoadingTemplates(false)
    }
  }

  // Importar JSON do arquivo
  const handleImportJson = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Resetar input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    try {
      const text = await file.text()
      const data = JSON.parse(text)

      if (!validatePolicyStructure(data)) {
        toast.error(CONTENT.import.invalidStructure)
        return
      }

      setPolicy(data)
      onChange(data)
      toast.success(CONTENT.import.success)
    } catch (error) {
      devError('Erro ao importar JSON:', error)
      if (error instanceof SyntaxError) {
        toast.error(CONTENT.import.invalidJson)
      } else {
        toast.error(CONTENT.import.error)
      }
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0">
      {/* Importação */}
      <div className="rounded-lg border p-3 sm:p-4 space-y-3 sm:space-y-4 min-w-0 bg-muted/30">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 min-w-0">
          <div className="min-w-0 flex-1">
            <h3 className="text-xs sm:text-sm font-medium mb-1 break-words min-w-0">
              {CONTENT.import.title}
            </h3>
            <p className="text-xs text-muted-foreground break-words min-w-0">
              {CONTENT.import.description}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportJson}
              className="hidden"
              id="json-import"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs sm:text-sm shrink-0"
            >
              <Upload className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
              {CONTENT.import.importJson}
            </Button>
            <Select
              value={selectedTemplate}
              onValueChange={(value) => {
                setSelectedTemplate(value)
                handleLoadTemplate(value)
              }}
              disabled={isLoadingTemplates}
            >
              <SelectTrigger className="w-full sm:w-[200px] text-xs sm:text-sm shrink-0">
                <SelectValue placeholder={CONTENT.import.templatePlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    <span className="font-medium">{template.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      - {template.description}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Geral */}
      <div className="space-y-3 sm:space-y-4 min-w-0">
        <div className="space-y-1.5 sm:space-y-2 min-w-0">
          <Label htmlFor="policy-title" className="text-xs sm:text-sm">
            {CONTENT.general.title}
          </Label>
          <Input
            id="policy-title"
            value={policy.title}
            onChange={(e) => updatePolicy({ title: e.target.value })}
            placeholder={CONTENT.general.titlePlaceholder}
          />
        </div>

        <div className="space-y-1.5 sm:space-y-2 min-w-0">
          <Label htmlFor="policy-subtitle" className="text-xs sm:text-sm">
            {CONTENT.general.subtitle}
          </Label>
          <Input
            id="policy-subtitle"
            value={policy.subtitle}
            onChange={(e) => updatePolicy({ subtitle: e.target.value })}
            placeholder={CONTENT.general.subtitlePlaceholder}
          />
        </div>

        <div className="space-y-1.5 sm:space-y-2 min-w-0">
          <Label htmlFor="policy-footer" className="text-xs sm:text-sm">
            {CONTENT.general.footer}
          </Label>
          <Input
            id="policy-footer"
            value={policy.footer}
            onChange={(e) => updatePolicy({ footer: e.target.value })}
            placeholder={CONTENT.general.footerPlaceholder}
          />
        </div>
      </div>

      {/* Seções */}
      <div className="space-y-3 sm:space-y-4 min-w-0">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <h3 className="text-xs sm:text-sm font-medium break-words min-w-0 flex-1">
            {CONTENT.sections.title}
          </h3>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addSection}
            className="shrink-0 text-xs sm:text-sm"
          >
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            {CONTENT.sections.add}
          </Button>
        </div>

        {policy.sections.map((section, index) => {
          const isOpen = openSections[index] || false
          const toggleOpen = () => {
            setOpenSections((prev) => ({ ...prev, [index]: !prev[index] }))
          }

          return (
            <Collapsible key={index} open={isOpen} onOpenChange={toggleOpen}>
              <div className="rounded-lg border min-w-0">
                {/* Header */}
                <div className="flex items-center gap-1 sm:gap-2 p-2 sm:p-3 bg-muted/50 min-w-0">
                  {/* Botões de reordenação */}
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => moveSection(index, 'up')}
                      disabled={index === 0}
                      className="h-5 w-5 sm:h-6 sm:w-6 p-0"
                      title={CONTENT.sections.moveUp}
                    >
                      <ChevronUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => moveSection(index, 'down')}
                      disabled={index === policy.sections.length - 1}
                      className="h-5 w-5 sm:h-6 sm:w-6 p-0"
                      title={CONTENT.sections.moveDown}
                    >
                      <ChevronDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    </Button>
                  </div>

                  {/* Ícone de collapse/expand */}
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 sm:h-8 sm:w-8 p-0 shrink-0"
                    >
                      {isOpen ? (
                        <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                      ) : (
                        <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>

                  {/* Título da seção */}
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      className="flex-1 justify-start font-medium text-xs sm:text-sm min-w-0 h-auto py-1.5 px-1 sm:px-2"
                    >
                      <div className="flex flex-wrap items-center gap-x-1 sm:gap-x-2 gap-y-0.5 min-w-0">
                        <span className="whitespace-nowrap shrink-0">
                          {CONTENT.sections.sectionLabel} {index + 1}
                        </span>
                        {section.title && (
                          <span className="truncate text-[10px] sm:text-xs">: {section.title}</span>
                        )}
                        {section.highlighted && (
                          <span className="text-[10px] sm:text-xs bg-warning/10 text-warning px-1.5 sm:px-2 py-0.5 rounded whitespace-nowrap shrink-0">
                            {CONTENT.sections.highlightedBadge}
                          </span>
                        )}
                      </div>
                    </Button>
                  </CollapsibleTrigger>

                  {/* Botão de remover */}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeSection(index)}
                    className="text-destructive hover:text-destructive/80 hover:bg-destructive/10 h-7 w-7 sm:h-8 sm:w-8 p-0 shrink-0"
                    title={CONTENT.sections.remove}
                  >
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </div>

                {/* Conteúdo (colapsável) */}
                <CollapsibleContent>
                  <div className="p-3 sm:p-4 space-y-2 sm:space-y-3 border-t min-w-0">
                    <Input
                      value={section.title}
                      onChange={(e) => updateSection(index, { title: e.target.value })}
                      placeholder={CONTENT.sections.sectionTitlePlaceholder}
                    />

                    <Textarea
                      value={section.content.join('\n')}
                      onChange={(e) => handleContentChange(index, e.target.value)}
                      placeholder={CONTENT.sections.contentPlaceholder}
                      rows={4}
                    />

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`highlighted-${index}`}
                        checked={section.highlighted}
                        onCheckedChange={(checked) =>
                          updateSection(index, { highlighted: checked as boolean })
                        }
                      />
                      <label
                        htmlFor={`highlighted-${index}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {CONTENT.sections.highlighted}
                      </label>
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )
        })}

        {policy.sections.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {CONTENT.sections.empty} &quot;{CONTENT.sections.add}&quot;{' '}
            {CONTENT.sections.emptyAction}
          </div>
        )}
      </div>

      {/* Checkout */}
      <div className="space-y-3 sm:space-y-4 min-w-0">
        <h3 className="text-xs sm:text-sm font-medium">{CONTENT.checkout.title}</h3>

        <div className="space-y-1.5 sm:space-y-2 min-w-0">
          <Label htmlFor="checkout-button" className="text-xs sm:text-sm">
            {CONTENT.checkout.buttonText}
          </Label>
          <Input
            id="checkout-button"
            value={policy.checkout.buttonText}
            onChange={(e) =>
              updatePolicy({
                checkout: { ...policy.checkout, buttonText: e.target.value },
              })
            }
            placeholder={CONTENT.checkout.buttonTextPlaceholder}
          />
        </div>

        <div className="space-y-1.5 sm:space-y-2 min-w-0">
          <Label htmlFor="checkout-acceptance" className="text-xs sm:text-sm">
            {CONTENT.checkout.acceptanceText}
          </Label>
          <Input
            id="checkout-acceptance"
            value={policy.checkout.acceptanceText}
            onChange={(e) =>
              updatePolicy({
                checkout: { ...policy.checkout, acceptanceText: e.target.value },
              })
            }
            placeholder={CONTENT.checkout.acceptanceTextPlaceholder}
          />
        </div>

        <div className="space-y-1.5 sm:space-y-2 min-w-0">
          <Label htmlFor="checkout-required" className="text-xs sm:text-sm">
            {CONTENT.checkout.acceptanceRequired}
          </Label>
          <Input
            id="checkout-required"
            value={policy.checkout.acceptanceRequired}
            onChange={(e) =>
              updatePolicy({
                checkout: { ...policy.checkout, acceptanceRequired: e.target.value },
              })
            }
            placeholder={CONTENT.checkout.acceptanceRequiredPlaceholder}
          />
        </div>
      </div>
    </div>
  )
}
