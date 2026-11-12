'use client'

import { useAdminUsers } from '@/hooks/use-admin'

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  super_admin: 'Super admin',
}

export default function AdminAdminsPage() {
  const { data, isLoading, error } = useAdminUsers()
  const admins = data ?? []

  return (
    <div className="mx-auto w-full max-w-5xl overflow-x-hidden px-4 py-6 sm:px-6">
      <h1 className="text-xl font-semibold text-foreground">Administradores</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Quem pode operar o painel. Inclusão e desativação continuam no banco.
      </p>
      {error ? (
        <p className="mt-4 text-sm text-destructive">
          {error instanceof Error ? error.message : 'Erro ao carregar'}
        </p>
      ) : null}
      <div className="mt-4 overflow-x-auto rounded-md border">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2 font-medium">Nome</th>
              <th className="px-3 py-2 font-medium">E-mail</th>
              <th className="px-3 py-2 font-medium">Papel</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Desde</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="px-3 py-4 text-muted-foreground" colSpan={5}>
                  Carregando…
                </td>
              </tr>
            ) : admins.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-muted-foreground" colSpan={5}>
                  Nenhum administrador cadastrado.
                </td>
              </tr>
            ) : (
              admins.map((admin) => (
                <tr key={admin.id} className="border-t">
                  <td className="px-3 py-2">{admin.name}</td>
                  <td className="px-3 py-2 break-all">{admin.email}</td>
                  <td className="px-3 py-2">{ROLE_LABEL[admin.role] ?? admin.role}</td>
                  <td className="px-3 py-2">{admin.is_active ? 'Ativo' : 'Inativo'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {new Date(admin.created_at).toLocaleString('pt-BR')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
