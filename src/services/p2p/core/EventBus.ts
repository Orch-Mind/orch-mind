// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { EventEmitter } from "events";
import type { IP2PEvents } from "./interfaces";

/**
 * Simple Event Bus for P2P communication
 * Following KISS principle - just wraps EventEmitter with type safety
 */
export class P2PEventBus extends EventEmitter {
  constructor() {
    super();
    // Increase max listeners to prevent warnings
    this.setMaxListeners(50);
  }

  // Type-safe emit
  emit<K extends keyof IP2PEvents>(
    event: K,
    ...args: Parameters<IP2PEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }

  // Type-safe on
  on<K extends keyof IP2PEvents>(event: K, listener: IP2PEvents[K]): this {
    return super.on(event, listener);
  }

  // Type-safe once
  once<K extends keyof IP2PEvents>(event: K, listener: IP2PEvents[K]): this {
    return super.once(event, listener);
  }

  // Type-safe off - use removeListener for better compatibility
  off<K extends keyof IP2PEvents>(event: K, listener: IP2PEvents[K]): this {
    // Use removeListener instead of off for better Node.js compatibility
    return super.removeListener(event, listener);
  }

  // Clear all listeners for an event
  removeAllListeners<K extends keyof IP2PEvents>(event?: K): this {
    return super.removeAllListeners(event);
  }
}

// Singleton instance
export const p2pEventBus = new P2PEventBus();
