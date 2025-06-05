// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * Performance Interfaces for Orch-OS Neural Processing
 * Implements Interface Segregation Principle - specific interfaces for specific needs
 */

// === Core Performance Types ===
export interface PerformanceMetrics {
  readonly fps: number;
  readonly averageFrameTime: number;
  readonly slowFrames: number;
  readonly totalFrames: number;
  readonly consecutiveSlowFrames: number;
  readonly heavyTaskPeriods: number;
  readonly isPerformanceGood: boolean;
  readonly slowFrameRatio: number;
}

export interface FrameConstraints {
  readonly TARGET_FPS: number;
  readonly MIN_FRAME_TIME: number;
  readonly MAX_FRAME_TIME: number;
  readonly PERFORMANCE_THRESHOLD: number;
  readonly FRAME_BUDGET_MS: number;
  readonly HEAVY_TASK_BUDGET_MS: number;
  readonly THROTTLE_HEAVY_TASKS: boolean;
  readonly PAUSE_DURING_HEAVY_TASKS: boolean;
  readonly HEAVY_TASK_DETECTION_THRESHOLD: number;
  readonly MEMORY_PRESSURE_THRESHOLD: number;
}

// === Animation Frame Interfaces ===
export interface IAnimationFrameCallback {
  (deltaTime: number, timestamp: number): void;
}

export interface IAnimationFrameOptimizer {
  readonly currentFrameTime: number;
  readonly performanceMetrics: PerformanceMetrics;
  readonly isHeavyTaskActive: boolean;
  readonly hasMemoryPressure: boolean;
}

// === Event Optimization Interfaces ===
export interface IEventOptions {
  readonly passive?: boolean;
  readonly capture?: boolean;
  readonly once?: boolean;
}

export interface IPassiveEventHandler<T extends Event = Event> {
  (event: T): void;
}

// === Memory Management Interfaces ===
export interface IMemoryOptimizer {
  optimize(): void;
  checkPressure(): boolean;
  getMemoryUsage(): number | null;
}

// === Task Management Interfaces ===
export interface IHeavyTask {
  readonly id: string;
  readonly fn: () => Promise<void>;
  readonly priority: number;
}

export interface IHeavyTaskManager {
  addTask(fn: () => Promise<void>, id: string, priority?: number): Promise<void>;
  isProcessing(): boolean;
  getQueueSize(): number;
}

// === Performance Monitoring Interfaces ===
export interface IPerformanceMonitor {
  update(timestamp: number): PerformanceMetrics;
  reset(): void;
  getMetrics(): PerformanceMetrics;
}

// === Message Handler Interfaces ===
export interface IMessageHandler<T = any> {
  (data: T): void;
}

export interface IOptimizedMessageHandler<T = any> {
  (data: T): void;
}

// === Configuration Interfaces ===
export interface IPerformanceConfig {
  readonly frameConstraints: FrameConstraints;
  readonly enableMemoryOptimization: boolean;
  readonly enableEventOptimization: boolean;
  readonly enableTaskManagement: boolean;
  readonly debugMode: boolean;
}

export interface IOptimizationLevel {
  readonly quality: number; // 0.25 to 1.0
  readonly adaptiveQuality: boolean;
} 