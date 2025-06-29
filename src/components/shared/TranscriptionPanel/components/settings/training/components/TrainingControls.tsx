// SPDX-License-Identifier: MIT OR Apache-2.0
// Training Controls Component - Following SRP and KISS
// Single responsibility: Handle training controls and progress display

import React from "react";
import type { TrainingDetails } from "../types";

interface TrainingControlsProps {
  isTraining: boolean;
  trainingProgress: number;
  trainingStatus: string;
  selectedCount: number;
  validPairs: number;
  trainingDetails: TrainingDetails | null;
  onStartTraining: () => void;
}

export const TrainingControls: React.FC<TrainingControlsProps> = ({
  isTraining,
  trainingProgress,
  trainingStatus,
  selectedCount,
  validPairs,
  trainingDetails,
  onStartTraining,
}) => {
  const canStartTraining = !isTraining && selectedCount > 0;

  return (
    <div className="space-y-2">
      {/* Training Action */}
      <div className="bg-black/20 backdrop-blur-sm rounded-md p-3 border border-cyan-400/20">
        <h3 className="text-xs font-semibold text-cyan-400 mb-2">
          Training Control
        </h3>

        {isTraining ? (
          <TrainingProgressDisplay
            progress={trainingProgress}
            status={trainingStatus}
            selectedCount={selectedCount}
            trainingDetails={trainingDetails}
          />
        ) : (
          <TrainingReadyDisplay
            selectedCount={selectedCount}
            validPairs={validPairs}
            canStartTraining={canStartTraining}
            onStartTraining={onStartTraining}
          />
        )}
      </div>
    </div>
  );
};

// Separate component for training progress (SRP)
interface TrainingProgressDisplayProps {
  progress: number;
  status: string;
  selectedCount: number;
  trainingDetails: TrainingDetails | null;
}

const TrainingProgressDisplay: React.FC<TrainingProgressDisplayProps> = ({
  progress,
  status,
  selectedCount,
  trainingDetails,
}) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-cyan-400 text-[10px] font-medium">Progress</span>
      <span className="text-cyan-400 font-mono text-[9px]">
        {Math.round(progress)}%
      </span>
    </div>

    <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden shadow-inner">
      <div
        className="bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-600 h-2 rounded-full transition-all duration-1000 ease-out relative shadow-sm"
        style={{ width: `${Math.round(progress)}%` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent animate-pulse rounded-full"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full animate-[shimmer_2s_infinite]"></div>
      </div>
    </div>

    <div className="text-[9px] text-gray-300">
      {status}
      <div className="text-[8px] text-cyan-400 mt-1">
        Strategy 1: PEFT-only → Strategy 2: Virtual Env → Strategy 3: Simplified
      </div>
    </div>

    {trainingDetails && trainingDetails.trainingExamples > 0 && (
      <div className="text-[8px] text-gray-400 bg-gray-800/50 p-1.5 rounded text-center">
        {trainingDetails.trainingExamples} examples from {selectedCount}{" "}
        conversations
      </div>
    )}
  </div>
);

// Separate component for ready state (SRP)
interface TrainingReadyDisplayProps {
  selectedCount: number;
  validPairs: number;
  canStartTraining: boolean;
  onStartTraining: () => void;
}

const TrainingReadyDisplay: React.FC<TrainingReadyDisplayProps> = ({
  selectedCount,
  validPairs,
  canStartTraining,
  onStartTraining,
}) => (
  <div className="space-y-2">
    <div className="text-[9px] text-gray-400 bg-gray-800/50 p-1.5 rounded">
      <div className="flex justify-between">
        <span>Selected:</span>
        <span className="text-cyan-400">{selectedCount}</span>
      </div>
      <div className="flex justify-between">
        <span>Pairs:</span>
        <span className="text-cyan-400">{validPairs}</span>
      </div>
    </div>

    <button
      onClick={onStartTraining}
      disabled={!canStartTraining}
      className={`w-full py-2 px-2 rounded font-semibold transition-all duration-200 text-[10px] ${
        !canStartTraining
          ? "bg-gray-700 text-gray-400 cursor-not-allowed"
          : "bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700 transform hover:scale-[1.02] shadow-lg hover:shadow-cyan-400/20"
      }`}
    >
      {selectedCount === 0
        ? "Select Conversations"
        : `Train (${selectedCount})`}
    </button>
  </div>
);
