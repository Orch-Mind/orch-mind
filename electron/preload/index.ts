// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * Main Preload Script - Orch-OS Neural System
 * 
 * Follows SOLID principles and Electron best practices:
 * - Single Responsibility: Each service handles one concern
 * - Open/Closed: Easy to extend without modifying existing code
 * - Liskov Substitution: Proper interface adherence
 * - Interface Segregation: Small, focused interfaces
 * - Dependency Inversion: Depends on abstractions, not concretions
 */

import { contextBridge } from 'electron';
import { ErrorHandler } from './utils/ErrorHandler';
import { ElectronAPIFactory } from './services/ElectronAPIFactory';
import { Logger } from './utils/Logger';

// Initialize logging and error handling first
const logger = new Logger('PRELOAD');
const errorHandler = new ErrorHandler(logger);

logger.info('Neural preload script initializing...');

// Set up global error handlers for the renderer process
errorHandler.setupGlobalHandlers();

async function initializeElectronAPI(): Promise<void> {
  try {
    // Create the API factory and build the complete API
    const apiFactory = new ElectronAPIFactory(logger);
    const electronAPI = await apiFactory.createAPI();
    
    // Expose the API to the renderer process through contextBridge
    contextBridge.exposeInMainWorld('electronAPI', electronAPI);
    
    logger.success('ElectronAPI successfully exposed to renderer');
    logger.info('Available API methods:', Object.keys(electronAPI));
    
    // Set up focus restoration for enhanced UX
    apiFactory.setupFocusRestoration();
    
  } catch (error) {
    logger.error('Failed to initialize ElectronAPI:', error);
    errorHandler.handleCriticalError(error as Error);
  }
}

// Initialize the API immediately
initializeElectronAPI().catch((error) => {
  console.error('Critical failure during preload initialization:', error);
}); 