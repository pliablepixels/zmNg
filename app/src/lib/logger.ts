/**
 * Centralized Logging Utility
 * 
 * Provides a structured logging system with support for log levels, context, and sanitization.
 * Logs are output to the console and also persisted to an in-memory store (via useLogStore)
 * for display in the application's debug/logs view.
 * 
 * Features:
 * - Log levels (DEBUG, INFO, WARN, ERROR)
 * - Automatic sanitization of sensitive data (passwords, tokens)
 * - Context-aware logging (component, action)
 * - Specialized helpers for common domains (API, Auth, Profile, Monitor)
 * - Persists log level preference to localStorage
 */

import { useLogStore } from '../stores/logs';
import { sanitizeLogMessage, sanitizeObject, sanitizeLogArgs } from './log-sanitizer';

export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4,
} as const;

export type LogLevel = typeof LogLevel[keyof typeof LogLevel];

interface LogContext {
  component?: string;
  action?: string;
  [key: string]: unknown;
}

class Logger {
  private level: LogLevel;
  private isDev: boolean;

  constructor() {
    this.isDev = import.meta.env.DEV;
    // Check for saved log level
    const savedLevel = typeof localStorage !== 'undefined' ? localStorage.getItem('zm_log_level') : null;

    if (savedLevel !== null && !isNaN(parseInt(savedLevel, 10))) {
      this.level = parseInt(savedLevel, 10) as LogLevel;
    } else {
      // Default to INFO in production to ensure logs are visible in simulator/device
      this.level = this.isDev ? LogLevel.DEBUG : LogLevel.INFO;
    }
  }

  /**
   * Set the current log level.
   * Persists the choice to localStorage.
   */
  setLevel(level: LogLevel): void {
    this.level = level;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('zm_log_level', level.toString());
    }
  }

  /**
   * Get the current log level.
   */
  getLevel(): LogLevel {
    return this.level;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level;
  }

  private formatMessage(level: string, context: LogContext, message: string, ...args: unknown[]): void {
    const timestamp = new Date().toLocaleString();
    const contextStr = context.component ? `[${context.component}]` : '';
    const actionStr = context.action ? `{${context.action}}` : '';

    const prefix = `${timestamp} ${level} ${contextStr}${actionStr}`;

    // Sanitize before logging to console and store
    const sanitizedMessage = sanitizeLogMessage(message);
    const sanitizedContext = sanitizeObject(context) as LogContext;
    const sanitizedArgs = args.length > 0 ? sanitizeLogArgs(args) : [];

    // Log sanitized data to console
    if (sanitizedArgs.length > 0) {
      console.log(prefix, sanitizedMessage, ...sanitizedArgs);
    } else {
      console.log(prefix, sanitizedMessage);
    }

    // Add to store
    useLogStore.getState().addLog({
      timestamp,
      level,
      message: sanitizedMessage,
      context: sanitizedContext,
      args: sanitizedArgs.length > 0 ? sanitizedArgs : undefined,
    });
  }

  debug(message: string, context: LogContext = {}, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.formatMessage('DEBUG', context, message, ...args);
    }
  }

  info(message: string, context: LogContext = {}, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.formatMessage('INFO', context, message, ...args);
    }
  }

  warn(message: string, context: LogContext = {}, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.formatMessage('WARN', context, message, ...args);
    }
  }

  error(message: string, context: LogContext = {}, error?: Error | unknown, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.formatMessage('ERROR', context, message, error, ...args);
      if (error instanceof Error && error.stack) {
        console.error(error.stack);
      }
    }
  }

  // Specialized loggers for common contexts
  api(message: string, details?: unknown): void {
    if (details !== undefined && details !== null && !(typeof details === 'object' && Object.keys(details as object).length === 0)) {
      this.debug(message, { component: 'API' }, details);
    } else {
      this.debug(message, { component: 'API' });
    }
  }

  auth(message: string, details?: unknown): void {
    if (details !== undefined && details !== null && !(typeof details === 'object' && Object.keys(details as object).length === 0)) {
      this.info(message, { component: 'Auth' }, details);
    } else {
      this.info(message, { component: 'Auth' });
    }
  }

  profile(message: string, details?: unknown): void {
    if (details !== undefined && details !== null && !(typeof details === 'object' && Object.keys(details as object).length === 0)) {
      this.info(message, { component: 'Profile' }, details);
    } else {
      this.info(message, { component: 'Profile' });
    }
  }

  monitor(message: string, details?: unknown): void {
    if (details !== undefined && details !== null && !(typeof details === 'object' && Object.keys(details as object).length === 0)) {
      this.debug(message, { component: 'Monitor' }, details);
    } else {
      this.debug(message, { component: 'Monitor' });
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience methods
export const log = {
  debug: (message: string, context?: LogContext, ...args: unknown[]) =>
    logger.debug(message, context, ...args),
  info: (message: string, context?: LogContext, ...args: unknown[]) =>
    logger.info(message, context, ...args),
  warn: (message: string, context?: LogContext, ...args: unknown[]) =>
    logger.warn(message, context, ...args),
  error: (message: string, context?: LogContext, error?: Error | unknown, ...args: unknown[]) =>
    logger.error(message, context, error, ...args),
  api: (message: string, details?: unknown) => logger.api(message, details),
  auth: (message: string, details?: unknown) => logger.auth(message, details),
  profile: (message: string, details?: unknown) => logger.profile(message, details),
  monitor: (message: string, details?: unknown) => logger.monitor(message, details),
};
