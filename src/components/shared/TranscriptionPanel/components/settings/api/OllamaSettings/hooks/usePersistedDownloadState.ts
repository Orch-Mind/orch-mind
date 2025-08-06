// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useEffect, useState, useCallback } from "react";
import { DownloadInfo } from "../types/ollama.types";

// Global store for persistent download state
class DownloadStateStore {
  private static instance: DownloadStateStore;
  private downloadingModels: Map<string, DownloadInfo> = new Map();
  private listeners: Set<(models: Map<string, DownloadInfo>) => void> = new Set();

  static getInstance(): DownloadStateStore {
    if (!DownloadStateStore.instance) {
      DownloadStateStore.instance = new DownloadStateStore();
    }
    return DownloadStateStore.instance;
  }

  getDownloadingModels(): Map<string, DownloadInfo> {
    return new Map(this.downloadingModels);
  }

  setDownloadingModel(modelId: string, info: DownloadInfo): void {
    this.downloadingModels.set(modelId, info);
    this.notifyListeners();
  }

  removeDownloadingModel(modelId: string): void {
    this.downloadingModels.delete(modelId);
    this.notifyListeners();
  }

  clearAllDownloads(): void {
    this.downloadingModels.clear();
    this.notifyListeners();
  }

  hasDownloadingModel(modelId: string): boolean {
    return this.downloadingModels.has(modelId);
  }

  getDownloadingModel(modelId: string): DownloadInfo | undefined {
    return this.downloadingModels.get(modelId);
  }

  subscribe(listener: (models: Map<string, DownloadInfo>) => void): () => void {
    this.listeners.add(listener);
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const currentState = this.getDownloadingModels();
    this.listeners.forEach(listener => listener(currentState));
  }
}

/**
 * Hook para gerenciar estado persistente de downloads
 * Mantém o estado mesmo quando o componente é desmontado (troca de abas)
 */
export const usePersistedDownloadState = () => {
  const store = DownloadStateStore.getInstance();
  const [downloadingModels, setDownloadingModels] = useState<Map<string, DownloadInfo>>(
    store.getDownloadingModels()
  );

  useEffect(() => {
    // Subscribe to store changes
    const unsubscribe = store.subscribe((models) => {
      setDownloadingModels(models);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, [store]);

  const addDownloadingModel = useCallback((modelId: string, info: DownloadInfo) => {
    console.log(`[PersistedDownloadState] Adding download: ${modelId}`, info);
    store.setDownloadingModel(modelId, info);
  }, [store]);

  const removeDownloadingModel = useCallback((modelId: string) => {
    console.log(`[PersistedDownloadState] Removing download: ${modelId}`);
    store.removeDownloadingModel(modelId);
  }, [store]);

  const updateDownloadProgress = useCallback((modelId: string, progress: number, speed: string, eta: string) => {
    const currentInfo = store.getDownloadingModel(modelId);
    if (currentInfo) {
      console.log(`[PersistedDownloadState] Updating progress for ${modelId}: ${progress}%`);
      store.setDownloadingModel(modelId, {
        progress,
        speed,
        eta
      });
    }
  }, [store]);

  const clearAllDownloads = useCallback(() => {
    console.log(`[PersistedDownloadState] Clearing all downloads`);
    store.clearAllDownloads();
  }, [store]);

  const hasDownloadingModel = useCallback((modelId: string) => {
    return store.hasDownloadingModel(modelId);
  }, [store]);

  return {
    downloadingModels,
    addDownloadingModel,
    removeDownloadingModel,
    updateDownloadProgress,
    clearAllDownloads,
    hasDownloadingModel
  };
};
