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
import { useP2PDownloadProgress } from "./useP2PDownloadProgress";

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
  // Download progress interface
  downloadState: any;
  isDownloading: (adapterName: string) => boolean;
  getProgress: (adapterName: string) => any;
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
  const currentIncomingAdaptersRef = useRef<IncomingAdapter[]>([]);

  // Download progress management
  const downloadProgress = useP2PDownloadProgress();

  useEffect(() => {
    currentAdaptersRef.current = sharedAdapters;
  }, [sharedAdapters]);

  useEffect(() => {
    currentIncomingAdaptersRef.current = incomingAdapters;
  }, [incomingAdapters]);

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

    console.log(
      `📦 [ADAPTER-MANAGER] Raw adapters from localStorage:`,
      loraAdapters.adapters.map((a: any) => ({
        id: a.id,
        name: a.name,
        status: a.status,
        source: a.source,
        displayName: a.displayName,
      }))
    );

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

        // Log merged adapters specifically
        if (adapter.status === "merged") {
          console.log(`🔗 [ADAPTER-MANAGER] Merged adapter detected:`, {
            id: adapter.id,
            name: adapter.name,
            displayName: adapter.displayName,
            mergedWith: adapter.mergedWith,
            sharedState: sharedState,
          });
        }

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

    // Count different adapter types for summary
    const adapterTypeCounts = {
      total: adapters.length,
      shared: adapters.filter((a) => a.shared).length,
      merged: loraAdapters.adapters.filter((a: any) => a.status === "merged")
        .length,
      p2p: loraAdapters.adapters.filter((a: any) => a.source === "p2p").length,
      local: loraAdapters.adapters.filter((a: any) => a.source === "local")
        .length,
    };

    console.log(
      `🔄 [ADAPTER-MANAGER] Loaded adapters summary:`,
      adapterTypeCounts
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

  /**
   * Detect base model from adapter name
   */
  const detectBaseModelFromName = useCallback((adapterName: string): string => {
    const name = adapterName.toLowerCase();

    if (name.includes("gemma3") || name.includes("gemma-3")) {
      return "gemma3:latest";
    }
    if (name.includes("gemma3n") || name.includes("gemma-3n")) {
      return "gemma3n:latest";
    }
    // Default fallback
    return "gemma3:latest";
  }, []);

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

        // SIMPLIFIED: If you can see adapters, you can download them!
        // The fact that adapters are visible is PROOF of connectivity
        const hasIncomingAdapters =
          currentIncomingAdaptersRef.current.length > 0;

        console.log("🔍 [ADAPTER-MANAGER] Download validation:", {
          adapterToDownload: adapter.name,
          totalIncomingAdapters: currentIncomingAdaptersRef.current.length,
          hasConnectivity: hasIncomingAdapters,
          reasoning: hasIncomingAdapters
            ? "✅ Adapters visible = connectivity confirmed"
            : "❌ No adapters = no connectivity",
        });

        if (!hasIncomingAdapters) {
          console.error(
            "❌ [ADAPTER-MANAGER] No adapters available - no connectivity"
          );
          NotificationUtils.showError(
            "No adapters available. Please check your P2P connection."
          );
          return;
        }

        console.log(
          "✅ [ADAPTER-MANAGER] Download allowed - adapters are visible, connectivity confirmed!"
        );

        // Additional validation: check if the adapter.from is valid
        if (!adapter.from || adapter.from.trim() === "") {
          console.error(`❌ [ADAPTER-MANAGER] Invalid adapter source`);
          NotificationUtils.showError(
            "Invalid adapter source. Cannot download from unknown peer."
          );
          return;
        }

        // Parse adapter size to bytes for progress tracking
        const sizeInBytes = ShareUtils.parseSizeToBytes(adapter.size);

        // Start download progress tracking
        downloadProgress.startDownload(adapter.name, sizeInBytes);

        console.log(
          `🔽 [ADAPTER-MANAGER] Requesting adapter from peer: ${adapter.from}`
        );

        try {
          await p2pService.requestAdapter(adapter.topic, adapter.from);

          console.log(
            `✅ [ADAPTER-MANAGER] Download request sent successfully`
          );
          NotificationUtils.showSuccess(`Started downloading ${adapter.name}`);

          // Detect base model from adapter name
          const detectedBaseModel = detectBaseModelFromName(adapter.name);

          console.log(
            `🔍 [ADAPTER-MANAGER] Detected base model for ${adapter.name}: ${detectedBaseModel}`
          );

          // Emit download event
          window.dispatchEvent(
            new CustomEvent("adapter-downloaded", {
              detail: {
                adapterId: adapter.topic,
                adapterName: adapter.name,
                baseModel: detectedBaseModel,
                downloadedFrom: adapter.from,
                size: adapter.size,
              },
            })
          );

          // Refresh adapter list
          setTimeout(() => loadLocalAdapters(), 500);
        } catch (downloadError) {
          // Handle download-specific errors and update progress
          const errorMessage =
            downloadError instanceof Error
              ? downloadError.message
              : "Unknown download error";

          downloadProgress.errorDownload(adapter.name, errorMessage);
          throw downloadError; // Re-throw to trigger the outer catch block
        }
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
    [
      loadLocalAdapters,
      verifyAdapterExists,
      downloadProgress,
      detectBaseModelFromName,
    ]
  );

  const addIncomingAdapters = useCallback(
    (data: { from: string; adapters: any[] }) => {
      // Validate data structure
      if (!data || !data.adapters || !Array.isArray(data.adapters)) {
        console.warn(`📥 [ADAPTER-MANAGER] Invalid data received:`, data);
        return;
      }

      // Validate 'from' field
      if (!data.from || data.from.trim() === "") {
        console.warn(`📥 [ADAPTER-MANAGER] Invalid 'from' field:`, data.from);
        return;
      }

      console.debug(
        `📥 [ADAPTER-MANAGER] Adding ${data.adapters.length} incoming adapters from ${data.from}`
      );

      // Log detailed adapter information for debugging (debug level)
      console.debug(
        `📥 [ADAPTER-MANAGER] Raw adapter data:`,
        data.adapters.map((adapter) => ({
          name: adapter.name,
          topic: adapter.topic,
          size: adapter.size,
          hasValidName: !!adapter.name,
          hasValidTopic: !!adapter.topic,
        }))
      );

      // Get current local adapter names for filtering
      const localAdapterNames = currentAdaptersRef.current.map(
        (adapter) => adapter.name
      );
      console.debug(
        `📥 [ADAPTER-MANAGER] Local adapter names for filtering:`,
        localAdapterNames
      );

      const newAdapters: IncomingAdapter[] = data.adapters
        .filter((adapter) => {
          // Validate adapter structure
          if (!adapter.name || !adapter.topic) {
            console.warn(
              `📥 [ADAPTER-MANAGER] Invalid adapter structure:`,
              adapter
            );
            return false;
          }

          const isOwnAdapter = localAdapterNames.includes(adapter.name);
          if (isOwnAdapter) {
            console.debug(
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

      console.debug(
        `📥 [ADAPTER-MANAGER] After filtering: ${
          newAdapters.length
        } adapters (filtered out ${
          data.adapters.length - newAdapters.length
        } own adapters)`
      );

      // Log final adapter list for debugging (debug level)
      console.debug(
        `📥 [ADAPTER-MANAGER] Final adapter list:`,
        newAdapters.map((adapter) => ({
          name: adapter.name,
          from: adapter.from,
          topic: adapter.topic.slice(0, 8) + "...",
        }))
      );

      if (newAdapters.length === 0) {
        console.debug(
          `📥 [ADAPTER-MANAGER] No new adapters to add after filtering`
        );
        return;
      }

      setIncomingAdapters((prev) => {
        // Remove duplicates based on topic AND from fields
        const filtered = prev.filter(
          (existing) =>
            !newAdapters.some(
              (newAdapter) =>
                newAdapter.topic === existing.topic &&
                newAdapter.from === existing.from
            )
        );

        const updated = [...filtered, ...newAdapters];

        // Only log significant changes
        if (updated.length !== prev.length) {
          console.log(
            `📥 [ADAPTER-MANAGER] Incoming adapters updated: ${prev.length} → ${updated.length}`
          );
        }

        // Log current state for debugging (debug level)
        console.debug(
          `📥 [ADAPTER-MANAGER] Current incoming adapters:`,
          updated.map((adapter) => ({
            name: adapter.name,
            from: adapter.from,
            topic: adapter.topic.slice(0, 8) + "...",
          }))
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

  // Listen for download completion events to remove adapters from incoming list
  useEffect(() => {
    const handleAdapterDownloaded = (event: CustomEvent) => {
      const { adapterName } = event.detail;
      console.log(
        `🎉 [ADAPTER-MANAGER] Download completed for: ${adapterName}`
      );

      // Remove adapter from incoming list
      setIncomingAdapters((prev) => {
        const filtered = prev.filter((adapter) => adapter.name !== adapterName);
        if (filtered.length !== prev.length) {
          console.log(
            `🧹 [ADAPTER-MANAGER] Removed ${adapterName} from incoming adapters`
          );
        }
        return filtered;
      });

      // Reload local adapters to include the newly downloaded adapter
      setTimeout(() => {
        console.log(
          `🔄 [ADAPTER-MANAGER] Reloading local adapters after download`
        );
        loadLocalAdapters();
      }, 1000); // Small delay to ensure filesystem operations complete
    };

    const handleAdapterSaved = (event: CustomEvent) => {
      const { adapter } = event.detail;
      console.log(
        `💾 [ADAPTER-MANAGER] Adapter saved to localStorage: ${adapter.name}`
      );

      // Remove from incoming list if present
      setIncomingAdapters((prev) => {
        const filtered = prev.filter(
          (incomingAdapter) => incomingAdapter.name !== adapter.name
        );
        if (filtered.length !== prev.length) {
          console.log(
            `🧹 [ADAPTER-MANAGER] Removed ${adapter.name} from incoming adapters after save`
          );
        }
        return filtered;
      });

      // Reload local adapters
      setTimeout(() => {
        console.log(`🔄 [ADAPTER-MANAGER] Reloading local adapters after save`);
        loadLocalAdapters();
      }, 500);
    };

    const handleAdapterDeleted = (event: CustomEvent) => {
      const { adapterName, wasP2P } = event.detail;
      console.log(
        `🗑️ [ADAPTER-MANAGER] Adapter deleted: ${adapterName} (was P2P: ${wasP2P})`
      );

      // If it was a P2P adapter, it might need to appear in the download list again
      if (wasP2P) {
        console.log(
          `🔄 [ADAPTER-MANAGER] P2P adapter ${adapterName} deleted - will reappear in download list when peers share it again`
        );

        // Force a refresh of incoming adapters by clearing and letting them repopulate
        // This ensures that if other peers are still sharing this adapter, it will appear again
        setTimeout(() => {
          console.log(
            `🔄 [ADAPTER-MANAGER] Triggering adapter list refresh after P2P adapter deletion`
          );
          // The adapter will naturally reappear when other peers announce their adapters
          // No need to manually add it back - just let the natural P2P discovery process work
        }, 1000);
      }

      // Reload local adapters to reflect the deletion
      setTimeout(() => {
        console.log(
          `🔄 [ADAPTER-MANAGER] Reloading local adapters after deletion`
        );
        loadLocalAdapters();
      }, 500);
    };

    // Listen for all adapter events
    window.addEventListener(
      "adapter-downloaded",
      handleAdapterDownloaded as EventListener
    );
    window.addEventListener(
      "lora-adapter-added",
      handleAdapterSaved as EventListener
    );
    window.addEventListener(
      "adapter-deleted",
      handleAdapterDeleted as EventListener
    );

    return () => {
      window.removeEventListener(
        "adapter-downloaded",
        handleAdapterDownloaded as EventListener
      );
      window.removeEventListener(
        "lora-adapter-added",
        handleAdapterSaved as EventListener
      );
      window.removeEventListener(
        "adapter-deleted",
        handleAdapterDeleted as EventListener
      );
    };
  }, [loadLocalAdapters]);

  // Listen for new merged adapters from Deploy tab
  useEffect(() => {
    const handleAdapterMerged = (event: CustomEvent) => {
      const { adapterName, displayName, source } = event.detail;
      console.log(
        `🔗 [ADAPTER-MANAGER] New merged adapter detected: ${adapterName} (display: ${displayName})`
      );

      // Reload local adapters to include the newly merged adapter
      setTimeout(() => {
        console.log(`🔄 [ADAPTER-MANAGER] Reloading adapters after merge`);
        loadLocalAdapters();
      }, 1000);
    };

    // Listen for merged adapters event
    window.addEventListener(
      "adapter-merged",
      handleAdapterMerged as EventListener
    );

    return () => {
      window.removeEventListener(
        "adapter-merged",
        handleAdapterMerged as EventListener
      );
    };
  }, [loadLocalAdapters]);

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
    // Download progress interface
    downloadState: downloadProgress.downloadState,
    isDownloading: downloadProgress.isDownloading,
    getProgress: downloadProgress.getProgress,
  };
};
