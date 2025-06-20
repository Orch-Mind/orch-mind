// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useCallback, useEffect, useState } from "react";
import { OllamaService } from "../services/ollamaService";
import { DownloadInfo, OllamaModel } from "../types/ollama.types";
import { MODEL_EVENTS, modelEvents } from "../utils/modelEvents";
import { getInitialModels, updateModelsWithStatus } from "../utils/modelUtils";

/**
 * Custom hook to manage Ollama models state
 * Single Responsibility: Manage models data and operations
 * Uses event-driven architecture for reactive updates
 */
export const useOllamaModels = () => {
  const [availableModels, setAvailableModels] = useState<OllamaModel[]>(
    getInitialModels()
  );
  const [installedModels, setInstalledModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingModels, setDownloadingModels] = useState<
    Map<string, DownloadInfo>
  >(new Map());

  // Fetch installed models
  const fetchInstalledModels = useCallback(async (isInitialLoad = false) => {
    try {
      // Só mostra loading completo no carregamento inicial
      if (isInitialLoad) {
        setIsLoadingModels(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);

      // Note: Ollama lists models as "installed" as soon as download starts
      // This is by design to support resuming interrupted downloads
      const models = await OllamaService.fetchInstalledModels();
      setInstalledModels(models);
    } catch (error) {
      console.error("Error loading installed models:", error);
      setError(
        "Não foi possível conectar ao Ollama. Verifique se está rodando."
      );
      setInstalledModels([]);
    } finally {
      if (isInitialLoad) {
        setIsLoadingModels(false);
      } else {
        setIsRefreshing(false);
      }
    }
  }, []);

  // Update models with status
  useEffect(() => {
    const updatedModels = updateModelsWithStatus(
      getInitialModels(),
      installedModels,
      downloadingModels
    );
    setAvailableModels(updatedModels);
  }, [installedModels, downloadingModels]);

  // Load data on mount
  useEffect(() => {
    fetchInstalledModels(true); // true = initial load
  }, [fetchInstalledModels]);

  // Subscribe to model events for reactive updates
  useEffect(() => {
    const unsubscribers = [
      // MODEL_DOWNLOADED is no longer emitted to avoid duplicate refreshes
      // The download completion now directly calls fetchInstalledModels
      modelEvents.on(MODEL_EVENTS.MODEL_REMOVED, () =>
        fetchInstalledModels(false)
      ),
      modelEvents.on(MODEL_EVENTS.MODELS_CHANGED, () => {
        // Prevent refresh during active downloads to avoid 99% stall issue
        if (downloadingModels.size > 0) {
          console.warn(
            "[OllamaModels] Skipping MODELS_CHANGED refresh - downloads still in progress"
          );
          return;
        }
        fetchInstalledModels(false);
      }),
    ];

    // Cleanup subscriptions
    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [fetchInstalledModels, downloadingModels]);

  // Add download info
  const addDownloadingModel = useCallback(
    (modelId: string, info: DownloadInfo) => {
      setDownloadingModels((prev) => new Map(prev).set(modelId, info));
      modelEvents.emit(MODEL_EVENTS.DOWNLOAD_STARTED);
    },
    []
  );

  // Remove download info
  const removeDownloadingModel = useCallback((modelId: string) => {
    setDownloadingModels((prev) => {
      const newMap = new Map(prev);
      newMap.delete(modelId);
      return newMap;
    });
  }, []);

  // Refresh all data
  const refreshData = useCallback(async () => {
    // Prevent refresh during active downloads
    // This avoids a known Ollama issue where concurrent API calls
    // can cause downloads to freeze at ~94-99%
    // See: https://github.com/jmorganca/ollama/issues/1736
    if (downloadingModels.size > 0) {
      console.warn("[OllamaModels] Skipping refresh - downloads in progress");
      return;
    }
    await fetchInstalledModels(false); // false = refresh mode
  }, [fetchInstalledModels, downloadingModels]);

  // Map downloading state to models
  const mappedModels = availableModels.map((model) => {
    const downloadingInfo = downloadingModels.get(model.id);
    const isDownloading = !!downloadingInfo;
    // Don't mark as installed if currently downloading
    const isDownloaded = !isDownloading && installedModels.includes(model.id);

    return {
      ...model,
      isDownloaded,
      isDownloading,
      downloadInfo: isDownloading ? downloadingInfo : undefined,
    };
  });

  // Add installed models that aren't in the static list
  const dynamicModels = installedModels
    .filter((modelId) => !availableModels.find((m) => m.id === modelId))
    .map((modelId) => {
      const isEmbedding = modelId.includes("embed");
      return {
        id: modelId,
        name: modelId.split(":")[0], // Remove tag
        description: "Installed model",
        size: "Unknown",
        category: isEmbedding ? "embedding" : "main",
        isDownloaded: true,
        isDownloading: false,
      } as OllamaModel;
    });

  // Combine static models with dynamic installed models
  const allModels = [...mappedModels, ...dynamicModels];

  return {
    availableModels: allModels,
    installedModels,
    setInstalledModels,
    isLoadingModels,
    isRefreshing,
    error,
    setError,
    downloadingModels,
    setDownloadingModels,
    addDownloadingModel,
    removeDownloadingModel,
    refreshData,
    fetchInstalledModels,
    mappedModels: allModels,
  };
};
