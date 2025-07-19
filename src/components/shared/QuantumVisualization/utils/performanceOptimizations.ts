// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * Performance Optimizations for Orch-Mind Neural Processing
 * 
 * This file now serves as a compatibility layer that re-exports 
 * the new SOLID architecture implementation.
 * 
 * The new architecture is located in the ./performance/ directory
 * and follows SOLID principles for better maintainability and extensibility.
 */

// Re-export everything from the new SOLID architecture
export * from './performance';

// Import required functions for legacy support
import {
    configurePassiveEvents,
    createPerformanceMonitor,
    createThrottledFunction
} from './performance';

// Maintain backwards compatibility by re-exporting specific functions
// that were previously defined in this file
export {
    createOptimizedMessageHandler,
    NEURAL_FRAME_CONSTRAINTS as NEURAL_FRAME_CONSTRAINTS_LEGACY, NON_PASSIVE_EVENT_OPTIONS as nonPassiveEventOptions, optimizeThreeJSMemory, PASSIVE_EVENT_OPTIONS as passiveEventOptions, useGlobalPassiveEventOptimization, useHeavyTaskManager, useOptimizedAnimationFrame, useOptimizedOrbitControls, useOptimizedQuantumFrame, useThrottledFrame
} from './performance';

// Additional legacy exports with different names for backwards compatibility
import { PerformanceMonitor } from './performance';

export class QuantumPerformanceMonitor extends PerformanceMonitor {
  // Legacy alias - extends the new PerformanceMonitor
}

// Legacy function aliases
export const configurePassiveOrbitControls = () => {
  return configurePassiveEvents();
};

export const usePassiveEventListener = <K extends keyof HTMLElementEventMap>(
  element: HTMLElement | null,
  eventType: K,
  handler: (event: HTMLElementEventMap[K]) => void,
  options?: {
    passive?: boolean;
    capture?: boolean;
    once?: boolean;
  }
) => {
  // Simple implementation for backwards compatibility
  if (!element || typeof window === 'undefined') return;

  const eventOptions = {
    passive: options?.passive ?? true,
    capture: options?.capture ?? false,
    once: options?.once ?? false
  };

  element.addEventListener(eventType, handler as EventListener, eventOptions);

  return () => {
    element.removeEventListener(eventType, handler as EventListener, eventOptions);
  };
};

export const useOptimizedWheelHandler = (
  element: HTMLElement | null,
  onWheel: (deltaY: number, event: WheelEvent) => void,
  enabled: boolean = true
) => {
  if (!element || !enabled || typeof window === 'undefined') return;

  const throttleRef = { current: 0 };
  const THROTTLE_MS = 16; // ~60fps throttling

  const handler = (event: WheelEvent) => {
    const now = performance.now();
    if (now - throttleRef.current >= THROTTLE_MS) {
      throttleRef.current = now;
      
      const deltaY = Math.sign(event.deltaY) * Math.min(Math.abs(event.deltaY), 100);
      
      try {
        onWheel(deltaY, event);
      } catch (error) {
        console.warn('[QuantumPerformance] Wheel handler error:', error);
      }
    }
  };

  element.addEventListener('wheel', handler, { passive: true });

  return () => {
    element.removeEventListener('wheel', handler);
  };
};

// Legacy debounce function
export const usePerformanceDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 100
): T => {
  return createThrottledFunction(callback, delay);
};

export const useQuantumPerformanceAutoOptimization = () => {
  const monitor = createPerformanceMonitor();
  
  return {
    optimizationLevel: 1.0,
    performanceMetrics: monitor
  };
}; 