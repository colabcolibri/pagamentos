declare module '@brazilian-utils/brazilian-utils' {
  export function formatCPF(value: string | number, options?: { pad?: boolean }): string
  export function formatCNPJ(value: string | number, options?: { pad?: boolean }): string
  export function isValidCPF(value: string): boolean
  export function isValidCNPJ(value: string): boolean
}
