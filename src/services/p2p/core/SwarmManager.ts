// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { p2pEventBus } from "./EventBus";
import type { IP2PConnection, IP2PRoom } from "./interfaces";

/**
 * SwarmManager - Single Responsibility: P2P Connection Management
 * Based on Pears documentation patterns
 */
export class SwarmManager implements IP2PConnection {
  private swarm: any = null;
  private discovery: any = null;
  private currentRoom: IP2PRoom | null = null;
  private peers: Map<string, any> = new Map();
  private isElectron: boolean;

  constructor() {
    // More robust Electron detection for Orch-OS
    this.isElectron = this.detectElectronEnvironment();
  }

  /**
   * Detect if we're running in Electron environment
   */
  private detectElectronEnvironment(): boolean {
    // Check multiple indicators for Electron
    if (typeof window === "undefined") return false;

    // Primary check: electronAPI exists
    if (window.electronAPI) return true;

    // Secondary check: process.versions.electron exists
    if (typeof process !== "undefined" && process.versions?.electron)
      return true;

    // Tertiary check: navigator.userAgent contains Electron
    if (
      typeof navigator !== "undefined" &&
      navigator.userAgent?.includes("Electron")
    )
      return true;

    // For Orch-OS, we can also check for specific window properties
    if (
      (window as any).__ORCH_OS__ ||
      (window as any).electronAPI !== undefined
    )
      return true;

    return false;
  }

  /**
   * Wait for Electron API to be available
   */
  private async waitForElectronAPI(timeout: number = 5000): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (window.electronAPI) {
        return true;
      }
      // Wait 100ms before checking again
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return false;
  }

  /**
   * Initialize Hyperswarm
   */
  async initialize(): Promise<void> {
    if (this.swarm) return; // Already initialized

    console.log("[SwarmManager] Initializing P2P...", {
      isElectron: this.isElectron,
      hasElectronAPI: !!window.electronAPI,
      userAgent: navigator.userAgent,
    });

    // In Electron, use IPC to initialize on main process
    if (this.isElectron) {
      // Wait for electronAPI to be available if not already
      if (!window.electronAPI) {
        console.log("[SwarmManager] Waiting for Electron API...");
        const apiAvailable = await this.waitForElectronAPI();
        if (!apiAvailable) {
          throw new Error(
            "Electron API not available after timeout. Please ensure the app is running in Electron."
          );
        }
      }

      try {
        const result = await (window.electronAPI as any).p2pInitialize();
        if (!result.success) {
          throw new Error(result.error || "Failed to initialize P2P");
        }
        this.setupElectronListeners();
        console.log("[SwarmManager] P2P initialized successfully");
      } catch (error) {
        console.error("[SwarmManager] P2P initialization failed:", error);
        throw new Error(
          `P2P initialization failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    } else {
      // For now, we only support Electron in Orch-OS
      // Future: Could implement WebRTC fallback for browser environments
      console.warn(
        "[SwarmManager] Non-Electron environment detected. P2P requires Electron."
      );
      throw new Error(
        "P2P networking requires Electron environment. Please run Orch-OS as a desktop application."
      );
    }
  }

  /**
   * Connect to a P2P room
   */
  async connect(topic: string): Promise<void> {
    if (!this.isElectron || !window.electronAPI) {
      throw new Error("P2P connection requires Electron environment");
    }

    // Disconnect from current room if any
    if (this.currentRoom) {
      await this.disconnect();
    }

    const result = await (window.electronAPI as any).p2pJoinRoom(topic);
    if (!result.success) {
      throw new Error(result.error || "Failed to join room");
    }

    // Room info will be updated via event
  }

  /**
   * Disconnect from current room
   */
  async disconnect(): Promise<void> {
    if (!this.isElectron || !this.currentRoom || !window.electronAPI) return;

    const result = await (window.electronAPI as any).p2pLeaveRoom();
    if (!result.success) {
      throw new Error(result.error || "Failed to leave room");
    }

    this.currentRoom = null;
    this.peers.clear();
    p2pEventBus.emit("room:left");
  }

  /**
   * Check if connected to a room
   */
  isConnected(): boolean {
    return this.currentRoom !== null;
  }

  /**
   * Get current peers count
   */
  getPeersCount(): number {
    return this.peers.size;
  }

  /**
   * Get current room info
   */
  getCurrentRoom(): IP2PRoom | null {
    return this.currentRoom;
  }

  /**
   * Setup Electron IPC listeners
   */
  private setupElectronListeners(): void {
    if (!window.electronAPI) {
      console.warn(
        "[SwarmManager] Cannot setup listeners: Electron API not available"
      );
      return;
    }

    // Peer count updates
    (window.electronAPI as any).onP2PPeersUpdated?.((count: number) => {
      if (this.currentRoom) {
        this.currentRoom.peersCount = count;
        p2pEventBus.emit("peer:connected", `peer-${count}`);
      }
    });

    // Room joined
    (window.electronAPI as any).onP2PRoomJoined?.((data: any) => {
      this.currentRoom = {
        type: data.type || "private",
        topic: data.topic,
        code: data.code,
        peersCount: 0,
      };
      p2pEventBus.emit("room:joined", this.currentRoom);
    });

    // Room left
    (window.electronAPI as any).onP2PRoomLeft?.(() => {
      this.currentRoom = null;
      this.peers.clear();
      p2pEventBus.emit("room:left");
    });
  }

  /**
   * Teardown following Pears pattern
   */
  async teardown(): Promise<void> {
    if (this.currentRoom) {
      await this.disconnect();
    }

    if (this.isElectron && window.electronAPI) {
      await (window.electronAPI as any).p2pDestroy();
    }

    this.peers.clear();
    p2pEventBus.removeAllListeners();
  }
}
