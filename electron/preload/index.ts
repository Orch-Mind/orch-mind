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

import { contextBridge } from "electron";
import { ElectronAPIFactory } from "./services/ElectronAPIFactory";
import { ErrorHandler } from "./utils/ErrorHandler";
import { Logger } from "./utils/Logger";

// Initialize logging and error handling first
const logger = new Logger("Preload");
const errorHandler = new ErrorHandler(logger);

logger.info("Neural preload script initializing...");

// Set up global error handlers for the renderer process
errorHandler.setupGlobalHandlers();

// Import types

async function initializeElectronAPI(): Promise<void> {
  try {
    // Create API using the factory
    const apiFactory = new ElectronAPIFactory(logger);
    const electronAPI = await apiFactory.createAPI();

    // Expose the API securely using contextBridge
    contextBridge.exposeInMainWorld("electronAPI", electronAPI);

    logger.success("ElectronAPI successfully exposed to renderer");
    logger.info("Available API methods:", Object.keys(electronAPI));

    // Setup additional services
    apiFactory.setupFocusRestoration();
  } catch (error) {
    logger.error("Failed to initialize ElectronAPI:", error);
    // Fallback partial API with error
    contextBridge.exposeInMainWorld("electronAPI", {
      error:
        error instanceof Error ? error.message : "Unknown initialization error",
    });
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeElectronAPI);
} else {
  initializeElectronAPI();
}
