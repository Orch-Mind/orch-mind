// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React, { useCallback, useRef } from "react";
import { OllamaService } from "../services/ollamaService";
import { DownloadInfo } from "../types/ollama.types";
import { MODEL_EVENTS, modelEvents } from "../utils/modelEvents";

interface UseModelDownloadProps {
  addDownloadingModel: (modelId: string, info: DownloadInfo) => void;
  removeDownloadingModel: (modelId: string) => void;
  fetchInstalledModels: (isInitialLoad?: boolean) => Promise<void>;
  downloadingModels?: Map<string, DownloadInfo>;
  setDownloadingModels: React.Dispatch<
    React.SetStateAction<Map<string, DownloadInfo>>
  >;
  setInstalledModels: React.Dispatch<React.SetStateAction<string[]>>;
  setError?: (error: string | null) => void;
}

/**
 * Custom hook to handle model downloads
 * Single Responsibility: Manage download operations
 * Uses event-driven architecture for reactive updates
 */
export const useModelDownload = ({
  addDownloadingModel,
  removeDownloadingModel,
  fetchInstalledModels,
  downloadingModels,
  setDownloadingModels,
  setInstalledModels,
  setError,
}: UseModelDownloadProps) => {
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
    [setInstalledModels, fetchInstalledModels, setDownloadingModels]
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
        if (downloadingModels?.has(modelId)) {
          console.log(`Modelo ${modelId} já está sendo baixado`);
          return;
        }

        // NOVO: Verificar se QUALQUER modelo está sendo baixado
        // Isso previne downloads simultâneos que podem causar race conditions
        if (downloadingModels && downloadingModels.size > 0) {
          console.warn(
            `[useModelDownload] Already downloading a model. Please wait.`
          );
          setError?.("Already downloading a model. Please wait.");
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
          // Always round progress to avoid decimal issues
          const roundedProgress = Math.round(progress);

          setDownloadingModels((prev) => {
            const newMap = new Map(prev);

            // Se o progresso for 100% ou mais, considere concluído
            if (roundedProgress >= 100) {
              newMap.delete(modelId);
              handleDownloadComplete(modelId);
              return newMap;
            }

            // Update with real progress
            newMap.set(modelId, {
              progress: roundedProgress,
              speed,
              eta,
            });

            return newMap;
          });
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
            setDownloadingModels((prev) => {
              const current = prev.get(modelId);
              if (!current) return prev;

              const newProgress = Math.min(
                current.progress + Math.random() * 10,
                100
              );
              const roundedNewProgress = Math.round(newProgress);
              const newMap = new Map(prev);

              if (roundedNewProgress >= 100) {
                clearInterval(progressInterval);
                progressIntervals.current.delete(modelId);
                newMap.delete(modelId);
                // Remove from active downloads when simulation completes
                OllamaService.removeActiveDownload(modelId);
                handleDownloadComplete(modelId);
              } else {
                newMap.set(modelId, {
                  progress: roundedNewProgress,
                  speed: `${(Math.random() * 10 + 1).toFixed(1)} MB/s`,
                  eta: `${Math.ceil((100 - roundedNewProgress) / 10)} min`,
                });
              }

              return newMap;
            });
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
      setDownloadingModels,
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
      try {
        setError?.(null);
        await OllamaService.removeModel(modelId);

        // Remover explicitamente da lista de modelos instalados
        setInstalledModels((prev) => prev.filter((id) => id !== modelId));

        // Emit event instead of direct fetch
        modelEvents.emit(MODEL_EVENTS.MODEL_REMOVED);
      } catch (error) {
        console.error("Erro ao remover modelo:", error);
        setError?.(
          `Erro ao remover modelo ${modelId}: ${(error as Error).message}`
        );
      }
    },
    [setError, setInstalledModels]
  );

  return {
    downloadModel,
    cancelDownload,
    removeModel,
  };
};
