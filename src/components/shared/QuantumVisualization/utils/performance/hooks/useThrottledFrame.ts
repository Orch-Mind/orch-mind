// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useFrame } from '@react-three/fiber';
import { useCallback, useRef } from 'react';

/**
 * Simple throttled frame hook for React Three Fiber
 * Single Responsibility: Throttle animation frames to prevent performance issues
 */

type FrameCallback = (state: any, delta: number) => void;

interface ThrottleOptions {
  /** Maximum frames per second for this component (default: 30) */
  maxFPS?: number;
  /** Frame budget in milliseconds (default: 8ms) */
  frameBudget?: number;
  /** Whether to skip frames during heavy load (default: true) */
  adaptiveSkipping?: boolean;
  /** Priority level: 'high' | 'medium' | 'low' (default: 'medium') */
  priority?: 'high' | 'medium' | 'low';
  /** Enable debug logging every N frames */
  debugInterval?: number;
}

/**
 * Simple throttled useFrame replacement
 */
export function useThrottledFrame(
  callback: FrameCallback,
  options: ThrottleOptions = {}
): void {
  const lastRunRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const performanceRef = useRef<{ sum: number; count: number }>({ sum: 0, count: 0 });

  const maxFPS = options.maxFPS ?? 30;
  const frameBudget = options.frameBudget ?? 8;
  const adaptiveSkipping = options.adaptiveSkipping ?? true;
  const priority = options.priority ?? 'medium';
  const debugInterval = options.debugInterval;

  const targetInterval = 1000 / maxFPS;

  const throttledCallback = useCallback((state: any, delta: number) => {
    const now = performance.now();
    const timeSinceLastRun = now - lastRunRef.current;

    // Always increment total frame count for debugging
    frameCountRef.current++;

    // Check if enough time has passed
    if (timeSinceLastRun < targetInterval) {
      return;
    }

    // Simple adaptive skipping based on recent performance
    if (adaptiveSkipping) {
      const avgFrameTime = performanceRef.current.count > 0 
        ? performanceRef.current.sum / performanceRef.current.count 
        : 0;

      // Skip low priority tasks if average frame time is high
      if (priority === 'low' && avgFrameTime > 20) {
        return;
      }

      // Skip medium priority tasks if performance is really bad
      if (priority === 'medium' && avgFrameTime > 33) {
        return;
      }
    }

    try {
      const startTime = performance.now();
      callback(state, delta);
      const duration = performance.now() - startTime;
      
      // Track performance
      performanceRef.current.sum += duration;
      performanceRef.current.count++;
      
      // Reset performance tracking periodically
      if (performanceRef.current.count >= 60) {
        performanceRef.current.sum *= 0.1;
        performanceRef.current.count = 1;
      }

      // Debug logging if enabled
      if (debugInterval && frameCountRef.current % debugInterval === 0 && process.env.NODE_ENV !== 'production') {
        const avgFrameTime = performanceRef.current.count > 0 
          ? (performanceRef.current.sum / performanceRef.current.count).toFixed(2)
          : '0.00';
        console.log(
          `[ThrottledFrame] Frame ${frameCountRef.current}: avg ${avgFrameTime}ms, current ${duration.toFixed(2)}ms, priority: ${priority}`
        );
      }

      // Warn if budget exceeded
      if (duration > frameBudget && process.env.NODE_ENV !== 'production') {
        console.warn(
          `[ThrottledFrame] Frame ${frameCountRef.current} exceeded budget: ${duration.toFixed(2)}ms (budget: ${frameBudget}ms)`
        );
      }

    } catch (error) {
      console.warn(`[ThrottledFrame] Frame ${frameCountRef.current} callback error:`, error);
    }

    lastRunRef.current = now;
  }, [callback, targetInterval, frameBudget, adaptiveSkipping, priority, debugInterval]);

  useFrame(throttledCallback);
}

/**
 * Performance-optimized useFrame replacement for quantum visualization
 * Use this instead of direct useFrame for quantum visualization components
 */
export function useOptimizedQuantumFrame(
  callback: FrameCallback,
  priority: 'high' | 'medium' | 'low' = 'medium'
): void {
  useThrottledFrame(callback, {
    maxFPS: priority === 'high' ? 60 : priority === 'medium' ? 30 : 15,
    frameBudget: priority === 'high' ? 12 : priority === 'medium' ? 8 : 4,
    adaptiveSkipping: true,
    priority,
    // Enable debug logging every 300 frames in development for quantum components
    debugInterval: process.env.NODE_ENV !== 'production' ? 300 : undefined
  });
} 