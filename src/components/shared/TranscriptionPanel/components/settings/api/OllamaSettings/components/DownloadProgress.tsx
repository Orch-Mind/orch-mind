// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";
import { useTranslation } from "react-i18next";
import { DownloadInfo } from "../types/ollama.types";

interface DownloadProgressProps {
  info: DownloadInfo;
}

/**
 * Displays download progress information
 * Following best practices from UX loading patterns
 */
export const DownloadProgress: React.FC<DownloadProgressProps> = ({ info }) => {
  const { t } = useTranslation();
  const { progress, speed, eta, message } = info;

  // Show contextual message during initial phases
  const getProgressMessage = () => {
    if (message) return message;
    if (progress === 0) return t('download.connecting');
    if (progress < 2 && speed === t('download.starting'))
      return t('download.preparingDownload');
    return null;
  };

  const progressMessage = getProgressMessage();

  return (
    <div className="mt-1 space-y-1">
      {/* Progress bar */}
      <div className="w-full bg-gray-700 rounded-full h-1.5">
        <div
          className="bg-gradient-to-r from-purple-500 to-blue-500 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Progress info */}
      <div className="flex justify-between text-[10px] text-gray-400">
        <span>
          {progress.toFixed(1)}% {speed !== t('download.starting') && speed}
        </span>
        <span>
          {progressMessage ||
            (eta !== t('download.preparingDownload') && `${t('download.eta')} ${eta}`)}
        </span>
      </div>
    </div>
  );
};
