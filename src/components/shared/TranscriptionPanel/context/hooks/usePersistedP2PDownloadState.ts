// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useCallback, useEffect, useState } from 'react';
import { P2PDownloadState, P2PDownloadProgress } from '../../components/settings/ShareSettings/types';

/**
 * Singleton store for P2P download state persistence
 * Keeps download progress state alive across component unmounts/remounts
 * Similar to DownloadStateStore but for P2P adapters
 */
class P2PDownloadStateStore {
  private static instance: P2PDownloadStateStore;
  private downloadState: P2PDownloadState = {};
  private listeners = new Set<() => void>();

  static getInstance(): P2PDownloadStateStore {
    if (!P2PDownloadStateStore.instance) {
      P2PDownloadStateStore.instance = new P2PDownloadStateStore();
    }
    return P2PDownloadStateStore.instance;
  }

  getDownloadState(): P2PDownloadState {
    return { ...this.downloadState };
  }

  setDownloadState(newState: P2PDownloadState): void {
    this.downloadState = { ...newState };
    this.notifyListeners();
  }

  updateAdapterProgress(adapterName: string, progress: P2PDownloadProgress): void {
    this.downloadState = {
      ...this.downloadState,
      [adapterName]: progress,
    };
    this.notifyListeners();
  }

  removeAdapter(adapterName: string): void {
    const { [adapterName]: removed, ...rest } = this.downloadState;
    this.downloadState = rest;
    this.notifyListeners();
  }

  clearCompletedDownloads(): void {
    const filtered = Object.fromEntries(
      Object.entries(this.downloadState).filter(
        ([_, progress]) => progress.status !== 'completed'
      )
    );
    this.downloadState = filtered;
    this.notifyListeners();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }

  // Debug methods
  getListenerCount(): number {
    return this.listeners.size;
  }

  logState(): void {
    console.log('🔍 [P2P-PERSISTENT-STORE] Current state:', {
      downloadState: this.downloadState,
      listeners: this.listeners.size,
    });
  }
}

/**
 * Hook for persistent P2P download state management
 * Provides reactive access to global download state that survives component unmounts
 * 
 * Usage pattern mirrors usePersistedDownloadState for consistency
 */
export const usePersistedP2PDownloadState = () => {
  const store = P2PDownloadStateStore.getInstance();
  const [downloadState, setDownloadState] = useState<P2PDownloadState>(() => 
    store.getDownloadState()
  );

  // Subscribe to store updates
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setDownloadState(store.getDownloadState());
    });

    return unsubscribe;
  }, [store]);

  // Callback to update entire state
  const updateDownloadState = useCallback((newState: P2PDownloadState) => {
    store.setDownloadState(newState);
  }, [store]);

  // Callback to start tracking a download
  const startDownload = useCallback((adapterName: string, totalBytes: number) => {
    const progress: P2PDownloadProgress = {
      adapterName,
      progress: 0,
      downloadedBytes: 0,
      totalBytes,
      speed: "0 B/s",
      eta: "Calculating...",
      status: "downloading",
    };
    store.updateAdapterProgress(adapterName, progress);
    
    console.log(`📥 [P2P-PERSISTENT] Started tracking download: ${adapterName} (${totalBytes} bytes)`);
  }, [store]);

  // Callback to update progress
  const updateProgress = useCallback((
    adapterName: string,
    progress: Partial<P2PDownloadProgress>
  ) => {
    const currentState = store.getDownloadState();
    const currentProgress = currentState[adapterName];
    
    if (!currentProgress) {
      console.warn(`⚠️ [P2P-PERSISTENT] No existing progress found for: ${adapterName}`);
      return;
    }

    const updatedProgress: P2PDownloadProgress = {
      ...currentProgress,
      ...progress,
    };

    store.updateAdapterProgress(adapterName, updatedProgress);
    
    console.log(`📊 [P2P-PERSISTENT] Updated progress: ${adapterName} - ${updatedProgress.progress}%`);
  }, [store]);

  // Callback to complete download
  const completeDownload = useCallback((adapterName: string) => {
    const currentState = store.getDownloadState();
    const currentProgress = currentState[adapterName];
    
    if (!currentProgress) {
      console.warn(`⚠️ [P2P-PERSISTENT] No existing progress found for completion: ${adapterName}`);
      return;
    }

    const completedProgress: P2PDownloadProgress = {
      ...currentProgress,
      progress: 100,
      status: "completed",
      speed: undefined,
      eta: undefined,
    };

    store.updateAdapterProgress(adapterName, completedProgress);
    
    // Auto-remove completed downloads after 3 seconds
    setTimeout(() => {
      store.removeAdapter(adapterName);
    }, 3000);
    
    console.log(`✅ [P2P-PERSISTENT] Completed download: ${adapterName}`);
  }, [store]);

  // Callback to handle download error
  const errorDownload = useCallback((adapterName: string, error: string) => {
    const currentState = store.getDownloadState();
    const currentProgress = currentState[adapterName];
    
    if (!currentProgress) {
      console.warn(`⚠️ [P2P-PERSISTENT] No existing progress found for error: ${adapterName}`);
      return;
    }

    const errorProgress: P2PDownloadProgress = {
      ...currentProgress,
      status: "error",
      error,
      speed: undefined,
      eta: undefined,
    };

    store.updateAdapterProgress(adapterName, errorProgress);
    
    console.error(`❌ [P2P-PERSISTENT] Download error for ${adapterName}: ${error}`);
  }, [store]);

  // Callback to cancel download
  const cancelDownload = useCallback((adapterName: string) => {
    store.removeAdapter(adapterName);
    console.log(`⏹️ [P2P-PERSISTENT] Cancelled download: ${adapterName}`);
  }, [store]);

  // Callback to check if downloading
  const isDownloading = useCallback((adapterName: string): boolean => {
    const currentState = store.getDownloadState();
    const state = currentState[adapterName];
    return state?.status === "downloading" || (state?.progress > 0 && state?.progress < 100);
  }, [store, downloadState]); // Include downloadState to trigger re-renders

  // Callback to get progress
  const getProgress = useCallback((adapterName: string): P2PDownloadProgress | undefined => {
    return downloadState[adapterName];
  }, [downloadState]);

  // Callback to clear all completed downloads
  const clearCompleted = useCallback(() => {
    store.clearCompletedDownloads();
    console.log(`🧹 [P2P-PERSISTENT] Cleared completed downloads`);
  }, [store]);

  // Debug callback
  const debugState = useCallback(() => {
    store.logState();
  }, [store]);

  return {
    // State
    downloadState,
    
    // Actions
    updateDownloadState,
    startDownload,
    updateProgress,
    completeDownload,
    errorDownload,
    cancelDownload,
    isDownloading,
    getProgress,
    clearCompleted,
    debugState,
  };
};
