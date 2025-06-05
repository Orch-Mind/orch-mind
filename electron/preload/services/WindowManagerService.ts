// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * Window Management Service
 * 
 * Single Responsibility: Handle all window-related operations
 * Provides window control functionality for the neural interface
 */

import { ipcRenderer } from 'electron';
import { IWindowManager, NeuralResponse } from '../interfaces/IElectronAPI';
import { ErrorHandler } from '../utils/ErrorHandler';
import { Logger } from '../utils/Logger';

export class WindowManagerService implements IWindowManager {
  private logger: Logger;
  private errorHandler: ErrorHandler;

  constructor(logger: Logger, errorHandler: ErrorHandler) {
    this.logger = logger.createChild('WindowManager');
    this.errorHandler = errorHandler;
  }

  /**
   * Toggle main window visibility
   */
  async toggleMainWindow(): Promise<NeuralResponse> {
    return this.errorHandler.wrapAsync(async () => {
      this.logger.debug('Toggling main window visibility');
      
      const result = await ipcRenderer.invoke('toggle-window');
      
      this.logger.success('Window toggle completed', result);
      return result;
    }, {
      component: 'WindowManager',
      operation: 'toggleMainWindow',
      severity: 'low'
    });
  }

  /**
   * Minimize the current window
   */
  minimizeWindow(): void {
    this.errorHandler.wrapSync(() => {
      this.logger.debug('Minimizing window');
      ipcRenderer.send('minimize-window');
      this.logger.success('Window minimize command sent');
    }, {
      component: 'WindowManager',
      operation: 'minimizeWindow',
      severity: 'low'
    });
  }

  /**
   * Close the current window
   */
  closeWindow(): void {
    this.errorHandler.wrapSync(() => {
      this.logger.debug('Closing window');
      ipcRenderer.send('close-window');
      this.logger.success('Window close command sent');
    }, {
      component: 'WindowManager',
      operation: 'closeWindow',
      severity: 'medium'
    });
  }

  /**
   * Get current platform information
   */
  getPlatform(): string {
    return this.errorHandler.wrapSync(() => {
      const platform = process.platform;
      this.logger.debug('Platform retrieved', { platform });
      return platform;
    }, {
      component: 'WindowManager',
      operation: 'getPlatform',
      severity: 'low'
    });
  }

  /**
   * Set up focus restoration for enhanced UX
   */
  setupFocusRestoration(): void {
    this.errorHandler.wrapSync(() => {
      ipcRenderer.on('restore-focus', () => {
        try {
          const activeElement = document.activeElement as HTMLElement;
          if (activeElement && typeof activeElement.focus === 'function') {
            activeElement.focus();
            this.logger.debug('Focus restored to active element');
          }
        } catch (error) {
          this.logger.warn('Failed to restore focus', error);
        }
      });
      
      this.logger.success('Focus restoration handler registered');
    }, {
      component: 'WindowManager',
      operation: 'setupFocusRestoration',
      severity: 'low'
    });
  }
} 