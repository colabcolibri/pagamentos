// Interface
export { LogLevel } from './logger.interface'
export type { LogContext, Logger } from './logger.interface'

// Implementação
export { ConsoleLogger } from './console-logger'

// Factory
export { createLogger, getLogger } from './logger-factory'

