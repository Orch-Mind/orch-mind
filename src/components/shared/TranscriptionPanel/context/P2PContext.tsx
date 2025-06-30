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
  IncomingAdapter,
  SharedAdapter,
} from "../components/settings/ShareSettings/types";
import {
  NotificationUtils,
  ShareUtils,
} from "../components/settings/ShareSettings/utils";
import { loadFromStorage } from "../components/settings/training/utils";

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

  // Adapter Management
  sharedAdapters: SharedAdapter[];
  incomingAdapters: IncomingAdapter[];
  loadLocalAdapters: () => void;
  toggleAdapterSharing: (index: number) => Promise<void>;
  downloadAdapter: (adapter: IncomingAdapter) => Promise<void>;
  clearIncomingAdapters: () => void;

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

  // Global connection status state
  const [status, setStatus] = useState<P2PGlobalStatus>({
    isConnected: false,
    isLoading: false,
    currentRoom: null,
    signalStrength: "none",
  });

  // Adapter state, now living in the context
  const [sharedAdapters, setSharedAdapters] = useState<SharedAdapter[]>([]);
  const [incomingAdapters, setIncomingAdapters] = useState<IncomingAdapter[]>(
    []
  );

  // Control flags
  const hasAutoReconnected = useRef(false);
  const isAutoRestoring = useRef(false);
  const autoRestoreSuccessful = useRef(false);
  const connectionCheckInterval = useRef<NodeJS.Timeout | null>(null);

  // Ref for accessing current adapter state in callbacks without dependency loops
  const currentAdaptersRef = useRef<SharedAdapter[]>([]);
  useEffect(() => {
    currentAdaptersRef.current = sharedAdapters;
  }, [sharedAdapters]);

  // Adapter Management Logic (moved from useAdapters)

  const loadLocalAdapters = useCallback(() => {
    console.log(
      "🔄 [P2P-CONTEXT] loadLocalAdapters called, loading from storage..."
    );

    const trainingHistory = loadFromStorage("orch-training-history", {
      trainedModels: [] as string[],
    });

    const persistedSharedIds = persistedState.sharedAdapterIds || [];

    const adapters: SharedAdapter[] = trainingHistory.trainedModels.map(
      (modelName: string) => ({
        name: modelName,
        topic: "", // Will be generated on share
        size: "Unknown",
        shared: persistedSharedIds.includes(modelName), // Restore from persistence
        peers: 0,
      })
    );

    console.log(
      "🔄 [P2P-CONTEXT] Adapters loaded with persisted shared state:",
      {
        count: adapters.length,
        sharedCount: adapters.filter((a) => a.shared).length,
      }
    );

    setSharedAdapters(adapters);
  }, [persistedState.sharedAdapterIds]);

  const toggleAdapterSharing = useCallback(
    async (index: number) => {
      const adapter = sharedAdapters[index];
      const willBeShared = !adapter.shared;

      const updatedAdapters = [...sharedAdapters];
      updatedAdapters[index].shared = willBeShared;

      if (willBeShared && !updatedAdapters[index].topic) {
        updatedAdapters[index].topic = ShareUtils.generateAdapterTopic();
        try {
          await p2pShareService.shareAdapter(updatedAdapters[index].name, {
            name: updatedAdapters[index].name,
            size: 0,
            checksum: "pending",
            topic: updatedAdapters[index].topic,
          });
          NotificationUtils.showSuccess(
            `Started sharing ${updatedAdapters[index].name}`
          );
        } catch (error) {
          updatedAdapters[index].shared = false; // Revert on error
          NotificationUtils.showError("Failed to share adapter");
        }
      } else if (!willBeShared && updatedAdapters[index].topic) {
        try {
          await p2pShareService.unshareAdapter(updatedAdapters[index].topic);
          NotificationUtils.showSuccess(
            `Stopped sharing ${updatedAdapters[index].name}`
          );
        } catch (error) {
          NotificationUtils.showError("Failed to stop sharing adapter");
        }
      }

      setSharedAdapters(updatedAdapters);
    },
    [sharedAdapters]
  );

  const downloadAdapter = useCallback(async (adapter: IncomingAdapter) => {
    try {
      await p2pShareService.requestAdapter(adapter.topic, adapter.from);
      NotificationUtils.showSuccess(`Started downloading ${adapter.name}`);
    } catch (error) {
      NotificationUtils.showError("Failed to download adapter");
    }
  }, []);

  const addAvailableAdapters = useCallback(
    (data: { from: string; adapters: any[] }) => {
      const newAdapters: IncomingAdapter[] = data.adapters.map((adapter) => ({
        name: adapter.name,
        topic: adapter.topic,
        size: ShareUtils.formatFileSize(adapter.size),
        from: data.from,
      }));

      setIncomingAdapters((prev) => {
        const filtered = prev.filter(
          (existing) =>
            !newAdapters.some(
              (newAdapter) =>
                newAdapter.topic === existing.topic &&
                newAdapter.from === existing.from
            )
        );
        return [...filtered, ...newAdapters];
      });
    },
    []
  );

  const clearIncomingAdapters = useCallback(() => {
    setIncomingAdapters([]);
  }, []);

  // Update persistence whenever sharedAdapters state changes
  useEffect(() => {
    const sharedAdapterIds = sharedAdapters
      .filter((adapter) => adapter.shared)
      .map((adapter) => adapter.name);
    updateSharedAdapters(sharedAdapterIds);
  }, [sharedAdapters, updateSharedAdapters]);

  // Adapters event listeners registry
  const adaptersCallbacks = useRef<Set<(adapters: any) => void>>(new Set());

  // Setup P2P event listeners (includes addAvailableAdapters now)
  const setupEventListeners = useCallback(() => {
    const handleRoomJoined = (data: any) => {
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
      }));
    };

    const handlePeersUpdated = (count: number) => {
      setStatus((prev) => ({
        ...prev,
        signalStrength: getSignalStrength(count, prev.isConnected),
        currentRoom: prev.currentRoom
          ? { ...prev.currentRoom, peersCount: count }
          : null,
      }));
      window.dispatchEvent(
        new CustomEvent("p2p-peers-updated", { detail: count })
      );
    };

    const handleRoomLeft = () => {
      setStatus({
        isConnected: false,
        isLoading: false,
        currentRoom: null,
        signalStrength: "none",
      });
      clearIncomingAdapters(); // Clear available adapters on disconnect
    };

    const handleConnectionError = (error: any) => {
      setStatus((prev) => ({
        ...prev,
        isLoading: false,
        lastError: error?.message || "Connection error",
      }));
    };

    p2pShareService.on("room-joined", handleRoomJoined);
    p2pShareService.on("peers-updated", handlePeersUpdated);
    p2pShareService.on("room-left", handleRoomLeft);
    p2pShareService.on("connection-error", handleConnectionError);
    p2pShareService.on("adapters-available", addAvailableAdapters); // Directly use addAvailableAdapters

    return () => {
      p2pShareService.removeListener("room-joined", handleRoomJoined);
      p2pShareService.removeListener("peers-updated", handlePeersUpdated);
      p2pShareService.removeListener("room-left", handleRoomLeft);
      p2pShareService.removeListener("connection-error", handleConnectionError);
      p2pShareService.removeListener(
        "adapters-available",
        addAvailableAdapters
      );
    };
  }, [addAvailableAdapters, clearIncomingAdapters]);

  // Connection health monitoring
  const startConnectionMonitoring = useCallback(() => {
    connectionCheckInterval.current = setInterval(() => {
      if (status.isConnected && status.currentRoom) {
        // Health check logic...
      }
    }, 30000);
  }, [status.isConnected, status.currentRoom]);

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

  // Connect function - moved before checkAndAutoReconnect to fix dependency order
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

  const restoreSharedAdapters = useCallback(async () => {
    console.log(
      "🔄 [P2P-CONTEXT] Attempting to restore shared adapters post-reconnect..."
    );
    const adaptersToRestore = currentAdaptersRef.current;
    let restoredCount = 0;

    const updatedAdapters = adaptersToRestore.map((adapter) => ({
      ...adapter,
    }));

    for (let i = 0; i < updatedAdapters.length; i++) {
      const adapter = updatedAdapters[i];
      if (adapter.shared) {
        // Check if it should be shared
        try {
          const topic = adapter.topic || ShareUtils.generateAdapterTopic();
          updatedAdapters[i].topic = topic;

          await p2pShareService.shareAdapter(adapter.name, {
            name: adapter.name,
            size: 0,
            checksum: "pending",
            topic: topic,
          });
          restoredCount++;
        } catch (error) {
          console.error(
            `❌ [P2P-CONTEXT] Failed to auto-restore adapter: ${adapter.name}`,
            error
          );
          updatedAdapters[i].shared = false; // Revert state on failure
        }
      }
    }

    if (restoredCount > 0) {
      console.log(
        `✅ [P2P-CONTEXT] Successfully auto-restored ${restoredCount} adapters.`
      );
      setSharedAdapters(updatedAdapters);
    }
  }, []);

  // Auto-reconnection logic (simplified) - now after connect and restoreSharedAdapters are defined
  const checkAndAutoReconnect = useCallback(async () => {
    if (hasAutoReconnected.current || !persistedState.lastConnectionType) {
      return;
    }
    hasAutoReconnected.current = true;
    isAutoRestoring.current = true;
    NotificationUtils.setSilentMode(true);

    try {
      await connect(
        persistedState.lastConnectionType,
        persistedState.lastRoomCode || undefined
      );
      // Restore adapters after connection is established
      await restoreSharedAdapters();
      autoRestoreSuccessful.current = true;
    } catch (error) {
      clearPersistedState();
    } finally {
      isAutoRestoring.current = false;
      NotificationUtils.setSilentMode(false);
    }
  }, [persistedState, connect, restoreSharedAdapters, clearPersistedState]);

  // Initialize P2P service, load adapters, and setup event listeners
  useEffect(() => {
    const initializeP2P = async () => {
      try {
        if (!p2pShareService.isInitialized()) {
          console.log("🔧 [P2P-CONTEXT] Initializing P2P service...");
          await p2pShareService.initialize();
        }
        setupEventListeners();
        startConnectionMonitoring();
        loadLocalAdapters(); // Load adapters ONCE on init
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
      if (connectionCheckInterval.current) {
        clearInterval(connectionCheckInterval.current);
      }
    };
  }, [
    loadLocalAdapters,
    checkAndAutoReconnect,
    setupEventListeners,
    startConnectionMonitoring,
  ]);

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

  const reconnectToLastSession = useCallback(async () => {
    if (persistedState.lastConnectionType) {
      await connect(
        persistedState.lastConnectionType,
        persistedState.lastRoomCode || undefined
      );
    }
  }, [persistedState.lastConnectionType, persistedState.lastRoomCode, connect]);

  const shouldShowReconnectPanel = useCallback(() => {
    return !!(
      persistedState.lastConnectionType &&
      !autoRestoreSuccessful.current &&
      !isAutoRestoring.current &&
      !status.isConnected
    );
  }, [persistedState.lastConnectionType, status.isConnected]);

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
    sharedAdapters,
    incomingAdapters,
    loadLocalAdapters,
    toggleAdapterSharing,
    downloadAdapter,
    clearIncomingAdapters,
    onAdaptersAvailable,
    offAdaptersAvailable,
  };

  return (
    <P2PContext.Provider value={contextValue}>{children}</P2PContext.Provider>
  );
};
