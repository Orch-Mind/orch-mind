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

  // COMPLETE RESTORATION: Actually reconnect and re-share when app restarts
  useEffect(() => {
    // Always mark as "restored" to enable persistence, regardless of whether there was data to restore
    if (!hasRestoredFromPersistence.current) {
      // FIX: Check if there's a previous connection to restore
      // Don't check persistedState.isSharing as it's unreliable - check lastConnectionType instead
      if (persistedState.lastConnectionType && !isAutoRestoring.current) {
        console.log(
          "🔄 [RESTORATION] Starting auto-reconnection from persisted state:",
          {
            lastConnectionType: persistedState.lastConnectionType,
            lastRoomCode: persistedState.lastRoomCode,
            sharedAdapterIds: persistedState.sharedAdapterIds,
          }
        );

        hasRestoredFromPersistence.current = true;
        isAutoRestoring.current = true;

        // Perform REAL restoration: reconnect + re-share
        performCompleteRestoration();
      } else {
        // No previous state to restore - mark as "restored" to enable persistence
        hasRestoredFromPersistence.current = true;
        console.log("🔄 [RESTORATION] No previous state to restore");
      }
    }
  }, [persistedState.lastConnectionType, persistedState.lastRoomCode]);

  const performCompleteRestoration = async () => {
    try {
      console.log("🔄 [RESTORATION] Starting complete P2P restoration...");

      // Enable silent mode for the entire restoration process
      NotificationUtils.setSilentMode(true);

      // Step 1: Actually reconnect to P2P (not just visual state) - SILENTLY
      console.log("🔄 [RESTORATION] Reconnecting to:", {
        type: persistedState.lastConnectionType,
        code: persistedState.lastRoomCode,
      });

      await connect(
        persistedState.lastConnectionType!,
        persistedState.lastRoomCode || undefined
      );

      // Step 2: Wait for connection to stabilize
      console.log("🔄 [RESTORATION] Waiting for connection to stabilize...");
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Step 3: Trigger adapter restoration with retry logic
      if (persistedState.sharedAdapterIds.length > 0) {
        console.log(
          "🔄 [RESTORATION] Restoring adapters:",
          persistedState.sharedAdapterIds
        );
        // Use setTimeout to ensure event is dispatched after all components are ready
        setTimeout(() => {
          triggerAdapterRestoration(persistedState.sharedAdapterIds, true);
        }, 500);
      }

      // Mark auto-restore as successful to prevent showing ReconnectPanel
      autoRestoreSuccessful.current = true;
      console.log("🔄 [RESTORATION] Complete restoration successful!");
    } catch (error) {
      console.error(
        "❌ [RESTORATION] Failed to perform complete restoration:",
        error
      );

      // Reset persistence if restoration failed
      clearPersistedState();

      // Show error only for complete failures (silent mode is still active)
      NotificationUtils.showError(
        "Failed to restore previous session. Starting fresh."
      );
    } finally {
      isAutoRestoring.current = false;
      // Disable silent mode after restoration
      NotificationUtils.setSilentMode(false);
      console.log("🔄 [RESTORATION] Restoration process completed");
    }
  };

  // Enhanced adapter restoration with retry logic
  const triggerAdapterRestoration = useCallback(
    (adapterIds: string[], isAutoRestore: boolean, retryAttempt = 0) => {
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
      return;
    }

    if (currentRoom && isSharing) {
      updateConnectionState(currentRoom.type, currentRoom.code, isSharing);
    } else if (!isSharing && hasRestoredFromPersistence.current) {
      updateConnectionState(null, "", false);
    }
  }, [currentRoom, isSharing, updateConnectionState]);

  // SRP: Função focada apenas em conectar
  const connect = useCallback(
    async (type: "general" | "local" | "private", privateCode?: string) => {
      // Prevent multiple concurrent connections
      if (isLoading || isAutoRestoring.current) {
        return;
      }

      setIsLoading(true);

      // Emit connection start event
      window.dispatchEvent(new CustomEvent("p2p-connect-start"));

      try {
        await executeConnection(type, privateCode);
        setIsSharing(true);

        // Emit connection completed event
        window.dispatchEvent(
          new CustomEvent("p2p-connect-completed", {
            detail: { type, privateCode },
          })
        );

        // Only show notification if it's not auto-restoration
        if (!isAutoRestoring.current) {
          const roomName =
            type === "general"
              ? "Community"
              : type === "local"
              ? "Local Network"
              : `Private Room ${privateCode}`;
          NotificationUtils.showSuccess(`Connected to ${roomName}!`);
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
    await p2pShareService.joinGeneralRoom();
    const generalRoom = {
      type: "general" as const,
      peersCount: 0,
      isActive: true,
    };
    setCurrentRoom(generalRoom);

    // Emit event with correct room type
    p2pShareService.emit("room-joined", { type: "general" });
  };

  const connectToLocal = async () => {
    try {
      const localTopic = await ShareUtils.generateLocalNetworkTopic();
      await p2pShareService.joinRoom(localTopic);

      const localRoom = {
        type: "local" as const,
        peersCount: 0,
        isActive: true,
      };
      setCurrentRoom(localRoom);

      // Emit event with correct room type
      p2pShareService.emit("room-joined", { type: "local", topic: localTopic });

      // Smart fallback: verifica peers na rede local em 3s (skip during auto-restore)
      if (!isAutoRestoring.current) {
        let hasFoundPeers = false;
        let isStillInLocalRoom = true;

        const fallbackTimer = setTimeout(async () => {
          if (!hasFoundPeers && isStillInLocalRoom) {
            console.log(
              "🔄 [LOCAL] No peers found, falling back to general room"
            );
            isStillInLocalRoom = false;
            await p2pShareService.leaveRoom();
            await connectToGeneral();
          }
        }, 3000);

        // Cleanup timer se peers aparecerem
        const handlePeersUpdate = (count: number) => {
          if (count > 0 && !hasFoundPeers && isStillInLocalRoom) {
            console.log("🔄 [LOCAL] Found peers, staying in local room");
            hasFoundPeers = true;
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
    } catch (error) {
      console.error("❌ [LOCAL] Failed to connect to local network:", error);
      await connectToGeneral();
    }
  };

  const connectToPrivate = async (privateCode?: string) => {
    const codeToUse = privateCode?.trim();

    if (codeToUse) {
      // 🔍 Procurando por sala existente
      const topic = await ShareUtils.codeToTopic(codeToUse);
      await p2pShareService.joinRoom(topic);

      const privateRoom = {
        type: "private" as const,
        code: codeToUse,
        peersCount: 0,
        isActive: true,
      };
      setCurrentRoom(privateRoom);

      // Emit event with correct room type and code
      p2pShareService.emit("room-joined", {
        type: "private",
        code: codeToUse,
        topic,
      });

      // Skip monitoring during auto-restore
      if (!isAutoRestoring.current) {
        // 👀 Monitora se encontrou peers (sala existia) em 2s
        let roomFound = false;
        const searchTimer = setTimeout(() => {
          if (!roomFound) {
            NotificationUtils.showSuccess(
              `Room ${codeToUse} created! Share this code with others.`
            );
          }
        }, 2000);

        // Se encontrar peers, sala já existia
        const handlePeersUpdate = (count: number) => {
          if (count > 0 && !roomFound) {
            roomFound = true;
            NotificationUtils.showSuccess(
              `Joined room ${codeToUse}! Found ${count} peers.`
            );
            clearTimeout(searchTimer);
            p2pShareService.removeListener("peers-updated", handlePeersUpdate);
          }
        };

        p2pShareService.on("peers-updated", handlePeersUpdate);
      }
    } else {
      // 🆕 Criando nova sala diretamente
      const friendlyCode = ShareUtils.generateFriendlyCode();

      const topic = await ShareUtils.codeToTopic(friendlyCode);
      await p2pShareService.joinRoom(topic);

      const newPrivateRoom = {
        type: "private" as const,
        code: friendlyCode,
        peersCount: 0,
        isActive: true,
      };
      setCurrentRoom(newPrivateRoom);

      // Emit event with correct room type and code
      p2pShareService.emit("room-joined", {
        type: "private",
        code: friendlyCode,
        topic,
      });

      if (!isAutoRestoring.current) {
        NotificationUtils.showSuccess(
          `Created room ${friendlyCode}! Share this code with others.`
        );
      }
    }
  };

  // SRP: Função focada apenas em desconectar
  const disconnect = useCallback(async () => {
    setIsLoading(true);
    try {
      await p2pShareService.leaveRoom();
      setCurrentRoom(null);
      setIsSharing(false);
      // Reset the restoration flag so it can work again if needed
      hasRestoredFromPersistence.current = false;
      // Reset auto-restore success flag so ReconnectPanel can show again if needed
      autoRestoreSuccessful.current = false;

      // Emit disconnect event
      window.dispatchEvent(new CustomEvent("p2p-disconnect"));

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
      if (currentRoom) {
        setCurrentRoom({ ...currentRoom, peersCount: count });
      }
    },
    [currentRoom]
  );

  // Function to auto-reconnect to last session
  const reconnectToLastSession = useCallback(async () => {
    if (!persistedState.lastConnectionType) {
      return;
    }

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
    clearPersistedState();
    setCurrentRoom(null);
    setIsSharing(false);
    hasRestoredFromPersistence.current = false;
  }, [clearPersistedState]);

  // Function to determine if ReconnectPanel should be shown
  const shouldShowReconnectPanel = useCallback(() => {
    // Don't show if no previous session exists
    if (!persistedState.lastConnectionType) {
      return false;
    }

    // Don't show if auto-restore was successful
    if (autoRestoreSuccessful.current) {
      return false;
    }

    // Don't show if currently restoring
    if (isAutoRestoring.current) {
      return false;
    }

    // Show if we have previous session but restoration hasn't succeeded
    return true;
  }, [persistedState.lastConnectionType]);

  return {
    currentRoom,
    isLoading,
    isSharing,
    connect,
    disconnect,
    updatePeerCount,
    setCurrentRoom: setCurrentRoom,
    setIsSharing: setIsSharing,

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
