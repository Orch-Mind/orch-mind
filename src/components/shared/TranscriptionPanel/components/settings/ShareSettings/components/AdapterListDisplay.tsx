// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";
import { IAdapterForMerge, IMergeStrategy } from "../utils/AdapterMergeTypes";

// SRP: Component focused only on displaying available adapters
interface AdapterListDisplayProps {
  adapters: any[];
  onDownload: (adapter: any) => void;
  showMergeSection: boolean;
  availableForMerge: IAdapterForMerge[];
  onAdapterSelection: (index: number) => void;
  onWeightChange: (index: number, weight: number) => void;
  selectedStrategy: IMergeStrategy["value"];
  currentRoom?: any;
  isSharing: boolean;
}

export const AdapterListDisplay: React.FC<AdapterListDisplayProps> = ({
  adapters,
  onDownload,
  showMergeSection,
  availableForMerge,
  onAdapterSelection,
  onWeightChange,
  selectedStrategy,
  currentRoom,
  isSharing,
}) => {
  if (!isSharing) {
    return <NotConnectedState />;
  }

  if (adapters.length === 0) {
    return <NoAdaptersState currentRoom={currentRoom} />;
  }

  return (
    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
      {adapters.map((adapter, index) => (
        <AdapterItem
          key={`${adapter.topic}-${adapter.from}-${index}`}
          adapter={adapter}
          onDownload={onDownload}
          showMergeSection={showMergeSection}
          mergeAdapter={availableForMerge[index]}
          onAdapterSelection={() => onAdapterSelection(index)}
          onWeightChange={(weight) => onWeightChange(index, weight)}
          selectedStrategy={selectedStrategy}
        />
      ))}
    </div>
  );
};

// SRP: Single adapter item component
const AdapterItem: React.FC<{
  adapter: any;
  onDownload: (adapter: any) => void;
  showMergeSection: boolean;
  mergeAdapter?: IAdapterForMerge;
  onAdapterSelection: () => void;
  onWeightChange: (weight: number) => void;
  selectedStrategy: IMergeStrategy["value"];
}> = ({
  adapter,
  onDownload,
  showMergeSection,
  mergeAdapter,
  onAdapterSelection,
  onWeightChange,
  selectedStrategy,
}) => (
  <div
    className={`p-2 bg-black/50 rounded border transition-colors ${
      showMergeSection && mergeAdapter?.selected
        ? "border-cyan-400/50 bg-cyan-900/20"
        : "border-cyan-400/10"
    }`}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2 flex-1">
        {/* KISS: Simple merge selection checkbox */}
        {showMergeSection && (
          <input
            type="checkbox"
            checked={mergeAdapter?.selected || false}
            onChange={onAdapterSelection}
            className="w-3 h-3 text-cyan-400 rounded"
            title="Select for merging"
          />
        )}

        <AdapterInfo adapter={adapter} />

        {/* YAGNI: Weight input only when needed */}
        {showMergeSection &&
          mergeAdapter?.selected &&
          selectedStrategy === "weighted_average" && (
            <WeightInput
              weight={mergeAdapter.weight}
              onChange={onWeightChange}
            />
          )}
      </div>

      <DownloadButton adapter={adapter} onDownload={onDownload} />
    </div>
  </div>
);

// SRP: Component focused only on weight input
const WeightInput: React.FC<{
  weight: number;
  onChange: (weight: number) => void;
}> = ({ weight, onChange }) => (
  <input
    type="number"
    min="0.1"
    max="2.0"
    step="0.1"
    value={weight}
    onChange={(e) => onChange(parseFloat(e.target.value) || 1.0)}
    className="w-12 px-1 py-0.5 text-xs bg-black/50 border border-cyan-400/30 rounded text-white"
    title="Weight for this adapter"
  />
);

// SRP: Component focused only on adapter information
const AdapterInfo: React.FC<{ adapter: any }> = ({ adapter }) => (
  <div className="flex-1 min-w-0">
    <h4 className="text-white font-medium text-xs truncate">{adapter.name}</h4>
    <p className="text-[9px] text-gray-400">
      {adapter.from} • {adapter.size}
    </p>
  </div>
);

// SRP: Download button component with ownership check
const DownloadButton: React.FC<{
  adapter: any;
  onDownload: (adapter: any) => void;
}> = ({ adapter, onDownload }) => {
  // Helper function to check if we own this adapter
  const isOwnAdapter = () => {
    // Check if adapter.from is empty, null, or matches our own identifier
    // Own adapters typically don't have a 'from' field or have empty 'from'
    return (
      !adapter.from || adapter.from.trim() === "" || adapter.from === "local"
    );
  };

  // Don't render download button for own adapters
  if (isOwnAdapter()) {
    return <span className="text-xs text-gray-500 px-2 py-1">Own adapter</span>;
  }

  return (
    <button
      onClick={() => onDownload(adapter)}
      className="text-xs bg-cyan-600/20 text-cyan-400 px-2 py-1 rounded border border-cyan-400/30 hover:bg-cyan-600/30 transition-colors whitespace-nowrap"
      title={`Download ${adapter.name} from ${adapter.from}`}
    >
      ⬇️ Download
    </button>
  );
};

// SRP: State when not connected
const NotConnectedState: React.FC = () => (
  <div className="text-center py-6">
    <div className="mb-2">
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
    <p className="text-gray-400 text-[10px] mb-1">Connect to see adapters</p>
    <p className="text-gray-500 text-[9px]">
      Join a room to discover shared adapters
    </p>
  </div>
);

// SRP: State when no adapters available
const NoAdaptersState: React.FC<{ currentRoom?: any }> = ({ currentRoom }) => {
  // KISS: Simple message based on room type
  const getMessage = (): { title: string; subtitle: string } => {
    switch (currentRoom?.type) {
      case "local":
        return {
          title: "No local adapters found",
          subtitle: "Check if peers on your network are sharing adapters",
        };
      case "general":
        return {
          title: "No community adapters yet",
          subtitle: "Wait for other users to share their adapters",
        };
      case "private":
        return {
          title: "No adapters in this room",
          subtitle: "Share the room code with peers who have adapters",
        };
      default:
        return {
          title: "No adapters available",
          subtitle: "Connect to a room to discover shared adapters",
        };
    }
  };

  const { title, subtitle } = getMessage();

  return (
    <div className="text-center py-6">
      <div className="mb-2">
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
      <p className="text-gray-400 text-[10px] mb-1">{title}</p>
      <p className="text-gray-500 text-[9px]">{subtitle}</p>
      {currentRoom?.peersCount === 0 && (
        <p className="text-yellow-500 text-[8px] mt-2">
          💡 No peers connected - invite others to join!
        </p>
      )}
    </div>
  );
};
