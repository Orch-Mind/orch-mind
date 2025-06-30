// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useCallback, useEffect, useState } from "react";
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

  // DEBUGGING: Log adapter state changes
  useEffect(() => {
    console.log("🔍 [ADAPTERS-DEBUG] Adapter state changed:", {
      totalAdapters: sharedAdapters.length,
      sharedCount: sharedAdapters.filter((a) => a.shared).length,
      sharedAdapterNames: sharedAdapters
        .filter((a) => a.shared)
        .map((a) => a.name),
      allAdapterNames: sharedAdapters.map((a) => a.name),
    });
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

      console.log(
        `🔄 [ADAPTER-RESTORE] Received restoration event (attempt ${
          retryAttempt + 1
        }):`,
        {
          sharedAdapterIds,
          isAutoRestore,
          retryAttempt,
          currentAdaptersLoaded: sharedAdapters.length > 0,
          availableAdapters: sharedAdapters.map((a) => a.name),
        }
      );

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

    console.log(
      "🔄 [ADAPTER-RESTORE] Setting up event listener for adapter restoration"
    );
    window.addEventListener("p2p-restore-adapters", handleAdapterRestoration);

    return () => {
      console.log("🧹 [ADAPTER-RESTORE] Cleaning up event listener");
      window.removeEventListener(
        "p2p-restore-adapters",
        handleAdapterRestoration
      );
    };
  }, [sharedAdapters]);

  // Function to restore shared adapters
  const restoreSharedAdapters = useCallback(
    async (adapterIds: string[], isAutoRestore: boolean, retryAttempt = 0) => {
      console.log(
        `🔄 [ADAPTER-RESTORE] Starting restoration (attempt ${
          retryAttempt + 1
        }):`,
        {
          adapterIds,
          isAutoRestore,
          currentAdaptersCount: sharedAdapters.length,
          adaptiesLoaded: sharedAdapters.length > 0,
        }
      );

      if (sharedAdapters.length === 0) {
        console.log(
          "⏳ [ADAPTER-RESTORE] Adapters not loaded yet, scheduling retry..."
        );

        // Don't retry forever - max 3 attempts
        if (retryAttempt < 2) {
          setTimeout(() => {
            console.log(
              `🔄 [ADAPTER-RESTORE] Retrying restoration (attempt ${
                retryAttempt + 2
              })...`
            );
            window.dispatchEvent(
              new CustomEvent("p2p-restore-adapters", {
                detail: {
                  sharedAdapterIds: adapterIds,
                  isAutoRestore,
                  retryAttempt: retryAttempt + 1,
                },
              })
            );
          }, 1000 * (retryAttempt + 1)); // Increasing delay: 1s, 2s, 3s
        } else {
          console.log(
            "❌ [ADAPTER-RESTORE] Max retry attempts reached, adapters still not loaded"
          );
        }
        return;
      }

      console.log(
        `🔄 [ADAPTER-RESTORE] Processing restoration for ${adapterIds.length} adapters...`
      );
      console.log(
        `🔄 [ADAPTER-RESTORE] Available adapters:`,
        sharedAdapters.map((a) => a.name)
      );
      console.log(`🔄 [ADAPTER-RESTORE] Adapters to restore:`, adapterIds);

      const updatedAdapters = [...sharedAdapters];
      let restoredCount = 0;
      const restoredAdapterNames: string[] = [];

      for (const adapterId of adapterIds) {
        const adapterIndex = updatedAdapters.findIndex(
          (adapter) => adapter.name === adapterId
        );

        console.log(
          `🔍 [ADAPTER-RESTORE] Looking for adapter "${adapterId}":`,
          {
            found: adapterIndex !== -1,
            currentlyShared:
              adapterIndex !== -1
                ? updatedAdapters[adapterIndex].shared
                : "N/A",
          }
        );

        if (adapterIndex !== -1 && !updatedAdapters[adapterIndex].shared) {
          try {
            // Generate topic if not exists
            if (!updatedAdapters[adapterIndex].topic) {
              updatedAdapters[adapterIndex].topic =
                ShareUtils.generateAdapterTopic();
              console.log(
                `🔧 [ADAPTER-RESTORE] Generated topic for "${adapterId}": ${updatedAdapters[adapterIndex].topic}`
              );
            }

            console.log(
              `🔄 [ADAPTER-RESTORE] Sharing adapter "${adapterId}" via P2P...`
            );

            // Actually share the adapter via P2P
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

            console.log(
              `✅ [ADAPTER-RESTORE] Successfully restored sharing for adapter: ${adapterId}`
            );
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
        console.log(`✅ [ADAPTER-RESTORE] Restoration completed:`, {
          restoredCount,
          totalRequested: adapterIds.length,
          restoredAdapters: restoredAdapterNames,
        });

        setSharedAdapters(updatedAdapters);

        if (isAutoRestore) {
          console.log(
            `🎉 [ADAPTER-RESTORE] Auto-restoration successful: ${restoredCount}/${adapterIds.length} adapters restored`
          );
        }
      } else {
        console.log(`⚠️ [ADAPTER-RESTORE] No adapters were restored:`, {
          requestedAdapters: adapterIds,
          availableAdapters: sharedAdapters.map((a) => a.name),
          reason: "Adapters may already be shared or not found",
        });
      }
    },
    [sharedAdapters]
  );

  // SRP: Carregar adapters locais
  const loadLocalAdapters = useCallback(() => {
    console.log("📂 [ADAPTERS] Loading local adapters from storage...");

    const trainingHistory = loadFromStorage("orch-training-history", {
      trainedModels: [] as string[],
    });

    console.log("📂 [ADAPTERS] Training history loaded:", {
      totalModels: trainingHistory.trainedModels.length,
      modelNames: trainingHistory.trainedModels,
    });

    const adapters: SharedAdapter[] = trainingHistory.trainedModels.map(
      (modelName: string) => ({
        name: modelName,
        topic: "",
        size: "Unknown", // TODO: Get actual file size from Ollama
        shared: false,
        peers: 0,
      })
    );

    console.log("✅ [ADAPTERS] Local adapters loaded:", {
      count: adapters.length,
      adapterNames: adapters.map((a) => a.name),
    });

    setSharedAdapters(adapters);
  }, []);

  // Update persistence whenever shared adapters change
  useEffect(() => {
    if (updateSharedAdapters && sharedAdapters.length > 0) {
      const sharedAdapterIds = sharedAdapters
        .filter((adapter) => adapter.shared)
        .map((adapter) => adapter.name);

      console.log(
        "💾 [ADAPTERS-PERSISTENCE] Updating shared adapters in persistence:",
        {
          sharedCount: sharedAdapterIds.length,
          sharedAdapterIds,
        }
      );

      updateSharedAdapters(sharedAdapterIds);
    }
  }, [sharedAdapters, updateSharedAdapters]);

  // SRP: Toggle compartilhamento de adapter
  const toggleAdapterSharing = useCallback(
    async (index: number) => {
      const adapter = sharedAdapters[index];
      const willBeShared = !adapter.shared;

      console.log(`🔄 [ADAPTERS] Toggling sharing for "${adapter.name}":`, {
        currentlyShared: adapter.shared,
        willBeShared,
        adapterIndex: index,
      });

      const updatedAdapters = [...sharedAdapters];
      updatedAdapters[index].shared = willBeShared;

      if (willBeShared && !updatedAdapters[index].topic) {
        updatedAdapters[index].topic = ShareUtils.generateAdapterTopic();
        console.log(
          `🔧 [ADAPTERS] Generated topic for "${adapter.name}": ${updatedAdapters[index].topic}`
        );

        try {
          console.log(
            `🔄 [ADAPTERS] Starting to share adapter "${adapter.name}"...`
          );

          await p2pShareService.shareAdapter(updatedAdapters[index].name, {
            name: updatedAdapters[index].name,
            size: 0,
            checksum: "pending",
            topic: updatedAdapters[index].topic,
          });

          console.log(
            `✅ [ADAPTERS] Successfully started sharing "${adapter.name}"`
          );

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
          console.log(
            `🔄 [ADAPTERS] Stopping sharing for adapter "${adapter.name}"...`
          );

          await p2pShareService.unshareAdapter(updatedAdapters[index].topic);

          console.log(
            `✅ [ADAPTERS] Successfully stopped sharing "${adapter.name}"`
          );

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
    [sharedAdapters]
  );

  // SRP: Download adapter de peer
  const downloadAdapter = useCallback(async (adapter: IncomingAdapter) => {
    console.log(
      `📥 [ADAPTERS] Starting download for adapter "${adapter.name}":`,
      {
        from: adapter.from,
        topic: adapter.topic,
        size: adapter.size,
      }
    );

    try {
      await p2pShareService.requestAdapter(adapter.topic, adapter.from);
      console.log(`✅ [ADAPTERS] Download request sent for "${adapter.name}"`);
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
      console.log(`📡 [ADAPTERS] Received available adapters from peer:`, {
        from: data.from,
        adapterCount: data.adapters.length,
        adapterNames: data.adapters.map((a) => a.name),
      });

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

        console.log(`✅ [ADAPTERS] Updated available adapters:`, {
          previousCount: prev.length,
          newCount: updated.length,
          addedAdapters: newAdapters.map((a) => a.name),
        });

        return updated;
      });
    },
    []
  );

  // SRP: Limpar adapters incoming quando desconectar
  const clearIncomingAdapters = useCallback(() => {
    console.log("🧹 [ADAPTERS] Clearing incoming adapters");
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
