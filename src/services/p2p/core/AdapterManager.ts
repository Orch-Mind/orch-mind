// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import * as crypto from "crypto";
import { ValidationService } from "../services/ValidationService";
import { p2pEventBus } from "./EventBus";
import type { IAdapterInfo } from "./interfaces";

/**
 * AdapterManager - Single Responsibility: Adapter Management
 * Handles listing, sharing, and tracking of LoRA adapters
 */
export class AdapterManager {
  private sharedAdapters: Map<string, IAdapterInfo> = new Map();
  private availableAdapters: Map<string, IAdapterInfo> = new Map();
  private validationService: ValidationService;

  constructor() {
    this.validationService = new ValidationService();
    this.setupEventListeners();
  }

  /**
   * Share an adapter
   */
  async shareAdapter(
    modelName: string,
    modelPath?: string
  ): Promise<IAdapterInfo> {
    // Generate unique topic for this adapter
    const topic = this.generateTopic();

    // In Electron, get file info from main process
    if (typeof window !== "undefined" && window.electronAPI) {
      const result = await (window.electronAPI as any).p2pShareAdapter(
        modelName
      );

      if (!result.success) {
        throw new Error(result.error || "Failed to share adapter");
      }

      const adapterInfo: IAdapterInfo = result.adapterInfo;
      this.sharedAdapters.set(topic, adapterInfo);

      // Broadcast updated list
      this.broadcastAdapters();

      return adapterInfo;
    }

    throw new Error("Adapter sharing requires Electron environment");
  }

  /**
   * Unshare an adapter
   */
  async unshareAdapter(topic: string): Promise<void> {
    const adapter = this.sharedAdapters.get(topic);
    if (!adapter) return;

    this.sharedAdapters.delete(topic);

    if (typeof window !== "undefined" && window.electronAPI) {
      await (window.electronAPI as any).p2pUnshareAdapter(topic);
    }

    this.broadcastAdapters();
  }

  /**
   * Get shared adapters
   */
  getSharedAdapters(): IAdapterInfo[] {
    return Array.from(this.sharedAdapters.values());
  }

  /**
   * Get available adapters from peers
   */
  getAvailableAdapters(): IAdapterInfo[] {
    return Array.from(this.availableAdapters.values());
  }

  /**
   * Update available adapters from peer
   */
  updateAvailableAdapters(peerId: string, adapters: IAdapterInfo[]): void {
    // Clear previous adapters from this peer
    this.availableAdapters.forEach((adapter, key) => {
      if (key.startsWith(peerId)) {
        this.availableAdapters.delete(key);
      }
    });

    // Add new adapters
    adapters.forEach((adapter) => {
      const key = `${peerId}:${adapter.topic}`;
      this.availableAdapters.set(key, {
        ...adapter,
        timestamp: Date.now(),
      });
    });

    p2pEventBus.emit("adapters:available", {
      from: "peer",
      adapters: this.getAvailableAdapters(),
    });
  }

  /**
   * Load adapters from local storage
   */
  loadLocalAdapters(modelNames: string[]): void {
    modelNames.forEach((modelName) => {
      const topic = this.generateTopic();
      const adapter: IAdapterInfo = {
        name: modelName,
        size: 0, // Will be updated when shared
        checksum: "pending",
        topic,
        timestamp: Date.now(),
      };

      // Check if adapter should be shared (from persistence)
      const persistedState = this.loadPersistedState();
      if (persistedState.sharedAdapterIds?.includes(modelName)) {
        this.sharedAdapters.set(topic, adapter);
      }
    });
  }

  /**
   * Broadcast available adapters to peers
   */
  private broadcastAdapters(): void {
    if (typeof window !== "undefined" && window.electronAPI) {
      const adapters = Array.from(this.sharedAdapters.values());
      (window.electronAPI as any).p2pBroadcastAdapters(adapters);

      // Emit locally for UI updates
      p2pEventBus.emit("adapters:available", {
        from: "local",
        adapters: adapters,
      });
    }
  }

  /**
   * Generate unique topic
   */
  private generateTopic(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Load persisted state
   */
  private loadPersistedState(): any {
    try {
      const saved = localStorage.getItem("orch-os-p2p-state");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for adapter lists from peers
    if (typeof window !== "undefined" && window.electronAPI) {
      (window.electronAPI as any).onP2PAdaptersAvailable?.((data: any) => {
        this.updateAvailableAdapters(data.from, data.adapters);
      });
    }
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.sharedAdapters.clear();
    this.availableAdapters.clear();
  }
}
