// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";
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
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Get contextual message during different phases
  const getProgressMessage = () => {
    if (error) return `❌ ${error}`;
    if (status === "completed") return "✅ Download completed";
    if (status === "cancelled") return "⏹️ Download cancelled";
    if (percentage === 0) return "🔗 Connecting to peer...";
    if (percentage < 2) return "📋 Preparing download...";
    if (percentage >= 100) return "💾 Finalizing...";
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
            ? "⬇️"
            : status === "completed"
            ? "✅"
            : status === "error"
            ? "❌"
            : "⏸️"}
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
              {eta && ` • ETA: ${eta}`}
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
