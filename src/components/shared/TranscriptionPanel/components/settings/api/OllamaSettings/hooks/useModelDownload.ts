// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React, { useCallback, useRef } from "react";
import { OllamaService } from "../services/ollamaService";
import { DownloadInfo } from "../types/ollama.types";
import { MODEL_EVENTS, modelEvents } from "../utils/modelEvents";
import { usePersistedDownloadState } from "./usePersistedDownloadState";
import { getDefaultModelsForAutoSelection, isProtectedModel } from "../constants/protectedModels.constants";

interface UseModelDownloadProps {
  fetchInstalledModels: (isInitialLoad?: boolean) => Promise<void>;
  setInstalledModels: React.Dispatch<React.SetStateAction<string[]>>;
  setError?: (error: string | null) => void;
  // Current selected models for auto-selection logic
  currentMainModel?: string;
  currentEmbeddingModel?: string;
  // Callbacks to update selected models
  onMainModelChange?: (modelId: string) => void;
  onEmbeddingModelChange?: (modelId: string) => void;
}

/**
 * Custom hook to handle model downloads
 * Single Responsibility: Manage download operations
 * Uses event-driven architecture for reactive updates
 */
export const useModelDownload = ({
  fetchInstalledModels,
  setInstalledModels,
  setError,
  currentMainModel,
  currentEmbeddingModel,
  onMainModelChange,
  onEmbeddingModelChange,
}: UseModelDownloadProps) => {
  // Use persistent download state hook
  const {
    downloadingModels,
    addDownloadingModel,
    removeDownloadingModel,
    updateDownloadProgress,
    hasDownloadingModel
  } = usePersistedDownloadState();
  // Keep track of progress intervals for cancellation
  const progressIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Handle download completion
  const handleDownloadComplete = useCallback(
    (modelId: string) => {
      // Add to installed models for optimistic UI update
      setInstalledModels((prev) => {
        if (!prev.includes(modelId)) {
          return [...prev, modelId];
        }
        return prev;
      });

      // Emit an event to signal completion without forcing a premature refresh
      modelEvents.emit(MODEL_EVENTS.DOWNLOAD_COMPLETED);

      // Refresh the model list after a slightly longer delay to ensure the API has updated.
      // This prevents the UI from reverting to a "not downloaded" state.
      setTimeout(() => {
        console.log(
          `[useModelDownload] Scheduling post-download refresh for ${modelId}`
        );
        fetchInstalledModels(false);
      }, 2500); // Increased delay to 2.5s for stability
    },
    [setInstalledModels, fetchInstalledModels]
  );

  // Handle download error
  const handleDownloadError = useCallback(
    (modelId: string, error: string) => {
      setError?.(error);
      modelEvents.emit(MODEL_EVENTS.DOWNLOAD_FAILED);
    },
    [setError]
  );

  const downloadModel = useCallback(
    async (modelId: string) => {
      try {
        // Clear any previous errors
        setError?.(null);

        // Verificar se já está baixando
        if (hasDownloadingModel(modelId)) {
          console.log(`Modelo ${modelId} já está sendo baixado`);
          return;
        }

        // NOVO: Verificar se QUALQUER modelo está sendo baixado
        // Isso previne downloads simultâneos que podem causar race conditions
        if (downloadingModels.size > 0) {
          const downloadingModel = Array.from(downloadingModels.keys())[0];
          console.warn(
            `[useModelDownload] Cannot start download of ${modelId}. Model ${downloadingModel} is currently downloading.`
          );
          setError?.(
            `Cannot start download. Please wait for "${downloadingModel}" to finish downloading first.`
          );
          return;
        }

        // Iniciar download
        console.log(`[useModelDownload] Starting download for ${modelId}`);
        console.log(
          `[useModelDownload] downloadingModels before:`,
          downloadingModels
        );

        addDownloadingModel(modelId, {
          progress: 0,
          speed: "Starting...",
          eta: "Preparing download...",
        });

        console.log(`[useModelDownload] addDownloadingModel called`);

        // Progress callback for real-time updates
        const progressCallback = (
          progress: number,
          speed: string,
          eta: string
        ) => {
          console.log(
            `[Download] Progress update for ${modelId}: ${progress}% (${speed}, ETA: ${eta})`
          );

          // Update persistent download progress
          updateDownloadProgress(modelId, Math.round(progress), speed, eta);

          // Complete download when reaching 100%
          if (progress >= 100) {
            console.log(
              `[Download] Download completed for ${modelId} via real progress`
            );
            removeDownloadingModel(modelId);
            // Remove from active downloads when real progress completes
            OllamaService.removeActiveDownload(modelId);
            handleDownloadComplete(modelId);
          }
        };

        const success = await OllamaService.downloadModel(
          modelId,
          progressCallback
        );

        if (success) {
          // Using Electron API with real progress
          console.log(
            `[Download] Download completed via Electron API: ${modelId}`
          );
          // Progress callback will handle completion
        } else {
          // Fallback to simulation only if real progress not available
          console.log(`[Download] Using simulation for ${modelId}`);

          // Clear any previous interval for this model
          const existingInterval = progressIntervals.current.get(modelId);
          if (existingInterval) {
            clearInterval(existingInterval);
            progressIntervals.current.delete(modelId);
          }

          // Simular progresso enquanto baixa (fallback)
          const progressInterval = setInterval(() => {
            const current = downloadingModels.get(modelId);
            if (!current) {
              clearInterval(progressInterval);
              progressIntervals.current.delete(modelId);
              return;
            }

            const newProgress = Math.min(
              current.progress + Math.random() * 10,
              100
            );
            const roundedNewProgress = Math.round(newProgress);

            if (roundedNewProgress >= 100) {
              clearInterval(progressInterval);
              progressIntervals.current.delete(modelId);
              removeDownloadingModel(modelId);
              // Remove from active downloads when simulation completes
              OllamaService.removeActiveDownload(modelId);
              handleDownloadComplete(modelId);
            } else {
              updateDownloadProgress(
                modelId,
                roundedNewProgress,
                `${(Math.random() * 10 + 1).toFixed(1)} MB/s`,
                `${Math.ceil((100 - roundedNewProgress) / 10)} min`
              );
            }
          }, 1000);

          // Store interval reference for cancellation
          progressIntervals.current.set(modelId, progressInterval);
        }
      } catch (error) {
        console.error("Erro ao baixar modelo:", error);

        // Clear any running interval
        const interval = progressIntervals.current.get(modelId);
        if (interval) {
          clearInterval(interval);
          progressIntervals.current.delete(modelId);
        }

        removeDownloadingModel(modelId);
        // Remove from active downloads on error
        OllamaService.removeActiveDownload(modelId);
        modelEvents.emit(MODEL_EVENTS.DOWNLOAD_FAILED);
        setError?.(
          `Erro ao baixar modelo ${modelId}: ${(error as Error).message}`
        );
      }
    },
    [
      addDownloadingModel,
      removeDownloadingModel,
      downloadingModels,
      updateDownloadProgress,
      hasDownloadingModel,
      setInstalledModels,
      setError,
      handleDownloadComplete,
      fetchInstalledModels,
    ]
  );

  const cancelDownload = useCallback(
    (modelId: string) => {
      // Clear interval if exists
      const interval = progressIntervals.current.get(modelId);
      if (interval) {
        clearInterval(interval);
        progressIntervals.current.delete(modelId);
      }

      removeDownloadingModel(modelId);
      // Remove from active downloads when cancelled
      OllamaService.removeActiveDownload(modelId);
    },
    [removeDownloadingModel]
  );

  const removeModel = useCallback(
    async (modelId: string) => {
      // Check if trying to remove a protected model (should not happen due to UI, but safety check)
      if (isProtectedModel(modelId)) {
        console.warn(`[useModelDownload] Attempted to remove protected model: ${modelId}`);
        setError?.(`Cannot remove protected model: ${modelId}`);
        return;
      }

      try {
        setError?.(null);
        
        // Check if the model being removed is currently selected
        const isMainModelSelected = currentMainModel === modelId;
        const isEmbeddingModelSelected = currentEmbeddingModel === modelId;
        
        await OllamaService.removeModel(modelId);

        // Remover explicitamente da lista de modelos instalados
        setInstalledModels((prev) => prev.filter((id) => id !== modelId));

        // Auto-select protected models if the removed model was selected
        if (isMainModelSelected || isEmbeddingModelSelected) {
          const defaultModels = getDefaultModelsForAutoSelection();
          
          if (isMainModelSelected && onMainModelChange) {
            console.log(`[useModelDownload] Auto-selecting main model: ${defaultModels.mainModel}`);
            onMainModelChange(defaultModels.mainModel);
          }
          
          if (isEmbeddingModelSelected && onEmbeddingModelChange) {
            console.log(`[useModelDownload] Auto-selecting embedding model: ${defaultModels.embeddingModel}`);
            onEmbeddingModelChange(defaultModels.embeddingModel);
          }
        }

        // Emit event instead of direct fetch
        modelEvents.emit(MODEL_EVENTS.MODEL_REMOVED);
      } catch (error) {
        console.error("Erro ao remover modelo:", error);
        setError?.(
          `Erro ao remover modelo ${modelId}: ${(error as Error).message}`
        );
      }
    },
    [setError, setInstalledModels, currentMainModel, currentEmbeddingModel, onMainModelChange, onEmbeddingModelChange]
  );

  return {
    downloadModel,
    cancelDownload,
    removeModel,
  };
};
