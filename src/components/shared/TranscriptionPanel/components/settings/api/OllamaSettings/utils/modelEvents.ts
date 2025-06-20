// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * Event system for reactive model updates
 * Follows Observer pattern for efficient state management
 */

type EventCallback = () => void;

class ModelEventEmitter {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  emit(event: string): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback());
    }
  }
}

// Singleton instance
export const modelEvents = new ModelEventEmitter();

// Event names
export const MODEL_EVENTS = {
  MODEL_DOWNLOADED: "model:downloaded",
  MODEL_REMOVED: "model:removed",
  MODELS_CHANGED: "models:changed",
  DOWNLOAD_STARTED: "download:started",
  DOWNLOAD_COMPLETED: "download:completed",
  DOWNLOAD_FAILED: "download:failed",
} as const;
