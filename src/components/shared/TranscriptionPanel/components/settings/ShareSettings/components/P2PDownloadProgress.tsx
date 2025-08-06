// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";
import { useTranslation } from "react-i18next";
import { P2PDownloadProgress } from "../types";

interface P2PDownloadProgressProps {
  progress: P2PDownloadProgress;
}

/**
 * Displays P2P download progress information
 * Following best practices from fetch progress indicators and UX loading patterns
 * References: https://dev.to/samthor/progress-indicator-with-fetch-1loo
 */
export const P2PDownloadProgressComponent: React.FC<
  P2PDownloadProgressProps
> = ({ progress }) => {
  const { t } = useTranslation();
  const {
    adapterName,
    progress: percentage,
    downloadedBytes,
    totalBytes,
    speed,
    eta,
    status,
    error,
  } = progress;

  // Format bytes to human readable format
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return `0 ${t('download.bytes.b')}`;
    const k = 1024;
    const sizes = [t('download.bytes.b'), t('download.bytes.kb'), t('download.bytes.mb'), t('download.bytes.gb')];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Get contextual message during different phases
  const getProgressMessage = () => {
    if (error) return `${t('download.status.error')} ${error}`;
    if (status === "completed") return t('download.downloadCompleted');
    if (status === "cancelled") return t('download.downloadCancelled');
    if (percentage === 0) return t('download.connectingToPeer');
    if (percentage < 2) return t('download.preparingDownload');
    if (percentage >= 100) return t('download.finalizing');
    return null;
  };

  const progressMessage = getProgressMessage();
  const isError = status === "error";
  const isCompleted = status === "completed";
  const isDownloading = status === "downloading";

  // Progress bar color based on status
  const getProgressBarColor = () => {
    if (isError) return "bg-red-500";
    if (isCompleted) return "bg-green-500";
    return "bg-gradient-to-r from-purple-500 to-blue-500";
  };

  return (
    <div className="mt-2 space-y-2 p-2 bg-black/30 rounded border border-cyan-400/20">
      {/* Header with adapter name and status */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-white truncate">
          📦 {adapterName}
        </span>
        <span
          className={`text-xs ${
            isError
              ? "text-red-400"
              : isCompleted
              ? "text-green-400"
              : "text-cyan-400"
          }`}
        >
          {status === "downloading"
            ? t('download.status.downloading')
            : status === "completed"
            ? t('download.status.completed')
            : status === "error"
            ? t('download.status.error')
            : t('download.status.paused')}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor()}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      {/* Progress info */}
      <div className="flex justify-between text-[10px] text-gray-400">
        <span>
          {percentage.toFixed(1)}%{isDownloading && speed && ` • ${speed}`}
        </span>
        <span>
          {progressMessage || (
            <>
              {formatBytes(downloadedBytes)} / {formatBytes(totalBytes)}
              {eta && ` • ${t('download.eta')} ${eta}`}
            </>
          )}
        </span>
      </div>

      {/* Error details if any */}
      {isError && error && (
        <div className="text-[9px] text-red-400 bg-red-900/20 p-1 rounded">
          {error}
        </div>
      )}
    </div>
  );
};
