// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * Neural Error Handler
 * 
 * Single Responsibility: Handle all error processing and recovery
 * Provides structured error handling for the Orch-Mind neural system
 */

import { Logger } from './Logger';

export interface ErrorContext {
  component: string;
  operation: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
}

export interface NeuralError extends Error {
  context?: ErrorContext;
  originalError?: Error;
  neuroCause?: string;
}

export class ErrorHandler {
  private logger: Logger;
  private errorCallbacks: ((error: NeuralError) => void)[] = [];

  constructor(logger: Logger) {
    this.logger = logger.createChild('ErrorHandler');
  }

  /**
   * Set up global error handlers for the renderer process
   */
  setupGlobalHandlers(): void {
    // Handle uncaught exceptions
    window.addEventListener('error', (event) => {
      const neuralError = this.createNeuralError(
        event.error || new Error(event.message),
        {
          component: 'Renderer',
          operation: 'WindowError',
          timestamp: new Date(),
          severity: 'high',
          recoverable: true
        }
      );
      
      this.handleError(neuralError);
      event.preventDefault();
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const neuralError = this.createNeuralError(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        {
          component: 'Renderer',
          operation: 'UnhandledPromise',
          timestamp: new Date(),
          severity: 'medium',
          recoverable: true
        }
      );
      
      this.handleError(neuralError);
      event.preventDefault();
    });

    this.logger.success('Global error handlers established');
  }

  /**
   * Handle a neural error with appropriate logging and recovery
   */
  handleError(error: NeuralError): void {
    const severity = error.context?.severity || 'medium';
    
    // Log with appropriate level
    switch (severity) {
      case 'low':
        this.logger.warn(`Neural warning: ${error.message}`, error);
        break;
      case 'medium':
        this.logger.error(`Neural error: ${error.message}`, error);
        break;
      case 'high':
      case 'critical':
        this.logger.critical(`Neural critical error: ${error.message}`, error);
        break;
    }

    // Notify registered callbacks
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (callbackError) {
        this.logger.error('Error in error callback', callbackError);
      }
    });

    // Attempt recovery if specified
    if (error.context?.recoverable) {
      this.attemptRecovery(error);
    }
  }

  /**
   * Handle critical errors that threaten system stability
   */
  handleCriticalError(error: Error): void {
    const neuralError = this.createNeuralError(error, {
      component: 'System',
      operation: 'CriticalFailure',
      timestamp: new Date(),
      severity: 'critical',
      recoverable: false
    });

    this.handleError(neuralError);
    
    // For critical errors, we should notify the main process
    console.error('CRITICAL NEURAL SYSTEM ERROR:', error);
  }

  /**
   * Wrap async operations with error handling
   */
  async wrapAsync<T>(
    operation: () => Promise<T>,
    context: Partial<ErrorContext>
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const neuralError = this.createNeuralError(
        error instanceof Error ? error : new Error(String(error)),
        {
          component: context.component || 'Unknown',
          operation: context.operation || 'AsyncOperation',
          timestamp: new Date(),
          severity: context.severity || 'medium',
          recoverable: context.recoverable ?? true
        }
      );
      
      this.handleError(neuralError);
      throw neuralError;
    }
  }

  /**
   * Wrap sync operations with error handling
   */
  wrapSync<T>(
    operation: () => T,
    context: Partial<ErrorContext>
  ): T {
    try {
      return operation();
    } catch (error) {
      const neuralError = this.createNeuralError(
        error instanceof Error ? error : new Error(String(error)),
        {
          component: context.component || 'Unknown',
          operation: context.operation || 'SyncOperation',
          timestamp: new Date(),
          severity: context.severity || 'medium',
          recoverable: context.recoverable ?? true
        }
      );
      
      this.handleError(neuralError);
      throw neuralError;
    }
  }

  /**
   * Register error callback for custom error handling
   */
  onError(callback: (error: NeuralError) => void): () => void {
    this.errorCallbacks.push(callback);
    
    return () => {
      const index = this.errorCallbacks.indexOf(callback);
      if (index >= 0) {
        this.errorCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Create a neural error with context
   */
  private createNeuralError(originalError: Error, context: ErrorContext): NeuralError {
    const neuralError: NeuralError = new Error(originalError.message);
    neuralError.name = 'NeuralError';
    neuralError.stack = originalError.stack;
    neuralError.context = context;
    neuralError.originalError = originalError;
    neuralError.neuroCause = this.inferNeuralCause(originalError, context);
    
    return neuralError;
  }

  /**
   * Infer neural cause from error patterns
   */
  private inferNeuralCause(error: Error, context: ErrorContext): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'Neural network connectivity disruption';
    }
    
    if (message.includes('memory') || message.includes('allocation')) {
      return 'Neural memory resource exhaustion';
    }
    
    if (message.includes('timeout')) {
      return 'Neural processing timeout exceeded';
    }
    
    if (message.includes('permission') || message.includes('access')) {
      return 'Neural system access violation';
    }
    
    if (context.component.includes('DuckDB')) {
      return 'Neural database synchronization failure';
    }
    
    return 'Unknown neural system disruption';
  }

  /**
   * Attempt automatic recovery from recoverable errors
   */
  private attemptRecovery(error: NeuralError): void {
    if (!error.context?.recoverable) return;

    this.logger.info(`Attempting neural recovery for: ${error.context.component}`);
    
    // Recovery strategies based on component and operation
    switch (error.context.component) {
      case 'DuckDB':
        this.logger.info('Attempting DuckDB connection recovery...');
        // Could trigger re-initialization
        break;
        
      case 'IPC':
        this.logger.info('Attempting IPC communication recovery...');
        // Could retry the operation
        break;
        
      default:
        this.logger.info('Generic recovery attempt - logging for analysis');
        break;
    }
  }
}