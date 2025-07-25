// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { p2pEventBus } from "./EventBus";
import type { IAdapterInfo } from "./interfaces";

/**
 * MockPeerService - Development tool to simulate P2P peers and adapters
 * Only active in development mode for testing P2P functionality
 */
export class MockPeerService {
  private isActive: boolean = false;
  private mockPeers: Map<string, any> = new Map();
  private mockAdapters: IAdapterInfo[] = [];
  private simulationInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Only activate in development mode
    this.isActive = this.isDevelopmentMode();

    if (this.isActive) {
      console.log(
        "🧪 [MockPeerService] Development mode detected - Mock peers enabled"
      );
      this.initializeMockData();
    }
  }

  /**
   * Check if we're in development mode
   */
  private isDevelopmentMode(): boolean {
    // Check if running in development
    if (
      typeof process !== "undefined" &&
      process.env.NODE_ENV === "development"
    ) {
      return false;
    }

    // Check if localhost or development URL
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      return (
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname.includes("dev")
      );
    }

    return false;
  }

  /**
   * Detect base model from adapter name
   */
  private detectBaseModelFromName(adapterName: string): string {
    const name = adapterName.toLowerCase();

    if (name.includes("gemma3") || name.includes("gemma-3")) {
      return "gemma3:latest";
    }
    if (name.includes("gemma3n") || name.includes("gemma-3n")) {
      return "gemma3n:latest";
    }

    // Default fallback
    return "gemma3:latest";
  }

  /**
   * Initialize mock data
   */
  private initializeMockData(): void {
    // Mock adapters that would come from Docker peer
    this.mockAdapters = [
      {
        name: "gemma3-test-adapter",
        topic: "gemma3-test-adapter-topic-hash-12345",
        size: 67108864, // 64MB
        checksum: "sha256:mock-checksum-gemma3",
        from: "115f4f24df80",
        timestamp: Date.now(),
        metadata: {
          base_model: "gemma3:latest",
          file_type: "safetensors",
          status: "ready",
        },
      },
      {
        name: "llama3-coding-adapter",
        topic: "llama3-coding-adapter-topic-hash-67890",
        size: 33554432, // 32MB
        checksum: "sha256:mock-checksum-llama3",
        from: "115f4f24df80",
        timestamp: Date.now(),
        metadata: {
          base_model: "llama3.1:latest",
          file_type: "safetensors",
          status: "ready",
        },
      },
      {
        name: "mistral-creative-adapter",
        topic: "mistral-creative-adapter-topic-hash-abcde",
        size: 45000000, // 45MB
        checksum: "sha256:mock-checksum-mistral",
        from: "115f4f24df80",
        timestamp: Date.now(),
        metadata: {
          base_model: "mistral:latest",
          file_type: "safetensors",
          status: "ready",
        },
      },
    ];

    // Mock peer info
    this.mockPeers.set("115f4f24df80", {
      id: "115f4f24df80",
      type: "docker-peer",
      adapters: this.mockAdapters,
      connected: true,
      lastSeen: Date.now(),
    });
  }

  /**
   * Start mock peer simulation
   */
  startSimulation(): void {
    if (!this.isActive) return;

    console.log("🚀 [MockPeerService] Starting peer simulation...");

    // Simulate peer connection after a short delay
    setTimeout(() => {
      this.simulatePeerConnection();
    }, 2000);

    // Send initial adapter list, then reduce frequency to avoid flood
    // Only send updates every 5 minutes instead of 30 seconds
    this.simulationInterval = setInterval(() => {
      // Only send updates if there are actually changes or periodically for keep-alive
      this.sendMockAdapterUpdates(true); // true = periodic update (less verbose)
    }, 300000); // Every 5 minutes (300 seconds) instead of 30 seconds
  }

  /**
   * Stop mock peer simulation
   */
  stopSimulation(): void {
    if (!this.isActive) return;

    console.log("🛑 [MockPeerService] Stopping peer simulation...");

    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }

    // Simulate peer disconnection
    this.simulatePeerDisconnection();
  }

  /**
   * Simulate peer connection
   */
  private simulatePeerConnection(): void {
    console.log("🤝 [MockPeerService] Simulating peer connection...");

    // Emit peer count update
    p2pEventBus.emit("peers:updated", 1);

    // Send adapter list
    setTimeout(() => {
      this.sendMockAdapterUpdates(false); // false = initial update (verbose)
    }, 1000);
  }

  /**
   * Simulate peer disconnection
   */
  private simulatePeerDisconnection(): void {
    console.log("👋 [MockPeerService] Simulating peer disconnection...");

    // Emit peer count update
    p2pEventBus.emit("peers:updated", 0);

    // Clear adapters
    p2pEventBus.emit("adapters:available", {
      from: "115f4f24df80",
      adapters: [],
    });
  }

  /**
   * Send mock adapter updates
   */
  private sendMockAdapterUpdates(isPeriodic: boolean = false): void {
    // Use console.debug for periodic updates to reduce noise
    if (isPeriodic) {
      console.debug(
        `📦 [MockPeerService] Periodic adapter list update: ${this.mockAdapters.length} adapters`
      );
    } else {
      console.log(
        `📦 [MockPeerService] Sending mock adapter list: ${this.mockAdapters.length} adapters`
      );
    }

    p2pEventBus.emit("adapters:available", {
      from: "115f4f24df80",
      adapters: this.mockAdapters,
    });
  }

  /**
   * Simulate adapter download
   */
  async simulateAdapterDownload(adapterName: string): Promise<Uint8Array> {
    if (!this.isActive) {
      throw new Error("Mock service not active");
    }

    const adapter = this.mockAdapters.find((a) => a.name === adapterName);
    if (!adapter) {
      throw new Error(`Mock adapter ${adapterName} not found`);
    }

    console.log(
      `📥 [MockPeerService] Simulating download of ${adapterName}...`
    );
    console.log(
      `📊 [MockPeerService] File size: ${(adapter.size / 1024 / 1024).toFixed(
        1
      )}MB`
    );

    // Simulate download progress
    const chunkSize = 64 * 1024; // 64KB
    const totalChunks = Math.ceil(adapter.size / chunkSize);

    console.log(
      `📦 [MockPeerService] Download will use ${totalChunks} chunks of ${
        chunkSize / 1024
      }KB each`
    );

    return new Promise((resolve, reject) => {
      let downloadedChunks = 0;
      // Use browser-compatible approach instead of Buffer
      const mockData = this.createMockBuffer(adapter.size);

      const downloadInterval = setInterval(() => {
        downloadedChunks++;
        const progress = (downloadedChunks / totalChunks) * 100;

        // Emit progress events
        p2pEventBus.emit("download:progress", {
          adapterName,
          progress,
          downloadedBytes: downloadedChunks * chunkSize,
          totalBytes: adapter.size,
        });

        // Log progress at intervals (every 10%)
        if (
          downloadedChunks % Math.ceil(totalChunks / 10) === 0 ||
          downloadedChunks === totalChunks
        ) {
          console.log(
            `📦 [MockPeerService] Download progress: ${progress.toFixed(
              1
            )}% (${downloadedChunks}/${totalChunks} chunks)`
          );
        }

        if (downloadedChunks >= totalChunks) {
          clearInterval(downloadInterval);
          console.log(
            `✅ [MockPeerService] Download completed: ${adapterName}`
          );

          // Emit final progress event
          p2pEventBus.emit("download:progress", {
            adapterName,
            progress: 100,
            downloadedBytes: adapter.size,
            totalBytes: adapter.size,
          });

          // Simulate saving adapter to localStorage after download completes
          this.simulateAdapterSave(adapter);

          resolve(mockData);
        }
      }, 50); // Simulate 50ms per chunk (faster for testing)

      // Simulate potential timeout - calculate based on file size
      // For 64MB file: ~1024 chunks × 50ms = ~51s, so use 80s timeout
      const estimatedTime = Math.ceil(totalChunks * 50); // 50ms per chunk
      const timeoutMs = Math.max(estimatedTime + 20000, 30000); // Add 20s buffer, minimum 30s

      console.log(
        `⏱️ [MockPeerService] Download timeout set to ${
          timeoutMs / 1000
        }s for ${totalChunks} chunks`
      );

      setTimeout(() => {
        clearInterval(downloadInterval);
        reject(
          new Error(
            `Mock download timeout for ${adapterName} after ${
              timeoutMs / 1000
            }s`
          )
        );
      }, timeoutMs);
    });
  }

  /**
   * Create mock buffer compatible with browser environment
   */
  private createMockBuffer(size: number): Uint8Array {
    // Use Uint8Array which is universally supported
    const array = new Uint8Array(size);
    array.fill(65); // Fill with 'A' (ASCII 65)
    return array;
  }

  /**
   * Simulate saving downloaded adapter to localStorage for training tab
   */
  private simulateAdapterSave(adapter: IAdapterInfo): void {
    try {
      console.log(
        `💾 [MockPeerService] Simulating adapter save to localStorage: ${adapter.name}`
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
          existing.id === adapter.name || existing.name === adapter.name
      );

      if (existingIndex === -1) {
        // Detect base model from adapter name
        const detectedBaseModel = this.detectBaseModelFromName(adapter.name);

        console.log(
          `🔍 [MockPeerService] Detected base model for ${adapter.name}: ${detectedBaseModel}`
        );

        // Create new adapter entry for training tab
        const newAdapter = {
          id: adapter.name,
          name: adapter.name,
          baseModel: detectedBaseModel, // Use detected base model instead of hardcoded
          enabled: false,
          createdAt: new Date().toISOString(),
          status: "downloaded",
          source: "p2p",
          downloadedFrom: "115f4f24df80", // Mock peer ID
          size: adapter.size,
          checksum: adapter.checksum,
          topic: adapter.topic,
        };

        adapterStorage.adapters.push(newAdapter);

        // Save back to localStorage
        localStorage.setItem(
          "orch-lora-adapters",
          JSON.stringify(adapterStorage)
        );

        console.log(
          `✅ [MockPeerService] Successfully saved adapter to localStorage:`,
          newAdapter
        );

        // Dispatch event to notify training tab
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
              source: "mock-download",
            },
          })
        );
      } else {
        console.log(
          `ℹ️ [MockPeerService] Adapter ${adapter.name} already exists in localStorage`
        );
      }
    } catch (error) {
      console.error(
        `❌ [MockPeerService] Error saving adapter to localStorage:`,
        error
      );
    }
  }

  /**
   * Test timeout calculations (for debugging)
   */
  testTimeoutCalculation(): void {
    if (!this.isActive) return;

    console.log("🧪 [MockPeerService] Testing timeout calculations:");

    this.mockAdapters.forEach((adapter) => {
      const chunkSize = 64 * 1024; // 64KB
      const totalChunks = Math.ceil(adapter.size / chunkSize);
      const estimatedTime = Math.ceil(totalChunks * 50); // 50ms per chunk
      const timeoutMs = Math.max(estimatedTime + 20000, 30000); // Add 20s buffer, minimum 30s

      console.log(`📊 [MockPeerService] ${adapter.name}:`, {
        size: `${(adapter.size / 1024 / 1024).toFixed(1)}MB`,
        chunks: totalChunks,
        estimatedTime: `${estimatedTime / 1000}s`,
        timeout: `${timeoutMs / 1000}s`,
      });
    });
  }

  /**
   * Check if mock service is active
   */
  isActiveService(): boolean {
    return this.isActive;
  }

  /**
   * Get mock adapters
   */
  getMockAdapters(): IAdapterInfo[] {
    return this.isActive ? [...this.mockAdapters] : [];
  }

  /**
   * Get mock peers
   */
  getMockPeers(): Map<string, any> {
    return this.isActive ? new Map(this.mockPeers) : new Map();
  }
}

// Export singleton instance
export const mockPeerService = new MockPeerService();
