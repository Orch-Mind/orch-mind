// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import {
  ArrowDownTrayIcon,
  CheckCircleIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import React from "react";
import { OllamaModel } from "../types/ollama.types";
import { DownloadProgress } from "./DownloadProgress";

interface ModelItemProps {
  model: OllamaModel;
  onDownload: (modelId: string) => void;
  onCancelDownload: (modelId: string) => void;
  onRemove: (modelId: string) => void;
}

/**
 * Individual model item component
 * Single Responsibility: Display and handle actions for a single model
 */
export const ModelItem: React.FC<ModelItemProps> = ({
  model,
  onDownload,
  onCancelDownload,
  onRemove,
}) => {
  const isDownloaded = model.isDownloaded;
  const isDownloading = model.isDownloading;
  const downloadInfo = model.downloadInfo;

  return (
    <div
      className={`${
        isDownloaded
          ? "bg-green-500/10 border-green-500/30"
          : "bg-black/30 border-cyan-500/20"
      } border rounded p-2`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          {isDownloaded && (
            <CheckCircleIcon className="w-3 h-3 text-green-400 flex-shrink-0" />
          )}
          <span
            className={`${
              isDownloaded ? "text-green-300" : "text-cyan-300"
            } text-xs break-words overflow-hidden`}
          >
            {model.name}
          </span>
          <span className="text-cyan-400/60 text-[10px] flex-shrink-0">
            {model.size}
          </span>
          {model.category === "embedding" && (
            <span className="px-1 py-0.5 bg-blue-500/20 text-blue-300 text-[9px] rounded flex-shrink-0">
              Embed
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1 flex-shrink-0">
          {isDownloaded ? (
            <button
              onClick={() => onRemove(model.id)}
              className="bg-red-600/20 hover:bg-red-500/30 text-red-400 rounded p-1 transition-colors"
              title="Remove Model"
            >
              <TrashIcon className="w-3 h-3" />
            </button>
          ) : isDownloading ? (
            <button
              onClick={() => onCancelDownload(model.id)}
              className="bg-red-600/30 hover:bg-red-500/40 text-red-300 rounded p-1 transition-colors"
              title="Cancel Download"
            >
              <XMarkIcon className="w-3 h-3" />
            </button>
          ) : (
            <button
              onClick={() => onDownload(model.id)}
              className="bg-cyan-600/30 hover:bg-cyan-500/40 text-cyan-300 rounded p-1 transition-colors"
              title="Download Model"
            >
              <ArrowDownTrayIcon className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Download progress */}
      {downloadInfo && <DownloadProgress info={downloadInfo} />}
    </div>
  );
};
