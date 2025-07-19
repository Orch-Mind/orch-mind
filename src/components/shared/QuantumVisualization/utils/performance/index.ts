// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * Orch-Mind Performance Optimization Suite
 * SOLID Architecture Implementation for Neural Processing Performance
 * 
 * This module follows SOLID principles:
 * - Single Responsibility: Each class/module has one clear purpose
 * - Open/Closed: Extensible through interfaces without modification
 * - Liskov Substitution: Interface implementations are interchangeable
 * - Interface Segregation: Specific interfaces for specific needs
 * - Dependency Inversion: Depend on abstractions, not concretions
 */

// === Core Interfaces (Interface Segregation Principle) ===
export type {
  FrameConstraints,
  IAnimationFrameCallback,
  IAnimationFrameOptimizer,
  IEventOptions, IHeavyTask,
  IHeavyTaskManager, IMemoryOptimizer, IMessageHandler, IOptimizationLevel, IOptimizedMessageHandler, IPassiveEventHandler, IPerformanceConfig, IPerformanceMonitor, PerformanceMetrics
} from './interfaces/PerformanceInterfaces';

// === Core Constants ===
export {
  NEURAL_FRAME_CONSTRAINTS, NON_PASSIVE_EVENT_OPTIONS, PASSIVE_EVENT_OPTIONS, PASSIVE_EVENT_TYPES,
  THROTTLE_DELAYS
} from './core/PerformanceConstants';

// === Core Optimizers (Single Responsibility Principle) ===
export { configurePassiveEvents, EventOptimizer, getEventOptions, optimizeCanvasElements } from './core/EventOptimizer';
export { MemoryOptimizer, memoryOptimizer } from './core/MemoryOptimizer';

// === Managers (Single Responsibility Principle) ===
export { HeavyTaskManager, heavyTaskManager } from './managers/HeavyTaskManager';

// === Monitors (Single Responsibility Principle) ===
export { createPerformanceMonitor, PerformanceMonitor } from './monitors/PerformanceMonitor';

// === Hooks (Open/Closed Principle - extensible) ===
export { useOptimizedAnimationFrame } from './hooks/useOptimizedAnimationFrame';
export { useOptimizedQuantumFrame, useThrottledFrame } from './hooks/useThrottledFrame';

// === Utilities (Single Responsibility Principle) ===
export {
  createDebouncedFunction, createOptimizedMessageHandler,
  createThrottledFunction
} from './utils/MessageHandlerOptimizer';

// === Local Imports for Legacy Functions ===
import { configurePassiveEvents as _configurePassiveEvents, optimizeCanvasElements as _optimizeCanvasElements } from './core/EventOptimizer';
import { memoryOptimizer as _memoryOptimizer } from './core/MemoryOptimizer';
import type { IHeavyTaskManager, IMemoryOptimizer, IPerformanceMonitor } from './interfaces/PerformanceInterfaces';
import { heavyTaskManager as _heavyTaskManager } from './managers/HeavyTaskManager';
import { createPerformanceMonitor as _createPerformanceMonitor } from './monitors/PerformanceMonitor';

// === Backwards Compatibility Exports ===
// These maintain compatibility with the old API while using the new SOLID architecture

/**
 * Legacy hook wrapper that maintains the old API
 */
export function useGlobalPassiveEventOptimization() {
  // Use the new EventOptimizer
  const cleanup = _configurePassiveEvents();
  _optimizeCanvasElements();
  
  return cleanup;
}

/**
 * Legacy hook wrapper for OrbitControls optimization
 */
export function useOptimizedOrbitControls() {
  _optimizeCanvasElements();
}

/**
 * Legacy function wrapper for Three.js memory optimization
 */
export function optimizeThreeJSMemory() {
  _memoryOptimizer.optimize();
}

/**
 * Legacy hook wrapper for heavy task management
 */
export function useHeavyTaskManager() {
  return {
    queueHeavyTask: (task: () => Promise<void>) => 
      _heavyTaskManager.addTask(task, `task-${Date.now()}`)
  };
}

/**
 * Convenience function to initialize all performance optimizations
 * Following the Dependency Inversion Principle - depends on abstractions
 */
export function initializeQuantumPerformanceOptimizations(): () => void {
  const cleanupFunctions: Array<() => void> = [];

  // Initialize event optimizations
  cleanupFunctions.push(_configurePassiveEvents());
  
  // Optimize canvas elements
  _optimizeCanvasElements();
  
  // Initialize memory optimization
  _memoryOptimizer.optimize();

  // Return cleanup function
  return () => {
    cleanupFunctions.forEach(cleanup => cleanup());
  };
}

/**
 * Factory function for creating a complete performance optimization suite
 * Follows Dependency Inversion - you can inject your own implementations
 */
export function createPerformanceOptimizationSuite(config?: {
  memoryOptimizer?: IMemoryOptimizer;
  heavyTaskManager?: IHeavyTaskManager;
  performanceMonitor?: IPerformanceMonitor;
}) {
  return {
    memoryOptimizer: config?.memoryOptimizer || _memoryOptimizer,
    heavyTaskManager: config?.heavyTaskManager || _heavyTaskManager,
    performanceMonitor: config?.performanceMonitor || _createPerformanceMonitor(),
    initialize: initializeQuantumPerformanceOptimizations
  };
} 