// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";
import { OllamaModel } from "../types/ollama.types";
import { ModelItem } from "./ModelItem";

interface ModelListProps {
  title: string;
  models: OllamaModel[];
  icon?: string;
  onDownload: (modelId: string) => void;
  onCancelDownload: (modelId: string) => void;
  onRemove: (modelId: string) => void;
  hasActiveDownloads?: boolean;
}

/**
 * List of models component
 * Single Responsibility: Display a categorized list of models
 */
export const ModelList: React.FC<ModelListProps> = ({
  title,
  models,
  icon = "📦",
  onDownload,
  onCancelDownload,
  onRemove,
  hasActiveDownloads = false,
}) => {
  if (models.length === 0) return null;

  return (
    <div>
      <h4 className="text-xs font-medium text-cyan-400 mb-1">
        {icon} {title} ({models.length})
      </h4>
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {models.map((model) => (
          <ModelItem
            key={model.id}
            model={model}
            onDownload={onDownload}
            onCancelDownload={onCancelDownload}
            onRemove={onRemove}
            hasActiveDownloads={hasActiveDownloads}
          />
        ))}
      </div>
    </div>
  );
};
