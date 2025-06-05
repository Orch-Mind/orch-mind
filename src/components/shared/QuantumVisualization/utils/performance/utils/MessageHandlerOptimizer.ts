// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * Message Handler Optimizer for Orch-OS Neural Processing
 * Single Responsibility: Optimize message handling performance with throttling and debouncing
 */

import { THROTTLE_DELAYS } from '../core/PerformanceConstants';
import type { IMessageHandler, IOptimizedMessageHandler } from '../interfaces/PerformanceInterfaces';

/**
 * Creates an optimized message handler with throttling to prevent performance issues
 * Following Single Responsibility Principle - focuses solely on message handler optimization
 */
export function createOptimizedMessageHandler<T = any>(
  handler: IMessageHandler<T>,
  options: {
    throttleMs?: number;
    maxWait?: number;
    leading?: boolean;
    trailing?: boolean;
  } = {}
): IOptimizedMessageHandler<T> {
  const {
    throttleMs = THROTTLE_DELAYS.MESSAGE_HANDLER,
    maxWait = THROTTLE_DELAYS.DEBOUNCE_MAX_WAIT,
    leading = true,
    trailing = true
  } = options;

  let lastExecution = 0;
  let timeoutId: NodeJS.Timeout | null = null;
  let maxTimeoutId: NodeJS.Timeout | null = null;
  let lastArgs: [T] | null = null;

  const optimizedHandler: IOptimizedMessageHandler<T> = (data: T) => {
    const now = performance.now();
    lastArgs = [data];

    // Clear existing timeouts
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    // Leading edge execution
    if (leading && (now - lastExecution >= throttleMs)) {
      executeHandler();
      return;
    }

    // Set up max wait timeout if not already set
    if (!maxTimeoutId && maxWait > 0) {
      maxTimeoutId = setTimeout(() => {
        executeHandler();
        maxTimeoutId = null;
      }, maxWait);
    }

    // Trailing edge execution
    if (trailing) {
      timeoutId = setTimeout(() => {
        executeHandler();
        if (maxTimeoutId) {
          clearTimeout(maxTimeoutId);
          maxTimeoutId = null;
        }
      }, throttleMs);
    }
  };

  function executeHandler() {
    if (!lastArgs) return;

    try {
      handler(lastArgs[0]);
      lastExecution = performance.now();
    } catch (error) {
      console.warn('[MessageHandlerOptimizer] Handler execution error:', error);
    }
  }

  // Add cleanup method for better memory management
  (optimizedHandler as any).cleanup = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (maxTimeoutId) {
      clearTimeout(maxTimeoutId);
      maxTimeoutId = null;
    }
    lastArgs = null;
  };

  return optimizedHandler;
}

/**
 * Creates a throttled function with configurable options
 * Following Single Responsibility Principle - focuses solely on function throttling
 */
export function createThrottledFunction<T extends (...args: any[]) => any>(
  func: T,
  delay: number = THROTTLE_DELAYS.DEBOUNCE_DEFAULT,
  options: {
    leading?: boolean;
    trailing?: boolean;
    maxWait?: number;
  } = {}
): T {
  const {
    leading = true,
    trailing = true,
    maxWait = THROTTLE_DELAYS.DEBOUNCE_MAX_WAIT
  } = options;

  let lastExecution = 0;
  let timeoutId: NodeJS.Timeout | null = null;
  let maxTimeoutId: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: any = null;

  const throttledFunction = function (this: any, ...args: Parameters<T>): ReturnType<T> | undefined {
    const now = performance.now();
    lastArgs = args;
    lastThis = this;

    // Clear existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    // Leading edge execution
    if (leading && (now - lastExecution >= delay)) {
      return executeFunction();
    }

    // Set up max wait timeout if not already set
    if (!maxTimeoutId && maxWait > 0) {
      maxTimeoutId = setTimeout(() => {
        executeFunction();
        maxTimeoutId = null;
      }, maxWait);
    }

    // Trailing edge execution
    if (trailing) {
      timeoutId = setTimeout(() => {
        executeFunction();
        if (maxTimeoutId) {
          clearTimeout(maxTimeoutId);
          maxTimeoutId = null;
        }
      }, delay);
    }

    return undefined;
  } as T;

  function executeFunction(): ReturnType<T> | undefined {
    if (!lastArgs || !lastThis) return undefined;

    try {
      const result = func.apply(lastThis, lastArgs);
      lastExecution = performance.now();
      return result;
    } catch (error) {
      console.warn('[ThrottledFunction] Function execution error:', error);
      return undefined;
    }
  }

  // Add cleanup method for better memory management
  (throttledFunction as any).cleanup = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (maxTimeoutId) {
      clearTimeout(maxTimeoutId);
      maxTimeoutId = null;
    }
    lastArgs = null;
    lastThis = null;
  };

  return throttledFunction;
}

/**
 * Creates a debounced function that delays execution until after the specified delay
 * Following Single Responsibility Principle - focuses solely on function debouncing
 */
export function createDebouncedFunction<T extends (...args: any[]) => any>(
  func: T,
  delay: number = THROTTLE_DELAYS.DEBOUNCE_DEFAULT,
  options: {
    immediate?: boolean;
    maxWait?: number;
  } = {}
): T {
  const {
    immediate = false,
    maxWait = THROTTLE_DELAYS.DEBOUNCE_MAX_WAIT
  } = options;

  let timeoutId: NodeJS.Timeout | null = null;
  let maxTimeoutId: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: any = null;

  const debouncedFunction = function (this: any, ...args: Parameters<T>): ReturnType<T> | undefined {
    lastArgs = args;
    lastThis = this;

    const callNow = immediate && !timeoutId;

    // Clear existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Set up max wait timeout if not already set
    if (!maxTimeoutId && maxWait > 0) {
      maxTimeoutId = setTimeout(() => {
        executeFunction();
        maxTimeoutId = null;
        timeoutId = null;
      }, maxWait);
    }

    timeoutId = setTimeout(() => {
      timeoutId = null;
      if (maxTimeoutId) {
        clearTimeout(maxTimeoutId);
        maxTimeoutId = null;
      }
      if (!immediate) {
        executeFunction();
      }
    }, delay);

    if (callNow) {
      return executeFunction();
    }

    return undefined;
  } as T;

  function executeFunction(): ReturnType<T> | undefined {
    if (!lastArgs || !lastThis) return undefined;

    try {
      return func.apply(lastThis, lastArgs);
    } catch (error) {
      console.warn('[DebouncedFunction] Function execution error:', error);
      return undefined;
    }
  }

  // Add cleanup method for better memory management
  (debouncedFunction as any).cleanup = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (maxTimeoutId) {
      clearTimeout(maxTimeoutId);
      maxTimeoutId = null;
    }
    lastArgs = null;
    lastThis = null;
  };

  return debouncedFunction;
} 