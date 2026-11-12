import { type LogContext, LogLevel, type Logger } from './logger.interface'

/**
 * Logger que usa console (desenvolvimento)
 */
export class ConsoleLogger implements Logger {
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const levelEmoji = this.getLevelEmoji(level)
    const contextStr = context ? ` ${JSON.stringify(context)}` : ''

    return `[${timestamp}] ${levelEmoji} ${message}${contextStr}`
  }

  private getLevelEmoji(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return '🔍'
      case LogLevel.INFO:
        return 'ℹ️'
      case LogLevel.WARN:
        return '⚠️'
      case LogLevel.ERROR:
        return '❌'
      default:
        return '📝'
    }
  }

  private isDevelopment(): boolean {
    return (
      typeof process !== 'undefined' &&
      process.env?.NODE_ENV !== 'production' &&
      process.env?.NODE_ENV !== 'production'
    )
  }

  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment()) {
      console.debug(this.formatMessage(LogLevel.DEBUG, message, context))
    }
  }

  info(message: string, context?: LogContext): void {
    console.info(this.formatMessage(LogLevel.INFO, message, context))
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage(LogLevel.WARN, message, context))
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext: LogContext = {
      ...context,
      error:
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
              name: error.name,
            }
          : error,
    }

    console.error(this.formatMessage(LogLevel.ERROR, message, errorContext))
  }
}

