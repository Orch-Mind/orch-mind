// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useP2PPersistence } from "../components/settings/ShareSettings/hooks/useP2PPersistence";
import { useAdapterManager } from "./hooks/useAdapterManager";
import { useAutoReconnect } from "./hooks/useAutoReconnect";
import { P2PContextType } from "./interfaces/P2PContextInterfaces";
import type { P2PGlobalStatus } from "./services/P2PConnectionService";
import { P2PConnectionService } from "./services/P2PConnectionService";

// Types
export interface P2PRoom {
  type: "general" | "local" | "private";
  code?: string;
  peersCount: number;
  isActive: boolean;
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

  // Connection status state
  const [status, setStatus] = useState<P2PGlobalStatus>({
    isConnected: false,
    isLoading: false,
    currentRoom: null,
  });

  // Initialization flag and connection service
  const isInitialized = useRef(false);
  const connectionService = useRef<P2PConnectionService | null>(null);
  const [isConnectionServiceReady, setIsConnectionServiceReady] =
    useState(false);

  // Adapter manager hook
  const adapterManager = useAdapterManager({
    persistedSharedIds: persistedState.sharedAdapterIds || [],
    updateSharedAdapters,
  });

  // Event management for adapters
  const adaptersCallbacks = useRef<Set<(adapters: any) => void>>(new Set());

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

  // Restore shared adapters function for auto-reconnect
  const restoreSharedAdapters = useCallback(async () => {
    console.log(
      "🔄 [P2P-CONTEXT] Attempting to restore shared adapters post-reconnect..."
    );

    const persistedSharedIds = persistedState.sharedAdapterIds || [];
    console.log(
      "🔍 [P2P-CONTEXT] Persisted shared adapter IDs:",
      persistedSharedIds
    );

    if (persistedSharedIds.length === 0) {
      console.log("🔍 [P2P-CONTEXT] No persisted shared adapters to restore");
      return;
    }

    let restoredCount = 0;
    let removedCount = 0;
    const validSharedAdapterIds: string[] = [];

    // First, reload local adapters to ensure we have the latest state
    console.log(
      "🔄 [P2P-CONTEXT] Reloading local adapters before restoration..."
    );
    adapterManager.loadLocalAdapters();

    // Wait a bit for the state to update
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Check each persisted shared adapter with comprehensive verification
    for (const adapterId of persistedSharedIds) {
      console.log(`🔍 [P2P-CONTEXT] Verifying adapter: ${adapterId}`);

      const adapterExists = await adapterManager.verifyAdapterExists(adapterId);

      if (adapterExists) {
        try {
          console.log(
            `🔄 [P2P-CONTEXT] Attempting to restore adapter: ${adapterId}`
          );

          // Find the adapter index to toggle sharing
          const currentAdapters = adapterManager.sharedAdapters;
          const adapterIndex = currentAdapters.findIndex(
            (a) => a.name === adapterId
          );

          if (adapterIndex !== -1) {
            const adapter = currentAdapters[adapterIndex];
            if (!adapter.shared) {
              console.log(
                `🔄 [P2P-CONTEXT] Restoring sharing for: ${adapterId}`
              );
              await adapterManager.toggleAdapterSharing(adapterIndex);
            } else {
              console.log(
                `✅ [P2P-CONTEXT] Adapter ${adapterId} already shared`
              );
            }
          } else {
            console.log(
              `⚠️ [P2P-CONTEXT] Adapter ${adapterId} not found in current list`
            );
          }

          validSharedAdapterIds.push(adapterId);
          restoredCount++;
          console.log(
            `✅ [P2P-CONTEXT] Successfully restored adapter: ${adapterId}`
          );
        } catch (error) {
          console.error(
            `❌ [P2P-CONTEXT] Failed to restore adapter: ${adapterId}`,
            error
          );
        }
      } else {
        console.log(
          `🧹 [P2P-CONTEXT] Adapter ${adapterId} verification failed, removing from shared list`
        );
        removedCount++;
      }
    }

    // Update persistence with only the valid shared adapter IDs
    if (validSharedAdapterIds.length !== persistedSharedIds.length) {
      console.log(
        `🔄 [P2P-CONTEXT] Updating persistence: ${persistedSharedIds.length} → ${validSharedAdapterIds.length} shared adapters`
      );
      updateSharedAdapters(validSharedAdapterIds);
    }

    // Final reload to reflect current state
    console.log("🔄 [P2P-CONTEXT] Final reload after restoration");
    adapterManager.loadLocalAdapters();

    if (restoredCount > 0) {
      console.log(
        `✅ [P2P-CONTEXT] Successfully auto-restored ${restoredCount} adapters.`
      );
    }

    if (removedCount > 0) {
      console.log(
        `🧹 [P2P-CONTEXT] Cleaned up ${removedCount} non-existent adapters from shared list.`
      );
    }
  }, [persistedState.sharedAdapterIds, updateSharedAdapters, adapterManager]);

  // Auto-reconnect hook - only create when connection service is ready
  const autoReconnect = useAutoReconnect({
    connectionService: connectionService.current,
    lastConnectionType: persistedState.lastConnectionType,
    lastRoomCode: persistedState.lastRoomCode,
    clearPersistedState,
    updateConnectionState: (type, code, isSharing) =>
      updateConnectionState(type as any, code, isSharing),
    onRestoreSharedAdapters: restoreSharedAdapters,
  });
  // Mantém referência sempre atualizada
  const autoReconnectRef = useRef<typeof autoReconnect | null>(null);
  useEffect(() => {
    autoReconnectRef.current = autoReconnect;
  }, [autoReconnect]);

  // Initialize P2P service and connection service
  useEffect(() => {
    if (isInitialized.current) {
      console.log("🔄 [P2P-CONTEXT] Already initialized, skipping...");
      return;
    }

    const initializeP2P = async () => {
      try {
        console.log("🔧 [P2P-CONTEXT] Initializing P2P service...");
        isInitialized.current = true;

        // Create connection service
        connectionService.current = new P2PConnectionService({
          onStatusChange: setStatus,
          onPeersUpdated: (count: number) => {
            // This is now handled by onStatusChange emitting the full status
          },
          onAdaptersAvailable: adapterManager.addIncomingAdapters,
        });

        // Initialize connection service
        await connectionService.current.initialize();

        // Mark connection service as ready
        setIsConnectionServiceReady(true);

        // Load local adapters
        adapterManager.loadLocalAdapters();

        console.log(
          "✅ [P2P-CONTEXT] P2P initialization completed successfully"
        );
      } catch (error) {
        console.error("❌ [P2P-CONTEXT] Failed to initialize P2P:", error);
        isInitialized.current = false;

        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to initialize P2P service";
        setStatus((prev) => ({ ...prev, lastError: errorMessage }));

        if (
          !errorMessage.includes("browser environment") &&
          !errorMessage.includes("Electron environment")
        ) {
          console.warn(
            "🔧 [P2P-CONTEXT] P2P initialization failed, but continuing without P2P features"
          );
        }
      }
    };

    initializeP2P();

    return () => {
      if (connectionService.current) {
        connectionService.current.cleanup();
      }
    };
  }, []); // Empty dependency array - run only once

  // Auto-reconnect effect  // AUTO-RECONNECT: Restore previous connection from local storage
  // Only triggers when there's a saved connection type
  useEffect(() => {
    if (
      isConnectionServiceReady &&
      connectionService.current &&
      persistedState.lastConnectionType &&
      autoReconnectRef.current
    ) {
      console.log(
        "🔄 [P2P-CONTEXT] Connection service ready, attempting auto-reconnect to saved room..."
      );
      autoReconnectRef.current.checkAndAutoReconnect();
    }
  }, [isConnectionServiceReady, persistedState.lastConnectionType]);

  // Connection wrapper functions
  const connect = useCallback(
    async (type: "general" | "local" | "private", privateCode?: string) => {
      if (!connectionService.current) {
        throw new Error("Connection service not initialized");
      }

      await connectionService.current.connect(type, privateCode, false);
      updateConnectionState(type, privateCode || "", true);
    },
    [updateConnectionState]
  );

  const disconnect = useCallback(async () => {
    if (!connectionService.current) {
      return;
    }

    await connectionService.current.disconnect();
    updateConnectionState(null, "", false);

    // FIX: Directly update the status to provide immediate UI feedback
    setStatus({
      isConnected: false,
      isLoading: false,
      currentRoom: null,
    });

    // FIX: Add defensive check to prevent crash if autoReconnectRef is not ready
    if (
      autoReconnectRef.current &&
      typeof autoReconnectRef.current.resetAutoReconnect === "function"
    ) {
      autoReconnectRef.current.resetAutoReconnect();
    } else {
      console.warn(
        "[P2P-CONTEXT] Could not reset auto-reconnect flags on disconnect."
      );
    }
  }, [updateConnectionState, setStatus]);

  // Context value with all interfaces combined - memoized to prevent unnecessary re-renders
  const contextValue: P2PContextType = useMemo(() => ({
    // Connection interface
    status,
    connect,
    disconnect,

    // Auto-reconnect interface
    checkAndAutoReconnect: () =>
      autoReconnectRef.current?.checkAndAutoReconnect?.() ?? Promise.resolve(),
    reconnectToLastSession: () =>
      autoReconnectRef.current?.reconnectToLastSession?.() ?? Promise.resolve(),
    shouldShowReconnectPanel: () =>
      autoReconnectRef.current?.shouldShowReconnectPanel?.() ?? false,
    isAutoRestoring: autoReconnectRef.current?.isAutoRestoring ?? false,

    // Persistence interface
    persistedState: {
      ...persistedState,
      updateSharedAdapters,
      updateSelectedMode,
    },
    clearPersistedState,

    // Adapter management interface
    sharedAdapters: adapterManager.sharedAdapters,
    incomingAdapters: adapterManager.incomingAdapters,
    loadLocalAdapters: adapterManager.loadLocalAdapters,
    toggleAdapterSharing: adapterManager.toggleAdapterSharing,
    downloadAdapter: adapterManager.downloadAdapter,
    clearIncomingAdapters: adapterManager.clearIncomingAdapters,
    // Download progress interface
    downloadState: adapterManager.downloadState,
    isDownloading: adapterManager.isDownloading,
    getProgress: adapterManager.getProgress,

    // Adapter sync interface
    syncLocalStorageWithFilesystem: adapterManager.syncWithFilesystem,
    cleanupOrphanedAdapters: adapterManager.cleanupOrphanedAdapters,

    // Events interface
    onAdaptersAvailable,
    offAdaptersAvailable,
  }), [
    status,
    connect,
    disconnect,
    persistedState,
    updateSharedAdapters,
    updateSelectedMode,
    clearPersistedState,
    adapterManager.sharedAdapters,
    adapterManager.incomingAdapters,
    adapterManager.loadLocalAdapters,
    adapterManager.toggleAdapterSharing,
    adapterManager.downloadAdapter,
    adapterManager.clearIncomingAdapters,
    adapterManager.downloadState,
    adapterManager.isDownloading,
    adapterManager.getProgress,
    adapterManager.syncWithFilesystem,
    adapterManager.cleanupOrphanedAdapters,
    onAdaptersAvailable,
    offAdaptersAvailable,
  ]);

  // Debug exposure - only in development (run once)
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      process.env.NODE_ENV === "development"
    ) {
      (window as any).p2pContext = contextValue;
      (window as any).p2pAdapterManager = adapterManager;
      console.log("🔧 [P2P-CONTEXT] Debug exposure enabled: window.p2pContext");
    }
  }, []); // Empty dependency array - run only once

  // Update debug references when context changes (without logging)
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      process.env.NODE_ENV === "development"
    ) {
      (window as any).p2pContext = contextValue;
      (window as any).p2pAdapterManager = adapterManager;
    }
  }, [contextValue, adapterManager]);

  return (
    <P2PContext.Provider value={contextValue}>{children}</P2PContext.Provider>
  );
};
