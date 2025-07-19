// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import type { FrameConstraints } from '../interfaces/PerformanceInterfaces';

/**
 * Performance Constants for Orch-Mind Neural Processing
 * Single Responsibility: Central configuration for performance parameters
 */

export const NEURAL_FRAME_CONSTRAINTS: FrameConstraints = {
  TARGET_FPS: 60,
  MIN_FRAME_TIME: 16.67, // 1000ms / 60fps
  MAX_FRAME_TIME: 33.33, // 1000ms / 30fps (fallback)
  PERFORMANCE_THRESHOLD: 0.8,
  FRAME_BUDGET_MS: 8, // Aggressive optimization
  HEAVY_TASK_BUDGET_MS: 3, // Very strict budget during heavy tasks
  THROTTLE_HEAVY_TASKS: true,
  PAUSE_DURING_HEAVY_TASKS: false, // Disable pausing to prevent infinite loops
  HEAVY_TASK_DETECTION_THRESHOLD: 50, // More reasonable threshold (50ms instead of 100ms)
  MEMORY_PRESSURE_THRESHOLD: 50 * 1024 * 1024 // 50MB memory threshold
} as const;

export const PASSIVE_EVENT_OPTIONS = {
  passive: true,
  capture: false
} as const;

export const NON_PASSIVE_EVENT_OPTIONS = {
  passive: false,
  capture: false
} as const;

export const PASSIVE_EVENT_TYPES = new Set([
  'wheel',
  'mousewheel',
  'touchstart',
  'touchmove',
  'touchend',
  'scroll'
]);

export const THROTTLE_DELAYS = {
  WHEEL_EVENT: 16, // ~60fps throttling
  MESSAGE_HANDLER: 100,
  DEBOUNCE_DEFAULT: 100,
  DEBOUNCE_MAX_WAIT: 500
} as const; 