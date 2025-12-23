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
 * - Supports log level preferences managed by profile settings
 */

import { useLogStore } from '../stores/logs';
import { sanitizeLogMessage, sanitizeObject, sanitizeLogArgs } from './log-sanitizer';
import { LogLevel } from './log-level';

interface LogContext {
  component?: string;
  action?: string;
  [key: string]: unknown;
}

class Logger {
  private level: LogLevel;
  private isDev: boolean;

  constructor() {
    this.isDev = this.resolveIsDev();
    // Default to INFO in production to ensure logs are visible in simulator/device
    this.level = this.isDev ? LogLevel.DEBUG : LogLevel.INFO;
  }

  private resolveIsDev(): boolean {
    if (typeof import.meta !== 'undefined' && import.meta.env && typeof import.meta.env.DEV === 'boolean') {
      return import.meta.env.DEV;
    }
    if (typeof process !== 'undefined' && process.env && typeof process.env.NODE_ENV === 'string') {
      return process.env.NODE_ENV !== 'production';
    }
    return false;
  }

  /**
   * Set the current log level.
   */
  setLevel(level: LogLevel): void {
    this.level = level;
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

    // Prepare context for console (exclude component/action as they are in prefix)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { component, action, ...consoleContext } = sanitizedContext;
    const hasContext = Object.keys(consoleContext).length > 0;

    // Log sanitized data to console
    const consoleArgs: unknown[] = [prefix, sanitizedMessage];
    if (hasContext) {
      consoleArgs.push(consoleContext);
    }
    if (sanitizedArgs.length > 0) {
      consoleArgs.push(...sanitizedArgs);
    }

    console.log(...consoleArgs);

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

  // Helper method to create component loggers
  private createComponentLogger(componentName: string, message: string, level: LogLevel, details?: unknown): void {
    if (level < LogLevel.DEBUG || level > LogLevel.ERROR) return;

    const context = { component: componentName };

    switch (level) {
      case LogLevel.DEBUG:
        if (details !== undefined && details !== null && !(typeof details === 'object' && Object.keys(details as object).length === 0)) {
          this.debug(message, context, details);
        } else {
          this.debug(message, context);
        }
        break;
      case LogLevel.INFO:
        if (details !== undefined && details !== null && !(typeof details === 'object' && Object.keys(details as object).length === 0)) {
          this.info(message, context, details);
        } else {
          this.info(message, context);
        }
        break;
      case LogLevel.WARN:
        if (details !== undefined && details !== null && !(typeof details === 'object' && Object.keys(details as object).length === 0)) {
          this.warn(message, context, details);
        } else {
          this.warn(message, context);
        }
        break;
      case LogLevel.ERROR:
        if (details !== undefined && details !== null && !(typeof details === 'object' && Object.keys(details as object).length === 0)) {
          this.error(message, context, details);
        } else {
          this.error(message, context);
        }
        break;
    }
  }

  // Component-specific loggers (alphabetically ordered)
  api(message: string, level: LogLevel = LogLevel.DEBUG, details?: unknown): void {
    this.createComponentLogger('API', message, level, details);
  }

  app(message: string, level: LogLevel, details?: unknown): void {
    this.createComponentLogger('App', message, level, details);
  }

  auth(message: string, level: LogLevel = LogLevel.INFO, details?: unknown): void {
    this.createComponentLogger('Auth', message, level, details);
  }

  crypto(message: string, level: LogLevel, details?: unknown): void {
    this.createComponentLogger('Crypto', message, level, details);
  }

  dashboard(message: string, level: LogLevel, details?: unknown): void {
    this.createComponentLogger('Dashboard', message, level, details);
  }

  discovery(message: string, level: LogLevel, details?: unknown): void {
    this.createComponentLogger('Discovery', message, level, details);
  }

  download(message: string, level: LogLevel, details?: unknown): void {
    this.createComponentLogger('Download', message, level, details);
  }

  errorBoundary(message: string, level: LogLevel, details?: unknown): void {
    this.createComponentLogger('ErrorBoundary', message, level, details);
  }

  eventCard(message: string, level: LogLevel, details?: unknown): void {
    this.createComponentLogger('EventCard', message, level, details);
  }

  eventDetail(message: string, level: LogLevel, details?: unknown): void {
    this.createComponentLogger('EventDetail', message, level, details);
  }

  eventMontage(message: string, level: LogLevel, details?: unknown): void {
    this.createComponentLogger('EventMontage', message, level, details);
  }

  http(message: string, level: LogLevel, details?: unknown): void {
    this.createComponentLogger('HTTP', message, level, details);
  }

  imageError(message: string, level: LogLevel, details?: unknown): void {
    this.createComponentLogger('ImageError', message, level, details);
  }

  monitor(message: string, level: LogLevel = LogLevel.DEBUG, details?: unknown): void {
    this.createComponentLogger('Monitor', message, level, details);
  }

  monitorCard(message: string, level: LogLevel, details?: unknown): void {
    this.createComponentLogger('MonitorCard', message, level, details);
  }

  monitorDetail(message: string, level: LogLevel, details?: unknown): void {
    this.createComponentLogger('MonitorDetail', message, level, details);
  }

  montageMonitor(message: string, level: LogLevel, details?: unknown): void {
    this.createComponentLogger('MontageMonitor', message, level, details);
  }

  navigation(message: string, level: LogLevel, details?: unknown): void {
    this.createComponentLogger('Navigation', message, level, details);
  }

  notificationHandler(message: string, level: LogLevel, details?: unknown): void {
    this.createComponentLogger('NotificationHandler', message, level, details);
  }

  notifications(message: string, level: LogLevel, details?: unknown): void {
    this.createComponentLogger('Notifications', message, level, details);
  }

  notificationSettings(message: string, level: LogLevel, details?: unknown): void {
    this.createComponentLogger('NotificationSettings', message, level, details);
  }

  profile(message: string, level: LogLevel = LogLevel.INFO, details?: unknown): void {
    this.createComponentLogger('Profile', message, level, details);
  }

  profileForm(message: string, level: LogLevel, details?: unknown): void {
    this.createComponentLogger('ProfileForm', message, level, details);
  }

  profileService(message: string, level: LogLevel, details?: unknown): void {
    this.createComponentLogger('ProfileService', message, level, details);
  }

  profileSwitcher(message: string, level: LogLevel, details?: unknown): void {
    this.createComponentLogger('ProfileSwitcher', message, level, details);
  }

  push(message: string, level: LogLevel, details?: unknown): void {
    this.createComponentLogger('Push', message, level, details);
  }

  queryCache(message: string, level: LogLevel, details?: unknown): void {
    this.createComponentLogger('QueryCache', message, level, details);
  }

  secureImage(message: string, level: LogLevel, details?: unknown): void {
    this.createComponentLogger('SecureImage', message, level, details);
  }

  secureStorage(message: string, level: LogLevel, details?: unknown): void {
    this.createComponentLogger('SecureStorage', message, level, details);
  }

  server(message: string, level: LogLevel, details?: unknown): void {
    this.createComponentLogger('Server', message, level, details);
  }

  time(message: string, level: LogLevel, details?: unknown): void {
    this.createComponentLogger('Time', message, level, details);
  }

  videoMarkers(message: string, level: LogLevel, details?: unknown): void {
    this.createComponentLogger('VideoMarkers', message, level, details);
  }

  videoPlayer(message: string, level: LogLevel, details?: unknown): void {
    this.createComponentLogger('VideoPlayer', message, level, details);
  }

  zmsEventPlayer(message: string, level: LogLevel, details?: unknown): void {
    this.createComponentLogger('ZmsEventPlayer', message, level, details);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience methods
export { LogLevel } from './log-level';

export const log = {
  debug: (message: string, context?: LogContext, ...args: unknown[]) =>
    logger.debug(message, context, ...args),
  info: (message: string, context?: LogContext, ...args: unknown[]) =>
    logger.info(message, context, ...args),
  warn: (message: string, context?: LogContext, ...args: unknown[]) =>
    logger.warn(message, context, ...args),
  error: (message: string, context?: LogContext, error?: Error | unknown, ...args: unknown[]) =>
    logger.error(message, context, error, ...args),

  // Component-specific loggers
  api: (message: string, level: LogLevel = LogLevel.DEBUG, details?: unknown) => logger.api(message, level, details),
  app: (message: string, level: LogLevel, details?: unknown) => logger.app(message, level, details),
  auth: (message: string, level: LogLevel = LogLevel.INFO, details?: unknown) => logger.auth(message, level, details),
  crypto: (message: string, level: LogLevel, details?: unknown) => logger.crypto(message, level, details),
  dashboard: (message: string, level: LogLevel, details?: unknown) => logger.dashboard(message, level, details),
  discovery: (message: string, level: LogLevel, details?: unknown) => logger.discovery(message, level, details),
  download: (message: string, level: LogLevel, details?: unknown) => logger.download(message, level, details),
  errorBoundary: (message: string, level: LogLevel, details?: unknown) => logger.errorBoundary(message, level, details),
  eventCard: (message: string, level: LogLevel, details?: unknown) => logger.eventCard(message, level, details),
  eventDetail: (message: string, level: LogLevel, details?: unknown) => logger.eventDetail(message, level, details),
  eventMontage: (message: string, level: LogLevel, details?: unknown) => logger.eventMontage(message, level, details),
  http: (message: string, level: LogLevel, details?: unknown) => logger.http(message, level, details),
  imageError: (message: string, level: LogLevel, details?: unknown) => logger.imageError(message, level, details),
  monitor: (message: string, level: LogLevel = LogLevel.DEBUG, details?: unknown) => logger.monitor(message, level, details),
  monitorCard: (message: string, level: LogLevel, details?: unknown) => logger.monitorCard(message, level, details),
  monitorDetail: (message: string, level: LogLevel, details?: unknown) => logger.monitorDetail(message, level, details),
  montageMonitor: (message: string, level: LogLevel, details?: unknown) => logger.montageMonitor(message, level, details),
  navigation: (message: string, level: LogLevel, details?: unknown) => logger.navigation(message, level, details),
  notificationHandler: (message: string, level: LogLevel, details?: unknown) => logger.notificationHandler(message, level, details),
  notifications: (message: string, level: LogLevel, details?: unknown) => logger.notifications(message, level, details),
  notificationSettings: (message: string, level: LogLevel, details?: unknown) => logger.notificationSettings(message, level, details),
  profile: (message: string, level: LogLevel = LogLevel.INFO, details?: unknown) => logger.profile(message, level, details),
  profileForm: (message: string, level: LogLevel, details?: unknown) => logger.profileForm(message, level, details),
  profileService: (message: string, level: LogLevel, details?: unknown) => logger.profileService(message, level, details),
  profileSwitcher: (message: string, level: LogLevel, details?: unknown) => logger.profileSwitcher(message, level, details),
  push: (message: string, level: LogLevel, details?: unknown) => logger.push(message, level, details),
  queryCache: (message: string, level: LogLevel, details?: unknown) => logger.queryCache(message, level, details),
  secureImage: (message: string, level: LogLevel, details?: unknown) => logger.secureImage(message, level, details),
  secureStorage: (message: string, level: LogLevel, details?: unknown) => logger.secureStorage(message, level, details),
  server: (message: string, level: LogLevel, details?: unknown) => logger.server(message, level, details),
  time: (message: string, level: LogLevel, details?: unknown) => logger.time(message, level, details),
  videoMarkers: (message: string, level: LogLevel, details?: unknown) => logger.videoMarkers(message, level, details),
  videoPlayer: (message: string, level: LogLevel, details?: unknown) => logger.videoPlayer(message, level, details),
  zmsEventPlayer: (message: string, level: LogLevel, details?: unknown) => logger.zmsEventPlayer(message, level, details),
};
