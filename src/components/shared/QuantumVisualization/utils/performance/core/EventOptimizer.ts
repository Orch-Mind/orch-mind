// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { NON_PASSIVE_EVENT_OPTIONS, PASSIVE_EVENT_OPTIONS, PASSIVE_EVENT_TYPES } from './PerformanceConstants';

/**
 * Event Optimizer for Orch-OS Neural Processing
 * Single Responsibility: Event listener optimization and passive event handling
 */
export class EventOptimizer {
  private static originalAddEventListener = EventTarget.prototype.addEventListener;
  private static originalRemoveEventListener = EventTarget.prototype.removeEventListener;
  private static isOptimized = false;

  /**
   * Configures global passive event listeners optimization
   */
  static configurePassiveEvents(): () => void {
    if (EventOptimizer.isOptimized) {
      return () => {}; // Already optimized
    }

    EventOptimizer.overrideEventListeners();
    EventOptimizer.addGlobalStyles();
    EventOptimizer.isOptimized = true;

    return EventOptimizer.cleanup;
  }

  /**
   * Overrides addEventListener to force passive events where appropriate
   */
  private static overrideEventListeners(): void {
    EventTarget.prototype.addEventListener = function(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ) {
      // Convert boolean options to object format
      let optionsObj: AddEventListenerOptions = {};
      
      if (typeof options === 'boolean') {
        optionsObj = { capture: options };
      } else if (options) {
        optionsObj = { ...options };
      }

      // Force passive: true for problematic events if not explicitly set to false
      if (PASSIVE_EVENT_TYPES.has(type) && optionsObj.passive !== false) {
        optionsObj.passive = true;
      }

      return EventOptimizer.originalAddEventListener.call(this, type, listener, optionsObj);
    };
  }

  /**
   * Adds global CSS styles for touch optimization
   */
  private static addGlobalStyles(): void {
    if (typeof document === 'undefined') return;

    const style = document.createElement('style');
    style.id = 'quantum-performance-styles';
    style.textContent = `
      * {
        touch-action: manipulation;
      }
      
      .quantum-three-canvas {
        touch-action: none;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Cleans up optimizations and restores original behavior
   */
  private static cleanup(): void {
    if (!EventOptimizer.isOptimized) return;

    EventTarget.prototype.addEventListener = EventOptimizer.originalAddEventListener;
    EventTarget.prototype.removeEventListener = EventOptimizer.originalRemoveEventListener;

    const style = document.getElementById('quantum-performance-styles');
    if (style) {
      document.head.removeChild(style);
    }

    EventOptimizer.isOptimized = false;
  }

  /**
   * Optimizes specific canvas elements for OrbitControls
   */
  static optimizeCanvasElements(): void {
    if (typeof document === 'undefined') return;

    const canvasElements = document.querySelectorAll('.quantum-three-canvas');
    
    canvasElements.forEach(canvas => {
      if (canvas instanceof HTMLElement) {
        // Set specific touch-action for better OrbitControls performance
        canvas.style.touchAction = 'none';
        
        // Add passive event listeners for common gestures
        const passiveOptions = { passive: true };
        
        ['wheel', 'touchstart', 'touchmove'].forEach(eventType => {
          canvas.addEventListener(eventType, () => {}, passiveOptions);
        });
      }
    });
  }

  /**
   * Gets the appropriate event options for a given event type
   */
  static getEventOptions(eventType: string, forcePassive = false): AddEventListenerOptions {
    if (forcePassive || PASSIVE_EVENT_TYPES.has(eventType)) {
      return PASSIVE_EVENT_OPTIONS;
    }
    
    return NON_PASSIVE_EVENT_OPTIONS;
  }

  /**
   * Fixes passive event listener issues with OrbitControls
   */
  static fixOrbitControlsEvents(): void {
    if (typeof document === 'undefined') return;

    // Wait for React Three Fiber to mount
    setTimeout(() => {
      const canvasElements = document.querySelectorAll('canvas');
      
      canvasElements.forEach(canvas => {
        if (canvas.parentElement?.classList.contains('quantum-three-canvas') || 
            canvas.closest('.quantum-three-canvas')) {
          
          // Override addEventListener for wheel events
          const originalAddEventListener = canvas.addEventListener.bind(canvas);
          
          canvas.addEventListener = function(type: string, listener: any, options?: any) {
            // Force non-passive for wheel events to allow preventDefault
            if (type === 'wheel' || type === 'mousewheel') {
              const nonPassiveOptions = typeof options === 'object' 
                ? { ...options, passive: false }
                : { passive: false };
              return originalAddEventListener(type, listener, nonPassiveOptions);
            }
            return originalAddEventListener(type, listener, options);
          };
          
          // Also set touch-action for better mobile support
          canvas.style.touchAction = 'none';
        }
      });
    }, 100); // Small delay to ensure canvas is mounted
  }
}

// Export convenience functions
export const configurePassiveEvents = EventOptimizer.configurePassiveEvents;
export const optimizeCanvasElements = EventOptimizer.optimizeCanvasElements;
export const getEventOptions = EventOptimizer.getEventOptions; 