import { serverEnv } from '@/lib/config/env'

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

  private isDev(): boolean {
    return serverEnv.NODE_ENV === 'development'
  }

  debug(message: string, context?: LogContext): void {
    if (this.isDev()) {
      console.debug(this.formatMessage(LogLevel.DEBUG, message, context))
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.isDev()) {
      console.info(this.formatMessage(LogLevel.INFO, message, context))
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.isDev()) {
      console.warn(this.formatMessage(LogLevel.WARN, message, context))
    }
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (!this.isDev()) return
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
