// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useCallback, useEffect, useState } from "react";
import { OllamaService } from "../services/ollamaService";
import { DownloadInfo, OllamaModel } from "../types/ollama.types";
import { MODEL_EVENTS, modelEvents } from "../utils/modelEvents";
import { getInitialModels, updateModelsWithStatus } from "../utils/modelUtils";
import { usePersistedDownloadState } from "./usePersistedDownloadState";

// Interface for detailed model info
interface OllamaModelDetails {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
  details?: any;
}

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
  const [installedModelsDetails, setInstalledModelsDetails] = useState<
    OllamaModelDetails[]
  >([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use persistent download state
  const {
    downloadingModels,
    addDownloadingModel,
    removeDownloadingModel
  } = usePersistedDownloadState();

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

      // Fetch installed models (basic list for compatibility)
      const modelsFromApi = await OllamaService.fetchInstalledModels();

      // Also fetch detailed model info through Electron API
      let detailedModels: OllamaModelDetails[] = [];
      try {
        if (window.electronAPI?.listModels) {
          const electronModels = await window.electronAPI.listModels();
          console.log(
            "📊 [useOllamaModels] Raw Electron models:",
            electronModels
          );

          detailedModels = electronModels.map((model: any) => ({
            name: model.name,
            size: model.size || 0,
            digest: model.digest || "",
            modified_at: model.modified_at || new Date().toISOString(),
            details: model.details,
          }));
        }
      } catch (error) {
        console.warn("Failed to get detailed model info:", error);
      }

      console.log(
        "📊 [useOllamaModels] Processed detailed models:",
        detailedModels
      );

      // Store detailed model information
      setInstalledModelsDetails(detailedModels);

      // Merge API results with existing state to prevent UI flicker
      // This handles the race condition where the API hasn't yet registered the new model
      setInstalledModels((prevModels) => {
        const merged = new Set([...prevModels, ...modelsFromApi]);
        return Array.from(merged);
      });
    } catch (error) {
      console.error("Error loading installed models:", error);
      setError(
        "Não foi possível conectar ao Ollama. Verifique se está rodando."
      );
      setInstalledModels([]);
      setInstalledModelsDetails([]);
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

  // Note: addDownloadingModel and removeDownloadingModel are now provided by usePersistedDownloadState

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

  // Add installed models that aren't in the static list with REAL sizes
  const dynamicModels = installedModels
    .filter((modelId) => !availableModels.find((m) => m.id === modelId))
    .map((modelId) => {
      const isEmbedding = modelId.includes("embed");

      // Find detailed info for this model
      const modelDetails = installedModelsDetails.find(
        (detail) => detail.name === modelId
      );

      // Format size from bytes to human readable
      let formattedSize = "Unknown";
      if (modelDetails && modelDetails.size > 0) {
        const sizeInGB = modelDetails.size / (1024 * 1024 * 1024);
        formattedSize = `${sizeInGB.toFixed(1)}GB`;
      }

      console.log(
        `📊 [useOllamaModels] Dynamic model ${modelId}: ${modelDetails?.size} bytes → ${formattedSize}`
      );

      return {
        id: modelId,
        name: modelId.split(":")[0], // Remove tag
        description: "Installed model",
        size: formattedSize, // ✅ Now uses REAL size!
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
    addDownloadingModel,
    removeDownloadingModel,
    refreshData,
    fetchInstalledModels,
    mappedModels: allModels,
  };
};
