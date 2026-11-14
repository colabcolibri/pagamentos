'use client'

import { useState } from 'react'

import Link from 'next/link'

import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Rocket,
  SlidersHorizontal,
} from 'lucide-react'

import { AdminPageLayout } from '@/components/admin/admin-page-layout'
import { type SetupModalStepId, SetupStepModal } from '@/components/admin/setup-step-modal'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useSetupStatus } from '@/hooks/admin/use-setup-status'

export default function AdminSetupPage() {
  const { status, isLoading, error, refetch } = useSetupStatus()
  const [activeModal, setActiveModal] = useState<SetupModalStepId | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  function openStepModal(stepId: SetupModalStepId) {
    setActiveModal(stepId)
    setModalOpen(true)
  }

  function closeStepModal() {
    setModalOpen(false)
  }

  const activeStep = status?.steps.find((s) => s.id === activeModal) ?? null

  return (
    <AdminPageLayout
      title="Setup inicial"
      subtitle="Passo a passo para colocar sua instalação no ar sem esquecer nada"
      action={
        <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isLoading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar status
        </Button>
      }
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Rocket className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Progresso da instalação</CardTitle>
              </div>
              {status && (
                <Badge variant={status.readyToOperate ? 'default' : 'secondary'}>
                  {status.readyToOperate
                    ? 'Pronto para operar'
                    : `${status.requiredCompletedCount}/${status.requiredTotalCount} obrigatórios`}
                </Badge>
              )}
            </div>
            <CardDescription>
              Siga os passos abaixo na ordem. Cada etapa abre apenas o necessário para você concluir
              e avançar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {isLoading && <Skeleton className="h-64 w-full rounded-md" />}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erro ao verificar setup</AlertTitle>
                <AlertDescription>
                  {error instanceof Error ? error.message : String(error)}
                </AlertDescription>
              </Alert>
            )}

            {status && (
              <>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {status.completedCount} de {status.totalCount} etapas concluídas
                    </span>
                    <span className="font-semibold tabular-nums">{status.percent}%</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${status.percent}%` }}
                    />
                  </div>
                </div>

                <ol className="space-y-3">
                  {status.steps.map((step, index) => (
                    <li
                      key={step.id}
                      className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold">
                          {step.completed ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <span>{index + 1}</span>
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{step.title}</span>
                            <Badge
                              variant={step.required ? 'outline' : 'secondary'}
                              className="text-[10px]"
                            >
                              {step.required ? 'Obrigatório' : 'Opcional'}
                            </Badge>
                            {step.completed && (
                              <Badge variant="secondary" className="text-[10px]">
                                Concluído
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{step.description}</p>
                          {step.missing.length > 0 && (
                            <ul className="space-y-0.5 pt-1 text-xs text-amber-700 dark:text-amber-400">
                              {step.missing.map((item) => (
                                <li key={item}>• Falta: {item}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 pl-10 sm:pl-0">
                        {step.id === 'catalog' ? (
                          <Button
                            asChild
                            size="sm"
                            variant={step.completed ? 'outline' : 'default'}
                          >
                            <Link href="/admin/products">
                              {step.completed ? 'Ver produtos' : 'Criar produto'}
                              <ExternalLink className="ml-2 h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant={step.completed ? 'outline' : 'default'}
                            onClick={() => openStepModal(step.id as SetupModalStepId)}
                          >
                            {step.completed ? 'Revisar' : 'Configurar'}
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 px-4 py-3 text-sm">
          <span className="text-muted-foreground">
            Todas essas opções e as configurações avançadas (IA, MCP, diagnóstico) também ficam
            organizadas em Configurações.
          </span>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/settings">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Abrir Configurações
            </Link>
          </Button>
        </div>
      </div>

      <SetupStepModal
        open={modalOpen}
        stepId={activeModal}
        step={activeStep}
        appUrl={status?.appUrl ?? ''}
        onClose={closeStepModal}
      />
    </AdminPageLayout>
  )
}
