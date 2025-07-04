// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useCallback, useEffect, useRef, useState } from "react";
import { p2pService } from "../../../../../services/p2p/P2PService";
import {
  IncomingAdapter,
  SharedAdapter,
} from "../../components/settings/ShareSettings/types";
import {
  NotificationUtils,
  ShareUtils,
} from "../../components/settings/ShareSettings/utils";
import {
  loadFromStorage,
  saveToStorage,
} from "../../components/settings/training/utils";

interface AdapterManagerState {
  sharedAdapters: SharedAdapter[];
  incomingAdapters: IncomingAdapter[];
}

interface AdapterManagerActions {
  loadLocalAdapters: () => void;
  toggleAdapterSharing: (index: number) => Promise<void>;
  downloadAdapter: (adapter: IncomingAdapter) => Promise<void>;
  clearIncomingAdapters: () => void;
  addIncomingAdapters: (data: { from: string; adapters: any[] }) => void;
  verifyAdapterExists: (adapterName: string) => Promise<boolean>;
  syncWithFilesystem: () => Promise<void>;
  cleanupOrphanedAdapters: () => number;
  debugAdapterState: () => void;
  autoCleanupIncomingAdapters: () => void;
}

interface UseAdapterManagerProps {
  persistedSharedIds: string[];
  updateSharedAdapters: (adapterIds: string[]) => void;
}

export const useAdapterManager = ({
  persistedSharedIds,
  updateSharedAdapters,
}: UseAdapterManagerProps): AdapterManagerState & AdapterManagerActions => {
  const [sharedAdapters, setSharedAdapters] = useState<SharedAdapter[]>([]);
  const [incomingAdapters, setIncomingAdapters] = useState<IncomingAdapter[]>(
    []
  );

  // Ref for accessing current adapter state in callbacks without dependency loops
  const currentAdaptersRef = useRef<SharedAdapter[]>([]);

  useEffect(() => {
    currentAdaptersRef.current = sharedAdapters;
  }, [sharedAdapters]);

  // Verify adapter exists in both localStorage and filesystem
  const verifyAdapterExists = useCallback(
    async (adapterName: string): Promise<boolean> => {
      try {
        // 1. Check if adapter exists in localStorage
        const freshLoraAdapters = loadFromStorage("orch-lora-adapters", {
          adapters: [] as any[],
        });

        const existsInLocalStorage = freshLoraAdapters.adapters.some(
          (adapter: any) => (adapter.name || adapter.id) === adapterName
        );

        console.log(
          `🔍 [ADAPTER-MANAGER] Adapter ${adapterName} exists in localStorage: ${existsInLocalStorage}`
        );

        if (!existsInLocalStorage) {
          return false;
        }

        // 2. Check if adapter exists in Electron filesystem
        if (typeof window !== "undefined") {
          try {
            // Use the existing P2P share API to verify adapter existence
            const result = await (window.electronAPI as any).p2pShareAdapter(
              adapterName
            );
            const existsInFilesystem = result.success;
            console.log(
              `🔍 [ADAPTER-MANAGER] Adapter ${adapterName} exists in filesystem: ${existsInFilesystem}`
            );
            return existsInFilesystem;
          } catch (error) {
            console.log(
              `🔍 [ADAPTER-MANAGER] Error checking filesystem for ${adapterName}:`,
              error
            );
            return false;
          }
        }

        // If no Electron API available, assume localStorage check is sufficient
        return existsInLocalStorage;
      } catch (error) {
        console.error(
          `🔍 [ADAPTER-MANAGER] Error verifying adapter ${adapterName}:`,
          error
        );
        return false;
      }
    },
    []
  );

  const loadLocalAdapters = useCallback(() => {
    console.log("🔄 [ADAPTER-MANAGER] Loading adapters from storage...");

    const loraAdapters = loadFromStorage("orch-lora-adapters", {
      adapters: [] as any[],
    });

    const adapters: SharedAdapter[] = loraAdapters.adapters.map(
      (adapter: any) => {
        const adapterName = adapter.name || adapter.id;

        // Preserve existing shared state from current adapters if available
        const existingAdapter = currentAdaptersRef.current.find(
          (existing) => existing.name === adapterName
        );

        const isSharedFromPersistence =
          persistedSharedIds.includes(adapterName);
        const isSharedFromCurrent = existingAdapter?.shared || false;

        // Use current state if available, otherwise use persistence
        const sharedState = existingAdapter
          ? isSharedFromCurrent
          : isSharedFromPersistence;

        console.log(
          `🔄 [ADAPTER-MANAGER] Adapter ${adapterName} shared state: ${sharedState} (persistence: ${isSharedFromPersistence}, current: ${isSharedFromCurrent})`
        );

        return {
          name: adapterName,
          topic: existingAdapter?.topic || "",
          size: "Unknown",
          shared: sharedState,
          peers: existingAdapter?.peers || 0,
        };
      }
    );

    // Filter out orphaned shared adapter IDs
    const existingAdapterNames = adapters.map((a) => a.name);
    const validSharedIds = persistedSharedIds.filter((id) =>
      existingAdapterNames.includes(id)
    );

    if (validSharedIds.length !== persistedSharedIds.length) {
      const removedCount = persistedSharedIds.length - validSharedIds.length;
      console.log(
        `🧹 [ADAPTER-MANAGER] Cleaning up ${removedCount} orphaned shared adapter IDs`
      );
      updateSharedAdapters(validSharedIds);
    }

    console.log(
      `🔄 [ADAPTER-MANAGER] Loaded ${adapters.length} adapters (${
        adapters.filter((a) => a.shared).length
      } shared)`
    );
    setSharedAdapters(adapters);
  }, [persistedSharedIds, updateSharedAdapters]);

  const toggleAdapterSharing = useCallback(
    async (index: number) => {
      const adapter = sharedAdapters[index];
      const willBeShared = !adapter.shared;

      console.log(
        `🔄 [ADAPTER-MANAGER] Toggling sharing for ${adapter.name}: ${adapter.shared} → ${willBeShared}`
      );

      const updatedAdapters = [...sharedAdapters];
      updatedAdapters[index].shared = willBeShared;

      if (willBeShared) {
        if (!updatedAdapters[index].topic) {
          updatedAdapters[index].topic = ShareUtils.generateAdapterTopic();
        }

        // Verify adapter exists before sharing
        const adapterExists = await verifyAdapterExists(
          updatedAdapters[index].name
        );

        if (!adapterExists) {
          console.log(
            `🧹 [ADAPTER-MANAGER] Adapter ${updatedAdapters[index].name} verification failed`
          );
          NotificationUtils.showError(
            `Adapter ${updatedAdapters[index].name} not found. It may have been deleted.`
          );
          updatedAdapters[index].shared = false;
          setTimeout(() => loadLocalAdapters(), 100);
          setSharedAdapters(updatedAdapters);
          return;
        }

        try {
          await p2pService.shareAdapter(updatedAdapters[index].name);
          NotificationUtils.showSuccess(
            `Started sharing ${updatedAdapters[index].name}`
          );
          console.log(
            `✅ [ADAPTER-MANAGER] Successfully shared: ${updatedAdapters[index].name}`
          );
        } catch (error) {
          console.error(`❌ [ADAPTER-MANAGER] Failed to share adapter:`, error);

          if (error instanceof Error && error.message.includes("not found")) {
            NotificationUtils.showError(
              `Adapter ${updatedAdapters[index].name} not found. It may have been deleted.`
            );
            setTimeout(() => loadLocalAdapters(), 100);
          } else {
            NotificationUtils.showError("Failed to share adapter");
          }

          updatedAdapters[index].shared = false;
        }
      } else if (updatedAdapters[index].topic) {
        try {
          await p2pService.unshareAdapter(updatedAdapters[index].topic);
          NotificationUtils.showSuccess(
            `Stopped sharing ${updatedAdapters[index].name}`
          );
          console.log(
            `✅ [ADAPTER-MANAGER] Successfully unshared: ${updatedAdapters[index].name}`
          );
        } catch (error) {
          console.error(
            `❌ [ADAPTER-MANAGER] Failed to unshare adapter:`,
            error
          );
          NotificationUtils.showError("Failed to stop sharing adapter");
        }
      }

      setSharedAdapters(updatedAdapters);
    },
    [sharedAdapters, loadLocalAdapters, verifyAdapterExists]
  );

  const downloadAdapter = useCallback(
    async (adapter: IncomingAdapter) => {
      console.log(
        `🔽 [ADAPTER-MANAGER] Starting download for adapter: ${adapter.name}`
      );
      console.log(`🔽 [ADAPTER-MANAGER] Adapter details:`, {
        name: adapter.name,
        topic: adapter.topic,
        from: adapter.from,
        size: adapter.size,
      });

      try {
        // First check if this is actually our own adapter
        const isOwnAdapter = await verifyAdapterExists(adapter.name);
        if (isOwnAdapter) {
          console.log(
            `⚠️ [ADAPTER-MANAGER] Attempted to download own adapter: ${adapter.name}`
          );
          NotificationUtils.showError(
            `You already own "${adapter.name}". No need to download it!`
          );
          return;
        }

        // Check if P2P service is initialized
        if (!p2pService.isInitialized()) {
          console.error(`❌ [ADAPTER-MANAGER] P2P service not initialized`);
          NotificationUtils.showError(
            "P2P service not initialized. Please connect to a room first."
          );
          return;
        }

        // Check connection status
        const status = p2pService.getStatus();
        console.log(`🔽 [ADAPTER-MANAGER] P2P status:`, status);

        if (!status.isConnected) {
          console.error(`❌ [ADAPTER-MANAGER] Not connected to any P2P room`);
          NotificationUtils.showError(
            "Not connected to a P2P room. Please connect first."
          );
          return;
        }

        if (status.peersCount === 0) {
          console.warn(`⚠️ [ADAPTER-MANAGER] No peers available for download`);
          NotificationUtils.showError(
            "No peers available. Make sure the adapter owner is online."
          );
          return;
        }

        // Additional validation: check if the adapter.from is valid
        if (!adapter.from || adapter.from.trim() === "") {
          console.error(`❌ [ADAPTER-MANAGER] Invalid adapter source`);
          NotificationUtils.showError(
            "Invalid adapter source. Cannot download from unknown peer."
          );
          return;
        }

        console.log(
          `🔽 [ADAPTER-MANAGER] Requesting adapter from peer: ${adapter.from}`
        );
        await p2pService.requestAdapter(adapter.topic, adapter.from);

        console.log(`✅ [ADAPTER-MANAGER] Download request sent successfully`);
        NotificationUtils.showSuccess(`Started downloading ${adapter.name}`);

        // Emit download event
        window.dispatchEvent(
          new CustomEvent("adapter-downloaded", {
            detail: {
              adapterId: adapter.topic,
              adapterName: adapter.name,
              baseModel: "llama3.1:latest",
              downloadedFrom: adapter.from,
              size: adapter.size,
            },
          })
        );

        // Refresh adapter list
        setTimeout(() => loadLocalAdapters(), 500);
      } catch (error) {
        console.error(
          `❌ [ADAPTER-MANAGER] Download failed for ${adapter.name}:`,
          error
        );

        // Provide more specific error messages
        if (error instanceof Error) {
          if (error.message.includes("not found")) {
            NotificationUtils.showError(
              `Adapter ${adapter.name} not found on peer`
            );
          } else if (error.message.includes("timeout")) {
            NotificationUtils.showError(
              `Download timeout for ${adapter.name}. Please try again.`
            );
          } else if (error.message.includes("connection")) {
            NotificationUtils.showError(
              `Connection error while downloading ${adapter.name}`
            );
          } else {
            NotificationUtils.showError(`Download failed: ${error.message}`);
          }
        } else {
          NotificationUtils.showError("Failed to download adapter");
        }
      }
    },
    [loadLocalAdapters, verifyAdapterExists]
  );

  const addIncomingAdapters = useCallback(
    (data: { from: string; adapters: any[] }) => {
      console.log(
        `📥 [ADAPTER-MANAGER] Adding ${data.adapters.length} incoming adapters from ${data.from}`
      );

      // Get current local adapter names for filtering
      const localAdapterNames = currentAdaptersRef.current.map(
        (adapter) => adapter.name
      );
      console.log(
        `📥 [ADAPTER-MANAGER] Local adapter names for filtering:`,
        localAdapterNames
      );

      const newAdapters: IncomingAdapter[] = data.adapters
        .filter((adapter) => {
          const isOwnAdapter = localAdapterNames.includes(adapter.name);
          if (isOwnAdapter) {
            console.log(
              `🚫 [ADAPTER-MANAGER] Filtering out own adapter: ${adapter.name}`
            );
            return false;
          }
          return true;
        })
        .map((adapter) => ({
          name: adapter.name,
          topic: adapter.topic,
          size: ShareUtils.formatFileSize(adapter.size),
          from: data.from,
        }));

      console.log(
        `📥 [ADAPTER-MANAGER] After filtering: ${
          newAdapters.length
        } adapters (filtered out ${
          data.adapters.length - newAdapters.length
        } own adapters)`
      );

      if (newAdapters.length === 0) {
        console.log(
          `📥 [ADAPTER-MANAGER] No new adapters to add after filtering`
        );
        return;
      }

      setIncomingAdapters((prev) => {
        const filtered = prev.filter(
          (existing) =>
            !newAdapters.some(
              (newAdapter) =>
                newAdapter.topic === existing.topic &&
                newAdapter.from === existing.from
            )
        );
        const updated = [...filtered, ...newAdapters];

        console.log(
          `📥 [ADAPTER-MANAGER] Incoming adapters updated: ${prev.length} → ${updated.length}`
        );

        return updated;
      });
    },
    []
  );

  const clearIncomingAdapters = useCallback(() => {
    console.log("🧹 [ADAPTER-MANAGER] Clearing all incoming adapters");
    setIncomingAdapters((prev) => {
      if (prev.length > 0) {
        console.log(
          `🧹 [ADAPTER-MANAGER] Cleared ${prev.length} incoming adapters`
        );
      }
      return [];
    });
  }, []);

  // Auto-clear incoming adapters when not connected
  const autoCleanupIncomingAdapters = useCallback(() => {
    console.log(
      "🧹 [ADAPTER-MANAGER] Auto-cleanup: checking for stale incoming adapters"
    );

    setIncomingAdapters((prev) => {
      if (prev.length > 0) {
        console.log(
          `🧹 [ADAPTER-MANAGER] Auto-cleanup: clearing ${prev.length} stale incoming adapters`
        );
        return [];
      }
      return prev;
    });
  }, []);

  const cleanupOrphanedAdapters = useCallback(() => {
    console.log("🧹 [ADAPTER-MANAGER] Running orphaned adapters cleanup...");

    const freshLoraAdapters = loadFromStorage("orch-lora-adapters", {
      adapters: [] as any[],
    });

    const existingAdapterNames = freshLoraAdapters.adapters.map(
      (adapter: any) => adapter.name || adapter.id
    );

    const validSharedIds = persistedSharedIds.filter((id) =>
      existingAdapterNames.includes(id)
    );

    if (validSharedIds.length !== persistedSharedIds.length) {
      const removedCount = persistedSharedIds.length - validSharedIds.length;
      console.log(
        `🧹 [ADAPTER-MANAGER] Cleanup: removing ${removedCount} orphaned adapter IDs`
      );
      updateSharedAdapters(validSharedIds);
      loadLocalAdapters();
      return removedCount;
    }

    console.log("✅ [ADAPTER-MANAGER] No orphaned adapters found");
    return 0;
  }, [persistedSharedIds, updateSharedAdapters, loadLocalAdapters]);

  const syncWithFilesystem = useCallback(async () => {
    console.log("🔄 [ADAPTER-MANAGER] Syncing localStorage with filesystem...");

    try {
      const loraAdapters = loadFromStorage("orch-lora-adapters", {
        adapters: [] as any[],
      });

      console.log(
        "📦 [ADAPTER-MANAGER] Current localStorage adapters:",
        loraAdapters.adapters.map((a) => a.name || a.id)
      );

      const validAdapters = [];

      for (const adapter of loraAdapters.adapters) {
        const adapterName = adapter.name || adapter.id;
        console.log(`🔍 [ADAPTER-MANAGER] Checking adapter: ${adapterName}`);

        try {
          const exists = await verifyAdapterExists(adapterName);

          if (exists) {
            validAdapters.push(adapter);
            console.log(`✅ [ADAPTER-MANAGER] Adapter ${adapterName} exists`);
          } else {
            console.log(
              `❌ [ADAPTER-MANAGER] Adapter ${adapterName} not found in filesystem`
            );
          }
        } catch (error) {
          console.log(
            `❌ [ADAPTER-MANAGER] Error checking adapter ${adapterName}:`,
            error
          );
        }
      }

      if (validAdapters.length !== loraAdapters.adapters.length) {
        const removedCount =
          loraAdapters.adapters.length - validAdapters.length;
        console.log(
          `🧹 [ADAPTER-MANAGER] Removing ${removedCount} orphaned adapters from localStorage`
        );

        saveToStorage("orch-lora-adapters", {
          adapters: validAdapters,
        });

        // Clean up persisted shared adapter IDs
        const validAdapterNames = validAdapters.map((a) => a.name || a.id);
        const validSharedIds = persistedSharedIds.filter((id) =>
          validAdapterNames.includes(id)
        );

        if (validSharedIds.length !== persistedSharedIds.length) {
          updateSharedAdapters(validSharedIds);
          console.log(`🧹 [ADAPTER-MANAGER] Cleaned up shared adapter IDs`);
        }

        NotificationUtils.showSuccess(
          `Cleaned up ${removedCount} orphaned adapters`
        );
        setTimeout(() => loadLocalAdapters(), 100);
      } else {
        console.log(
          "✅ [ADAPTER-MANAGER] All adapters in localStorage are valid"
        );
      }
    } catch (error) {
      console.error(
        "❌ [ADAPTER-MANAGER] Error syncing localStorage with filesystem:",
        error
      );
    }
  }, [
    loadLocalAdapters,
    updateSharedAdapters,
    persistedSharedIds,
    verifyAdapterExists,
  ]);

  // Debug function to log current state
  const debugAdapterState = useCallback(() => {
    console.log("🔍 [ADAPTER-MANAGER] Current adapter state:", {
      sharedAdapters: sharedAdapters.length,
      incomingAdapters: incomingAdapters.length,
      sharedAdapterNames: sharedAdapters.map((a) => a.name),
      incomingAdapterNames: incomingAdapters.map(
        (a) => `${a.name} (from: ${a.from})`
      ),
    });
  }, [sharedAdapters, incomingAdapters]);

  // Update persistence whenever sharedAdapters state changes
  useEffect(() => {
    const sharedAdapterIds = sharedAdapters
      .filter((adapter) => adapter.shared)
      .map((adapter) => adapter.name);
    updateSharedAdapters(sharedAdapterIds);
  }, [sharedAdapters, updateSharedAdapters]);

  return {
    // State
    sharedAdapters,
    incomingAdapters,

    // Actions
    loadLocalAdapters,
    toggleAdapterSharing,
    downloadAdapter,
    clearIncomingAdapters,
    addIncomingAdapters,
    verifyAdapterExists,
    syncWithFilesystem,
    cleanupOrphanedAdapters,
    debugAdapterState,
    autoCleanupIncomingAdapters,
  };
};
