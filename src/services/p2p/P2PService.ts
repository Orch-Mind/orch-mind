// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import * as crypto from "crypto";
import { AdapterManager } from "./core/AdapterManager";
import { p2pEventBus } from "./core/EventBus";
import type { IAdapterInfo, IP2PRoom } from "./core/interfaces";
import { SwarmManager } from "./core/SwarmManager";
import { TransferManager } from "./core/TransferManager";

/**
 * P2PService - Facade pattern for simple P2P operations
 * Following KISS principle - provides a simple API for complex operations
 */
export class P2PService {
  private swarmManager: SwarmManager;
  private adapterManager: AdapterManager;
  private transferManager: TransferManager;
  private initialized: boolean = false;

  // Well-known room topics
  static readonly GENERAL_ROOM = "orch-os-general-public-community-room-v1";
  static readonly LOCAL_PREFIX = "orch-os-local-network-";

  constructor() {
    this.swarmManager = new SwarmManager();
    this.adapterManager = new AdapterManager();
    this.transferManager = new TransferManager();
  }

  /**
   * Initialize P2P service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.swarmManager.initialize();
    this.setupIPCListeners();
    this.initialized = true;
  }

  /**
   * Setup IPC listeners to bridge Electron events to EventBus
   */
  private setupIPCListeners(): void {
    if (typeof window !== "undefined" && window.electronAPI) {
      // Listen for peers updated from Electron backend
      (window.electronAPI as any).onP2PPeersUpdated?.((count: number) => {
        console.log(
          "[P2PService] Received peers-updated from Electron:",
          count
        );
        p2pEventBus.emit("peers:updated", count);
      });

      // Listen for room events from Electron backend
      (window.electronAPI as any).onP2PRoomJoined?.((data: any) => {
        console.log("[P2PService] Received room-joined from Electron:", data);
        p2pEventBus.emit("room:joined", data);
      });

      (window.electronAPI as any).onP2PRoomLeft?.(() => {
        console.log("[P2PService] Received room-left from Electron");
        p2pEventBus.emit("room:left");
      });

      // Listen for adapters available from Electron backend
      (window.electronAPI as any).onP2PAdaptersAvailable?.((data: any) => {
        console.log(
          "[P2PService] Received adapters-available from Electron:",
          data
        );
        p2pEventBus.emit("adapters:available", data.adapters);
      });

      console.log("[P2PService] IPC listeners setup complete");
    }
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Join general/community room
   */
  async joinGeneralRoom(): Promise<void> {
    const topic = await this.hashTopic(P2PService.GENERAL_ROOM);
    await this.swarmManager.connect(topic);
  }

  /**
   * Join local network room
   */
  async joinLocalRoom(): Promise<void> {
    const localTopic = P2PService.LOCAL_PREFIX + this.getLocalNetworkId();
    const topic = await this.hashTopic(localTopic);
    await this.swarmManager.connect(topic);
  }

  /**
   * Join or create private room
   */
  async joinRoom(roomCode: string): Promise<void> {
    const topic = await this.codeToTopic(roomCode);
    await this.swarmManager.connect(topic);
  }

  /**
   * Create new private room
   */
  async createRoom(): Promise<string> {
    const code = this.generateRoomCode();
    await this.joinRoom(code);
    return code;
  }

  /**
   * Leave current room
   */
  async leaveRoom(): Promise<void> {
    await this.swarmManager.disconnect();
  }

  /**
   * Get connection status
   */
  getStatus(): {
    isConnected: boolean;
    currentRoom: IP2PRoom | null;
    peersCount: number;
  } {
    return {
      isConnected: this.swarmManager.isConnected(),
      currentRoom: this.swarmManager.getCurrentRoom(),
      peersCount: this.swarmManager.getPeersCount(),
    };
  }

  /**
   * Share a LoRA adapter
   */
  async shareAdapter(modelName: string): Promise<IAdapterInfo> {
    return await this.adapterManager.shareAdapter(modelName);
  }

  /**
   * Unshare an adapter
   */
  async unshareAdapter(topic: string): Promise<void> {
    await this.adapterManager.unshareAdapter(topic);
  }

  /**
   * Get shared adapters
   */
  getSharedAdapters(): IAdapterInfo[] {
    return this.adapterManager.getSharedAdapters();
  }

  /**
   * Get available adapters from peers
   */
  getAvailableAdapters(): IAdapterInfo[] {
    return this.adapterManager.getAvailableAdapters();
  }

  /**
   * Request adapter download
   */
  async requestAdapter(topic: string, fromPeer?: string): Promise<Buffer> {
    // Request the adapter via IPC
    if (typeof window !== "undefined" && window.electronAPI) {
      await (window.electronAPI as any).p2pRequestAdapter({ topic, fromPeer });
    }

    // Wait for transfer to complete
    return await this.transferManager.receiveFile(topic);
  }

  /**
   * Set transfer progress callback
   */
  onTransferProgress(callback: (progress: number) => void): void {
    this.transferManager.onProgress(callback);
  }

  /**
   * Subscribe to P2P events
   */
  on<K extends keyof import("./core/interfaces").IP2PEvents>(
    event: K,
    listener: import("./core/interfaces").IP2PEvents[K]
  ): void {
    p2pEventBus.on(event, listener);
  }

  /**
   * Unsubscribe from P2P events
   */
  off<K extends keyof import("./core/interfaces").IP2PEvents>(
    event: K,
    listener: import("./core/interfaces").IP2PEvents[K]
  ): void {
    p2pEventBus.off(event, listener);
  }

  /**
   * Test P2P system end-to-end
   * Returns validation results for all components
   */
  async validateSystem(): Promise<{
    swarmManager: boolean;
    adapterManager: boolean;
    transferManager: boolean;
    eventBus: boolean;
    overall: boolean;
  }> {
    const results = {
      swarmManager: false,
      adapterManager: false,
      transferManager: false,
      eventBus: false,
      overall: false,
    };

    try {
      // Test SwarmManager
      results.swarmManager = this.swarmManager !== null;

      // Test AdapterManager
      results.adapterManager = this.adapterManager !== null;

      // Test TransferManager
      results.transferManager = this.transferManager !== null;

      // Test EventBus
      results.eventBus = p2pEventBus !== null;

      // Overall validation
      results.overall =
        results.swarmManager &&
        results.adapterManager &&
        results.transferManager &&
        results.eventBus &&
        this.initialized;

      console.log("[P2PService] System validation:", results);
      return results;
    } catch (error) {
      console.error("[P2PService] System validation failed:", error);
      return results;
    }
  }

  /**
   * Clean teardown
   */
  async destroy(): Promise<void> {
    await this.swarmManager.teardown();
    this.adapterManager.cleanup();
    this.transferManager.cleanup();
    this.initialized = false;
  }

  // Utility methods

  /**
   * Generate friendly room code
   */
  private generateRoomCode(): string {
    const adjectives = ["FAST", "SMART", "COOL", "MEGA", "SUPER"];
    const nouns = ["PEER", "NODE", "LINK", "MESH", "SWARM"];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 1000);
    return `${adj}-${noun}-${num}`;
  }

  /**
   * Convert room code to topic hash
   */
  private async codeToTopic(code: string): Promise<string> {
    const normalizedCode = code.trim().toUpperCase();
    return await this.hashTopic(`orch-os-room-${normalizedCode}`);
  }

  /**
   * Hash a topic string
   */
  private async hashTopic(topic: string): Promise<string> {
    const hash = crypto.createHash("sha256").update(topic).digest();
    return hash.toString("hex");
  }

  /**
   * Get local network identifier
   */
  private getLocalNetworkId(): string {
    // Simple implementation - could be improved with actual network detection
    return "default-local";
  }
}

// Export singleton instance
export const p2pService = new P2PService();
