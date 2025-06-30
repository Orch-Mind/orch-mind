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

// SRP: Component focused only on download functionality
const DownloadButton: React.FC<{
  adapter: any;
  onDownload: (adapter: any) => void;
}> = ({ adapter, onDownload }) => (
  <button
    onClick={() => onDownload(adapter)}
    className="px-2 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded transition-colors border border-green-400/30 text-[9px] font-medium"
    title={`Download ${adapter.name} from ${adapter.from}`}
  >
    📥
  </button>
);

// SRP: State when not connected
const NotConnectedState: React.FC = () => (
  <div className="text-center py-4">
    <p className="text-gray-400 text-[10px] mb-1">Connect to see adapters</p>
    <p className="text-gray-500 text-[9px]">Start sharing first</p>
  </div>
);

// SRP: State when no adapters available
const NoAdaptersState: React.FC<{ currentRoom?: any }> = ({ currentRoom }) => {
  // KISS: Simple message based on room type
  const getMessage = (): string => {
    switch (currentRoom?.type) {
      case "local":
        return "Check local network";
      case "general":
        return "Wait for community shares";
      case "private":
        return "Share room code";
      default:
        return "No peers connected";
    }
  };

  return (
    <div className="text-center py-4">
      <p className="text-gray-400 text-[10px] mb-1">No adapters yet</p>
      <p className="text-gray-500 text-[9px]">{getMessage()}</p>
    </div>
  );
};
