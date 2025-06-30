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
      if (sharedAdapters.length === 0) {
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

      const updatedAdapters = [...sharedAdapters];
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
          availableAdapters: sharedAdapters.map((a) => a.name),
          reason: "Adapters may already be shared or not found",
        });
      }
    },
    [sharedAdapters]
  );

  // SRP: Carregar adapters locais
  const loadLocalAdapters = useCallback(() => {
    const trainingHistory = loadFromStorage("orch-training-history", {
      trainedModels: [] as string[],
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

    setSharedAdapters(adapters);
  }, []);

  // Update persistence whenever shared adapters change
  useEffect(() => {
    if (updateSharedAdapters && sharedAdapters.length > 0) {
      const sharedAdapterIds = sharedAdapters
        .filter((adapter) => adapter.shared)
        .map((adapter) => adapter.name);

      console.log("🔄 [ADAPTERS] Updating shared adapters persistence:", {
        totalAdapters: sharedAdapters.length,
        sharedCount: sharedAdapterIds.length,
        sharedAdapterIds,
      });

      updateSharedAdapters(sharedAdapterIds);
    } else if (updateSharedAdapters && sharedAdapters.length === 0) {
      console.log(
        "⚠️ [ADAPTERS] No adapters loaded yet, skipping persistence update"
      );
    } else if (!updateSharedAdapters) {
      console.log("⚠️ [ADAPTERS] updateSharedAdapters function not provided");
    }
  }, [sharedAdapters, updateSharedAdapters]);

  // SRP: Toggle compartilhamento de adapter
  const toggleAdapterSharing = useCallback(
    async (index: number) => {
      const adapter = sharedAdapters[index];
      const willBeShared = !adapter.shared;

      const updatedAdapters = [...sharedAdapters];
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
    [sharedAdapters]
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
