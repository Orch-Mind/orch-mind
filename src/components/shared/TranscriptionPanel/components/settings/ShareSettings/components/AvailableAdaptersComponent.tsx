// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React, { useState } from "react";
import { useAdapterMerge } from "../hooks/useAdapterMerge";
import { AvailableAdaptersProps } from "../types";
import { AdapterListDisplay } from "./AdapterListDisplay";
import { AdapterMergeSection } from "./AdapterMergeSection";

// SRP: Component focused only on coordinating adapter display and merge toggle
export const AvailableAdaptersComponent: React.FC<
  AvailableAdaptersProps & {
    // Download progress props
    downloadState?: any;
    isDownloading?: (adapterName: string) => boolean;
    getProgress?: (adapterName: string) => any;
  }
> = ({
  adapters,
  currentRoom,
  onDownload,
  isSharing,
  downloadState,
  isDownloading,
  getProgress,
}) => {
  const [showMergeSection, setShowMergeSection] = useState(false);

  // DRY: Use custom hook for all merge-related logic
  const {
    availableForMerge,
    mergedAdapters,
    selectedStrategy,
    setSelectedStrategy,
    outputName,
    setOutputName,
    isLoading,
    selectedCount,
    canMerge,
    handleAdapterSelection,
    handleWeightChange,
    handleMergeAdapters,
    handleShareMergedAdapter,
    handleRemoveMergedAdapter,
  } = useAdapterMerge(adapters);

  return (
    <div className="bg-black/20 backdrop-blur-sm rounded-md p-3 border border-cyan-400/20 h-full">
      {/* KISS: Simple header with merge toggle */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-cyan-400">🎁 Available</h3>
        <div className="flex items-center space-x-2">
          {mergedAdapters.length > 0 && (
            <span className="text-xs text-gray-400">
              {mergedAdapters.length} merged
            </span>
          )}
          <button
            onClick={() => setShowMergeSection(!showMergeSection)}
            className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors whitespace-nowrap px-1"
            title={
              showMergeSection ? "Hide merge section" : "Show merge section"
            }
          >
            {showMergeSection ? "🔗 Hide" : "🔗 Merge"}
          </button>
        </div>
      </div>

      {/* SRP: Separated adapter list display */}
      <AdapterListDisplay
        adapters={adapters}
        currentRoom={currentRoom}
        onDownload={onDownload}
        isSharing={isSharing}
        showMergeSection={showMergeSection}
        availableForMerge={availableForMerge}
        onAdapterSelection={handleAdapterSelection}
        onWeightChange={handleWeightChange}
        selectedStrategy={selectedStrategy}
        downloadState={downloadState}
        isDownloading={isDownloading}
        getProgress={getProgress}
      />

      {/* YAGNI: Merge section only when needed */}
      {showMergeSection && isSharing && adapters.length > 0 && (
        <div className="mt-4 pt-3 border-t border-cyan-400/20">
          <AdapterMergeSection
            selectedStrategy={selectedStrategy}
            setSelectedStrategy={setSelectedStrategy}
            outputName={outputName}
            setOutputName={setOutputName}
            onMerge={handleMergeAdapters}
            canMerge={canMerge}
            isLoading={isLoading}
            selectedCount={selectedCount}
            mergedAdapters={mergedAdapters}
            onShareMerged={handleShareMergedAdapter}
            onRemoveMerged={handleRemoveMergedAdapter}
          />
        </div>
      )}
    </div>
  );
};
