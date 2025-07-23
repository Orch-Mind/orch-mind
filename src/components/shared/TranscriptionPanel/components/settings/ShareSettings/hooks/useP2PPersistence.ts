// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useCallback, useEffect, useState } from "react";

// Types for P2P persistence
interface P2PPersistedState {
  lastConnectionType: "general" | "local" | "private" | null;
  lastRoomCode: string;
  lastSelectedMode: "auto" | "manual";
  sharedAdapterIds: string[];
  isSharing: boolean;
  roomHistory: Array<{
    type: string;
    code?: string;
    timestamp: number;
  }>;
}

// Default state
const defaultP2PState: P2PPersistedState = {
  lastConnectionType: null,
  lastRoomCode: "",
  lastSelectedMode: "auto",
  sharedAdapterIds: [],
  isSharing: false,
  roomHistory: [],
};

/**
 * Custom hook for persisting P2P state in localStorage
 * Following Josh Comeau's useStickyState pattern with useCallback to prevent infinite loops
 */
export function useP2PPersistence() {
  // Initialize state from localStorage
  const [persistedState, setPersistedState] = useState<P2PPersistedState>(
    () => {
      // SSR safety check
      if (typeof window === "undefined" || !window.localStorage) {
        return defaultP2PState;
      }

      try {
        const saved = window.localStorage.getItem("orch-mind-p2p-state");
        if (saved) {
          const parsed = JSON.parse(saved);

          // Validate the structure and migrate if needed
          return {
            ...defaultP2PState,
            ...parsed,
            // Ensure arrays exist
            sharedAdapterIds: Array.isArray(parsed.sharedAdapterIds)
              ? parsed.sharedAdapterIds
              : [],
            roomHistory: Array.isArray(parsed.roomHistory)
              ? parsed.roomHistory
              : [],
          };
        }
      } catch (error) {
        console.warn("Failed to parse P2P state from localStorage:", error);
      }

      return defaultP2PState;
    }
  );

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.setItem(
          "orch-mind-p2p-state",
          JSON.stringify(persistedState)
        );
      } catch (error) {
        console.warn("Failed to save P2P state to localStorage:", error);
      }
    }
  }, [persistedState]);

  // Helper functions for updating specific parts of the state - MEMOIZED to prevent infinite loops
  const updateConnectionState = useCallback(
    (
      type: P2PPersistedState["lastConnectionType"],
      roomCode?: string,
      isSharing?: boolean
    ) => {
      setPersistedState((prev) => {
        const newState = {
          ...prev,
          lastConnectionType: type,
          lastRoomCode: roomCode || prev.lastRoomCode,
          isSharing: isSharing ?? prev.isSharing,
          // Keep only the last room in history (single item, not array)
          roomHistory:
            type && isSharing
              ? [
                  { type, code: roomCode, timestamp: Date.now() },
                  // Only keep the last room, not multiple entries
                ]
              : prev.roomHistory,
        };

        return newState;
      });
    },
    [] // No dependencies - functional update pattern
  );

  const updateConnectionType = useCallback(
    (type: P2PPersistedState["lastConnectionType"]) => {
      setPersistedState((prev) => ({
        ...prev,
        lastConnectionType: type,
      }));
    },
    []
  );

  const updateRoomCode = useCallback((code: string) => {
    setPersistedState((prev) => ({
      ...prev,
      lastRoomCode: code,
    }));
  }, []);

  const updateIsSharing = useCallback((isSharing: boolean) => {
    setPersistedState((prev) => ({
      ...prev,
      isSharing,
    }));
  }, []);

  const addToRoomHistory = useCallback(
    (entry: { type: string; code?: string; timestamp: number }) => {
      setPersistedState((prev) => ({
        ...prev,
        roomHistory: [entry], // Only keep the last room entry
      }));
    },
    []
  );

  const updateSelectedMode = useCallback(
    (mode: P2PPersistedState["lastSelectedMode"]) => {
      setPersistedState((prev) => ({
        ...prev,
        lastSelectedMode: mode,
      }));
    },
    []
  );

  const updateSharedAdapters = useCallback((adapterIds: string[]) => {
    console.log("🔄 [P2P-PERSISTENCE] updateSharedAdapters called with:", {
      adapterIds,
      count: adapterIds.length,
      stackTrace: new Error().stack?.split("\n").slice(1, 4),
    });

    setPersistedState((prev) => {
      console.log("🔄 [P2P-PERSISTENCE] Previous state:", {
        previousAdapterIds: prev.sharedAdapterIds,
        newAdapterIds: adapterIds,
        changing:
          prev.sharedAdapterIds.length !== adapterIds.length ||
          JSON.stringify(prev.sharedAdapterIds.sort()) !==
            JSON.stringify(adapterIds.sort()),
      });

      const newState = {
        ...prev,
        sharedAdapterIds: adapterIds,
      };

      return newState;
    });
  }, []); // No dependencies - functional update pattern

  const clearPersistedState = useCallback(() => {
    setPersistedState(defaultP2PState);
  }, []);

  // Get recently used room codes for quick access - MEMOIZED
  const getRecentRoomCodes = useCallback((): string[] => {
    return persistedState.roomHistory
      .filter((entry) => entry.code && entry.type === "private")
      .map((entry) => entry.code!)
      .filter((code, index, arr) => arr.indexOf(code) === index) // Remove duplicates
      .slice(0, 3); // Last 3 unique codes
  }, [persistedState.roomHistory]);

  return {
    // Current state
    persistedState,

    // Update functions - all memoized
    updateConnectionState,
    updateConnectionType,
    updateRoomCode,
    updateIsSharing,
    updateSelectedMode,
    updateSharedAdapters,
    addToRoomHistory,
    clearPersistedState,

    // Helper functions - memoized
    getRecentRoomCodes,
  };
}

/**
 * Hook for individual sticky values (following Josh Comeau pattern)
 */
export function useStickyState<T>(
  defaultValue: T,
  key: string
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    // SSR safety
    if (typeof window === "undefined" || !window.localStorage) {
      return defaultValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Failed to get ${key} from localStorage:`, error);
      return defaultValue;
    }
  });

  // Memoize the setter function to prevent unnecessary re-renders
  const setStickyValue = useCallback(
    (newValue: T) => {
      setValue(newValue);

      if (typeof window !== "undefined" && window.localStorage) {
        try {
          window.localStorage.setItem(key, JSON.stringify(newValue));
        } catch (error) {
          console.warn(`Failed to save ${key} to localStorage:`, error);
        }
      }
    },
    [key]
  );

  return [value, setStickyValue];
}
