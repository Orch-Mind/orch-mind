// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";
import { useTranslation } from "react-i18next";

/**
 * Download Adapters List Component
 * Dedicated component for displaying and downloading P2P adapters
 * Focused only on download functionality - no merge capabilities
 */

interface DownloadAdaptersListProps {
  adapters: any[];
  onDownload: (adapter: any) => void;
  isConnected: boolean;
  currentRoom?: any;
  downloadState?: { [adapterName: string]: any };
  isDownloading?: (adapterName: string) => boolean;
  getProgress?: (adapterName: string) => any;
}

export const DownloadAdaptersList: React.FC<DownloadAdaptersListProps> = ({
  adapters,
  onDownload,
  isConnected,
  currentRoom,
  downloadState,
  isDownloading,
  getProgress,
}) => {
  const { t } = useTranslation();
  
  if (!isConnected) {
    return <NotConnectedState />;
  }

  if (adapters.length === 0) {
    return <NoAdaptersState currentRoom={currentRoom} />;
  }

  return (
    <div className="bg-black/20 backdrop-blur-sm rounded-lg p-3 border border-cyan-400/20">
      {/* Header Section with Connection Status */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <svg
            className="w-4 h-4 text-green-400 connection-status"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-sm font-semibold text-green-400">
            {t('download.connectedTo')}{" "}
            {currentRoom?.type === "general"
              ? t('download.globalRoom')
              : `${t('download.privateRoom')} ${currentRoom?.code}`}
          </h3>
        </div>
        <span className="text-xs text-gray-400 bg-cyan-900/20 px-2 py-0.5 rounded-full">
          {adapters.length} {t('download.adaptersAvailable')}
        </span>
      </div>

      {/* Adapters List - Limited to 3 visible with scroll */}
      <div className="space-y-2 max-h-[240px] overflow-y-auto custom-scrollbar">
        {adapters.map((adapter, index) => (
          <AdapterListItem
            key={adapter.name || `adapter-${index}`}
            adapter={adapter}
            onDownload={onDownload}
            isDownloading={isDownloading?.(adapter.topic) || false}
            downloadProgress={getProgress?.(adapter.topic)}
          />
        ))}
      </div>

      {/* Scroll indicator when there are more than 3 adapters */}
      {adapters.length > 3 && (
        <div className="text-center mt-2">
          <p className="text-xs text-gray-500 flex items-center justify-center">
            <svg
              className="w-3 h-3 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
            {t('download.scrollToSeeMore')}
          </p>
        </div>
      )}
    </div>
  );
};

// Individual adapter list item component - Compact version with animations
const AdapterListItem: React.FC<{
  adapter: any;
  onDownload: (adapter: any) => void;
  isDownloading: boolean;
  downloadProgress?: any;
}> = ({ adapter, onDownload, isDownloading, downloadProgress }) => {
  const { t } = useTranslation();
  
  // Check if this is user's own adapter
  const isOwnAdapter =
    !adapter.from || adapter.from.trim() === "" || adapter.from === "local";

  return (
    <div className="adapter-item bg-black/40 rounded-md p-2.5 border border-cyan-400/10 hover:border-cyan-400/30 transition-all duration-200">
      <div className="flex items-center justify-between">
        {/* Adapter Info - Compact */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-white font-medium text-sm truncate mr-2">
              {adapter.name}
            </h4>
            <div className="flex items-center text-xs text-gray-400 space-x-2 flex-shrink-0">
              <span className="flex items-center">
                <svg
                  className="w-3 h-3 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                {adapter.from || t('download.unknown')}
              </span>
              <span className="flex items-center">
                <svg
                  className="w-3 h-3 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                {adapter.size || t('download.unknownSize')}
              </span>
            </div>
          </div>

          {/* Download Progress - Compact */}
          {downloadProgress && (
            <DownloadProgressIndicator progress={downloadProgress} />
          )}
        </div>

        {/* Action Button - Compact */}
        <div className="ml-3 flex-shrink-0">
          {isOwnAdapter ? (
            <span className="text-xs text-gray-500 flex items-center px-2 py-1">
              <svg
                className="w-3 h-3 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {t('download.own')}
            </span>
          ) : isDownloading ? (
            <span className="text-xs text-yellow-400 flex items-center px-2 py-1">
              <svg
                className="w-3 h-3 mr-1 animate-spin"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {t('download.downloading')}
            </span>
          ) : (
            <button
              onClick={() => onDownload(adapter)}
              className="download-btn bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 px-3 py-1.5 rounded border border-cyan-400/30 hover:border-cyan-400/50 transition-all duration-200 text-xs font-medium flex items-center"
              title={`${t('download.download')} ${adapter.name} from ${adapter.from}`}
            >
              <svg
                className="w-3 h-3 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                />
              </svg>
              {t('download.download')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Download progress indicator component - Compact version with animations
const DownloadProgressIndicator: React.FC<{ progress: any }> = ({
  progress,
}) => {
  // Early return if no progress data
  if (!progress) {
    return null;
  }
  
  const percentage = progress?.progress || 0;
  const status = progress?.status || "downloading";
  const speed = progress?.speed;
  const eta = progress?.eta;
  const downloadedBytes = progress?.downloadedBytes || 0;
  const totalBytes = progress?.totalBytes || 0;

  // Format bytes to human readable format
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="mt-2 space-y-1 p-1.5 bg-black/30 rounded border border-cyan-400/20">
      {/* Progress bar - Compact with animation */}
      <div className="w-full bg-gray-700 rounded-full h-1.5">
        <div
          className="progress-bar bg-gradient-to-r from-purple-500 to-blue-500 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      {/* Progress info - Compact */}
      <div className="flex justify-between text-[9px] text-gray-400">
        <span>
          {percentage.toFixed(1)}%{speed && ` • ${speed}`}
        </span>
        <span>
          {formatBytes(downloadedBytes)} / {formatBytes(totalBytes)}
          {eta && ` • ETA: ${eta}`}
        </span>
      </div>
    </div>
  );
};

// State when not connected - Compact version
const NotConnectedState: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <div className="bg-black/20 backdrop-blur-sm rounded-lg p-4 border border-cyan-400/20 text-center">
      <div className="mb-3">
        <svg
          className="w-8 h-8 text-gray-500 mx-auto"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
          />
        </svg>
      </div>
      <h3 className="text-base font-medium text-gray-400 mb-1">{t('download.notConnected')}</h3>
      <p className="text-sm text-gray-500 mb-2">
        {t('download.notConnectedDescription')}
      </p>
      <p className="text-xs text-gray-600">{t('download.goToShareTab')}</p>
    </div>
  );
};

// State when no adapters available - Compact version
const NoAdaptersState: React.FC<{ currentRoom?: any }> = ({ currentRoom }) => {
  const { t } = useTranslation();
  
  const getMessage = (): {
    title: string;
    subtitle: string;
    suggestion: string;
  } => {
    switch (currentRoom?.type) {
      case "local":
        return {
          title: t('download.noLocalAdapters'),
          subtitle: t('download.noLocalAdaptersDescription'),
          suggestion: t('download.makeSurePeersSharing'),
        };
      case "general":
        return {
          title: t('download.noCommunityAdapters'),
          subtitle: t('download.noCommunityAdaptersDescription'),
          suggestion: t('download.checkBackLater'),
        };
      case "private":
        return {
          title: t('download.noAdaptersInRoom'),
          subtitle: t('download.noAdaptersInRoomDescription'),
          suggestion: t('download.shareRoomCode'),
        };
      default:
        return {
          title: t('download.noAdaptersAvailable'),
          subtitle: t('download.noAdaptersAvailableDescription'),
          suggestion: t('download.tryDifferentRoom'),
        };
    }
  };

  const { title, subtitle, suggestion } = getMessage();

  return (
    <div className="bg-black/20 backdrop-blur-sm rounded-lg p-4 border border-cyan-400/20 text-center">
      <div className="mb-3">
        <svg
          className="w-8 h-8 text-gray-500 mx-auto"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8V4a1 1 0 00-1-1H7a1 1 0 00-1 1v1m8 0V4.5"
          />
        </svg>
      </div>
      <h3 className="text-base font-medium text-gray-400 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 mb-2">{subtitle}</p>
      <p className="text-xs text-gray-600">{suggestion}</p>
      {currentRoom?.peersCount === 0 && (
        <div className="mt-3 p-2 bg-yellow-900/20 border border-yellow-400/30 rounded">
          <p className="text-yellow-400 text-xs flex items-center justify-center">
            <svg
              className="w-3 h-3 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            {t('download.noPeersConnected')}
          </p>
        </div>
      )}
    </div>
  );
};
