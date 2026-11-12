import { ConsoleLogger } from './console-logger'
import type { Logger } from './logger.interface'

let loggerInstance: Logger | null = null

/**
 * Factory para criar o logger apropriado
 * Por enquanto, sempre retorna ConsoleLogger
 * No futuro, pode retornar StructuredLogger para produção
 */
export function createLogger(): Logger {
  if (loggerInstance) {
    return loggerInstance
  }

  loggerInstance = new ConsoleLogger()
  return loggerInstance
}

/**
 * Obtém a instância singleton do logger
 */
export function getLogger(): Logger {
  return createLogger()
}
