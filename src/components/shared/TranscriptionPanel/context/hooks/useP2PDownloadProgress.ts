// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useCallback, useEffect, useRef } from "react";
import { p2pEventBus } from "../../../../../services/p2p/core/EventBus";
import {
  P2PDownloadProgress,
} from "../../components/settings/ShareSettings/types";
import { usePersistedP2PDownloadState } from './usePersistedP2PDownloadState';

/**
 * Custom hook to manage P2P download progress
 * Now using persistent state to survive component unmounts/tab switches
 * Refactored from local React state to global persistent store
 * References: https://notestoself.dev/posts/promise-batch-progress-meter-in-typescript/
 */
export const useP2PDownloadProgress = () => {
  // Use persistent state hook instead of local React state
  const persistedState = usePersistedP2PDownloadState();
  const downloadTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Store start times separately to avoid closure issues
  const startTimes = useRef<Map<string, number>>(new Map());

  // Calculate download speed based on progress changes
  const calculateSpeed = useCallback(
    (downloadedBytes: number, timeElapsed: number): string => {
      if (timeElapsed === 0) return "0 B/s";

      const bytesPerSecond = (downloadedBytes * 1000) / timeElapsed;
      const k = 1024;
      const sizes = ["B/s", "KB/s", "MB/s", "GB/s"];
      const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
      return (
        parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(1)) +
        " " +
        sizes[i]
      );
    },
    []
  );

  // Calculate ETA based on current progress and speed
  const calculateETA = useCallback(
    (
      progress: number,
      downloadedBytes: number,
      totalBytes: number,
      timeElapsed: number
    ): string => {
      if (progress >= 100 || timeElapsed === 0) return "0s";

      const remainingBytes = totalBytes - downloadedBytes;
      const bytesPerSecond = (downloadedBytes * 1000) / timeElapsed;

      if (bytesPerSecond === 0) return "∞";

      const remainingSeconds = remainingBytes / bytesPerSecond;

      if (remainingSeconds > 3600) {
        return `${Math.ceil(remainingSeconds / 3600)}h`;
      } else if (remainingSeconds > 60) {
        return `${Math.ceil(remainingSeconds / 60)}m`;
      } else {
        return `${Math.ceil(remainingSeconds)}s`;
      }
    },
    []
  );

  // Start tracking download progress - now using persistent state
  const startDownload = useCallback(
    (adapterName: string, totalBytes: number) => {
      const startTime = Date.now();
      startTimes.current.set(adapterName, startTime);
      persistedState.startDownload(adapterName, totalBytes);
      
      console.log(`📥 [P2P-PROGRESS] Started tracking download: ${adapterName} (${totalBytes} bytes)`);
    },
    [persistedState]
  );

  // Update download progress - now using persistent state
  const updateProgress = useCallback(
    (data: {
      adapterName: string;
      progress: number;
      downloadedBytes: number;
      totalBytes: number;
    }) => {
      const { adapterName, progress, downloadedBytes, totalBytes } = data;
      const currentTime = Date.now();
      
      if (!startTimes.current.has(adapterName)) {
        startTimes.current.set(adapterName, currentTime);
      }
      
      const startTime = startTimes.current.get(adapterName) || currentTime;
      const timeElapsed = currentTime - startTime;

      const speed = timeElapsed > 1000 ? calculateSpeed(downloadedBytes, timeElapsed) : "Calculating...";
      const eta = timeElapsed > 1000 ? calculateETA(progress, downloadedBytes, totalBytes, timeElapsed) : "Calculating...";
      const isCompleted = progress >= 100;

      persistedState.updateProgress(adapterName, {
        progress,
        downloadedBytes,
        totalBytes,
        speed: isCompleted ? undefined : speed,
        eta: isCompleted ? undefined : eta,
        status: isCompleted ? "completed" : "downloading",
      });

      if (isCompleted) {
        console.log(`✅ [P2P-PROGRESS] Download completed: ${adapterName}`);
        
        const timeout = downloadTimeouts.current.get(adapterName);
        if (timeout) {
          clearTimeout(timeout);
          downloadTimeouts.current.delete(adapterName);
        }
        startTimes.current.delete(adapterName);
        
        // Emit progress completion custom event
        window.dispatchEvent(
          new CustomEvent("p2p-download-progress", {
            detail: { adapterName, progress: 100, downloadedBytes, totalBytes },
          })
        );
        
        persistedState.completeDownload(adapterName);
      }
    },
    [calculateSpeed, calculateETA, persistedState]
  );

  // Complete download - now using persistent state
  const completeDownload = useCallback((adapterName: string) => {
    const timeout = downloadTimeouts.current.get(adapterName);
    if (timeout) {
      clearTimeout(timeout);
      downloadTimeouts.current.delete(adapterName);
    }
    startTimes.current.delete(adapterName);
    persistedState.completeDownload(adapterName);
    
    console.log(`✅ [P2P-PROGRESS] Completed download: ${adapterName}`);
  }, [persistedState]);

  // Handle download error - now using persistent state
  const errorDownload = useCallback((adapterName: string, error: string) => {
    const timeout = downloadTimeouts.current.get(adapterName);
    if (timeout) {
      clearTimeout(timeout);
      downloadTimeouts.current.delete(adapterName);
    }
    startTimes.current.delete(adapterName);
    persistedState.errorDownload(adapterName, error);
    
    console.error(`❌ [P2P-PROGRESS] Download error for ${adapterName}: ${error}`);
  }, [persistedState]);

  // Cancel download - now using persistent state
  const cancelDownload = useCallback((adapterName: string) => {
    const timeout = downloadTimeouts.current.get(adapterName);
    if (timeout) {
      clearTimeout(timeout);
      downloadTimeouts.current.delete(adapterName);
    }
    startTimes.current.delete(adapterName);
    persistedState.cancelDownload(adapterName);
    
    console.log(`⏹️ [P2P-PROGRESS] Cancelled download: ${adapterName}`);
  }, [persistedState]);

  // Check if adapter is currently downloading - now using persistent state
  const isDownloading = useCallback(
    (adapterName: string): boolean => {
      return persistedState.isDownloading(adapterName);
    },
    [persistedState]
  );

  // Get download progress for specific adapter - now using persistent state
  const getProgress = useCallback(
    (adapterName: string): P2PDownloadProgress | undefined => {
      return persistedState.getProgress(adapterName);
    },
    [persistedState]
  );

  // Listen to P2P download events
  useEffect(() => {
    const handleDownloadProgress = (data: {
      adapterName: string;
      progress: number;
      downloadedBytes: number;
      totalBytes: number;
    }) => {
      updateProgress(data);
    };

    // Subscribe to download progress events
    p2pEventBus.on("download:progress", handleDownloadProgress);

    return () => {
      p2pEventBus.off("download:progress", handleDownloadProgress);

      // Clean up all timeouts and start times
      downloadTimeouts.current.forEach((timeout) => clearTimeout(timeout));
      downloadTimeouts.current.clear();
      startTimes.current.clear();
    };
  }, [updateProgress]);

  return {
    downloadState: persistedState.downloadState,
    startDownload,
    updateProgress,
    completeDownload,
    errorDownload,
    cancelDownload,
    isDownloading,
    getProgress,
  };
};
