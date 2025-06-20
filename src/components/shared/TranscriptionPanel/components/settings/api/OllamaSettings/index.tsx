// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import React, { useCallback } from "react";

// Types
import { OllamaModel, OllamaSettingsProps } from "./types/ollama.types";

// Constants
import { DEFAULT_STORAGE_PATH } from "./constants/models.constants";

// Hooks
import { useModelDownload } from "./hooks/useModelDownload";
import { useModelStatus } from "./hooks/useModelStatus";
import { useOllamaModels } from "./hooks/useOllamaModels";

// Components
import { ModelRadioSelector } from "./components/ModelRadioSelector";
import { StoragePathInput } from "./components/StoragePathInput";

// Utils
import { filterModelsByCategory } from "./utils/modelUtils";

/**
 * Main OllamaSettings component
 * Acts as an orchestrator for all Ollama-related settings
 * Following Single Responsibility Principle - only orchestrates sub-components
 */
export const OllamaSettings: React.FC<OllamaSettingsProps> = ({
  ollamaModel,
  setOllamaModel,
  ollamaEmbeddingModel,
  setOllamaEmbeddingModel,
  ollamaEnabled,
  setOllamaEnabled,
  storagePath = DEFAULT_STORAGE_PATH,
  setStoragePath,
}) => {
  // Custom hooks for state management
  const {
    availableModels,
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
    mappedModels,
  } = useOllamaModels();

  const { downloadModel, cancelDownload, removeModel } = useModelDownload({
    addDownloadingModel,
    removeDownloadingModel,
    fetchInstalledModels,
    downloadingModels,
    setDownloadingModels,
    setInstalledModels,
    setError,
  });

  const { isModelLoading } = useModelStatus();

  // Model lists by category
  const mainModels = filterModelsByCategory(availableModels, "main");
  const embeddingModels = filterModelsByCategory(availableModels, "embedding");

  // Downloaded and available models
  const downloadedModels = availableModels.filter((m) => m.isDownloaded);
  const availableForDownload = availableModels.filter((m) => !m.isDownloaded);

  // Handlers for model selection
  const handleSelectMainModel = useCallback(
    async (model: OllamaModel) => {
      setOllamaModel(model.id);
      if (!ollamaEnabled) setOllamaEnabled(true);
    },
    [ollamaEnabled, setOllamaEnabled, setOllamaModel]
  );

  const handleSelectEmbeddingModel = useCallback(
    async (model: OllamaModel) => {
      setOllamaEmbeddingModel(model.id);
    },
    [setOllamaEmbeddingModel]
  );

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm">🦙</span>
          <h3 className="text-sm font-medium text-cyan-300">Ollama Models</h3>
          {isRefreshing && (
            <div className="animate-spin inline-block w-3 h-3 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full ml-2"></div>
          )}
          {downloadingModels.size > 0 && (
            <span className="text-[10px] text-yellow-400">
              ({downloadingModels.size} downloading)
            </span>
          )}
        </div>
        <button
          onClick={() => {
            console.log("[OllamaSettings] Refresh clicked");
            console.log(
              "[OllamaSettings] downloadingModels:",
              downloadingModels
            );
            console.log(
              "[OllamaSettings] downloadingModels.size:",
              downloadingModels.size
            );
            console.log("[OllamaSettings] isRefreshing:", isRefreshing);
            refreshData();
          }}
          disabled={isRefreshing || downloadingModels.size > 0}
          className="bg-cyan-600/30 hover:bg-cyan-500/40 text-cyan-300 rounded px-2 py-1 transition-colors disabled:opacity-50 text-xs"
          title={
            downloadingModels.size > 0
              ? "Wait for downloads to complete"
              : "Refresh models"
          }
        >
          <span className={`${isRefreshing ? "animate-spin" : ""}`}>🔄</span>
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded p-2">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-3 h-3 text-red-400 mr-1" />
            <div>
              <h4 className="text-red-400 font-medium text-[10px]">Erro</h4>
              <p className="text-red-400/70 text-[10px]">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Storage Path */}
      {setStoragePath && (
        <StoragePathInput value={storagePath} onChange={setStoragePath} />
      )}

      {/* Model Selection with Radio Buttons */}
      <ModelRadioSelector
        mainValue={ollamaModel}
        embeddingValue={ollamaEmbeddingModel}
        mainModels={filterModelsByCategory(mappedModels, "main")}
        embeddingModels={filterModelsByCategory(mappedModels, "embedding")}
        onMainSelect={handleSelectMainModel}
        onEmbeddingSelect={handleSelectEmbeddingModel}
        onDownload={downloadModel}
        onCancelDownload={cancelDownload}
        onRemove={removeModel}
        disabled={isLoadingModels}
        isMainLoading={isModelLoading(ollamaModel)}
        isEmbeddingLoading={isModelLoading(ollamaEmbeddingModel)}
      />
    </div>
  );
};

export default OllamaSettings;
