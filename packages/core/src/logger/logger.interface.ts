/**
 * Níveis de log
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Contexto adicional para logs
 */
export interface LogContext {
  userId?: string
  requestId?: string
  module?: string
  action?: string
  [key: string]: unknown
}

/**
 * Interface do Logger
 */
export interface Logger {
  /**
   * Log de debug (apenas em desenvolvimento)
   */
  debug(message: string, context?: LogContext): void

  /**
   * Log informativo
   */
  info(message: string, context?: LogContext): void

  /**
   * Log de aviso
   */
  warn(message: string, context?: LogContext): void

  /**
   * Log de erro
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void
}

