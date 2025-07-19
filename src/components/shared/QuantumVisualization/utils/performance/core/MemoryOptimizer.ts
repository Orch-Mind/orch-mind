// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import type { IMemoryOptimizer } from '../interfaces/PerformanceInterfaces';
import { NEURAL_FRAME_CONSTRAINTS } from './PerformanceConstants';

/**
 * Memory Optimizer for Orch-Mind Neural Processing
 * Single Responsibility: Memory management and optimization
 */
export class MemoryOptimizer implements IMemoryOptimizer {
  private lastOptimizationTime = 0;
  private readonly optimizationCooldown = 5000; // 5 seconds

  /**
   * Optimizes memory usage by triggering garbage collection and cache clearing
   */
  optimize(): void {
    const now = performance.now();
    
    // Prevent too frequent optimizations
    if (now - this.lastOptimizationTime < this.optimizationCooldown) {
      return;
    }

    this.lastOptimizationTime = now;

    // Force garbage collection hint (if available)
    this.triggerGarbageCollection();

    // Clear Three.js cache if available
    this.clearThreeJSCache();
  }

  /**
   * Checks if the system is under memory pressure
   */
  checkPressure(): boolean {
    const usage = this.getMemoryUsage();
    return usage !== null && usage > NEURAL_FRAME_CONSTRAINTS.MEMORY_PRESSURE_THRESHOLD;
  }

  /**
   * Gets current memory usage in bytes
   */
  getMemoryUsage(): number | null {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in window.performance) {
      const memory = (window.performance as any).memory;
      return memory?.usedJSHeapSize || null;
    }
    return null;
  }

  /**
   * Triggers garbage collection if available
   */
  private triggerGarbageCollection(): void {
    if (typeof window !== 'undefined' && 'gc' in window) {
      try {
        (window as any).gc();
      } catch {
        // Silent fail - gc not available
      }
    }
  }

  /**
   * Clears Three.js cache if available
   */
  private clearThreeJSCache(): void {
    if (typeof window !== 'undefined') {
      try {
        // Try to access THREE from global scope
        const THREE = (window as any).THREE;
        if (THREE?.Cache) {
          THREE.Cache.clear();
        }
      } catch {
        // Silent fail - Three.js not available
      }
    }
  }
}

// Singleton instance for global use
export const memoryOptimizer = new MemoryOptimizer(); 