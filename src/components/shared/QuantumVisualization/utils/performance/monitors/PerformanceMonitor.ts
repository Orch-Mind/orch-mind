// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { NEURAL_FRAME_CONSTRAINTS } from '../core/PerformanceConstants';
import type { IPerformanceMonitor, PerformanceMetrics } from '../interfaces/PerformanceInterfaces';

/**
 * Performance Monitor for Orch-OS Neural Processing
 * Single Responsibility: Performance metrics collection and analysis
 */
export class PerformanceMonitor implements IPerformanceMonitor {
  private frameCount = 0;
  private lastTime = 0;
  private fps = 0;
  private averageFrameTime = NEURAL_FRAME_CONSTRAINTS.MIN_FRAME_TIME;
  private slowFrameCount = 0;
  private consecutiveSlowFrames = 0;
  private heavyTaskPeriods = 0;
  private readonly maxSlowFrames: number;

  constructor(maxSlowFrames = 30) {
    this.maxSlowFrames = maxSlowFrames;
  }

  /**
   * Updates performance metrics with new frame data
   */
  update(timestamp: number): PerformanceMetrics {
    this.frameCount++;
    
    if (this.lastTime === 0) {
      this.lastTime = timestamp;
      return this.getMetrics();
    }

    const deltaTime = timestamp - this.lastTime;
    this.lastTime = timestamp;

    // Update average frame time with exponential smoothing
    this.averageFrameTime = this.averageFrameTime * 0.9 + deltaTime * 0.1;

    // Count slow frames
    if (deltaTime > NEURAL_FRAME_CONSTRAINTS.MAX_FRAME_TIME) {
      this.slowFrameCount++;
      this.consecutiveSlowFrames++;
    } else {
      this.consecutiveSlowFrames = 0;
    }

    // Detect heavy task periods
    if (deltaTime > NEURAL_FRAME_CONSTRAINTS.HEAVY_TASK_DETECTION_THRESHOLD) {
      this.heavyTaskPeriods++;
    }

    // Calculate FPS every 60 frames
    if (this.frameCount % 60 === 0) {
      this.fps = Math.round(1000 / this.averageFrameTime);
      
      // Reset slow frame count periodically
      if (this.frameCount % 300 === 0) {
        this.slowFrameCount = Math.max(0, this.slowFrameCount - 10);
      }
    }

    return this.getMetrics();
  }

  /**
   * Resets all performance metrics
   */
  reset(): void {
    this.frameCount = 0;
    this.lastTime = 0;
    this.fps = 0;
    this.averageFrameTime = NEURAL_FRAME_CONSTRAINTS.MIN_FRAME_TIME;
    this.slowFrameCount = 0;
    this.consecutiveSlowFrames = 0;
    this.heavyTaskPeriods = 0;
  }

  /**
   * Gets current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const slowFrameRatio = this.frameCount > 0 ? this.slowFrameCount / this.frameCount : 0;
    const isPerformanceGood = 
      this.fps >= NEURAL_FRAME_CONSTRAINTS.TARGET_FPS * NEURAL_FRAME_CONSTRAINTS.PERFORMANCE_THRESHOLD &&
      slowFrameRatio < 0.1;

    return {
      fps: this.fps,
      averageFrameTime: this.averageFrameTime,
      slowFrames: this.slowFrameCount,
      totalFrames: this.frameCount,
      consecutiveSlowFrames: this.consecutiveSlowFrames,
      heavyTaskPeriods: this.heavyTaskPeriods,
      isPerformanceGood,
      slowFrameRatio
    };
  }
}

// Factory function for creating monitor instances
export const createPerformanceMonitor = (maxSlowFrames?: number): PerformanceMonitor => {
  return new PerformanceMonitor(maxSlowFrames);
}; 