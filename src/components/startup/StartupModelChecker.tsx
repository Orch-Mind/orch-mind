// SPDX-License-Identifier: MIT OR Apache-2.0
/*
  StartupModelChecker.tsx
  --------------------------------------------------
  Automatically verifies that the user has the required Ollama models
  (main LLM + embedding LLM) installed every time the renderer boots.
  If the model is missing it triggers the download and renders a global
  progress bar identical to the one used inside the Advanced ▸ API ▸ Ollama
  settings panel.

  This component is completely self-contained and does **not** rely on the
  heavier settings hooks (useOllamaModels / useModelDownload) to avoid
  pulling unnecessary UI state when the settings panel is closed.
*/

import React, { useEffect, useRef, useState } from "react";
import { OllamaService } from "../shared/TranscriptionPanel/components/settings/api/OllamaSettings/services/ollamaService";
import { setOption } from "../../services/StorageService";
import {
  DownloadInfo,
} from "../shared/TranscriptionPanel/components/settings/api/OllamaSettings/types/ollama.types";
import { DownloadProgress } from "../shared/TranscriptionPanel/components/settings/api/OllamaSettings/components/DownloadProgress";
import {
  getOption,
  STORAGE_KEYS,
} from "../../services/StorageService";

// Helpers ---------------------------------------------------------------------
const DEFAULT_MAIN_MODEL = "gemma3:latest";
const DEFAULT_EMBED_MODEL = "bge-m3:latest";

function getRequiredModels(): string[] {
  const mainModel =
    (getOption<string>(STORAGE_KEYS.OLLAMA_MODEL) as string) ||
    DEFAULT_MAIN_MODEL;
  const embeddingModel =
    (getOption<string>(STORAGE_KEYS.OLLAMA_EMBEDDING_MODEL) as string) ||
    DEFAULT_EMBED_MODEL;

  // Prevent duplicates in case user selected the same model for both roles
  return Array.from(new Set([mainModel, embeddingModel]));
}

export const StartupModelChecker: React.FC = () => {
  const [downloads, setDownloads] = useState<Map<string, DownloadInfo>>(new Map());
  const [initialized, setInitialized] = useState(false);
  // Prevent unmounted-state updates
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Main effect – runs once at boot
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const verifyAndDownload = async () => {
      try {
        const installed = await OllamaService.fetchInstalledModels();
        const required = getRequiredModels();
        const missing = required.filter((model) => !installed.includes(model));

        if (missing.length === 0) {
          // Ensure stored options reflect installed models
          const [mainModel, embedModel] = required;
          setOption(STORAGE_KEYS.OLLAMA_MODEL, mainModel);
          setOption(STORAGE_KEYS.OLLAMA_EMBEDDING_MODEL, embedModel);

          if (mountedRef.current) setInitialized(true);
          return;
        }

        // Sequentially download missing models to avoid Ollama race conditions
        for (const modelId of missing) {
          await downloadWithProgress(modelId);
        }

        // Persist model selections now that downloads are complete
        const [mainModel, embedModel] = required;
        setOption(STORAGE_KEYS.OLLAMA_MODEL, mainModel);
        setOption(STORAGE_KEYS.OLLAMA_EMBEDDING_MODEL, embedModel);

        if (mountedRef.current) setInitialized(true);
      } catch (error) {
        console.error("[StartupModelChecker] Error verifying Ollama models:", error);
        if (mountedRef.current) setInitialized(true); // allow app to continue
      }
    };

    verifyAndDownload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------
  const updateDownloadInfo = (modelId: string, info: Partial<DownloadInfo>) => {
    setDownloads((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(modelId) || {
        progress: 0,
        speed: "Starting...",
        eta: "Preparing download...",
      };
      newMap.set(modelId, { ...current, ...info });
      return newMap;
    });
  };

  const downloadWithProgress = async (modelId: string): Promise<void> => {
    return new Promise(async (resolve) => {
      // Control flag to prevent multiple finalization paths
      let isCompleted = false;
      let pollInterval: NodeJS.Timeout | null = null;

      // Helper function for safe completion - prevents race conditions
      const completeDownload = () => {
        if (isCompleted) return; // Already completed, prevent duplicate execution
        isCompleted = true;
        
        // Clear polling if active
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
        
        // Mark as completed and remove after delay
        updateDownloadInfo(modelId, { progress: 100, speed: "", eta: "Done" });
        setTimeout(() => {
          setDownloads((prev) => {
            const newMap = new Map(prev);
            newMap.delete(modelId);
            return newMap;
          });
          resolve();
        }, 750); // small delay so user can see 100%
      };

      // Initialise state for this model and avoid flicker by pre-setting map with this entry
      // PRESERVE existing downloads instead of replacing the entire Map
      setDownloads((prev) => {
        const newMap = new Map(prev);
        newMap.set(modelId, { progress: 0, speed: "Starting...", eta: "Preparing download..." });
        return newMap;
      });

      // Real progress via Electron API
      const success = await OllamaService.downloadModel(
        modelId,
        (progress, speed, eta) => {
          if (isCompleted) return; // Don't update if already completed
          
          updateDownloadInfo(modelId, { progress, speed, eta });
          if (progress >= 100) {
            completeDownload(); // Use centralized completion logic
          }
        }
      );

      if (success) return; // electron API will call resolve via callback

      // Fallback polling - only if not already completed
      if (!isCompleted) {
        pollInterval = setInterval(async () => {
          if (isCompleted) return; // Check again in case it completed while polling
          
          try {
            const installed = await OllamaService.fetchInstalledModels();
            if (installed.includes(modelId)) {
              completeDownload(); // Use centralized completion logic
            }
          } catch (err) {
            console.warn(`[StartupModelChecker] Polling error for ${modelId}:`, err);
          }
        }, 5000);
      }
    });
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  // Show overlay only while there are active downloads
  if (downloads.size === 0) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-auto px-4">
      <div className="w-full max-w-sm mx-auto space-y-4 bg-gray-800/90 rounded-xl p-6 border border-gray-700 shadow-lg pointer-events-auto">
        <h4 className="text-sm font-medium text-gray-100 flex items-center gap-2">
          <span>Downloading required models…</span>
        </h4>
        {Array.from(downloads.entries()).map(([id, info]) => (
          <div key={id} className="space-y-1">
            <span className="text-xs text-gray-300">{id}</span>
            <DownloadProgress info={info} />
          </div>
        ))}
      </div>
    </div>
  );
};
