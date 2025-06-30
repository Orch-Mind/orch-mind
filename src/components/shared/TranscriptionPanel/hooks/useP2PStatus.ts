// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useEffect, useState } from "react";
import { p2pShareService } from "../../../../services/p2p/P2PShareService";

export interface P2PStatus {
  isConnected: boolean;
  roomType: "general" | "local" | "private" | null;
  roomCode?: string;
  peersCount: number;
  isLoading: boolean;
}

/**
 * Hook para monitorar globalmente o status da conexão P2P
 * Expõe informações simplificadas do P2P para uso em qualquer componente
 */
export const useP2PStatus = (): P2PStatus => {
  const [status, setStatus] = useState<P2PStatus>({
    isConnected: false,
    roomType: null,
    roomCode: undefined,
    peersCount: 0,
    isLoading: false,
  });

  useEffect(() => {
    // Initialize P2P service if not already done
    const initializeIfNeeded = async () => {
      try {
        if (!p2pShareService.isInitialized()) {
          console.log("🔧 [P2P-STATUS] Initializing P2P service...");
          await p2pShareService.initialize();
        }
      } catch (error) {
        console.warn("🔧 [P2P-STATUS] P2P service not available:", error);
      }
    };

    initializeIfNeeded();

    // Event handlers for P2P status updates
    const handleRoomJoined = (data: any) => {
      console.log("🔄 [P2P-STATUS] Room joined event:", data);

      setStatus((prev) => {
        const newStatus = {
          ...prev,
          isConnected: true,
          roomType: data.type || "local",
          roomCode: data.code,
          isLoading: false,
        };

        console.log(
          "🔄 [P2P-STATUS] Updated status after room joined:",
          newStatus
        );
        return newStatus;
      });
    };

    const handlePeersUpdated = (count: number) => {
      console.log("🔄 [P2P-STATUS] Peers updated:", count);

      setStatus((prev) => {
        const newStatus = {
          ...prev,
          peersCount: count,
        };

        console.log(
          "🔄 [P2P-STATUS] Updated status after peers update:",
          newStatus
        );
        return newStatus;
      });
    };

    const handleRoomLeft = () => {
      console.log("🔄 [P2P-STATUS] Room left event");

      const disconnectedStatus = {
        isConnected: false,
        roomType: null,
        roomCode: undefined,
        peersCount: 0,
        isLoading: false,
      };

      console.log(
        "🔄 [P2P-STATUS] Updated status after room left:",
        disconnectedStatus
      );
      setStatus(disconnectedStatus);
    };

    const handleConnectionStarted = () => {
      console.log("🔄 [P2P-STATUS] Connection started");
      setStatus((prev) => ({ ...prev, isLoading: true }));
    };

    const handleConnectionError = () => {
      console.log("🔄 [P2P-STATUS] Connection error");
      setStatus((prev) => ({
        ...prev,
        isLoading: false,
      }));
    };

    // Subscribe to P2P events
    p2pShareService.on("room-joined", handleRoomJoined);
    p2pShareService.on("peers-updated", handlePeersUpdated);
    p2pShareService.on("room-left", handleRoomLeft);
    p2pShareService.on("connection-started", handleConnectionStarted);
    p2pShareService.on("connection-error", handleConnectionError);

    // Custom events from the ShareSettings component
    const handleP2PConnect = () => {
      console.log("🔄 [P2P-STATUS] P2P connect start event");
      setStatus((prev) => ({ ...prev, isLoading: true }));
    };

    const handleP2PConnectCompleted = (event: any) => {
      console.log("🔄 [P2P-STATUS] P2P connect completed event:", event.detail);
      setStatus((prev) => ({ ...prev, isLoading: false }));
    };

    const handleP2PDisconnect = () => {
      console.log("🔄 [P2P-STATUS] P2P disconnect event");
      const disconnectedStatus = {
        isConnected: false,
        roomType: null,
        roomCode: undefined,
        peersCount: 0,
        isLoading: false,
      };
      setStatus(disconnectedStatus);
    };

    // Listen for custom events
    window.addEventListener("p2p-connect-start", handleP2PConnect);
    window.addEventListener("p2p-connect-completed", handleP2PConnectCompleted);
    window.addEventListener("p2p-disconnect", handleP2PDisconnect);

    // Check for existing persisted state on mount
    const checkPersistedState = () => {
      try {
        const persistedData = localStorage.getItem("orch-os-p2p-state");
        if (persistedData) {
          const parsed = JSON.parse(persistedData);
          console.log("🔄 [P2P-STATUS] Found persisted P2P state:", parsed);

          // If there's a persisted connection, the useP2PConnection hook should handle auto-reconnection
          // We just log it here for debugging
          if (parsed.lastConnectionType) {
            console.log(
              "🔄 [P2P-STATUS] Previous connection type detected:",
              parsed.lastConnectionType
            );
          }
        }
      } catch (error) {
        console.warn("🔄 [P2P-STATUS] Error reading persisted state:", error);
      }
    };

    checkPersistedState();

    // Cleanup
    return () => {
      p2pShareService.removeListener("room-joined", handleRoomJoined);
      p2pShareService.removeListener("peers-updated", handlePeersUpdated);
      p2pShareService.removeListener("room-left", handleRoomLeft);
      p2pShareService.removeListener(
        "connection-started",
        handleConnectionStarted
      );
      p2pShareService.removeListener("connection-error", handleConnectionError);

      window.removeEventListener("p2p-connect-start", handleP2PConnect);
      window.removeEventListener(
        "p2p-connect-completed",
        handleP2PConnectCompleted
      );
      window.removeEventListener("p2p-disconnect", handleP2PDisconnect);
    };
  }, []);

  return status;
};
