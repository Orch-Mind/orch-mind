// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * Neural Logger Utility
 * 
 * Single Responsibility: Handle all logging operations with symbolic awareness
 * Provides structured logging for the Orch-Mind neural system
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  SUCCESS = 2,
  WARN = 3,
  ERROR = 4,
  CRITICAL = 5
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  context: string;
  message: string;
  data?: unknown;
  error?: Error;
}

export class Logger {
  private context: string;
  private minLevel: LogLevel = LogLevel.DEBUG;

  constructor(context: string) {
    this.context = context;
  }

  /**
   * Set minimum log level to display
   */
  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /**
   * Debug level logging - for development and troubleshooting
   */
  debug(message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Info level logging - general information
   */
  info(message: string, data?: unknown): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Success level logging - positive neural outcomes
   */
  success(message: string, data?: unknown): void {
    this.log(LogLevel.SUCCESS, message, data);
  }

  /**
   * Warning level logging - potential neural issues
   */
  warn(message: string, data?: unknown): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Error level logging - neural system errors
   */
  error(message: string, error?: Error | unknown, data?: unknown): void {
    this.log(LogLevel.ERROR, message, data, error instanceof Error ? error : undefined);
  }

  /**
   * Critical level logging - system-threatening issues
   */
  critical(message: string, error?: Error | unknown, data?: unknown): void {
    this.log(LogLevel.CRITICAL, message, data, error instanceof Error ? error : undefined);
  }

  /**
   * Core logging method with neural symbolic formatting
   */
  private log(level: LogLevel, message: string, data?: unknown, error?: Error): void {
    if (level < this.minLevel) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      context: this.context,
      message,
      data,
      error
    };

    const formattedMessage = this.formatMessage(entry);
    
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage, data);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage, data);
        break;
      case LogLevel.SUCCESS:
        console.log(formattedMessage, data);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, data);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage, error || data);
        break;
      case LogLevel.CRITICAL:
        console.error(formattedMessage, error || data);
        break;
    }
  }

  /**
   * Format log message with neural symbolic indicators
   */
  private formatMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString().split('T')[1].split('.')[0];
    const levelIcon = this.getLevelIcon(entry.level);
    const levelName = LogLevel[entry.level];
    
    return `${timestamp} ${levelIcon} [${entry.context}] ${levelName}: ${entry.message}`;
  }

  /**
   * Get symbolic icon for log level
   */
  private getLevelIcon(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG: return '🔍';
      case LogLevel.INFO: return 'ℹ️';
      case LogLevel.SUCCESS: return '✅';
      case LogLevel.WARN: return '⚠️';
      case LogLevel.ERROR: return '❌';
      case LogLevel.CRITICAL: return '🚨';
      default: return '🧠';
    }
  }

  /**
   * Create child logger with extended context
   */
  createChild(childContext: string): Logger {
    const child = new Logger(`${this.context}:${childContext}`);
    child.setMinLevel(this.minLevel);
    return child;
  }
} 