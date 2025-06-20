// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { AVAILABLE_MODELS } from "../constants/models.constants";
import { DownloadInfo, OllamaModel } from "../types/ollama.types";

/**
 * Filter models by category
 */
export const filterModelsByCategory = (
  models: OllamaModel[],
  category: "main" | "embedding"
): OllamaModel[] => {
  return models.filter((m) => m.category === category);
};

/**
 * Get model display name
 */
export const getModelDisplayName = (
  modelId: string,
  models: OllamaModel[]
): string => {
  const model = models.find((m) => m.id === modelId);
  return model
    ? `${model.name} (${model.size})`
    : modelId || "Selecione um modelo...";
};

/**
 * Update models with download status
 */
export const updateModelsWithStatus = (
  models: OllamaModel[],
  installedModels: string[],
  downloadingModels: Map<string, DownloadInfo>
): OllamaModel[] => {
  return models.map((model) => {
    const downloadInfo = downloadingModels.get(model.id);
    return {
      ...model,
      isDownloaded: installedModels.includes(model.id),
      isDownloading: downloadingModels.has(model.id),
      downloadProgress: downloadInfo?.progress || 0,
      downloadSpeed: downloadInfo?.speed || "",
      downloadETA: downloadInfo?.eta || "",
    };
  });
};

/**
 * Simulate download progress (for fallback when streaming not available)
 */
export const simulateDownloadProgress = (
  currentProgress: number
): { progress: number; speed: string; eta: string } => {
  const increment = Math.random() * 10; // 0-10% increment
  const newProgress = Math.min(currentProgress + increment, 100);
  // Round to 1 decimal place to avoid showing too many decimals like 42.0142188408348%
  const roundedProgress = Math.round(newProgress * 10) / 10;
  const speed = `${(Math.random() * 10 + 1).toFixed(1)} MB/s`;

  // Calculate ETA based on average speed (assuming ~5% per second)
  const remainingProgress = 100 - roundedProgress;
  const estimatedSecondsRemaining = remainingProgress / 5;
  const eta =
    estimatedSecondsRemaining > 60
      ? `${Math.ceil(estimatedSecondsRemaining / 60)} min`
      : `${Math.ceil(estimatedSecondsRemaining)} seg`;

  return { progress: roundedProgress, speed, eta };
};

/**
 * Get initial models list
 */
export const getInitialModels = (): OllamaModel[] => {
  return [...AVAILABLE_MODELS];
};
