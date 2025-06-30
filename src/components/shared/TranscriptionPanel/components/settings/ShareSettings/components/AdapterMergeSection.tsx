// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";
import {
  IMergeStrategy,
  IMergedAdapterInfo,
  MERGE_STRATEGIES,
} from "../utils/AdapterMergeTypes";

// SRP: Component focused only on merge functionality
interface AdapterMergeSectionProps {
  selectedStrategy: IMergeStrategy["value"];
  setSelectedStrategy: (strategy: IMergeStrategy["value"]) => void;
  outputName: string;
  setOutputName: (name: string) => void;
  onMerge: () => void;
  canMerge: boolean;
  isLoading: boolean;
  selectedCount: number;
  mergedAdapters: IMergedAdapterInfo[];
  onShareMerged: (name: string) => void;
  onRemoveMerged: (name: string) => void;
}

export const AdapterMergeSection: React.FC<AdapterMergeSectionProps> = ({
  selectedStrategy,
  setSelectedStrategy,
  outputName,
  setOutputName,
  onMerge,
  canMerge,
  isLoading,
  selectedCount,
  mergedAdapters,
  onShareMerged,
  onRemoveMerged,
}) => (
  <div className="space-y-3">
    <h4 className="text-xs font-medium text-cyan-300">🔗 Fusão de Adapters</h4>

    <StrategySelector
      selectedStrategy={selectedStrategy}
      setSelectedStrategy={setSelectedStrategy}
    />

    <OutputNameInput outputName={outputName} setOutputName={setOutputName} />

    <MergeButton
      onMerge={onMerge}
      canMerge={canMerge}
      isLoading={isLoading}
      selectedCount={selectedCount}
    />

    <MergedAdaptersList
      mergedAdapters={mergedAdapters}
      onShareMerged={onShareMerged}
      onRemoveMerged={onRemoveMerged}
    />
  </div>
);

// SRP: Component focused only on strategy selection
const StrategySelector: React.FC<{
  selectedStrategy: IMergeStrategy["value"];
  setSelectedStrategy: (strategy: IMergeStrategy["value"]) => void;
}> = ({ selectedStrategy, setSelectedStrategy }) => (
  <div>
    <select
      value={selectedStrategy}
      onChange={(e) =>
        setSelectedStrategy(e.target.value as IMergeStrategy["value"])
      }
      className="w-full px-2 py-1 text-xs bg-black/50 border border-cyan-400/30 rounded text-white"
      title="Selecionar estratégia de fusão"
    >
      {MERGE_STRATEGIES.map((strategy) => (
        <option key={strategy.value} value={strategy.value}>
          {strategy.label}
        </option>
      ))}
    </select>
    <p className="text-xs text-gray-400 mt-1">
      {MERGE_STRATEGIES.find((s) => s.value === selectedStrategy)?.description}
    </p>
  </div>
);

// SRP: Component focused only on output name input
const OutputNameInput: React.FC<{
  outputName: string;
  setOutputName: (name: string) => void;
}> = ({ outputName, setOutputName }) => (
  <input
    type="text"
    value={outputName}
    onChange={(e) => setOutputName(e.target.value)}
    placeholder="Nome do adapter merged"
    className="w-full px-2 py-1 text-xs bg-black/50 border border-cyan-400/30 rounded text-white placeholder-gray-400"
  />
);

// SRP: Component focused only on merge button
const MergeButton: React.FC<{
  onMerge: () => void;
  canMerge: boolean;
  isLoading: boolean;
  selectedCount: number;
}> = ({ onMerge, canMerge, isLoading, selectedCount }) => (
  <button
    onClick={onMerge}
    disabled={!canMerge}
    className={`w-full py-1.5 px-3 rounded text-xs font-medium transition-colors ${
      canMerge
        ? "bg-cyan-600 hover:bg-cyan-700 text-white"
        : "bg-gray-600 text-gray-400 cursor-not-allowed"
    }`}
  >
    {isLoading ? "🔄 Processando..." : `🔗 Fundir ${selectedCount} Adapters`}
  </button>
);

// SRP: Component focused only on merged adapters list
const MergedAdaptersList: React.FC<{
  mergedAdapters: IMergedAdapterInfo[];
  onShareMerged: (name: string) => void;
  onRemoveMerged: (name: string) => void;
}> = ({ mergedAdapters, onShareMerged, onRemoveMerged }) => {
  if (mergedAdapters.length === 0) {
    return null; // YAGNI: Don't show empty section
  }

  return (
    <div className="mt-3 pt-2 border-t border-cyan-400/20">
      <h5 className="text-xs font-medium text-cyan-300 mb-2">
        Adapters Merged ({mergedAdapters.length})
      </h5>
      <div className="space-y-1 max-h-24 overflow-y-auto">
        {mergedAdapters.map((adapter, index) => (
          <MergedAdapterItem
            key={index}
            adapter={adapter}
            onShare={onShareMerged}
            onRemove={onRemoveMerged}
          />
        ))}
      </div>
    </div>
  );
};

// SRP: Component focused only on single merged adapter item
const MergedAdapterItem: React.FC<{
  adapter: IMergedAdapterInfo;
  onShare: (name: string) => void;
  onRemove: (name: string) => void;
}> = ({ adapter, onShare, onRemove }) => (
  <div className="flex items-center justify-between p-1.5 bg-black/30 rounded border border-cyan-400/10">
    <MergedAdapterInfo adapter={adapter} />
    <MergedAdapterActions
      adapterName={adapter.name}
      onShare={onShare}
      onRemove={onRemove}
    />
  </div>
);

// SRP: Component focused only on merged adapter information
const MergedAdapterInfo: React.FC<{
  adapter: IMergedAdapterInfo;
}> = ({ adapter }) => (
  <div className="flex-1 min-w-0">
    <div className="text-xs font-medium text-white truncate">
      {adapter.name}
    </div>
    <div className="text-xs text-gray-400">
      {adapter.metadata.sourceAdapters.length} sources •{" "}
      {adapter.metadata.mergeStrategy}
    </div>
  </div>
);

// SRP: Component focused only on merged adapter actions
const MergedAdapterActions: React.FC<{
  adapterName: string;
  onShare: (name: string) => void;
  onRemove: (name: string) => void;
}> = ({ adapterName, onShare, onRemove }) => (
  <div className="flex space-x-1">
    <button
      onClick={() => onShare(adapterName)}
      className="px-1 py-0.5 text-xs bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded border border-green-400/30"
      title="Share on P2P network"
    >
      🌐
    </button>
    <button
      onClick={() => onRemove(adapterName)}
      className="px-1 py-0.5 text-xs bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded border border-red-400/30"
      title="Remove merged adapter"
    >
      🗑️
    </button>
  </div>
);
