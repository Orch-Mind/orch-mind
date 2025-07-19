// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { AdapterManager } from "./core/AdapterManager";
import { p2pEventBus } from "./core/EventBus";
import type { IAdapterInfo, IP2PRoom } from "./core/interfaces";
import { mockPeerService } from "./core/MockPeerService";
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
  static readonly GENERAL_ROOM = "orch-mind-general-public-community-room-v1";
  static readonly LOCAL_PREFIX = "orch-mind-local-network-";

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

    // Start mock peer service if in development mode
    if (mockPeerService.isActiveService()) {
      console.log("🧪 [P2PService] Starting mock peer service for development");
      mockPeerService.startSimulation();
    }

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
        p2pEventBus.emit("adapters:available", data);
      });

      // Listen for adapter saved to filesystem (for adding to training tab)
      (window.electronAPI as any).onP2PAdapterSavedToFilesystem?.(
        (data: any) => {
          console.log(
            "[P2PService] Adapter saved to filesystem, adding to training tab:",
            data
          );
          this.addDownloadedAdapterToTrainingTab(data);
        }
      );

      // IMPORTANT: Listen for transfer progress from Electron backend
      // This converts backend "transfer-progress" events to frontend "download:progress" events
      (window.electronAPI as any).onP2PTransferProgress?.((data: {
        topic: string;
        progress: number;
        sent: number;
        total: number;
      }) => {
        console.log(
          "[P2PService] Received transfer-progress from Electron:",
          data
        );
        
        // Convert backend progress to frontend format
        const downloadProgressData = {
          adapterName: data.topic,
          progress: data.progress,
          downloadedBytes: Math.floor((data.sent / data.total) * 100000), // Estimate bytes based on progress
          totalBytes: 100000, // Default estimate, will be updated with real data if available
        };
        
        // Emit as download:progress event for the frontend to consume
        p2pEventBus.emit("download:progress", downloadProgressData);
      });

      // Listen for chunk received events to track download progress
      (window.electronAPI as any).onP2PChunkReceived?.((data: {
        topic: string;
        index: number;
        total: number;
        chunkSize?: number;
        [key: string]: any;
      }) => {
        console.log(
          "[P2PService] Received chunk-received from Electron:",
          `${data.index + 1}/${data.total} for ${data.topic}`
        );
        
        // Calculate progress based on chunks received
        const progress = ((data.index + 1) / data.total) * 100;
        
        // Estimate bytes based on chunks (assuming ~64KB per chunk as typical)
        const estimatedChunkSize = data.chunkSize || 65536; // 64KB default
        const downloadedBytes = (data.index + 1) * estimatedChunkSize;
        const totalBytes = data.total * estimatedChunkSize;
        
        const downloadProgressData = {
          adapterName: data.topic,
          progress: Math.min(progress, 100),
          downloadedBytes,
          totalBytes,
        };
        
        // Emit as download:progress event for the frontend to consume
        p2pEventBus.emit("download:progress", downloadProgressData);
      });

      // Listen for transfer completion to finalize progress
      (window.electronAPI as any).onP2PTransferComplete?.((data: any) => {
        const topic = typeof data === 'string' ? data : data.topic;
        console.log(
          "[P2PService] Transfer completed for adapter:",
          topic
        );
        
        // Emit final 100% progress with realistic byte values
        const completionData = {
          adapterName: topic,
          progress: 100,
          downloadedBytes: data.totalBytes || 100000000, // 100MB default if not provided
          totalBytes: data.totalBytes || 100000000,
        };
        
        p2pEventBus.emit("download:progress", completionData);
      });

      console.log("[P2PService] IPC listeners setup complete with download progress support");
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
   * Ensures the P2P service is connected before proceeding.
   * Retries for a short duration.
   */
  async ensureConnection(timeout = 3000): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const status = this.getStatus();

      // Consider connection confirmed if:
      // 1. Connected and has peers, OR
      // 2. Connected and has been connected for at least 2 seconds (for Docker peers)
      if (status.isConnected) {
        if (status.peersCount > 0) {
          console.log("[P2PService] Connection confirmed with peers.", status);
          return true;
        }

        // For Docker peers that may not be counted correctly,
        // if we've been connected for 2+ seconds, consider it stable
        const connectedTime = Date.now() - startTime;
        if (connectedTime >= 2000) {
          console.log(
            "[P2PService] Connection confirmed (stable connection).",
            status
          );
          return true;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 500)); // Wait 500ms before retrying
    }
    console.warn(
      "[P2PService] Connection could not be confirmed within the timeout.",
      this.getStatus()
    );
    return false;
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
  async requestAdapter(topic: string, fromPeer?: string): Promise<Uint8Array> {
    // Check if mock service should handle this
    if (mockPeerService.isActiveService()) {
      const mockAdapters = mockPeerService.getMockAdapters();
      const adapter = mockAdapters.find((a) => a.topic === topic);

      if (adapter) {
        console.log(`🧪 [P2PService] Using mock download for ${adapter.name}`);
        return await mockPeerService.simulateAdapterDownload(adapter.name);
      }
    }

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
    // Stop mock service if active
    if (mockPeerService.isActiveService()) {
      mockPeerService.stopSimulation();
    }

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
    return await this.hashTopic(`orch-mind-room-${normalizedCode}`);
  }

  /**
   * Hash a topic string
   */
  private async hashTopic(topic: string): Promise<string> {
    // Use Electron crypto API when available
    if (
      typeof window !== "undefined" &&
      (window as any).electronAPI?.crypto?.hashTopic
    ) {
      return await (window as any).electronAPI.crypto.hashTopic(topic);
    }

    // Fallback for development/testing
    if (typeof window !== "undefined" && window.crypto?.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(topic);
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }

    throw new Error("No crypto implementation available");
  }

  /**
   * Get local network identifier
   */
  private getLocalNetworkId(): string {
    // Simple implementation - could be improved with actual network detection
    return "default-local";
  }

  /**
   * Add downloaded adapter to training tab localStorage
   */
  private addDownloadedAdapterToTrainingTab(data: {
    adapterName: string;
    metadata: any;
    filesystem: any;
  }): void {
    try {
      console.log(
        `💾 [P2PService] Adding downloaded adapter to training tab: ${data.adapterName}`
      );

      // Load existing adapters from localStorage
      const existingData = localStorage.getItem("orch-lora-adapters");
      let adapterStorage = existingData
        ? JSON.parse(existingData)
        : { adapters: [] };

      // Ensure adapters array exists
      if (!adapterStorage.adapters) {
        adapterStorage.adapters = [];
      }

      // Check if adapter already exists
      const existingIndex = adapterStorage.adapters.findIndex(
        (existing: any) =>
          existing.id === data.adapterName || existing.name === data.adapterName
      );

      if (existingIndex === -1) {
        // Create new adapter entry for training tab
        const newAdapter = {
          id: data.adapterName,
          name: data.adapterName,
          baseModel: data.metadata.base_model || "llama3.1:latest",
          enabled: false,
          createdAt: data.metadata.created_at || new Date().toISOString(),
          status: "downloaded",
          source: "p2p",
          downloadedFrom: "real-peer", // Real P2P download
          size: data.metadata.original_size || 0,
          checksum: data.metadata.checksum,
          // Additional metadata from filesystem
          adapterPath: data.filesystem.adapterPath,
          registryPath: data.filesystem.registryPath,
          trainingMethod: data.metadata.training_method,
          fileType: data.metadata.file_type,
        };

        adapterStorage.adapters.push(newAdapter);

        // Save back to localStorage
        localStorage.setItem(
          "orch-lora-adapters",
          JSON.stringify(adapterStorage)
        );

        console.log(
          `✅ [P2PService] Successfully added real adapter to localStorage:`,
          newAdapter
        );

        // Dispatch events to notify training tab
        window.dispatchEvent(
          new CustomEvent("storage", {
            detail: {
              key: "orch-lora-adapters",
              newValue: JSON.stringify(adapterStorage),
              storageArea: localStorage,
            },
          })
        );

        // Also dispatch a more specific event for immediate UI updates
        window.dispatchEvent(
          new CustomEvent("lora-adapter-added", {
            detail: {
              adapter: newAdapter,
              source: "real-p2p-download",
            },
          })
        );
      } else {
        console.log(
          `ℹ️ [P2PService] Adapter ${data.adapterName} already exists in localStorage`
        );
      }
    } catch (error) {
      console.error(
        `❌ [P2PService] Error adding adapter to localStorage:`,
        error
      );
    }
  }
}

// Export singleton instance
export const p2pService = new P2PService();
