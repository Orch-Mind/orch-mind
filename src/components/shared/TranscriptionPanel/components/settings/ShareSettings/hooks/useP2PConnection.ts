// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useCallback, useEffect, useRef, useState } from "react";
import { p2pShareService } from "../../../../../../../services/p2p/P2PShareService";
import { P2PRoom } from "../types";
import { NotificationUtils, ShareUtils } from "../utils";
import { useP2PPersistence } from "./useP2PPersistence";

// SRP: Hook responsável APENAS por gerenciar conexões P2P
export const useP2PConnection = () => {
  // Use persistence hook
  const {
    persistedState,
    updateConnectionState,
    clearPersistedState,
    getRecentRoomCodes,
    updateSharedAdapters,
  } = useP2PPersistence();

  const [currentRoom, setCurrentRoom] = useState<P2PRoom | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Refs for coordination between effects - FIXED: Prevent infinite loops
  const hasRestoredFromPersistence = useRef(false);
  const isAutoRestoring = useRef(false);
  const restorationRetryCount = useRef(0);
  const autoRestoreSuccessful = useRef(false); // NEW: Track if auto-restore was successful

  // Debug wrappers for state setters
  const setCurrentRoomDebug = useCallback(
    (room: P2PRoom | null) => {
      console.log("🏠 [STATE] setCurrentRoom called:", {
        from: currentRoom,
        to: room,
        callerStack: new Error().stack?.split("\n").slice(1, 3),
      });
      setCurrentRoom(room);
    },
    [currentRoom]
  );

  const setIsSharingDebug = useCallback(
    (sharing: boolean) => {
      console.log("📡 [STATE] setIsSharing called:", {
        from: isSharing,
        to: sharing,
        callerStack: new Error().stack?.split("\n").slice(1, 3),
      });
      setIsSharing(sharing);
    },
    [isSharing]
  );

  // DEBUGGING: Log persisted state on every change
  useEffect(() => {
    console.log("🔍 [DEBUG] Persisted state changed:", {
      isSharing: persistedState.isSharing,
      lastConnectionType: persistedState.lastConnectionType,
      lastRoomCode: persistedState.lastRoomCode,
      sharedAdapterIds: persistedState.sharedAdapterIds,
      sharedCount: persistedState.sharedAdapterIds.length,
    });
  }, [persistedState]);

  // COMPLETE RESTORATION: Actually reconnect and re-share when app restarts
  useEffect(() => {
    // Always mark as "restored" to enable persistence, regardless of whether there was data to restore
    if (!hasRestoredFromPersistence.current) {
      // FIX: Don't check persistedState.isSharing - it's always false initially
      // Only check if there's a previous connection type to restore
      if (persistedState.lastConnectionType && !isAutoRestoring.current) {
        console.log("🔄 [RESTORATION] Starting complete P2P restoration...");
        console.log("🔄 [RESTORATION] State to restore:", {
          connectionType: persistedState.lastConnectionType,
          roomCode: persistedState.lastRoomCode,
          adaptersToRestore: persistedState.sharedAdapterIds.length,
          adapterIds: persistedState.sharedAdapterIds,
          previousIsSharing: persistedState.isSharing, // Log for debugging
        });

        hasRestoredFromPersistence.current = true;
        isAutoRestoring.current = true;

        // Perform REAL restoration: reconnect + re-share
        performCompleteRestoration();
      } else {
        // No previous state to restore - mark as "restored" to enable persistence
        console.log(
          "ℹ️ [RESTORATION] No previous state to restore, enabling persistence for new connections"
        );
        console.log("🔍 [RESTORATION] Debug info:", {
          hasLastConnectionType: !!persistedState.lastConnectionType,
          lastConnectionType: persistedState.lastConnectionType,
          isAutoRestoring: isAutoRestoring.current,
          persistedState: persistedState,
        });
        hasRestoredFromPersistence.current = true;
      }
    }
  }, [persistedState.lastConnectionType, persistedState.lastRoomCode]);

  const performCompleteRestoration = async () => {
    try {
      console.log(
        `🔄 [RESTORATION] Step 1: Reconnecting to ${persistedState.lastConnectionType} room...`
      );

      // Step 1: Actually reconnect to P2P (not just visual state) - SILENTLY
      await connect(
        persistedState.lastConnectionType!,
        persistedState.lastRoomCode || undefined
      );

      console.log("✅ [RESTORATION] Step 1 completed: P2P connection restored");

      // Step 2: Wait for connection to stabilize
      console.log(
        "⏳ [RESTORATION] Step 2: Waiting for connection to stabilize..."
      );
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Step 3: Trigger adapter restoration with retry logic
      if (persistedState.sharedAdapterIds.length > 0) {
        console.log(
          `🔄 [RESTORATION] Step 3: Triggering restoration of ${persistedState.sharedAdapterIds.length} adapters...`
        );
        console.log(
          `🔄 [RESTORATION] Adapter IDs to restore:`,
          persistedState.sharedAdapterIds
        );

        // Use setTimeout to ensure event is dispatched after all components are ready
        setTimeout(() => {
          triggerAdapterRestoration(persistedState.sharedAdapterIds, true);
        }, 500);
      } else {
        console.log("ℹ️ [RESTORATION] Step 3: No adapters to restore");
      }

      // SILENT SUCCESS: No popup notification for auto-restore
      console.log(
        `🔇 [RESTORATION] Silent success: Reconnected to ${persistedState.lastConnectionType} room without user notification`
      );

      console.log(
        "✅ [RESTORATION] Complete P2P restoration finished successfully"
      );

      // Mark auto-restore as successful to prevent showing ReconnectPanel
      autoRestoreSuccessful.current = true;
    } catch (error) {
      console.error(
        "❌ [RESTORATION] Failed to perform complete restoration:",
        error
      );

      // Reset persistence if restoration failed
      clearPersistedState();

      NotificationUtils.showError(
        "Failed to restore previous session. Starting fresh."
      );
    } finally {
      isAutoRestoring.current = false;
    }
  };

  // Enhanced adapter restoration with retry logic
  const triggerAdapterRestoration = useCallback(
    (adapterIds: string[], isAutoRestore: boolean, retryAttempt = 0) => {
      console.log(
        `🔄 [ADAPTER-RESTORE] Triggering restoration attempt ${
          retryAttempt + 1
        }:`,
        {
          adapterIds,
          isAutoRestore,
          retryAttempt,
        }
      );

      const event = new CustomEvent("p2p-restore-adapters", {
        detail: {
          sharedAdapterIds: adapterIds,
          isAutoRestore,
          retryAttempt,
        },
      });

      window.dispatchEvent(event);

      // Retry logic: if this is auto-restore and first attempt, schedule a retry
      if (isAutoRestore && retryAttempt === 0) {
        setTimeout(() => {
          console.log("🔄 [ADAPTER-RESTORE] Scheduling retry attempt...");
          triggerAdapterRestoration(
            adapterIds,
            isAutoRestore,
            retryAttempt + 1
          );
        }, 3000);
      }
    },
    []
  );

  // Update persistence when connection state changes - FIXED LOGIC
  useEffect(() => {
    // Only skip during auto-restoration, not when there's no previous state
    if (isAutoRestoring.current) {
      console.log(
        "💾 [PERSISTENCE] Skipping persistence update during auto-restoration"
      );
      return;
    }

    console.log(
      "💾 [PERSISTENCE] Checking if should update connection state:",
      {
        currentRoom,
        isSharing,
        hasRestoredFromPersistence: hasRestoredFromPersistence.current,
        isAutoRestoring: isAutoRestoring.current,
        shouldUpdate: !isAutoRestoring.current,
        roomType: currentRoom?.type,
        roomCode: currentRoom?.code,
        roomActive: currentRoom?.isActive,
      }
    );

    if (currentRoom && isSharing) {
      console.log(
        "💾 [PERSISTENCE] About to save connection state with values:",
        {
          type: currentRoom.type,
          code: currentRoom.code,
          isSharing,
          roomObject: currentRoom,
        }
      );
      updateConnectionState(currentRoom.type, currentRoom.code, isSharing);
    } else if (!isSharing && hasRestoredFromPersistence.current) {
      console.log(
        "💾 [PERSISTENCE] About to clear connection state (disconnected)"
      );
      updateConnectionState(null, "", false);
    } else {
      console.log("💾 [PERSISTENCE] Not updating connection state because:", {
        hasCurrentRoom: !!currentRoom,
        isSharing,
        hasRestored: hasRestoredFromPersistence.current,
        reason: !currentRoom
          ? "no current room"
          : !isSharing
          ? "not sharing"
          : !hasRestoredFromPersistence.current
          ? "not restored yet"
          : "unknown",
      });
    }
  }, [currentRoom, isSharing, updateConnectionState]);

  // SRP: Função focada apenas em conectar
  const connect = useCallback(
    async (type: "general" | "local" | "private", privateCode?: string) => {
      // Prevent multiple concurrent connections
      if (isLoading || isAutoRestoring.current) {
        console.log(
          "🛑 [CONNECTION] Connection already in progress, skipping...",
          {
            isLoading,
            isAutoRestoring: isAutoRestoring.current,
          }
        );
        return;
      }

      console.log(`🔗 [CONNECTION] Starting connection to ${type}`, {
        privateCode,
      });
      setIsLoading(true);

      try {
        await executeConnection(type, privateCode);
        setIsSharingDebug(true);

        console.log("✅ [CONNECTION] Connection successful");

        // Only show notification if it's not auto-restoration
        if (!isAutoRestoring.current) {
          const roomName =
            type === "general"
              ? "Community"
              : type === "local"
              ? "Local Network"
              : `Private Room ${privateCode}`;
          NotificationUtils.showSuccess(`Connected to ${roomName}!`);
        } else {
          console.log(
            "🔇 [CONNECTION] Silent auto-restore connection - no notification shown"
          );
        }
      } catch (error) {
        console.error("❌ [CONNECTION] Error connecting:", error);
        if (!isAutoRestoring.current) {
          NotificationUtils.showError("Failed to connect");
        }
        throw error; // Re-throw for restoration error handling
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading]
  );

  // SRP: Lógica de execução de conexão isolada
  const executeConnection = async (
    type: "general" | "local" | "private",
    privateCode?: string
  ) => {
    if (type === "general") {
      await connectToGeneral();
    } else if (type === "local") {
      await connectToLocal();
    } else {
      await connectToPrivate(privateCode);
    }
  };

  const connectToGeneral = async () => {
    console.log("🌍 [CONNECTION] Connecting to general room...");
    await p2pShareService.joinGeneralRoom();
    setCurrentRoomDebug({ type: "general", peersCount: 0, isActive: true });
    console.log("✅ [CONNECTION] Connected to general room");
  };

  const connectToLocal = async () => {
    try {
      console.log("📡 [CONNECTION] Connecting to local network...");
      const localTopic = await ShareUtils.generateLocalNetworkTopic();
      await p2pShareService.joinRoom(localTopic);

      const localRoom = {
        type: "local" as const,
        peersCount: 0,
        isActive: true,
      };
      setCurrentRoomDebug(localRoom);

      // Smart fallback: verifica peers na rede local em 3s (skip during auto-restore)
      if (!isAutoRestoring.current) {
        let hasFoundPeers = false;
        let isStillInLocalRoom = true;

        const fallbackTimer = setTimeout(async () => {
          if (!hasFoundPeers && isStillInLocalRoom) {
            console.log(
              "🔄 No local peers found, falling back to global community..."
            );
            isStillInLocalRoom = false;
            await p2pShareService.leaveRoom();
            await connectToGeneral();
          }
        }, 3000);

        // Cleanup timer se peers aparecerem
        const handlePeersUpdate = (count: number) => {
          if (count > 0 && !hasFoundPeers && isStillInLocalRoom) {
            hasFoundPeers = true;
            console.log(
              `✅ Found ${count} local peers, staying in local network`
            );
            clearTimeout(fallbackTimer);
            p2pShareService.removeListener("peers-updated", handlePeersUpdate);
          }
        };

        p2pShareService.on("peers-updated", handlePeersUpdate);

        // Cleanup se mudar de room manualmente
        const cleanup = () => {
          isStillInLocalRoom = false;
          clearTimeout(fallbackTimer);
          p2pShareService.removeListener("peers-updated", handlePeersUpdate);
        };

        // Store cleanup para uso posterior se necessário
        (globalThis as any).__localRoomCleanup = cleanup;
      }

      console.log("✅ [CONNECTION] Connected to local network");
    } catch (error) {
      console.log(
        "❌ Local network connection failed, connecting to global community"
      );
      await connectToGeneral();
    }
  };

  const connectToPrivate = async (privateCode?: string) => {
    const codeToUse = privateCode?.trim();

    if (codeToUse) {
      // 🔍 Procurando por sala existente
      console.log(`🔍 [CONNECTION] Looking for private room: ${codeToUse}...`);
      const topic = await ShareUtils.codeToTopic(codeToUse);
      await p2pShareService.joinRoom(topic);

      setCurrentRoomDebug({
        type: "private",
        code: codeToUse,
        peersCount: 0,
        isActive: true,
      });

      // Skip monitoring during auto-restore
      if (!isAutoRestoring.current) {
        // 👀 Monitora se encontrou peers (sala existia) em 2s
        let roomFound = false;
        const searchTimer = setTimeout(() => {
          if (!roomFound) {
            console.log(
              `🆕 Room ${codeToUse} created - you're the first here!`
            );
            NotificationUtils.showSuccess(
              `Room ${codeToUse} created! Share this code with others.`
            );
          }
        }, 2000);

        // Se encontrar peers, sala já existia
        const handlePeersUpdate = (count: number) => {
          if (count > 0 && !roomFound) {
            roomFound = true;
            console.log(`✅ Found room ${codeToUse} with ${count} peers!`);
            NotificationUtils.showSuccess(
              `Joined room ${codeToUse}! Found ${count} peers.`
            );
            clearTimeout(searchTimer);
            p2pShareService.removeListener("peers-updated", handlePeersUpdate);
          }
        };

        p2pShareService.on("peers-updated", handlePeersUpdate);
      }

      console.log(`✅ [CONNECTION] Connected to private room: ${codeToUse}`);
    } else {
      // 🆕 Criando nova sala diretamente
      const friendlyCode = ShareUtils.generateFriendlyCode();
      console.log(`🆕 [CONNECTION] Creating new private room: ${friendlyCode}`);

      const topic = await ShareUtils.codeToTopic(friendlyCode);
      await p2pShareService.joinRoom(topic);

      setCurrentRoomDebug({
        type: "private",
        code: friendlyCode,
        peersCount: 0,
        isActive: true,
      });

      if (!isAutoRestoring.current) {
        NotificationUtils.showSuccess(
          `Created room ${friendlyCode}! Share this code with others.`
        );
      }

      console.log(`✅ [CONNECTION] Created private room: ${friendlyCode}`);
    }
  };

  // SRP: Função focada apenas em desconectar
  const disconnect = useCallback(async () => {
    console.log("🔌 [DISCONNECT] Starting disconnection...");
    setIsLoading(true);
    try {
      await p2pShareService.leaveRoom();
      setCurrentRoomDebug(null);
      setIsSharingDebug(false);
      // Reset the restoration flag so it can work again if needed
      hasRestoredFromPersistence.current = false;
      // Reset auto-restore success flag so ReconnectPanel can show again if needed
      autoRestoreSuccessful.current = false;

      console.log("✅ [DISCONNECT] Disconnected successfully");
      NotificationUtils.showSuccess("Disconnected from P2P network");
    } catch (error) {
      console.error("❌ [DISCONNECT] Error disconnecting:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // SRP: Função para atualizar peer count
  const updatePeerCount = useCallback(
    (count: number) => {
      console.log("🔢 [STATE] updatePeerCount called:", {
        currentRoom,
        count,
        willUpdate: !!currentRoom,
      });
      if (currentRoom) {
        setCurrentRoomDebug({ ...currentRoom, peersCount: count });
      }
    },
    [currentRoom, setCurrentRoomDebug]
  );

  // Function to auto-reconnect to last session
  const reconnectToLastSession = useCallback(async () => {
    if (!persistedState.lastConnectionType) {
      console.log("💡 [RECONNECT] No previous session to reconnect to");
      return;
    }

    console.log(
      `🔄 [RECONNECT] Manual reconnection to: ${persistedState.lastConnectionType}`
    );

    try {
      await connect(
        persistedState.lastConnectionType,
        persistedState.lastRoomCode || undefined
      );

      // Trigger adapter restoration for manual reconnection too
      if (persistedState.sharedAdapterIds.length > 0) {
        setTimeout(() => {
          triggerAdapterRestoration(persistedState.sharedAdapterIds, false);
        }, 1500);
      }
    } catch (error) {
      console.error("❌ [RECONNECT] Failed to reconnect:", error);
      NotificationUtils.showError("Failed to reconnect to previous session");
    }
  }, [
    persistedState.lastConnectionType,
    persistedState.lastRoomCode,
    connect,
    triggerAdapterRestoration,
  ]);

  // Clear all persisted data
  const resetP2PState = useCallback(() => {
    console.log("🧹 [RESET] Clearing P2P state...");
    clearPersistedState();
    setCurrentRoomDebug(null);
    setIsSharingDebug(false);
    hasRestoredFromPersistence.current = false;
    console.log("✅ [RESET] P2P state cleared");
  }, [clearPersistedState, setCurrentRoomDebug, setIsSharingDebug]);

  // Function to determine if ReconnectPanel should be shown
  const shouldShowReconnectPanel = useCallback(() => {
    // Don't show if no previous session exists
    if (!persistedState.lastConnectionType) {
      return false;
    }

    // Don't show if auto-restore was successful
    if (autoRestoreSuccessful.current) {
      console.log(
        "🎯 [UI] Hiding ReconnectPanel - auto-restore was successful"
      );
      return false;
    }

    // Don't show if currently restoring
    if (isAutoRestoring.current) {
      console.log("🎯 [UI] Hiding ReconnectPanel - auto-restore in progress");
      return false;
    }

    // Show if we have previous session but restoration hasn't succeeded
    console.log("🎯 [UI] Showing ReconnectPanel - manual reconnect available");
    return true;
  }, [persistedState.lastConnectionType]);

  return {
    currentRoom,
    isLoading,
    isSharing,
    connect,
    disconnect,
    updatePeerCount,
    setCurrentRoom: setCurrentRoomDebug,
    setIsSharing: setIsSharingDebug,

    // Persistence features
    persistedState,
    reconnectToLastSession,
    resetP2PState,
    getRecentRoomCodes,
    updateSharedAdapters,

    // State flags for coordination
    isAutoRestoring: isAutoRestoring.current,

    // New function to determine if ReconnectPanel should be shown
    shouldShowReconnectPanel,
  };
};
