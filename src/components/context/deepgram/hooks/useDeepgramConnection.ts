// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useCallback, useState } from "react";
import { DeepgramState } from "../interfaces/deepgram/IDeepgramContext";
import { ConnectionState } from "../interfaces/deepgram/IDeepgramService";

interface DeepgramConnectionState {
  deepgramState: DeepgramState;
  isConnected: boolean;
  connectionState: ConnectionState;
}

interface ConnectionActions {
  connectToDeepgram: (language: string) => Promise<boolean>;
  disconnectFromDeepgram: () => Promise<void>;
  hasActiveConnection: () => boolean;
  getConnectionStatus: () => { state: ConnectionState; active: boolean };
}

/**
 * Hook for managing Deepgram connection state
 * Following Single Responsibility Principle
 */
export function useDeepgramConnection(
  deepgramConnection: any,
  dispatch: React.Dispatch<any>
): DeepgramConnectionState & ConnectionActions {
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.CLOSED
  );

  const connectToDeepgram = useCallback(
    async (language: string) => {
      try {
        if (!deepgramConnection) return false;

        dispatch({ type: "SET_STATE", payload: DeepgramState.Connecting });
        await deepgramConnection.connectToDeepgram(language);

        const connected = await deepgramConnection.hasActiveConnection();

        if (connected) {
          dispatch({ type: "SET_STATE", payload: DeepgramState.Connected });
          dispatch({ type: "SET_CONNECTED", payload: true });
        } else {
          dispatch({ type: "SET_STATE", payload: DeepgramState.Error });
          dispatch({ type: "SET_CONNECTED", payload: false });
        }

        return connected;
      } catch (error) {
        console.error("❌ Error connecting to Deepgram:", error);
        dispatch({ type: "SET_STATE", payload: DeepgramState.Error });
        dispatch({ type: "SET_CONNECTED", payload: false });
        return false;
      }
    },
    [deepgramConnection, dispatch]
  );

  const disconnectFromDeepgram = useCallback(async () => {
    try {
      if (!deepgramConnection) return;

      dispatch({ type: "SET_STATE", payload: DeepgramState.Disconnecting });
      await deepgramConnection.disconnectFromDeepgram();

      dispatch({ type: "SET_STATE", payload: DeepgramState.NotConnected });
      dispatch({ type: "SET_CONNECTED", payload: false });
    } catch (error) {
      console.error("❌ Error disconnecting from Deepgram:", error);
    }
  }, [deepgramConnection, dispatch]);

  const hasActiveConnection = useCallback(() => {
    return deepgramConnection?.hasActiveConnection() || false;
  }, [deepgramConnection]);

  const getConnectionStatus = useCallback(() => {
    return (
      deepgramConnection?.getConnectionStatus() || {
        state: ConnectionState.CLOSED,
        active: false,
      }
    );
  }, [deepgramConnection]);

  return {
    connectionState,
    connectToDeepgram,
    disconnectFromDeepgram,
    hasActiveConnection,
    getConnectionStatus,
  } as any; // Type assertion to avoid complex type issues
}
