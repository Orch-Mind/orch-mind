// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { p2pService } from "../../../../../services/p2p/P2PService";
import { p2pEventBus } from "../../../../../services/p2p/core/EventBus";
import {
  NotificationUtils,
  ShareUtils,
} from "../../components/settings/ShareSettings/utils";

export interface P2PRoom {
  type: "general" | "local" | "private";
  code?: string;
  peersCount: number;
  isActive: boolean;
}

export interface P2PGlobalStatus {
  isConnected: boolean;
  isLoading: boolean;
  currentRoom: P2PRoom | null;
  lastError?: string;
}

interface ConnectionCallbacks {
  onStatusChange: (status: P2PGlobalStatus) => void;
  onPeersUpdated: (count: number) => void;
  onAdaptersAvailable: (data: { from: string; adapters: any[] }) => void;
}

export class P2PConnectionService {
  private status: P2PGlobalStatus = {
    isConnected: false,
    isLoading: false,
    currentRoom: null,
  };

  private callbacks: ConnectionCallbacks;
  private connectionCheckInterval: NodeJS.Timeout | null = null;
  private eventListenersSetup = false;
  private eventHandlers: {
    handleRoomJoined: (room: any) => void;
    handlePeersUpdated: (count: number) => void;
    handleRoomLeft: () => void;
    handleAdaptersAvailable: (data: { from: string; adapters: any[] }) => void;
  } = {} as any;

  constructor(callbacks: ConnectionCallbacks) {
    this.callbacks = callbacks;
  }

  getStatus(): P2PGlobalStatus {
    return { ...this.status };
  }

  async initialize(): Promise<void> {
    try {
      console.log("🔧 [P2P-CONNECTION] Initializing P2P service...");

      // Check if we're in Electron environment
      if (typeof window === "undefined" || !window.__ORCH_OS__) {
        throw new Error("P2P requires Orch-OS desktop application");
      }

      // Wait for Electron API to be ready
      let retries = 0;
      const maxRetries = 10;
      while (!window.electronAPI && retries < maxRetries) {
        console.log(
          `🔄 [P2P-CONNECTION] Waiting for Electron API... (${
            retries + 1
          }/${maxRetries})`
        );
        await new Promise((resolve) => setTimeout(resolve, 500));
        retries++;
      }

      if (!window.electronAPI) {
        throw new Error(
          "Electron API not available after waiting. Please restart the application."
        );
      }

      if (!p2pService.isInitialized()) {
        await p2pService.initialize();
        console.log("✅ [P2P-CONNECTION] P2P service initialized successfully");
      }

      this.setupEventListeners();
      this.startConnectionMonitoring();
    } catch (error) {
      console.error("❌ [P2P-CONNECTION] Failed to initialize P2P:", error);
      this.updateStatus({
        ...this.status,
        lastError:
          error instanceof Error
            ? error.message
            : "Failed to initialize P2P service",
      });
      throw error;
    }
  }

  async connect(
    type: "general" | "local" | "private",
    privateCode?: string,
    isAutoRestoring = false
  ): Promise<void> {
    if (this.status.isLoading) {
      console.log("⚠️ [P2P-CONNECTION] Connection already in progress");
      return;
    }

    console.log("🔄 [P2P-CONNECTION] Connecting to:", { type, privateCode });

    this.updateStatus({
      ...this.status,
      isLoading: true,
      lastError: undefined,
    });

    try {
      if (type === "general") {
        await p2pService.joinGeneralRoom();
        p2pEventBus.emit("room:joined", {
          type: "general",
          topic: "general-room",
          peersCount: 0,
        });
      } else if (type === "local") {
        const localTopic = await ShareUtils.generateLocalNetworkTopic();
        await p2pService.joinRoom(localTopic);
        p2pEventBus.emit("room:joined", {
          type: "local",
          topic: localTopic,
          peersCount: 0,
        });
      } else if (type === "private") {
        const codeToUse = privateCode?.trim();

        if (codeToUse) {
          const topic = await ShareUtils.codeToTopic(codeToUse);
          await p2pService.joinRoom(topic);
          p2pEventBus.emit("room:joined", {
            type: "private",
            code: codeToUse,
            topic,
            peersCount: 0,
          });
        } else {
          const friendlyCode = ShareUtils.generateFriendlyCode();
          const topic = await ShareUtils.codeToTopic(friendlyCode);
          await p2pService.joinRoom(topic);
          p2pEventBus.emit("room:joined", {
            type: "private",
            code: friendlyCode,
            topic,
            peersCount: 0,
          });
        }
      }

      // Show success notification (if not auto-restoring)
      if (!isAutoRestoring) {
        const roomName =
          type === "general"
            ? "Community"
            : type === "local"
            ? "Local Network"
            : `Room ${privateCode || "Created"}`;
        NotificationUtils.showSuccess(`Connected to ${roomName}!`);
      }
    } catch (error) {
      console.error("❌ [P2P-CONNECTION] Connection failed:", error);

      this.updateStatus({
        ...this.status,
        isLoading: false,
        lastError: error instanceof Error ? error.message : "Connection failed",
      });

      if (!isAutoRestoring) {
        NotificationUtils.showError("Failed to connect to P2P network");
      }

      throw error;
    }
  }

  async disconnect(): Promise<void> {
    console.log("🔄 [P2P-CONNECTION] Disconnecting...");

    try {
      await p2pService.leaveRoom();
      NotificationUtils.showSuccess("Disconnected from P2P network");
    } catch (error) {
      console.error("❌ [P2P-CONNECTION] Disconnect failed:", error);
      NotificationUtils.showError("Failed to disconnect properly");
    }
  }

  private setupEventListeners(): void {
    if (this.eventListenersSetup) {
      return;
    }

    const handleRoomJoined = (room: any): void => {
      console.log(`🚪 [P2P-CONNECTION] Room joined event:`, room);

      // Validate room type to prevent "Unknown" status
      const validTypes: Array<"general" | "local" | "private"> = [
        "general",
        "local",
        "private",
      ];
      const roomType = validTypes.includes(room.type) ? room.type : "general";

      if (room.type !== roomType) {
        console.warn(
          `⚠️ [P2P-CONNECTION] Invalid room type "${room.type}", defaulting to "${roomType}"`
        );
      }

      const newStatus: P2PGlobalStatus = {
        isConnected: true,
        isLoading: false,
        currentRoom: {
          type: roomType,
          code: room.code,
          peersCount: room.peersCount || 0,
          isActive: true,
        },
      };

      console.log(`✅ [P2P-CONNECTION] Status updated:`, {
        type: newStatus.currentRoom?.type,
        code: newStatus.currentRoom?.code,
        peersCount: newStatus.currentRoom?.peersCount,
      });

      this.updateStatus(newStatus);
    };

    const handlePeersUpdated = (count: number) => {
      console.log(`📡 [P2P-CONNECTION] Peers updated event: ${count} peers`);
      this.status.currentRoom = this.status.currentRoom
        ? { ...this.status.currentRoom, peersCount: count }
        : null;
      this.updateStatus({ ...this.status });
      this.callbacks.onPeersUpdated(count);
    };

    const handleRoomLeft = () => {
      console.log(`🚪 [P2P-CONNECTION] Room left event`);
      const newStatus: P2PGlobalStatus = {
        isConnected: false,
        isLoading: false,
        currentRoom: null,
      };
      this.updateStatus(newStatus);
    };

    const handleAdaptersAvailable = (data: {
      from: string;
      adapters: any[];
    }) => {
      this.callbacks.onAdaptersAvailable(data);
    };

    // Store handlers for proper cleanup
    this.eventHandlers = {
      handleRoomJoined,
      handlePeersUpdated,
      handleRoomLeft,
      handleAdaptersAvailable,
    };

    // Remove existing listeners first to prevent duplicates
    p2pEventBus.off("room:joined", handleRoomJoined);
    p2pEventBus.off("peers:updated", handlePeersUpdated);
    p2pEventBus.off("room:left", handleRoomLeft);
    p2pEventBus.off("adapters:available", handleAdaptersAvailable);

    // Add new listeners
    p2pEventBus.on("room:joined", handleRoomJoined);
    p2pEventBus.on("peers:updated", handlePeersUpdated);
    p2pEventBus.on("room:left", handleRoomLeft);
    p2pEventBus.on("adapters:available", handleAdaptersAvailable);

    this.eventListenersSetup = true;
    console.log("✅ [P2P-CONNECTION] Event listeners setup complete");
  }

  private startConnectionMonitoring(): void {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }

    this.connectionCheckInterval = setInterval(() => {
      if (this.status.isConnected && this.status.currentRoom) {
        // Health check logic can be added here
        console.log("🔍 [P2P-CONNECTION] Connection health check passed");
      }
    }, 30000); // Check every 30 seconds
  }

  private updateStatus(newStatus: P2PGlobalStatus): void {
    this.status = newStatus;
    this.callbacks.onStatusChange(newStatus);
  }

  cleanup(): void {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }

    // Remove event listeners
    if (this.eventListenersSetup) {
      p2pEventBus.off("room:joined", this.eventHandlers.handleRoomJoined);
      p2pEventBus.off("peers:updated", this.eventHandlers.handlePeersUpdated);
      p2pEventBus.off("room:left", this.eventHandlers.handleRoomLeft);
      p2pEventBus.off(
        "adapters:available",
        this.eventHandlers.handleAdaptersAvailable
      );
      this.eventListenersSetup = false;
    }

    console.log("🧹 [P2P-CONNECTION] Cleanup completed");
  }
}
