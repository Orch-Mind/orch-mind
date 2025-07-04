// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";
import "./ShareSettings/styles.css";

// SRP: Import only download-related components
import { useP2PContext } from "../../context/P2PContext";
import { AvailableAdaptersComponent } from "./ShareSettings/components";

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
    clearIncomingAdapters,
    // Download progress state and functions
    downloadState,
    isDownloading,
    getProgress,
  } = useP2PContext();

  return (
    <div className="space-y-3 max-w-7xl mx-auto">
      <DownloadHeader />
      <ConnectionStatus
        currentRoom={status.currentRoom}
        isConnected={status.isConnected}
        incomingAdapters={incomingAdapters}
      />
      <DownloadSection
        currentRoom={status.currentRoom}
        isConnected={status.isConnected}
        incomingAdapters={incomingAdapters}
        onDownload={downloadAdapter}
        downloadState={downloadState}
        isDownloading={isDownloading}
        getProgress={getProgress}
      />
      <DownloadInfoFooter currentRoom={status.currentRoom} />
    </div>
  );
};

// SRP: Header component focused only on download information
const DownloadHeader: React.FC = () => (
  <div className="text-center mb-4">
    <h2 className="text-lg font-semibold text-cyan-400 mb-2">
      📥 Adapter Downloads
    </h2>
    <p className="text-xs text-gray-400">
      Discover and download LoRA adapters shared by other users in your P2P
      network
    </p>
  </div>
);

// SRP: Connection status component focused on download context
const ConnectionStatus: React.FC<{
  currentRoom: any;
  isConnected: boolean;
  incomingAdapters: any[];
}> = ({ currentRoom, isConnected, incomingAdapters }) => {
  if (!isConnected) {
    return (
      <div className="bg-yellow-900/20 border border-yellow-400/30 rounded-md p-3 text-center">
        <p className="text-yellow-400 text-sm">
          🔌 Not connected to P2P network
        </p>
        <p className="text-yellow-300 text-xs mt-1">
          Go to the Share tab to connect and discover adapters
        </p>
      </div>
    );
  }

  return (
    <div className="bg-green-900/20 border border-green-400/30 rounded-md p-3 text-center">
      <p className="text-green-400 text-sm">
        ✅ Connected to{" "}
        {currentRoom?.type === "general"
          ? "Community"
          : currentRoom?.type === "local"
          ? "Local Network"
          : `Room ${currentRoom?.code}`}
      </p>
      <p className="text-green-300 text-xs mt-1">
        {incomingAdapters.length} adapter
        {incomingAdapters.length !== 1 ? "s" : ""} available for download
      </p>
    </div>
  );
};

// SRP: Main download section component
const DownloadSection: React.FC<{
  currentRoom: any;
  isConnected: boolean;
  incomingAdapters: any[];
  onDownload: (adapter: any) => void;
  downloadState: any;
  isDownloading: (adapterName: string) => boolean;
  getProgress: (adapterName: string) => any;
}> = ({
  currentRoom,
  isConnected,
  incomingAdapters,
  onDownload,
  downloadState,
  isDownloading,
  getProgress,
}) => (
  <div className="bg-black/20 backdrop-blur-sm rounded-md p-4 border border-cyan-400/20">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-semibold text-cyan-400">
        🎁 Available Adapters
      </h3>
      <span className="text-xs text-gray-400">
        {incomingAdapters.length} available
      </span>
    </div>

    <AvailableAdaptersComponent
      adapters={incomingAdapters}
      currentRoom={currentRoom}
      onDownload={onDownload}
      isSharing={isConnected}
      downloadState={downloadState}
      isDownloading={isDownloading}
      getProgress={getProgress}
    />
  </div>
);

// SRP: Info footer component for download context
const DownloadInfoFooter: React.FC<{ currentRoom: any }> = ({
  currentRoom,
}) => (
  <div className="bg-black/10 backdrop-blur-sm rounded-md p-3 border border-cyan-400/10">
    <h4 className="text-xs font-medium text-cyan-300 mb-2">
      ℹ️ Download Information
    </h4>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-400">
      <div>
        <span className="text-cyan-400">•</span> Adapters are downloaded
        directly from peers
      </div>
      <div>
        <span className="text-cyan-400">•</span> Progress is shown in real-time
      </div>
      <div>
        <span className="text-cyan-400">•</span> Downloaded adapters appear in
        Training tab
      </div>
      <div>
        <span className="text-cyan-400">•</span> All downloads include integrity
        verification
      </div>
    </div>
    {currentRoom && (
      <div className="mt-2 pt-2 border-t border-cyan-400/20">
        <p className="text-xs text-gray-500">
          Current room:{" "}
          <span className="text-cyan-400">
            {currentRoom.type === "general"
              ? "Community Network"
              : currentRoom.type === "local"
              ? "Local Network"
              : `Private Room ${currentRoom.code}`}
          </span>
        </p>
      </div>
    )}
  </div>
);

export default DownloadSettings;
