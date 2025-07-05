// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import {
  CheckCircleIcon,
  CloudArrowDownIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import React from "react";
import { OllamaModel } from "../types/ollama.types";

interface ModelRadioSelectorProps {
  mainValue: string;
  embeddingValue: string;
  mainModels: OllamaModel[];
  embeddingModels: OllamaModel[];
  onMainSelect: (model: OllamaModel) => void;
  onEmbeddingSelect: (model: OllamaModel) => void;
  onDownload: (modelId: string) => Promise<void>;
  onCancelDownload: (modelId: string) => void;
  onRemove: (modelId: string) => Promise<void>;
  disabled?: boolean;
  isMainLoading?: boolean;
  isEmbeddingLoading?: boolean;
  hasActiveDownloads?: boolean;
}

/**
 * Two-column radio button selector for model selection with integrated management
 * Provides model download, removal, and selection in a unified interface
 */
export const ModelRadioSelector: React.FC<ModelRadioSelectorProps> = ({
  mainValue,
  embeddingValue,
  mainModels,
  embeddingModels,
  onMainSelect,
  onEmbeddingSelect,
  onDownload,
  onCancelDownload,
  onRemove,
  disabled = false,
  isMainLoading = false,
  isEmbeddingLoading = false,
  hasActiveDownloads = false,
}) => {
  const renderModelOption = (
    model: OllamaModel,
    isSelected: boolean,
    onSelect: (model: OllamaModel) => void,
    name: string
  ) => {
    const handleAction = async (
      e: React.MouseEvent,
      action: () => void | Promise<void>
    ) => {
      e.stopPropagation();
      e.preventDefault();
      await action();
    };

    const renderActionButton = () => {
      if (model.isDownloading) {
        return (
          <button
            onClick={(e) => handleAction(e, () => onCancelDownload(model.id))}
            className="p-1.5 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
            title="Cancel download"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        );
      }

      if (model.isDownloaded) {
        const isDisabled = hasActiveDownloads && !model.isDownloading;
        return (
          <button
            onClick={(e) =>
              !isDisabled && handleAction(e, () => onRemove(model.id))
            }
            disabled={isDisabled}
            className={`p-1.5 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors ${
              isDisabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
            title={
              isDisabled
                ? "Wait for active downloads to complete"
                : "Remove model"
            }
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        );
      }

      const isDisabled = hasActiveDownloads;
      return (
        <button
          onClick={(e) =>
            !isDisabled && handleAction(e, () => onDownload(model.id))
          }
          disabled={isDisabled}
          className={`p-1.5 rounded-md bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 transition-colors ${
            isDisabled ? "opacity-50 cursor-not-allowed" : ""
          }`}
          title={
            isDisabled
              ? "Wait for active downloads to complete"
              : "Download model"
          }
        >
          <CloudArrowDownIcon className="w-4 h-4" />
        </button>
      );
    };

    const statusIcon = model.isDownloaded ? (
      <CheckCircleIcon className="w-4 h-4 text-green-400" />
    ) : model.isDownloading ? (
      <div className="animate-spin w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full" />
    ) : null;

    const statusText = model.isDownloaded
      ? "Installed"
      : model.isDownloading
      ? `Downloading ${(model.downloadInfo?.progress || 0).toFixed(1)}%`
      : "Available";

    return (
      <label
        key={model.id}
        title={
          !model.isDownloaded && !model.isDownloading
            ? "This model must be downloaded before it can be selected"
            : ""
        }
        className={`
          flex items-start p-3 rounded-lg transition-all group
          ${
            isSelected
              ? "bg-cyan-500/20 border-cyan-400"
              : model.isDownloaded
              ? "bg-black/30 border-cyan-500/20 hover:bg-cyan-500/10 cursor-pointer"
              : "bg-black/20 border-gray-500/20 cursor-not-allowed opacity-75"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          border relative
        `}
      >
        <input
          type="radio"
          name={name}
          value={model.id}
          checked={isSelected}
          onChange={() => !disabled && model.isDownloaded && onSelect(model)}
          disabled={disabled || !model.isDownloaded}
          className="mt-1 w-4 h-4 text-cyan-400 bg-gray-800 border-cyan-500 focus:outline-none focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <div className="ml-3 flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div
                  className={`font-medium text-sm break-words overflow-hidden ${
                    model.isDownloaded ? "text-white/90" : "text-gray-400"
                  }`}
                >
                  {model.name}
                </div>
                {statusIcon}
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span
                  className={`text-xs ${
                    model.isDownloaded ? "text-cyan-400/60" : "text-gray-400/60"
                  }`}
                >
                  {model.size}
                </span>
                <span className="text-cyan-400/40">•</span>
                <span
                  className={`text-xs ${
                    model.isDownloaded
                      ? "text-green-400"
                      : model.isDownloading
                      ? "text-yellow-400"
                      : "text-gray-400"
                  }`}
                >
                  {statusText}
                </span>
                {!model.isDownloaded && !model.isDownloading && (
                  <>
                    <span className="text-gray-400/40">•</span>
                    <span className="text-xs text-orange-400">
                      Download required
                    </span>
                  </>
                )}
              </div>
              {model.isDownloading && model.downloadInfo && (
                <div className="mt-2">
                  <div className="bg-cyan-500/10 rounded-full h-1.5 w-full">
                    <div
                      className="bg-cyan-400 h-1.5 rounded-full transition-all"
                      style={{ width: `${model.downloadInfo.progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-cyan-400/60 mt-1">
                    <span>{model.downloadInfo.speed}</span>
                    <span>{model.downloadInfo.eta}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex-shrink-0 ml-2">{renderActionButton()}</div>
          </div>
        </div>
      </label>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-cyan-400">
        <span>💎</span>
        <h3 className="font-medium">Model Selection & Management</h3>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Main Model Column */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-cyan-300">
              Main Model
              {isMainLoading && (
                <span className="ml-2 animate-spin inline-block">🔄</span>
              )}
            </h4>
            {mainValue && (
              <span className="text-xs text-cyan-400/60 truncate max-w-[150px]">
                {mainValue}
              </span>
            )}
          </div>

          {mainModels.length === 0 ? (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <ExclamationTriangleIcon className="w-4 h-4 text-red-400" />
                <p className="text-red-400 text-xs">
                  No main models available. Please check Ollama installation.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-cyan-500/30 scrollbar-track-transparent">
              {mainModels.map((model) =>
                renderModelOption(
                  model,
                  mainValue === model.id,
                  onMainSelect,
                  "main-model"
                )
              )}
            </div>
          )}
        </div>

        {/* Embedding Model Column */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-cyan-300">
              Embedding Model
              {isEmbeddingLoading && (
                <span className="ml-2 animate-spin inline-block">🔄</span>
              )}
            </h4>
            {embeddingValue && (
              <span className="text-xs text-cyan-400/60 truncate max-w-[150px]">
                {embeddingValue}
              </span>
            )}
          </div>

          {embeddingModels.length === 0 ? (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <ExclamationTriangleIcon className="w-4 h-4 text-red-400" />
                <p className="text-red-400 text-xs">
                  No embedding models available. Please check Ollama
                  installation.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-cyan-500/30 scrollbar-track-transparent">
              {embeddingModels.map((model) =>
                renderModelOption(
                  model,
                  embeddingValue === model.id,
                  onEmbeddingSelect,
                  "embedding-model"
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-3">
        <p className="text-xs text-cyan-300">
          <strong>Info:</strong> Only installed models can be selected. Use the
          download button (<CloudArrowDownIcon className="w-3 h-3 inline" />) to
          install a model before selecting it. You can remove installed models
          with the trash button (<TrashIcon className="w-3 h-3 inline" />
          ).
        </p>
      </div>
    </div>
  );
};
