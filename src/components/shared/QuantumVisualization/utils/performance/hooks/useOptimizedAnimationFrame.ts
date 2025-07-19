// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useCallback, useEffect, useRef } from 'react';
import { MemoryOptimizer } from '../core/MemoryOptimizer';
import { NEURAL_FRAME_CONSTRAINTS } from '../core/PerformanceConstants';
import type { IAnimationFrameCallback, IAnimationFrameOptimizer } from '../interfaces/PerformanceInterfaces';
import { PerformanceMonitor } from '../monitors/PerformanceMonitor';

/**
 * Optimized Animation Frame Hook for Orch-Mind Neural Processing
 * Single Responsibility: Optimized requestAnimationFrame handling with performance monitoring
 * 
 * Performance Optimizations:
 * - Defer expensive operations using requestIdleCallback
 * - Implement frame budgeting to prevent heavy frames
 * - Use time-slicing for long-running tasks
 * - Reduce logging frequency to prevent performance overhead
 */
export function useOptimizedAnimationFrame(
  callback: IAnimationFrameCallback,
  enabled: boolean = true
): IAnimationFrameOptimizer {
  const requestRef = useRef<number | null>(null);
  const previousTimeRef = useRef<number | null>(null);
  const frameTimeRef = useRef<number>(0);
  const lastHeavyTaskRef = useRef<number>(0);
  const heavyTaskActiveRef = useRef<boolean>(false);
  const memoryPressureRef = useRef<boolean>(false);
  const performanceMonitorRef = useRef(new PerformanceMonitor());
  const memoryOptimizerRef = useRef(new MemoryOptimizer());
  const lastLogRef = useRef<number>(0);
  const frameSkipCountRef = useRef<number>(0);
  const frameBudgetRef = useRef<number>(NEURAL_FRAME_CONSTRAINTS.FRAME_BUDGET_MS);
  const isIdleRef = useRef<boolean>(true);

  // Memory pressure detection using requestIdleCallback to defer work
  const checkMemoryPressure = useCallback(() => {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        const hasMemoryPressure = memoryOptimizerRef.current.checkPressure();
        if (hasMemoryPressure) {
          memoryPressureRef.current = true;
        }
      }, { timeout: 1000 });
    } else {
      // Fallback for environments without requestIdleCallback
      setTimeout(() => {
        const hasMemoryPressure = memoryOptimizerRef.current.checkPressure();
        if (hasMemoryPressure) {
          memoryPressureRef.current = true;
        }
      }, 0);
    }
  }, []);

  const optimizedCallback = useCallback((timestamp: number) => {
    const frameStartTime = performance.now();
    
    if (previousTimeRef.current !== null) {
      const deltaTime = timestamp - previousTimeRef.current;
      frameTimeRef.current = deltaTime;
      
      // Time-sliced performance monitoring - only update every few frames
      if (timestamp % 3 === 0) {
        const metrics = performanceMonitorRef.current.update(timestamp);
        
        // Check for memory pressure much less frequently (every 180 frames ≈ 3 seconds at 60fps)
        if (metrics.totalFrames % 180 === 0) {
          checkMemoryPressure();
        }
        
        // Adaptive frame budget based on recent performance
        const targetFrameTime = NEURAL_FRAME_CONSTRAINTS.MIN_FRAME_TIME;
        const avgFrameTime = metrics.averageFrameTime;
        
        // More conservative budget adjustments
        if (avgFrameTime > targetFrameTime * 2) {
          frameBudgetRef.current = Math.max(4, frameBudgetRef.current * 0.9); // Slower reduction
        } else if (avgFrameTime < targetFrameTime * 0.6) {
          frameBudgetRef.current = Math.min(NEURAL_FRAME_CONSTRAINTS.FRAME_BUDGET_MS, frameBudgetRef.current * 1.05); // Slower increase
        }
      }
      
      // More relaxed heavy task detection - focus on truly problematic frames
      const timeSinceLastHeavyTask = timestamp - lastHeavyTaskRef.current;
      
      // Only consider frames > 50ms as truly "heavy" (was 25ms)
      if (deltaTime > 50) {
        lastHeavyTaskRef.current = timestamp;
        heavyTaskActiveRef.current = true;
        
        // Much more throttled logging - only log once every 10 seconds
        const timeSinceLastLog = timestamp - lastLogRef.current;
        if (process.env.NODE_ENV !== 'production' && timeSinceLastLog > 10000) {
          // Use requestIdleCallback for logging to not block the main thread
          if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
            window.requestIdleCallback(() => {
              console.warn(
                `[QuantumPerformance] Heavy frame detected (${deltaTime.toFixed(2)}ms)`
              );
            });
          }
          lastLogRef.current = timestamp;
        }
      }
      
      // Reset heavy task flag after longer period for stability
      if (timeSinceLastHeavyTask > 2000) {
        heavyTaskActiveRef.current = false;
        memoryPressureRef.current = false;
        frameSkipCountRef.current = 0;
        isIdleRef.current = true;
      }
      
      // More conservative frame skipping strategy
      const shouldSkipFrame = (
        heavyTaskActiveRef.current && 
        NEURAL_FRAME_CONSTRAINTS.THROTTLE_HEAVY_TASKS &&
        frameSkipCountRef.current < 2 && // Reduced max consecutive skips
        deltaTime > 80 // Only skip on really bad frames
      );
      
      if (shouldSkipFrame) {
        frameSkipCountRef.current++;
        // Skip callback execution but continue animation loop
      } else {
        frameSkipCountRef.current = 0;
        
        try {
          // Execute callback with time budgeting
          const callbackStartTime = performance.now();
          
          // Use time-slicing: if we're running behind, reduce callback complexity
          const isRunningBehind = deltaTime > 32; // 2 frames behind at 60fps
          if (isRunningBehind) {
            // Potentially pass a flag to callback to reduce complexity
            callback(deltaTime, timestamp, { simplified: true });
          } else {
            callback(deltaTime, timestamp);
          }
          
          const callbackDuration = performance.now() - callbackStartTime;
          
          // More relaxed budget checking - only warn on significant violations
          if (callbackDuration > frameBudgetRef.current * 1.5) {
            heavyTaskActiveRef.current = true;
            lastHeavyTaskRef.current = timestamp;
            isIdleRef.current = false;
            
            // Throttled budget violation logging
            const timeSinceLastLog = timestamp - lastLogRef.current;
            if (process.env.NODE_ENV !== 'production' && timeSinceLastLog > 5000) {
              if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
                window.requestIdleCallback(() => {
                  console.warn(
                    `[QuantumPerformance] Frame budget exceeded: ${callbackDuration.toFixed(2)}ms (budget: ${frameBudgetRef.current.toFixed(2)}ms)`
                  );
                });
              }
              lastLogRef.current = timestamp;
            }
          } else {
            isIdleRef.current = true;
          }
        } catch (error) {
          // Defer error logging to not impact frame performance
          if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
            window.requestIdleCallback(() => {
              console.warn('[QuantumPerformance] Frame callback error:', error);
            });
          }
        }
      }
    }
    
    previousTimeRef.current = timestamp;
    
    // Always schedule next frame if enabled
    if (enabled) {
      requestRef.current = requestAnimationFrame(optimizedCallback);
    }
  }, [callback, enabled, checkMemoryPressure]);

  useEffect(() => {
    if (enabled) {
      requestRef.current = requestAnimationFrame(optimizedCallback);
    }
    
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
    };
  }, [enabled, optimizedCallback]);

  // Return performance metrics for monitoring
  return {
    currentFrameTime: frameTimeRef.current,
    performanceMetrics: performanceMonitorRef.current.getMetrics(),
    isHeavyTaskActive: heavyTaskActiveRef.current,
    hasMemoryPressure: memoryPressureRef.current
  };
} 