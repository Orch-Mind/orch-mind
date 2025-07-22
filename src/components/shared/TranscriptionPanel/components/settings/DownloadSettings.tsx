// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";
import "./ShareSettings/styles.css";

// SRP: Import only download-related components
import { useP2PContext } from "../../context/P2PContext";
import { DownloadAdaptersList } from "./components/DownloadAdaptersList";

/**
 * Download Settings Component
 * Dedicated to P2P adapter downloads - separated from sharing functionality
 * Following SRP principle: this component only handles downloading adapters
 */
const DownloadSettings: React.FC = () => {
  // Use global P2P context for download state
  const {
    status,
    // Download-specific state and functions
    incomingAdapters,
    downloadAdapter,
    // Download progress state and functions
    downloadState,
    isDownloading,
    getProgress,
  } = useP2PContext();

  return (
    <div className="space-y-3 max-w-6xl mx-auto p-3">
      <DownloadHeader />
      <DownloadAdaptersList
        adapters={incomingAdapters}
        onDownload={downloadAdapter}
        isConnected={status.isConnected}
        currentRoom={status.currentRoom}
        downloadState={downloadState}
        isDownloading={isDownloading}
        getProgress={getProgress}
      />
    </div>
  );
};

// SRP: Header component focused only on download information - Compact
const DownloadHeader: React.FC = () => (
  <div className="text-center mb-4">
    <h2 className="text-lg font-bold text-cyan-400 mb-1">
      📥 Adapter Downloads
    </h2>
    <p className="text-xs text-gray-400">
      Discover and download LoRA adapters shared by other users in your P2P
      network
    </p>
  </div>
);

// SRP: Connection status component focused on download context - Compact
const ConnectionStatus: React.FC<{
  currentRoom: any;
  isConnected: boolean;
  incomingAdapters: any[];
}> = ({ currentRoom, isConnected, incomingAdapters }) => {
  if (!isConnected) {
    return (
      <div className="bg-yellow-900/20 border border-yellow-400/30 rounded-lg p-3 text-center">
        <div className="flex items-center justify-center mb-1">
          <svg
            className="w-5 h-5 text-yellow-400 mr-2"
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
          <p className="text-yellow-400 font-medium text-sm">
            Not connected to P2P network
          </p>
        </div>
        <p className="text-yellow-300 text-xs">
          Go to the Share tab to connect and discover adapters
        </p>
      </div>
    );
  }

  return (
    <div className="bg-green-900/20 border border-green-400/30 rounded-lg p-3 text-center">
      <div className="flex items-center justify-center mb-1">
        <svg
          className="w-5 h-5 text-green-400 mr-2"
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
        <p className="text-green-400 font-medium text-sm">
          Connected to{" "}
          {currentRoom?.type === "general"
            ? "Global"
            : `Room ${currentRoom?.code}`}
        </p>
      </div>
      <p className="text-green-300 text-xs">
        {incomingAdapters.length} adapter
        {incomingAdapters.length !== 1 ? "s" : ""} available for download
      </p>
    </div>
  );
};

export default DownloadSettings;
