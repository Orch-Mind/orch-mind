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
  const isAutoRestoring = useRef(false);
  const autoRestoreSuccessful = useRef(false);

  const checkAndAutoReconnect = useCallback(async () => {
    if (
      hasAutoReconnected.current ||
      !lastConnectionType ||
      !connectionService
    ) {
      if (!connectionService) {
        console.log(
          "🔄 [AUTO-RECONNECT] Connection service not ready yet, skipping auto-reconnect"
        );
      }
      return;
    }

    console.log("🔄 [AUTO-RECONNECT] Starting auto-reconnection process...");
    hasAutoReconnected.current = true;
    isAutoRestoring.current = true;
    NotificationUtils.setSilentMode(true);

    try {
      await connectionService.connect(
        lastConnectionType,
        lastRoomCode || undefined,
        true // isAutoRestoring
      );

      console.log(
        "✅ [AUTO-RECONNECT] Connection restored, restoring shared adapters..."
      );

      // Restore adapters after connection is established
      await onRestoreSharedAdapters();

      autoRestoreSuccessful.current = true;
      console.log(
        "✅ [AUTO-RECONNECT] Auto-reconnection completed successfully"
      );
    } catch (error) {
      console.error("❌ [AUTO-RECONNECT] Auto-reconnection failed:", error);
      clearPersistedState();
    } finally {
      isAutoRestoring.current = false;
      NotificationUtils.setSilentMode(false);
    }
  }, [
    lastConnectionType,
    lastRoomCode,
    connectionService,
    clearPersistedState,
    onRestoreSharedAdapters,
  ]);

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

  const resetFlags = useCallback(() => {
    hasAutoReconnected.current = false;
    autoRestoreSuccessful.current = false;
    isAutoRestoring.current = false;
    console.log("🔄 [AUTO-RECONNECT] Flags reset");
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
    resetFlags,
    getState,
    isAutoRestoring: isAutoRestoring.current,
  };
};
