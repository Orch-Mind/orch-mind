// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useCallback, useEffect, useRef, useState } from "react";
import { p2pEventBus } from "../../../../../services/p2p/core/EventBus";
import {
  P2PDownloadProgress,
  P2PDownloadState,
} from "../../components/settings/ShareSettings/types";

/**
 * Custom hook to manage P2P download progress
 * Following patterns from useModelDownload but adapted for P2P
 * References: https://notestoself.dev/posts/promise-batch-progress-meter-in-typescript/
 */
export const useP2PDownloadProgress = () => {
  const [downloadState, setDownloadState] = useState<P2PDownloadState>({});
  const downloadTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Store start times separately to avoid closure issues
  const startTimes = useRef<Map<string, number>>(new Map());

  // Calculate download speed based on progress changes
  const calculateSpeed = useCallback(
    (
      downloadedBytes: number,
      timeElapsed: number // in milliseconds
    ): string => {
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

  // Start tracking download progress
  const startDownload = useCallback(
    (adapterName: string, totalBytes: number) => {
      const startTime = Date.now();

      // Store start time in ref
      startTimes.current.set(adapterName, startTime);

      setDownloadState((prev) => ({
        ...prev,
        [adapterName]: {
          adapterName,
          progress: 0,
          downloadedBytes: 0,
          totalBytes,
          speed: "0 B/s",
          eta: "Calculating...",
          status: "downloading",
        },
      }));

      console.log(
        `📥 [P2P-PROGRESS] Started tracking download: ${adapterName} (${totalBytes} bytes)`
      );
    },
    [] // Remove downloadState dependency to fix closure issue
  );

  // Update download progress
  const updateProgress = useCallback(
    (data: {
      adapterName: string;
      progress: number;
      downloadedBytes: number;
      totalBytes: number;
    }) => {
      const { adapterName, progress, downloadedBytes, totalBytes } = data;
      const currentTime = Date.now();
      const startTime = startTimes.current.get(adapterName) || currentTime;
      const timeElapsed = currentTime - startTime;

      const speed =
        timeElapsed > 1000
          ? calculateSpeed(downloadedBytes, timeElapsed)
          : "Calculating...";
      const eta =
        timeElapsed > 1000
          ? calculateETA(progress, downloadedBytes, totalBytes, timeElapsed)
          : "Calculating...";

      const isCompleted = progress >= 100;

      setDownloadState((prev) => ({
        ...prev,
        [adapterName]: {
          ...prev[adapterName],
          progress: Math.min(progress, 100),
          downloadedBytes,
          totalBytes,
          speed: isCompleted ? undefined : speed,
          eta: isCompleted ? undefined : eta,
          status: isCompleted ? "completed" : "downloading",
        },
      }));

      console.log(
        `📊 [P2P-PROGRESS] ${adapterName}: ${progress.toFixed(1)}% (${speed}, ETA: ${eta})`
      );

      // Auto-complete download when progress reaches 100%
      if (isCompleted) {
        console.log(`🎉 [P2P-PROGRESS] Auto-completing download: ${adapterName}`);
        
        // Clean up start time
        startTimes.current.delete(adapterName);
        
        // Emit download completion event for adapter manager
        window.dispatchEvent(
          new CustomEvent("adapter-downloaded", {
            detail: {
              adapterName,
              progress: 100,
              downloadedBytes,
              totalBytes,
            },
          })
        );
        
        // Auto-remove completed download after 3 seconds
        setTimeout(() => {
          setDownloadState((prev) => {
            const { [adapterName]: removed, ...rest } = prev;
            return rest;
          });
        }, 3000);
      }
    },
    [calculateSpeed, calculateETA]
  );

  // Complete download
  const completeDownload = useCallback((adapterName: string) => {
    setDownloadState((prev) => {
      const current = prev[adapterName];
      if (!current) return prev;

      return {
        ...prev,
        [adapterName]: {
          ...current,
          progress: 100,
          status: "completed",
          speed: undefined,
          eta: undefined,
        },
      };
    });

    // Clean up timeout and start time
    const timeout = downloadTimeouts.current.get(adapterName);
    if (timeout) {
      clearTimeout(timeout);
      downloadTimeouts.current.delete(adapterName);
    }
    startTimes.current.delete(adapterName);

    // Auto-remove completed download after 3 seconds
    setTimeout(() => {
      setDownloadState((prev) => {
        const { [adapterName]: removed, ...rest } = prev;
        return rest;
      });
    }, 3000);

    console.log(`✅ [P2P-PROGRESS] Completed download: ${adapterName}`);
  }, []);

  // Handle download error
  const errorDownload = useCallback((adapterName: string, error: string) => {
    setDownloadState((prev) => ({
      ...prev,
      [adapterName]: {
        ...prev[adapterName],
        status: "error",
        error,
        speed: undefined,
        eta: undefined,
      },
    }));

    // Clean up timeout and start time
    const timeout = downloadTimeouts.current.get(adapterName);
    if (timeout) {
      clearTimeout(timeout);
      downloadTimeouts.current.delete(adapterName);
    }
    startTimes.current.delete(adapterName);

    console.error(
      `❌ [P2P-PROGRESS] Download error for ${adapterName}: ${error}`
    );
  }, []);

  // Cancel download
  const cancelDownload = useCallback((adapterName: string) => {
    setDownloadState((prev) => {
      const { [adapterName]: removed, ...rest } = prev;
      return rest;
    });

    // Clean up timeout and start time
    const timeout = downloadTimeouts.current.get(adapterName);
    if (timeout) {
      clearTimeout(timeout);
      downloadTimeouts.current.delete(adapterName);
    }
    startTimes.current.delete(adapterName);

    console.log(`⏹️ [P2P-PROGRESS] Cancelled download: ${adapterName}`);
  }, []);

  // Check if adapter is currently downloading
  const isDownloading = useCallback(
    (adapterName: string): boolean => {
      return downloadState[adapterName]?.status === "downloading";
    },
    [downloadState]
  );

  // Get download progress for specific adapter
  const getProgress = useCallback(
    (adapterName: string): P2PDownloadProgress | undefined => {
      return downloadState[adapterName];
    },
    [downloadState]
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
    downloadState,
    startDownload,
    updateProgress,
    completeDownload,
    errorDownload,
    cancelDownload,
    isDownloading,
    getProgress,
  };
};
