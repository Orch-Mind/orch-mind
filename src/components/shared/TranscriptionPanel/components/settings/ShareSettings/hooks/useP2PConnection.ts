// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useCallback, useEffect, useRef, useState } from "react";
import { p2pService } from "../../../../../../../services/p2p/P2PService";
import { p2pEventBus } from "../../../../../../../services/p2p/core/EventBus";
import { P2PRoom } from "../types";
import { useP2PPersistence } from "./useP2PPersistence";

// SRP: Hook responsável APENAS por gerenciar conexões P2P
export const useP2PConnection = () => {
  // State management
  const [currentRoom, setCurrentRoom] = useState<P2PRoom | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Persistence
  const {
    persistedState,
    updateConnectionType,
    updateRoomCode,
    updateSelectedMode,
    updateSharedAdapters,
    updateIsSharing,
    addToRoomHistory,
    clearPersistedState,
  } = useP2PPersistence();

  // Refs for preventing memory leaks and infinite loops
  const isAutoRestoring = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Flag to prevent conflicting room events during manual connections
  const isManuallyConnecting = useRef(false);

  // Event handlers
  const handleRoomJoined = useCallback(
    (data: any) => {
      console.log("🎉 [P2P] Room joined event received:", data);
      
      // CRITICAL FIX: Ignore conflicting events during manual connection
      if (isManuallyConnecting.current) {
        console.log("🚫 [P2P] Ignoring room:joined event during manual connection");
        return;
      }
      
      console.log("✅ [P2P] Processing room:joined event:", data);
      setIsSharing(true);
      setIsLoading(false);

      // Only set code for private rooms, not for general rooms
      const roomData = {
        type: data.type,
        code: data.type === "private" ? data.code : undefined,
        peersCount: data.peersCount || 0,
        isActive: true,
      };
      setCurrentRoom(roomData);

      // Update persistence
      updateConnectionType(data.type);
      updateIsSharing(true);
      
      // Only update room code and history for private rooms
      if (data.code && data.type === "private") {
        updateRoomCode(data.code);
        addToRoomHistory({
          code: data.code,
          type: data.type,
          timestamp: Date.now(),
        });
      }
    },
    [updateConnectionType, updateIsSharing, updateRoomCode, addToRoomHistory]
  );

  const handlePeersUpdated = useCallback((count: number) => {
    console.log(`👥 [P2P] Peers updated: ${count}`);
    setCurrentRoom((prev) => (prev ? { ...prev, peersCount: count } : null));
  }, []);

  const handleRoomLeft = useCallback(() => {
    console.log("👋 [P2P] Room left");
    setCurrentRoom(null);
    setIsSharing(false);
    setIsLoading(false);
  }, []);

  const handleConnectionError = useCallback((error: any) => {
    console.error("❌ [P2P] Connection error:", error);
    setIsLoading(false);
  }, []);

  // Setup event listeners
  const setupEventListeners = useCallback(() => {
    // Clean up previous listeners
    if (cleanupRef.current) {
      cleanupRef.current();
    }

    // Add new listeners using EventBus
    p2pEventBus.on("room:joined", handleRoomJoined);
    p2pEventBus.on("peers:updated", handlePeersUpdated);
    p2pEventBus.on("room:left", handleRoomLeft);

    // Store cleanup function
    cleanupRef.current = () => {
      p2pEventBus.off("room:joined", handleRoomJoined);
      p2pEventBus.off("peers:updated", handlePeersUpdated);
      p2pEventBus.off("room:left", handleRoomLeft);
    };

    return cleanupRef.current;
  }, [handleRoomJoined, handlePeersUpdated, handleRoomLeft]);

  // Connection functions
  const connectToGeneral = async () => {
    try {
      console.log("🌍 [P2P] Connecting to general room...");
      
      // CRITICAL FIX: Set flag to prevent conflicting events
      isManuallyConnecting.current = true;
      
      await p2pService.joinGeneralRoom();
      
      // Don't hardcode peersCount - let it be updated by peer detection
      const generalRoom = {
        type: "general" as const,
        topic: "general-room",
        peersCount: 0, // Start with 0, will be updated by handlePeersUpdated
        isActive: true,
      };
      
      setCurrentRoom(generalRoom);
      setIsSharing(true);
      setIsLoading(false);

      // Update persistence immediately
      updateConnectionType("general");
      updateIsSharing(true);

      // DON'T emit room:joined event to avoid conflicts with Electron events
      // The Electron backend will emit its own events
      console.log("✅ [P2P] Successfully connected to general room");
      
      // Clear the flag after a delay to allow for peer detection
      setTimeout(() => {
        console.log("🔍 [P2P] Clearing manual connection flag...");
        isManuallyConnecting.current = false;
      }, 3000); // 3 seconds should be enough for connection to stabilize
      
    } catch (error) {
      console.error("❌ [P2P] Failed to connect to general room:", error);
      isManuallyConnecting.current = false; // Clear flag on error
      setIsLoading(false);
      throw error;
    }
  };

  const connectToLocal = async () => {
    try {
      await p2pService.joinLocalRoom();

      const localRoom = {
        type: "local" as const,
        topic: "local-room",
        peersCount: 0,
        isActive: true,
      };
      setCurrentRoom(localRoom);

      // Emit event manually
      p2pEventBus.emit("room:joined", {
        type: "local",
        topic: "local-room",
        peersCount: 0,
      });

      // Smart fallback logic remains the same but using EventBus
      if (!isAutoRestoring.current) {
        let hasFoundPeers = false;
        let isStillInLocalRoom = true;

        const fallbackTimer = setTimeout(async () => {
          if (!hasFoundPeers && isStillInLocalRoom) {
            console.log(
              "📡 [P2P] No local peers found, falling back to Community..."
            );
            isStillInLocalRoom = false;
            await p2pService.leaveRoom();
            await connectToGeneral();
          }
        }, 3000);

        const handlePeersUpdate = (count: number) => {
          if (count > 0 && !hasFoundPeers && isStillInLocalRoom) {
            console.log(
              "📡 [P2P] Found local peers! Staying in local network."
            );
            hasFoundPeers = true;
            clearTimeout(fallbackTimer);
          }
        };

        // Use EventBus for peer updates
        p2pEventBus.on("peers:updated", handlePeersUpdate);

        // Cleanup function
        const cleanup = () => {
          isStillInLocalRoom = false;
          clearTimeout(fallbackTimer);
          p2pEventBus.off("peers:updated", handlePeersUpdate);
        };

        setTimeout(cleanup, 10000);
      }
    } catch (error) {
      console.error("Error connecting to local network:", error);
      throw error;
    }
  };

  const connectToPrivate = async (privateCode?: string) => {
    const codeToUse = privateCode?.trim();

    if (codeToUse) {
      // Join existing room
      await p2pService.joinRoom(codeToUse);

      const privateRoom = {
        type: "private" as const,
        code: codeToUse,
        topic: `private-${codeToUse}`,
        peersCount: 0,
        isActive: true,
      };
      setCurrentRoom(privateRoom);

      // Emit event manually
      p2pEventBus.emit("room:joined", {
        type: "private",
        code: codeToUse,
        topic: `private-${codeToUse}`,
        peersCount: 0,
      });

      // Monitor for peers in private room
      if (!isAutoRestoring.current) {
        let foundPeers = false;
        const searchTimer = setTimeout(() => {
          if (!foundPeers) {
            console.log(
              `🔍 [P2P] Room "${codeToUse}" found but no peers yet. You can share this code with others.`
            );
          }
        }, 2000);

        const handlePeersUpdate = (count: number) => {
          if (count > 0 && !foundPeers) {
            console.log(
              `🔍 [P2P] Found ${count} peer(s) in room "${codeToUse}"!`
            );
            foundPeers = true;
            clearTimeout(searchTimer);
          }
        };

        p2pEventBus.on("peers:updated", handlePeersUpdate);
      }
    } else {
      // Create new room
      const friendlyCode = await p2pService.createRoom();

      const newPrivateRoom = {
        type: "private" as const,
        code: friendlyCode,
        topic: `private-${friendlyCode}`,
        peersCount: 0,
        isActive: true,
      };
      setCurrentRoom(newPrivateRoom);

      // Emit event manually
      p2pEventBus.emit("room:joined", {
        type: "private",
        code: friendlyCode,
        topic: `private-${friendlyCode}`,
        peersCount: 0,
      });
    }
  };

  // Main connection function
  const connect = useCallback(
    async (type: "general" | "local" | "private", privateCode?: string) => {
      setIsLoading(true);
      try {
        if (type === "general") {
          await connectToGeneral();
        } else if (type === "local") {
          await connectToLocal();
        } else {
          await connectToPrivate(privateCode);
        }
      } catch (error) {
        console.error("Connection failed:", error);
        setIsLoading(false);
        throw error;
      }
    },
    []
  );

  // Disconnect function
  const disconnect = useCallback(async () => {
    setIsLoading(true);
    try {
      await p2pService.leaveRoom();
      setCurrentRoom(null);
      setIsSharing(false);
      updateIsSharing(false);
    } catch (error) {
      console.error("Disconnect failed:", error);
    } finally {
      setIsLoading(false);
    }
  }, [updateIsSharing]);

  // Restoration functions
  const performCompleteRestoration = useCallback(async () => {
    if (!persistedState.lastConnectionType) return;

    console.log("🔄 [RESTORATION] Starting complete P2P restoration...");
    isAutoRestoring.current = true;

    try {
      if (!p2pService.isInitialized()) {
        await p2pService.initialize();
      }

      await connect(
        persistedState.lastConnectionType,
        persistedState.lastRoomCode
      );

      console.log("✅ [RESTORATION] P2P restoration completed successfully");
    } catch (error) {
      console.error("❌ [RESTORATION] P2P restoration failed:", error);
    } finally {
      isAutoRestoring.current = false;
    }
  }, [persistedState.lastConnectionType, persistedState.lastRoomCode, connect]);

  const reconnectToLastSession = useCallback(async () => {
    await performCompleteRestoration();
  }, [performCompleteRestoration]);

  // Initialize and setup
  useEffect(() => {
    const cleanup = setupEventListeners();

    // AUTO-RESTORATION DISABLED:
    // Removed automatic restoration to give user full control over connections
    // User must manually connect to desired rooms
    console.log("🔧 [P2P] Auto-restoration disabled - manual connection required");

    return cleanup;
  }, [setupEventListeners]);

  // Utility functions
  const updatePeerCount = useCallback((count: number) => {
    setCurrentRoom((prev) => (prev ? { ...prev, peersCount: count } : null));
  }, []);

  const resetP2PState = useCallback(() => {
    clearPersistedState();
    setCurrentRoom(null);
    setIsSharing(false);
    setIsLoading(false);
  }, [clearPersistedState]);

  const getRecentRoomCodes = useCallback(() => {
    return (
      persistedState.roomHistory
        ?.map((entry) => entry.code || "")
        .filter(Boolean) || []
    );
  }, [persistedState.roomHistory]);

  const shouldShowReconnectPanel = !!(
    persistedState.lastConnectionType &&
    !isSharing &&
    !isAutoRestoring.current
  );

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
