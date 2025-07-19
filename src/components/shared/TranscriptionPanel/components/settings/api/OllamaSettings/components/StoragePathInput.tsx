// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";
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
  const handleBrowse = async () => {
    try {
      const path = await OllamaService.selectDirectory();
      if (path) {
        onChange(path);
      } else {
        // Fallback for web
        const input = document.createElement("input");
        input.type = "file";
        input.webkitdirectory = true;
        input.onchange = (e) => {
          const files = (e.target as HTMLInputElement).files;
          if (files && files.length > 0) {
            const firstFile = files[0];
            const pathParts = firstFile.webkitRelativePath.split("/");
            pathParts.pop(); // Remove filename
            const dirPath = pathParts.join("/");
            onChange(dirPath || "./orch-mind-memory");
          }
        };
        input.click();
      }
    } catch (error) {
      console.error("Error selecting directory:", error);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <span className="text-xs text-purple-400">🧠 Storage:</span>
      <input
        type="text"
        value={value}
        readOnly
        className="flex-1 bg-black/30 text-purple-300 rounded px-2 py-1 text-xs border border-purple-500/20 focus:outline-none focus:border-purple-400/50 cursor-default"
        placeholder="Storage path..."
      />
      <button
        onClick={handleBrowse}
        className="bg-blue-600/30 hover:bg-blue-500/40 text-blue-300 rounded px-2 py-1 text-xs transition-colors"
      >
        📁
      </button>
    </div>
  );
};
