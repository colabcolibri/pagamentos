/**
 * Logs que só rodam em desenvolvimento (fase 9.7).
 * Use em componentes/hooks client-side; em rotas API e server use getLogger().
 */
const isDev = () => process.env.NODE_ENV === 'development'

export function devLog(...args: unknown[]): void {
  if (isDev()) console.log(...args)
}

export function devError(...args: unknown[]): void {
  if (isDev()) console.error(...args)
}

export function devWarn(...args: unknown[]): void {
  if (isDev()) console.warn(...args)
}
