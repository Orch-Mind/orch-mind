// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useCallback, useEffect, useRef, useState } from "react";
import { p2pShareService } from "../../../../../../../services/p2p/P2PShareService";
import { loadFromStorage } from "../../training/utils";
import { IncomingAdapter, SharedAdapter } from "../types";
import { NotificationUtils, ShareUtils } from "../utils";

// SRP: Hook responsável APENAS por gerenciar adapters
export const useAdapters = (
  updateSharedAdapters?: (adapterIds: string[]) => void
) => {
  const [sharedAdapters, setSharedAdapters] = useState<SharedAdapter[]>([]);
  const [incomingAdapters, setIncomingAdapters] = useState<IncomingAdapter[]>(
    []
  );

  // Use ref to access current adapters state without creating infinite loop
  const currentAdaptersRef = useRef<SharedAdapter[]>([]);

  // Flag to prevent updateSharedAdapters call on initial mount with empty array
  const hasInitiallyLoadedRef = useRef(false);

  // Update ref whenever sharedAdapters changes
  useEffect(() => {
    currentAdaptersRef.current = sharedAdapters;

    // Mark as initially loaded once we have data
    if (sharedAdapters.length > 0) {
      hasInitiallyLoadedRef.current = true;
    }
  }, [sharedAdapters]);

  // Listen for restoration events from useP2PConnection
  useEffect(() => {
    const handleAdapterRestoration = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const {
        sharedAdapterIds,
        isAutoRestore,
        retryAttempt = 0,
      } = customEvent.detail;

      try {
        await restoreSharedAdapters(
          sharedAdapterIds,
          isAutoRestore,
          retryAttempt
        );

        if (!isAutoRestore) {
          NotificationUtils.showSuccess(
            `✅ Restored sharing for ${sharedAdapterIds.length} adapters`
          );
        }
      } catch (error) {
        console.error(
          "❌ [ADAPTER-RESTORE] Failed to restore shared adapters:",
          error
        );
        if (!isAutoRestore) {
          NotificationUtils.showError("Failed to restore adapter sharing");
        }
      }
    };

    window.addEventListener("p2p-restore-adapters", handleAdapterRestoration);

    return () => {
      window.removeEventListener(
        "p2p-restore-adapters",
        handleAdapterRestoration
      );
    };
  }, [sharedAdapters]);

  // Function to restore shared adapters
  const restoreSharedAdapters = useCallback(
    async (adapterIds: string[], isAutoRestore: boolean, retryAttempt = 0) => {
      const currentAdapters = currentAdaptersRef.current;

      if (currentAdapters.length === 0) {
        if (retryAttempt < 2) {
          setTimeout(() => {
            window.dispatchEvent(
              new CustomEvent("p2p-restore-adapters", {
                detail: {
                  sharedAdapterIds: adapterIds,
                  isAutoRestore,
                  retryAttempt: retryAttempt + 1,
                },
              })
            );
          }, 1000 * (retryAttempt + 1));
        }
        return;
      }

      const updatedAdapters = [...currentAdapters];
      let restoredCount = 0;
      const restoredAdapterNames: string[] = [];

      for (const adapterId of adapterIds) {
        const adapterIndex = updatedAdapters.findIndex(
          (adapter) => adapter.name === adapterId
        );

        if (adapterIndex !== -1 && !updatedAdapters[adapterIndex].shared) {
          try {
            // Generate topic if not exists
            if (!updatedAdapters[adapterIndex].topic) {
              updatedAdapters[adapterIndex].topic =
                ShareUtils.generateAdapterTopic();
            }

            await p2pShareService.shareAdapter(
              updatedAdapters[adapterIndex].name,
              {
                name: updatedAdapters[adapterIndex].name,
                size: 0,
                checksum: "pending",
                topic: updatedAdapters[adapterIndex].topic,
              }
            );

            updatedAdapters[adapterIndex].shared = true;
            restoredCount++;
            restoredAdapterNames.push(adapterId);
          } catch (error) {
            console.error(
              `❌ [ADAPTER-RESTORE] Failed to restore adapter: ${adapterId}`,
              error
            );
          }
        } else if (
          adapterIndex !== -1 &&
          updatedAdapters[adapterIndex].shared
        ) {
          console.log(
            `ℹ️ [ADAPTER-RESTORE] Adapter "${adapterId}" is already being shared`
          );
        } else {
          console.log(
            `⚠️ [ADAPTER-RESTORE] Adapter "${adapterId}" not found in available adapters`
          );
        }
      }

      if (restoredCount > 0) {
        setSharedAdapters(updatedAdapters);

        if (isAutoRestore) {
          console.log(
            `🎉 [ADAPTER-RESTORE] Auto-restoration successful: ${restoredCount}/${adapterIds.length} adapters restored`
          );
        }
      } else {
        console.log(`⚠️ [ADAPTER-RESTORE] No adapters were restored:`, {
          requestedAdapters: adapterIds,
          availableAdapters: currentAdapters.map((a) => a.name),
          reason: "Adapters may already be shared or not found",
        });
      }
    },
    [] // No dependencies - use ref to access current state
  );

  // SRP: Carregar adapters locais
  const loadLocalAdapters = useCallback(() => {
    console.log(
      "🔄 [ADAPTERS] loadLocalAdapters called, loading from storage..."
    );

    const trainingHistory = loadFromStorage("orch-training-history", {
      trainedModels: [] as string[],
    });

    console.log("🔄 [ADAPTERS] Training history loaded:", {
      trainedModels: trainingHistory.trainedModels,
      count: trainingHistory.trainedModels.length,
    });

    // Create new adapters while preserving existing shared state
    const adapters: SharedAdapter[] = trainingHistory.trainedModels.map(
      (modelName: string) => {
        // Check if this adapter already exists and preserve its shared state
        const existingAdapter = currentAdaptersRef.current.find(
          (adapter) => adapter.name === modelName
        );

        return {
          name: modelName,
          topic: existingAdapter?.topic || "",
          size: "Unknown", // TODO: Get actual file size from Ollama
          shared: existingAdapter?.shared || false, // Preserve existing shared state
          peers: existingAdapter?.peers || 0, // Preserve existing peers count
        };
      }
    );

    console.log("🔄 [ADAPTERS] Setting adapters with preserved shared state:", {
      adapters: adapters.map((a) => ({ name: a.name, shared: a.shared })),
      count: adapters.length,
      preservedSharedCount: adapters.filter((a) => a.shared).length,
      currentAdaptersCount: currentAdaptersRef.current.length,
      stackTrace: new Error().stack?.split("\n").slice(1, 4),
    });

    setSharedAdapters(adapters);
  }, []); // No dependencies - use ref to access current state

  // Update persistence whenever shared adapters change
  useEffect(() => {
    console.log(
      "🔄 [ADAPTERS] useEffect triggered - analyzing sharedAdapters change:",
      {
        adapterCount: sharedAdapters.length,
        adapters: sharedAdapters.map((a) => ({
          name: a.name,
          shared: a.shared,
        })),
        updateSharedAdaptersExists: !!updateSharedAdapters,
        hasInitiallyLoaded: hasInitiallyLoadedRef.current,
        stackTrace: new Error().stack?.split("\n").slice(1, 6),
      }
    );

    if (updateSharedAdapters && sharedAdapters.length > 0) {
      const sharedAdapterIds = sharedAdapters
        .filter((adapter) => adapter.shared)
        .map((adapter) => adapter.name);

      console.log("🔄 [ADAPTERS] Calling updateSharedAdapters with data:", {
        totalAdapters: sharedAdapters.length,
        sharedCount: sharedAdapterIds.length,
        sharedAdapterIds,
      });

      updateSharedAdapters(sharedAdapterIds);
    } else if (updateSharedAdapters && sharedAdapters.length === 0) {
      console.log(
        "⚠️ [ADAPTERS] sharedAdapters is EMPTY - checking if this should delete localStorage:",
        {
          adapterCount: sharedAdapters.length,
          hasInitiallyLoaded: hasInitiallyLoadedRef.current,
          shouldAllowDeletion: hasInitiallyLoadedRef.current,
          stackTrace: new Error().stack?.split("\n").slice(1, 6),
        }
      );

      if (hasInitiallyLoadedRef.current) {
        // Only allow deletion if we've previously loaded data
        console.log(
          "🔄 [ADAPTERS] Allowing updateSharedAdapters([]) because adapters were previously loaded - this is a legitimate clear"
        );
        updateSharedAdapters([]);
      } else {
        // Prevent deletion on initial mount
        console.log(
          "🚫 [ADAPTERS] PREVENTING updateSharedAdapters([]) on initial mount - this would incorrectly delete localStorage!"
        );
      }
    } else if (!updateSharedAdapters) {
      console.log("⚠️ [ADAPTERS] updateSharedAdapters function not provided");
    }
  }, [sharedAdapters, updateSharedAdapters]);

  // SRP: Toggle compartilhamento de adapter
  const toggleAdapterSharing = useCallback(
    async (index: number) => {
      const currentAdapters = currentAdaptersRef.current;
      const adapter = currentAdapters[index];
      const willBeShared = !adapter.shared;

      const updatedAdapters = [...currentAdapters];
      updatedAdapters[index].shared = willBeShared;

      if (willBeShared && !updatedAdapters[index].topic) {
        updatedAdapters[index].topic = ShareUtils.generateAdapterTopic();

        try {
          await p2pShareService.shareAdapter(updatedAdapters[index].name, {
            name: updatedAdapters[index].name,
            size: 0,
            checksum: "pending",
            topic: updatedAdapters[index].topic,
          });

          NotificationUtils.showSuccess(
            `Started sharing ${updatedAdapters[index].name}`
          );
        } catch (error) {
          console.error(
            `❌ [ADAPTERS] Error sharing adapter "${adapter.name}":`,
            error
          );
          updatedAdapters[index].shared = false;
          NotificationUtils.showError("Failed to share adapter");
        }
      } else if (!willBeShared && updatedAdapters[index].topic) {
        try {
          await p2pShareService.unshareAdapter(updatedAdapters[index].topic);

          NotificationUtils.showSuccess(
            `Stopped sharing ${updatedAdapters[index].name}`
          );
        } catch (error) {
          console.error(
            `❌ [ADAPTERS] Error unsharing adapter "${adapter.name}":`,
            error
          );
          NotificationUtils.showError("Failed to stop sharing adapter");
        }
      }

      setSharedAdapters(updatedAdapters);
    },
    [] // No dependencies - use ref to access current state
  );

  // SRP: Download adapter de peer
  const downloadAdapter = useCallback(async (adapter: IncomingAdapter) => {
    try {
      await p2pShareService.requestAdapter(adapter.topic, adapter.from);
      NotificationUtils.showSuccess(`Started downloading ${adapter.name}`);
    } catch (error) {
      console.error(
        `❌ [ADAPTERS] Error downloading adapter "${adapter.name}":`,
        error
      );
      NotificationUtils.showError("Failed to download adapter");
    }
  }, []);

  // SRP: Adicionar adapters disponíveis de peers
  const addAvailableAdapters = useCallback(
    (data: { from: string; adapters: any[] }) => {
      const newAdapters: IncomingAdapter[] = data.adapters.map((adapter) => ({
        name: adapter.name,
        topic: adapter.topic,
        size: ShareUtils.formatFileSize(adapter.size),
        from: data.from,
      }));

      setIncomingAdapters((prev) => {
        // Remove duplicates and add new ones
        const filtered = prev.filter(
          (existing) =>
            !newAdapters.some(
              (newAdapter) =>
                newAdapter.topic === existing.topic &&
                newAdapter.from === existing.from
            )
        );
        const updated = [...filtered, ...newAdapters];

        return updated;
      });
    },
    []
  );

  // SRP: Limpar adapters incoming quando desconectar
  const clearIncomingAdapters = useCallback(() => {
    setIncomingAdapters([]);
  }, []);

  return {
    sharedAdapters,
    incomingAdapters,
    loadLocalAdapters,
    toggleAdapterSharing,
    downloadAdapter,
    addAvailableAdapters,
    clearIncomingAdapters,
  };
};
