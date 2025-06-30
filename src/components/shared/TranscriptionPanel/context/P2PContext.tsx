// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { p2pShareService } from "../../../../services/p2p/P2PShareService";
import { useP2PPersistence } from "../components/settings/ShareSettings/hooks/useP2PPersistence";
import {
  NotificationUtils,
  ShareUtils,
} from "../components/settings/ShareSettings/utils";

// Types
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
  signalStrength: "strong" | "medium" | "weak" | "none";
  lastError?: string;
}

interface P2PContextType {
  // Status
  status: P2PGlobalStatus;

  // Connection management
  connect: (
    type: "general" | "local" | "private",
    privateCode?: string
  ) => Promise<void>;
  disconnect: () => Promise<void>;

  // Auto-reconnection
  checkAndAutoReconnect: () => Promise<void>;
  reconnectToLastSession: () => Promise<void>;

  // Persistence
  persistedState: ReturnType<typeof useP2PPersistence>["persistedState"] & {
    updateSharedAdapters: (adapterIds: string[]) => void;
    updateSelectedMode: (mode: "auto" | "manual") => void;
  };
  clearPersistedState: () => void;

  // Utilities
  isAutoRestoring: boolean;
  shouldShowReconnectPanel: () => boolean;

  // Adapters events
  onAdaptersAvailable: (callback: (adapters: any) => void) => void;
  offAdaptersAvailable: (callback: (adapters: any) => void) => void;
}

const P2PContext = createContext<P2PContextType | null>(null);

export const useP2PContext = () => {
  const context = useContext(P2PContext);
  if (!context) {
    throw new Error("useP2PContext must be used within P2PProvider");
  }
  return context;
};

export const P2PProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Persistence hook
  const {
    persistedState,
    updateConnectionState,
    clearPersistedState,
    updateSharedAdapters,
    updateSelectedMode,
  } = useP2PPersistence();

  // Global status state
  const [status, setStatus] = useState<P2PGlobalStatus>({
    isConnected: false,
    isLoading: false,
    currentRoom: null,
    signalStrength: "none",
  });

  // Control flags
  const hasAutoReconnected = useRef(false);
  const isAutoRestoring = useRef(false);
  const autoRestoreSuccessful = useRef(false);
  const connectionCheckInterval = useRef<NodeJS.Timeout>();

  // Adapters event listeners registry
  const adaptersCallbacks = useRef<Set<(adapters: any) => void>>(new Set());

  // Initialize P2P service and setup event listeners
  useEffect(() => {
    const initializeP2P = async () => {
      try {
        if (!p2pShareService.isInitialized()) {
          console.log("🔧 [P2P-CONTEXT] Initializing P2P service...");
          await p2pShareService.initialize();
        }

        // Setup event listeners
        setupEventListeners();

        // Start connection health monitoring
        startConnectionMonitoring();

        // Auto-reconnect if needed
        checkAndAutoReconnect();
      } catch (error) {
        console.error("❌ [P2P-CONTEXT] Failed to initialize P2P:", error);
        setStatus((prev) => ({
          ...prev,
          lastError: "Failed to initialize P2P service",
        }));
      }
    };

    initializeP2P();

    return () => {
      cleanup();
    };
  }, []);

  // Setup P2P event listeners
  const setupEventListeners = useCallback(() => {
    const handleRoomJoined = (data: any) => {
      console.log("🔄 [P2P-CONTEXT] Room joined:", data);

      const newRoom: P2PRoom = {
        type: data.type || "local",
        code: data.code,
        peersCount: 0,
        isActive: true,
      };

      setStatus((prev) => ({
        ...prev,
        isConnected: true,
        isLoading: false,
        currentRoom: newRoom,
        signalStrength: getSignalStrength(0, true),
        lastError: undefined,
      }));
    };

    const handlePeersUpdated = (count: number) => {
      console.log("🔄 [P2P-CONTEXT] Peers updated:", count);

      setStatus((prev) => ({
        ...prev,
        signalStrength: getSignalStrength(count, prev.isConnected),
        currentRoom: prev.currentRoom
          ? {
              ...prev.currentRoom,
              peersCount: count,
            }
          : null,
      }));

      // Dispatch custom event for Smart Connect
      window.dispatchEvent(
        new CustomEvent("p2p-peers-updated", {
          detail: count,
        })
      );
    };

    const handleRoomLeft = () => {
      console.log("🔄 [P2P-CONTEXT] Room left");

      setStatus({
        isConnected: false,
        isLoading: false,
        currentRoom: null,
        signalStrength: "none",
      });
    };

    const handleConnectionError = (error: any) => {
      console.error("❌ [P2P-CONTEXT] Connection error:", error);

      setStatus((prev) => ({
        ...prev,
        isLoading: false,
        lastError: error?.message || "Connection error",
        signalStrength: "none",
      }));
    };

    const handleAdaptersAvailable = (adapters: any) => {
      console.log("🔄 [P2P-CONTEXT] Adapters available:", adapters);

      // Notify all registered callbacks
      adaptersCallbacks.current.forEach((callback) => {
        try {
          callback(adapters);
        } catch (error) {
          console.error("❌ [P2P-CONTEXT] Error in adapters callback:", error);
        }
      });
    };

    // Subscribe to P2P events
    p2pShareService.on("room-joined", handleRoomJoined);
    p2pShareService.on("peers-updated", handlePeersUpdated);
    p2pShareService.on("room-left", handleRoomLeft);
    p2pShareService.on("connection-error", handleConnectionError);
    p2pShareService.on("adapters-available", handleAdaptersAvailable);

    // Store cleanup functions
    return () => {
      p2pShareService.removeListener("room-joined", handleRoomJoined);
      p2pShareService.removeListener("peers-updated", handlePeersUpdated);
      p2pShareService.removeListener("room-left", handleRoomLeft);
      p2pShareService.removeListener("connection-error", handleConnectionError);
      p2pShareService.removeListener(
        "adapters-available",
        handleAdaptersAvailable
      );
    };
  }, []);

  // Connection health monitoring
  const startConnectionMonitoring = useCallback(() => {
    // Check connection status every 30 seconds
    connectionCheckInterval.current = setInterval(() => {
      if (status.isConnected && status.currentRoom) {
        console.log("🔄 [P2P-CONTEXT] Checking connection health...");

        // Verify if we're still actually connected
        // If no peers for too long, might indicate connection issues
        if (
          status.currentRoom.peersCount === 0 &&
          status.currentRoom.type !== "private"
        ) {
          console.log(
            "⚠️ [P2P-CONTEXT] No peers detected, connection might be stale"
          );
        }
      }
    }, 30000);
  }, [status.isConnected, status.currentRoom]);

  // Auto-reconnection logic
  const checkAndAutoReconnect = useCallback(async () => {
    if (hasAutoReconnected.current || isAutoRestoring.current) {
      return;
    }

    if (persistedState.lastConnectionType) {
      console.log("🔄 [P2P-CONTEXT] Auto-reconnecting from persisted state:", {
        type: persistedState.lastConnectionType,
        code: persistedState.lastRoomCode,
        sharedAdapters: persistedState.sharedAdapterIds,
      });

      hasAutoReconnected.current = true;
      isAutoRestoring.current = true;

      try {
        // Enable silent mode
        NotificationUtils.setSilentMode(true);

        await connect(
          persistedState.lastConnectionType,
          persistedState.lastRoomCode || undefined
        );

        // Restore shared adapters after successful connection
        if (persistedState.sharedAdapterIds.length > 0) {
          console.log(
            "🔄 [P2P-CONTEXT] Restoring shared adapters:",
            persistedState.sharedAdapterIds
          );

          // Wait a bit for the connection to stabilize and adapters to load
          setTimeout(() => {
            window.dispatchEvent(
              new CustomEvent("p2p-restore-adapters", {
                detail: {
                  sharedAdapterIds: persistedState.sharedAdapterIds,
                  isAutoRestore: true,
                  retryAttempt: 0,
                },
              })
            );
          }, 2000); // Wait 2 seconds for adapters to load
        }

        autoRestoreSuccessful.current = true;
        console.log("✅ [P2P-CONTEXT] Auto-reconnection successful");
      } catch (error) {
        console.error("❌ [P2P-CONTEXT] Auto-reconnection failed:", error);
        clearPersistedState();
      } finally {
        isAutoRestoring.current = false;
        NotificationUtils.setSilentMode(false);
      }
    } else {
      console.log("🔄 [P2P-CONTEXT] No previous connection to restore");
    }
  }, [
    persistedState.lastConnectionType,
    persistedState.lastRoomCode,
    persistedState.sharedAdapterIds,
  ]);

  // Connect function
  const connect = useCallback(
    async (type: "general" | "local" | "private", privateCode?: string) => {
      if (status.isLoading) {
        console.log("⚠️ [P2P-CONTEXT] Connection already in progress");
        return;
      }

      console.log("🔄 [P2P-CONTEXT] Connecting to:", { type, privateCode });

      setStatus((prev) => ({ ...prev, isLoading: true, lastError: undefined }));

      try {
        if (type === "general") {
          await p2pShareService.joinGeneralRoom();
          p2pShareService.emit("room-joined", { type: "general" });
        } else if (type === "local") {
          const localTopic = await ShareUtils.generateLocalNetworkTopic();
          await p2pShareService.joinRoom(localTopic);
          p2pShareService.emit("room-joined", {
            type: "local",
            topic: localTopic,
          });
        } else if (type === "private") {
          const codeToUse = privateCode?.trim();

          if (codeToUse) {
            const topic = await ShareUtils.codeToTopic(codeToUse);
            await p2pShareService.joinRoom(topic);
            p2pShareService.emit("room-joined", {
              type: "private",
              code: codeToUse,
              topic,
            });
          } else {
            const friendlyCode = ShareUtils.generateFriendlyCode();
            const topic = await ShareUtils.codeToTopic(friendlyCode);
            await p2pShareService.joinRoom(topic);
            p2pShareService.emit("room-joined", {
              type: "private",
              code: friendlyCode,
              topic,
            });
          }
        }

        // Update persistence
        updateConnectionState(type, privateCode || "", true);

        // Show success notification (if not auto-restoring)
        if (!isAutoRestoring.current) {
          const roomName =
            type === "general"
              ? "Community"
              : type === "local"
              ? "Local Network"
              : `Room ${privateCode || "Created"}`;
          NotificationUtils.showSuccess(`Connected to ${roomName}!`);
        }
      } catch (error) {
        console.error("❌ [P2P-CONTEXT] Connection failed:", error);

        setStatus((prev) => ({
          ...prev,
          isLoading: false,
          lastError:
            error instanceof Error ? error.message : "Connection failed",
        }));

        if (!isAutoRestoring.current) {
          NotificationUtils.showError("Failed to connect to P2P network");
        }

        throw error;
      }
    },
    [status.isLoading, updateConnectionState]
  );

  // Disconnect function
  const disconnect = useCallback(async () => {
    console.log("🔄 [P2P-CONTEXT] Disconnecting...");

    try {
      await p2pShareService.leaveRoom();

      // Clear persistence
      updateConnectionState(null, "", false);

      // Reset flags
      hasAutoReconnected.current = false;
      autoRestoreSuccessful.current = false;

      NotificationUtils.showSuccess("Disconnected from P2P network");
    } catch (error) {
      console.error("❌ [P2P-CONTEXT] Disconnect failed:", error);
      NotificationUtils.showError("Failed to disconnect properly");
    }
  }, [updateConnectionState]);

  // Reconnect to last session
  const reconnectToLastSession = useCallback(async () => {
    if (!persistedState.lastConnectionType) {
      console.log("⚠️ [P2P-CONTEXT] No last session to reconnect to");
      return;
    }

    await connect(
      persistedState.lastConnectionType,
      persistedState.lastRoomCode || undefined
    );
  }, [persistedState.lastConnectionType, persistedState.lastRoomCode, connect]);

  // Should show reconnect panel
  const shouldShowReconnectPanel = useCallback(() => {
    return !!(
      persistedState.lastConnectionType &&
      !autoRestoreSuccessful.current &&
      !isAutoRestoring.current &&
      !status.isConnected
    );
  }, [persistedState.lastConnectionType, status.isConnected]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (connectionCheckInterval.current) {
      clearInterval(connectionCheckInterval.current);
    }
  }, []);

  // Signal strength calculation
  const getSignalStrength = (
    peersCount: number,
    isConnected: boolean
  ): P2PGlobalStatus["signalStrength"] => {
    if (!isConnected) return "none";
    if (peersCount >= 3) return "strong";
    if (peersCount >= 1) return "medium";
    return "weak";
  };

  // Adapters event management
  const onAdaptersAvailable = useCallback(
    (callback: (adapters: any) => void) => {
      console.log("🔧 [P2P-CONTEXT] Registering adapters callback");
      adaptersCallbacks.current.add(callback);
    },
    []
  );

  const offAdaptersAvailable = useCallback(
    (callback: (adapters: any) => void) => {
      console.log("🔧 [P2P-CONTEXT] Unregistering adapters callback");
      adaptersCallbacks.current.delete(callback);
    },
    []
  );

  const contextValue: P2PContextType = {
    status,
    connect,
    disconnect,
    checkAndAutoReconnect,
    reconnectToLastSession,
    persistedState: {
      ...persistedState,
      updateSharedAdapters,
      updateSelectedMode,
    },
    clearPersistedState,
    isAutoRestoring: isAutoRestoring.current,
    shouldShowReconnectPanel,
    onAdaptersAvailable,
    offAdaptersAvailable,
  };

  return (
    <P2PContext.Provider value={contextValue}>{children}</P2PContext.Provider>
  );
};
