// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";
import { useTranslation } from "react-i18next";
import { OllamaService } from "../services/ollamaService";

interface StoragePathInputProps {
  value: string;
  onChange: (path: string) => void;
}

/**
 * Storage path input component
 * Single Responsibility: Handle storage path selection
 */
export const StoragePathInput: React.FC<StoragePathInputProps> = ({
  value,
  onChange,
}) => {
  const { t } = useTranslation();
  const [isSelecting, setIsSelecting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleBrowse = async () => {
    try {
      setIsSelecting(true);
      setError(null);
      
      const path = await OllamaService.selectDirectory();
      
      if (path) {
        onChange(path);
        console.log(`✅ Directory selected: ${path}`);
      } else {
        console.info("ℹ️ Directory selection was canceled by user");
      }
    } catch (error) {
      console.error("❌ Error selecting directory:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      setError(`Failed to open directory browser: ${errorMessage}`);
    } finally {
      setIsSelecting(false);
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center space-x-2">
        <span className="text-xs text-purple-400">{t('api.ollama.storage')}</span>
        <input
          type="text"
          value={value}
          readOnly
          className="flex-1 bg-black/30 text-purple-300 rounded px-2 py-1 text-xs border border-purple-500/20 focus:outline-none focus:border-purple-400/50 cursor-default"
          placeholder={t('api.ollama.storagePlaceholder')}
        />
        <button
          onClick={handleBrowse}
          disabled={isSelecting}
          className="bg-blue-600/30 hover:bg-blue-500/40 text-blue-300 rounded px-2 py-1 text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSelecting ? (
            <span className="flex items-center">
              <div className="animate-spin w-3 h-3 border border-blue-300/30 border-t-blue-300 rounded-full mr-1"></div>
              {t('api.ollama.selecting')}
            </span>
          ) : (
            t('api.ollama.browse')
          )}
        </button>
      </div>
      
      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded p-1">
          <p className="text-red-400/80 text-[9px]">
            ⚠️ {error}
          </p>
        </div>
      )}
    </div>
  );
};
