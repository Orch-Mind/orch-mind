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
import { ModelDropdown } from "./components/ModelDropdown";
import { ModelItem } from "./components/ModelItem";
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
      if (!model.isDownloaded && !model.isDownloading) {
        await downloadModel(model.id);
      }
    },
    [ollamaEnabled, setOllamaEnabled, setOllamaModel, downloadModel]
  );

  const handleSelectEmbeddingModel = useCallback(
    async (model: OllamaModel) => {
      setOllamaEmbeddingModel(model.id);
      if (!model.isDownloaded && !model.isDownloading) {
        await downloadModel(model.id);
      }
    },
    [setOllamaEmbeddingModel, downloadModel]
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

      {/* Model Selection Dropdowns */}
      <div className="grid grid-cols-2 gap-2">
        <ModelDropdown
          label="Main Model"
          value={ollamaModel}
          models={mainModels}
          onSelect={handleSelectMainModel}
          disabled={isLoadingModels}
          isLoading={isModelLoading(ollamaModel)}
        />
        <ModelDropdown
          label="Embedding Model"
          value={ollamaEmbeddingModel}
          models={embeddingModels}
          onSelect={handleSelectEmbeddingModel}
          disabled={isLoadingModels}
          isLoading={isModelLoading(ollamaEmbeddingModel)}
        />
      </div>

      {/* Model management section */}
      <div className="bg-black/30 border border-cyan-500/20 rounded-lg p-4 shadow-lg">
        <h3 className="text-cyan-300 font-medium text-sm mb-3">
          💎 Model Management
        </h3>

        {/* Info message when downloading */}
        {downloadingModels.size > 0 && (
          <div className="text-yellow-400 text-xs mb-2 px-2">
            ℹ️ Concurrent downloads are blocked to avoid stability issues
          </div>
        )}

        {isLoadingModels && !error ? (
          <div className="text-center py-4">
            <div className="animate-spin inline-block w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full"></div>
            <p className="text-cyan-400/60 text-xs mt-2">Loading models...</p>
          </div>
        ) : (
          <>
            {/* Model list */}
            {isLoadingModels ? (
              <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Carregando modelos...
              </div>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {mappedModels.map((model) => (
                  <ModelItem
                    key={model.id}
                    model={model}
                    onDownload={downloadModel}
                    onCancelDownload={cancelDownload}
                    onRemove={removeModel}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default OllamaSettings;
