// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useCallback, useRef } from "react";
import { NotificationUtils } from "../../components/settings/ShareSettings/utils";
import { P2PConnectionService } from "../services/P2PConnectionService";

interface AutoReconnectState {
  hasAutoReconnected: boolean;
  isAutoRestoring: boolean;
  autoRestoreSuccessful: boolean;
}

interface UseAutoReconnectProps {
  connectionService: P2PConnectionService | null;
  lastConnectionType: "general" | "local" | "private" | null;
  lastRoomCode: string | null;
  clearPersistedState: () => void;
  updateConnectionState: (
    type: string | null,
    code: string,
    isSharing: boolean
  ) => void;
  onRestoreSharedAdapters: () => Promise<void>;
}

export const useAutoReconnect = ({
  connectionService,
  lastConnectionType,
  lastRoomCode,
  clearPersistedState,
  updateConnectionState,
  onRestoreSharedAdapters,
}: UseAutoReconnectProps) => {
  // Control flags
  const hasAutoReconnected = useRef(false);
  const isReconnecting = useRef(false);
  const lastReconnectAttempt = useRef(0);
  const isAutoRestoring = useRef(false);
  const autoRestoreSuccessful = useRef(false);

  const checkAndAutoReconnect = useCallback(async () => {
    const now = Date.now();
    const RECONNECT_COOLDOWN = 10000; // 10 seconds cooldown between attempts

    console.log("🔄 [AUTO-RECONNECT] checkAndAutoReconnect called", {
      connectionService: !!connectionService,
      hasAutoReconnected: hasAutoReconnected.current,
      isReconnecting: isReconnecting.current,
      lastConnectionType,
      lastRoomCode,
      isAutoRestoring: isAutoRestoring.current,
      timeSinceLastAttempt: now - lastReconnectAttempt.current,
    });
    
    // DEBUG: Log exactly what we received from props
    console.log("🔍 [AUTO-RECONNECT-DEBUG] Props received:", {
      lastConnectionType: lastConnectionType,
      lastRoomCode: lastRoomCode,
      typeOfLastConnectionType: typeof lastConnectionType,
      typeOfLastRoomCode: typeof lastRoomCode,
    });

    if (!connectionService) {
      console.log(
        "🔄 [AUTO-RECONNECT] Connection service not ready yet, skipping auto-reconnect"
      );
      return;
    }

    // If we're already reconnecting, skip
    if (isReconnecting.current) {
      console.log("🔄 [AUTO-RECONNECT] Already reconnecting, skipping");
      return;
    }

    // If we already auto-reconnected, skip
    if (hasAutoReconnected.current) {
      console.log("🔄 [AUTO-RECONNECT] Already auto-reconnected, skipping");
      return;
    }

    // Cooldown check
    if (now - lastReconnectAttempt.current < RECONNECT_COOLDOWN) {
      console.log("🔄 [AUTO-RECONNECT] Cooldown active, skipping");
      return;
    }

    console.log("🔄 [AUTO-RECONNECT] Starting auto-reconnection process...");
    hasAutoReconnected.current = true;
    isReconnecting.current = true;
    lastReconnectAttempt.current = now;
    isAutoRestoring.current = true;
    NotificationUtils.setSilentMode(true);

    try {
      // DEBUG: Log the exact decision tree
      console.log("🔍 [AUTO-RECONNECT-DEBUG] Decision tree:", {
        hasLastConnectionType: !!lastConnectionType,
        lastConnectionType: lastConnectionType,
        lastRoomCode: lastRoomCode,
        willConnectTo: lastConnectionType || "general (default)",
        willUseCode: lastConnectionType === "private" ? (lastRoomCode || undefined) : undefined,
      });
      
      // Restore previous connection based on local storage
      if (lastConnectionType) {
        console.log(
          `🔄 [AUTO-RECONNECT] Restoring previous connection: ${lastConnectionType}${
            lastRoomCode ? ` (${lastRoomCode})` : ""
          }`
        );

        if (lastConnectionType === "general") {
          console.log("🔄 [AUTO-RECONNECT] Connecting to GENERAL room");
          await connectionService.connect("general", undefined, true);
        } else if (lastConnectionType === "private") {
          console.log(`🔄 [AUTO-RECONNECT] Connecting to PRIVATE room with code: ${lastRoomCode || "undefined"}`);
          await connectionService.connect(
            "private",
            lastRoomCode || undefined,
            true
          );
        } else {
          console.warn(
            `🔄 [AUTO-RECONNECT] Unknown connection type: ${lastConnectionType}, defaulting to Community`
          );
          await connectionService.connect("general", undefined, true);
        }
      } else {
        // Default to Community room if no previous connection
        console.log(
          "🔄 [AUTO-RECONNECT] No previous connection found, connecting to Community"
        );
        await connectionService.connect("general", undefined, true);
      }

      console.log(
        "🔄 [AUTO-RECONNECT] Auto-reconnection completed successfully"
      );
    } catch (error) {
      console.error("🔄 [AUTO-RECONNECT] Auto-reconnection failed:", error);
      // Reset flags on failure so we can try again later
      hasAutoReconnected.current = false;
    } finally {
      isReconnecting.current = false;
      isAutoRestoring.current = false;
      NotificationUtils.setSilentMode(false);
    }
  }, [connectionService, lastConnectionType, lastRoomCode]);

  const reconnectToLastSession = useCallback(async () => {
    if (lastConnectionType && connectionService) {
      console.log("🔄 [AUTO-RECONNECT] Manual reconnection to last session...");

      try {
        await connectionService.connect(
          lastConnectionType,
          lastRoomCode || undefined,
          false // not auto-restoring
        );

        // Update persistence
        updateConnectionState(lastConnectionType, lastRoomCode || "", true);

        // Restore adapters
        await onRestoreSharedAdapters();

        console.log("✅ [AUTO-RECONNECT] Manual reconnection completed");
      } catch (error) {
        console.error("❌ [AUTO-RECONNECT] Manual reconnection failed:", error);
        throw error;
      }
    }
  }, [
    lastConnectionType,
    lastRoomCode,
    connectionService,
    updateConnectionState,
    onRestoreSharedAdapters,
  ]);

  const shouldShowReconnectPanel = useCallback(() => {
    return !!(
      lastConnectionType &&
      connectionService &&
      !autoRestoreSuccessful.current &&
      !isAutoRestoring.current &&
      !connectionService.getStatus().isConnected
    );
  }, [lastConnectionType, connectionService]);

  const resetAutoReconnect = useCallback(() => {
    console.log("🔄 [AUTO-RECONNECT] Resetting auto-reconnect flags");
    hasAutoReconnected.current = false;
    isReconnecting.current = false;
    lastReconnectAttempt.current = 0;
    autoRestoreSuccessful.current = false;
    isAutoRestoring.current = false;
  }, []);

  const getState = useCallback(
    (): AutoReconnectState => ({
      hasAutoReconnected: hasAutoReconnected.current,
      isAutoRestoring: isAutoRestoring.current,
      autoRestoreSuccessful: autoRestoreSuccessful.current,
    }),
    []
  );

  return {
    checkAndAutoReconnect,
    reconnectToLastSession,
    shouldShowReconnectPanel,
    resetAutoReconnect,
    getState,
    isAutoRestoring: isAutoRestoring.current,
  };
};
