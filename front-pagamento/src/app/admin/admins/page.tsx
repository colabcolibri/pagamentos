'use client'

import { useMemo } from 'react'

import { type ColumnDef } from '@tanstack/react-table'
import { Users } from 'lucide-react'

import { AdminPageLayout } from '@/components/admin/admin-page-layout'
import { AppDataTable } from '@/components/admin/app-data-table'
import { Badge } from '@/components/ui/badge'
import { type AdminUserRow, useAdminUsers } from '@/hooks/use-admin'

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  super_admin: 'Super admin',
}

export default function AdminAdminsPage() {
  const { data, isLoading, error } = useAdminUsers()
  const admins = data ?? []

  const columns = useMemo<ColumnDef<AdminUserRow>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Nome',
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: 'email',
        header: 'E-mail',
        cell: ({ row }) => (
          <span className="text-muted-foreground truncate block max-w-[260px]">
            {row.original.email}
          </span>
        ),
      },
      {
        accessorKey: 'role',
        header: 'Papel',
        cell: ({ row }) => (
          <Badge variant="outline">{ROLE_LABEL[row.original.role] ?? row.original.role}</Badge>
        ),
      },
      {
        accessorKey: 'is_active',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? 'default' : 'secondary'}>
            {row.original.is_active ? 'Ativo' : 'Inativo'}
          </Badge>
        ),
      },
      {
        accessorKey: 'created_at',
        header: 'Desde',
        meta: {
          headerClassName: 'text-right',
          cellClassName: 'text-right text-sm text-muted-foreground tabular-nums whitespace-nowrap',
        },
        cell: ({ row }) => new Date(row.original.created_at).toLocaleString('pt-BR'),
      },
    ],
    []
  )

  return (
    <AdminPageLayout
      title="Administradores"
      subtitle="Quem pode operar o painel. Inclusão e desativação continuam no banco."
    >
      <AppDataTable
        ariaLabel="Lista de administradores"
        columns={columns}
        data={admins}
        isLoading={isLoading}
        error={error ? (error instanceof Error ? error.message : 'Erro ao carregar') : null}
        emptyIcon={<Users className="size-10 text-muted-foreground/60" />}
        emptyTitle="Nenhum administrador cadastrado"
        getRowId={(row) => row.id}
      />
    </AdminPageLayout>
  )
}
