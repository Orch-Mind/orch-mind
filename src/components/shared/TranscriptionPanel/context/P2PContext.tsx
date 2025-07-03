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
import { p2pService } from "../../../../services/p2p/P2PService";
import { p2pEventBus } from "../../../../services/p2p/core/EventBus";
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
  const isInitialized = useRef(false); // Flag to prevent multiple initializations

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

      console.log(`🔄 [P2P-CONTEXT] Toggling adapter sharing:`, {
        adapter: adapter.name,
        currentlyShared: adapter.shared,
        willBeShared: willBeShared,
        currentTopic: adapter.topic,
      });

      const updatedAdapters = [...sharedAdapters];
      updatedAdapters[index].shared = willBeShared;

      if (willBeShared && !updatedAdapters[index].topic) {
        updatedAdapters[index].topic = ShareUtils.generateAdapterTopic();
        console.log(
          `📤 [P2P-CONTEXT] Sharing adapter with new topic:`,
          updatedAdapters[index].topic
        );
        try {
          await p2pService.shareAdapter(updatedAdapters[index].name);
          NotificationUtils.showSuccess(
            `Started sharing ${updatedAdapters[index].name}`
          );
          console.log(
            `✅ [P2P-CONTEXT] Successfully shared adapter:`,
            updatedAdapters[index].name
          );
        } catch (error) {
          console.error(`❌ [P2P-CONTEXT] Failed to share adapter:`, error);
          updatedAdapters[index].shared = false; // Revert on error
          
          // Provide specific error messages based on the error
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes("not found in Ollama")) {
            NotificationUtils.showError(
              `Model ${updatedAdapters[index].name} not found. Please check if it exists in Ollama.`
            );
          } else if (errorMessage.includes("Ollama API not available")) {
            NotificationUtils.showError(
              "Ollama is not running. Please start Ollama and try again."
            );
          } else if (errorMessage.includes("File size") && errorMessage.includes("greater than")) {
            NotificationUtils.showError(
              `Model ${updatedAdapters[index].name} is too large for P2P sharing. Large model sharing will be supported in a future update.`
            );
          } else if (errorMessage.includes("out of memory") || errorMessage.includes("ENOMEM")) {
            NotificationUtils.showError(
              `Not enough memory to process ${updatedAdapters[index].name}. Try closing other applications.`
            );
          } else {
            NotificationUtils.showError(
              `Failed to share ${updatedAdapters[index].name}: ${errorMessage}`
            );
          }
        }
      } else if (!willBeShared && updatedAdapters[index].topic) {
        console.log(
          `📥 [P2P-CONTEXT] Unsharing adapter:`,
          updatedAdapters[index].name
        );
        try {
          await p2pService.unshareAdapter(updatedAdapters[index].topic);
          NotificationUtils.showSuccess(
            `Stopped sharing ${updatedAdapters[index].name}`
          );
          console.log(
            `✅ [P2P-CONTEXT] Successfully unshared adapter:`,
            updatedAdapters[index].name
          );
        } catch (error) {
          console.error(`❌ [P2P-CONTEXT] Failed to unshare adapter:`, error);
          NotificationUtils.showError("Failed to stop sharing adapter");
        }
      }

      setSharedAdapters(updatedAdapters);
      console.log(
        `🔄 [P2P-CONTEXT] Updated shared adapters state:`,
        updatedAdapters.filter((a) => a.shared).map((a) => a.name)
      );
    },
    [sharedAdapters]
  );

  const downloadAdapter = useCallback(async (adapter: IncomingAdapter) => {
    try {
      await p2pService.requestAdapter(adapter.topic, adapter.from);
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
    // EventBus doesn't need max listeners configuration

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
      }));
    };

    const handlePeersUpdated = (count: number) => {
      setStatus((prev) => ({
        ...prev,
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

    // Remove existing listeners first to prevent duplicates
    p2pEventBus.off("room:joined", handleRoomJoined);
    p2pEventBus.off("peers:updated", handlePeersUpdated);
    p2pEventBus.off("room:left", handleRoomLeft);
    p2pEventBus.off("adapters:available", addAvailableAdapters);

    // Add new listeners using EventBus
    p2pEventBus.on("room:joined", handleRoomJoined);
    p2pEventBus.on("peers:updated", handlePeersUpdated);
    p2pEventBus.on("room:left", handleRoomLeft);
    p2pEventBus.on("adapters:available", addAvailableAdapters);

    return () => {
      p2pEventBus.off("room:joined", handleRoomJoined);
      p2pEventBus.off("peers:updated", handlePeersUpdated);
      p2pEventBus.off("room:left", handleRoomLeft);
      p2pEventBus.off("adapters:available", addAvailableAdapters);
    };
  }, [addAvailableAdapters, clearIncomingAdapters]);

  // Connection health monitoring
  const startConnectionMonitoring = useCallback(() => {
    if (connectionCheckInterval.current) {
      clearInterval(connectionCheckInterval.current);
    }
    connectionCheckInterval.current = setInterval(() => {
      if (status.isConnected && status.currentRoom) {
        // Health check logic...
      }
    }, 30000);
  }, [status.isConnected, status.currentRoom]);

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

          await p2pService.shareAdapter(adapter.name);
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

  // Initialize P2P service, load adapters, and setup event listeners - ONLY ONCE
  useEffect(() => {
    if (isInitialized.current) {
      console.log("🔄 [P2P-CONTEXT] Already initialized, skipping...");
      return;
    }

    const initializeP2P = async () => {
      try {
        console.log("🔧 [P2P-CONTEXT] Initializing P2P service...");
        isInitialized.current = true;

        // Check if we're in Electron environment first
        if (typeof window === "undefined" || !window.__ORCH_OS__) {
          console.warn(
            "⚠️ [P2P-CONTEXT] Not in Orch-OS Electron environment, P2P disabled"
          );
          setStatus((prev) => ({
            ...prev,
            lastError: "P2P requires Orch-OS desktop application",
          }));
          return;
        }

        // Wait a bit for Electron API to be ready
        let retries = 0;
        const maxRetries = 10;
        while (!window.electronAPI && retries < maxRetries) {
          console.log(
            `🔄 [P2P-CONTEXT] Waiting for Electron API... (${
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
          console.log("✅ [P2P-CONTEXT] P2P service initialized successfully");
        }

        const cleanup = setupEventListeners();
        startConnectionMonitoring();
        loadLocalAdapters();

        // Only attempt auto-reconnect if initialization was successful
        checkAndAutoReconnect();

        return cleanup;
      } catch (error) {
        console.error("❌ [P2P-CONTEXT] Failed to initialize P2P:", error);
        isInitialized.current = false; // Reset flag on error

        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to initialize P2P service";

        setStatus((prev) => ({
          ...prev,
          lastError: errorMessage,
        }));

        // Show user-friendly notification if not a browser environment issue
        if (
          !errorMessage.includes("browser environment") &&
          !errorMessage.includes("Electron environment")
        ) {
          console.warn(
            "🔧 [P2P-CONTEXT] P2P initialization failed, but continuing without P2P features"
          );
          // Don't show error notification - just log and continue
        }
      }
    };

    let cleanup: (() => void) | undefined;
    initializeP2P().then((cleanupFn) => {
      cleanup = cleanupFn;
    });

    return () => {
      if (connectionCheckInterval.current) {
        clearInterval(connectionCheckInterval.current);
      }
      if (cleanup) {
        cleanup();
      }
    };
  }, []); // Empty dependency array - run only once

  // Disconnect function
  const disconnect = useCallback(async () => {
    console.log("🔄 [P2P-CONTEXT] Disconnecting...");

    try {
      await p2pService.leaveRoom();

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
