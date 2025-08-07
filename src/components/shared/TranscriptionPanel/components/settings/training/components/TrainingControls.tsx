// SPDX-License-Identifier: MIT OR Apache-2.0
// Training Controls Component - Following SRP and KISS
// Single responsibility: Handle training controls and progress display

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  formatLearningRate,
  useTrainingConfig,
} from "../hooks/useTrainingConfig";
import type { TrainingDetails } from "../types";
import { NamingModal } from "./NamingModal";

interface TrainingControlsProps {
  isTraining: boolean;
  trainingProgress: number;
  trainingStatus: string;
  selectedCount: number;
  validPairs: number;
  trainingDetails: TrainingDetails | null;
  onStartTraining: (customAdapterName?: string) => void;
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
  const { t } = useTranslation();
  const canStartTraining = !isTraining && selectedCount > 0;
  const { config } = useTrainingConfig(); // No loading/error since it's synchronous
  
  // State for adapter naming modal
  const [showNamingModal, setShowNamingModal] = useState(false);
  const [isStartingTraining, setIsStartingTraining] = useState(false);

  // Generate default adapter name based on current date/time
  const generateDefaultAdapterName = () => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toTimeString().slice(0, 5).replace(':', '');
    return `adapter-${dateStr}-${timeStr}`;
  };

  // Handle training button click - show naming modal
  const handleTrainingClick = () => {
    if (canStartTraining) {
      setShowNamingModal(true);
    }
  };

  // Handle adapter name confirmation from modal
  const handleNameConfirm = async (adapterName: string) => {
    setIsStartingTraining(true);
    
    try {
      // Start training asynchronously (don't wait for completion)
      Promise.resolve(onStartTraining(adapterName)).catch((error: unknown) => {
        console.warn('[TrainingControls] Training error (modal already closed):', error);
      });
      
      // Close modal immediately after starting training
      console.log('[TrainingControls] Training started, closing modal immediately');
    } catch (error) {
      console.warn('[TrainingControls] Error starting training:', error);
    } finally {
      // Always close modal immediately
      setIsStartingTraining(false);
      setShowNamingModal(false);
    }
  };

  // Handle modal cancel
  const handleNameCancel = () => {
    setShowNamingModal(false);
  };

  return (
    <div className="bg-black/20 backdrop-blur-sm rounded-md p-2 border border-cyan-400/20 flex flex-col overflow-hidden">
      <h3 className="text-xs font-semibold text-cyan-400 mb-1">
        {t('training.control')}
      </h3>

      <div className="flex-1 flex flex-col justify-between min-h-0">
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
            onStartTraining={handleTrainingClick}
            config={config}
          />
        )}
      </div>
      
      {/* Naming Modal */}
      <NamingModal
        isOpen={showNamingModal}
        type="adapter"
        defaultName={generateDefaultAdapterName()}
        title={t('training.adapterName')}
        description={t('training.adapterNameDescription', { count: selectedCount })}
        onConfirm={handleNameConfirm}
        onCancel={handleNameCancel}
        isLoading={isStartingTraining}
      />
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
}) => {
  const { t } = useTranslation();
  
  return (
  <div className="space-y-2 h-full flex flex-col justify-between">
    <div className="flex items-center justify-between">
      <span className="text-cyan-400 text-sm font-medium">
        {t('training.progress')}
      </span>
      <span className="text-cyan-400 font-mono text-lg font-bold">
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

    <div className="bg-gray-800/50 rounded-lg p-2 flex-1">
      <div className="text-sm text-gray-300">
        <div className="font-medium text-cyan-300 mb-1 text-xs">
          {t('training.currentStatus')}:
        </div>
        <div className="text-xs truncate">{status}</div>
      </div>
      <div className="text-xs text-cyan-400 border-t border-gray-600 pt-1 mt-1">
        {t('training.strategy')}
      </div>
    </div>

    {trainingDetails && trainingDetails.trainingExamples > 0 && (
      <div className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 border border-cyan-400/20 rounded-lg p-1.5">
        <div className="text-center">
          <div className="text-cyan-300 font-medium mb-0.5 text-xs">
            {t('training.details')}
          </div>
          <div className="text-gray-300 text-xs">
            {t('training.examplesFromConversations', { 
              examples: trainingDetails.trainingExamples, 
              count: selectedCount 
            })}
          </div>
        </div>
      </div>
    )}
  </div>
  );
};

// Separate component for ready state (SRP)
interface TrainingReadyDisplayProps {
  selectedCount: number;
  validPairs: number;
  canStartTraining: boolean;
  onStartTraining: () => void;
  config: any;
}

const TrainingReadyDisplay: React.FC<TrainingReadyDisplayProps> = ({
  selectedCount,
  validPairs,
  canStartTraining,
  onStartTraining,
  config,
}) => {
  const { t } = useTranslation();
  
  return (
  <div className="space-y-2 h-full flex flex-col justify-between">
    {/* Training Information */}
    <div className="bg-gray-800/50 rounded-lg p-2 flex-1">
      <div className="text-sm text-gray-300">
        <div className="font-medium text-cyan-300 mb-1.5 text-sm">
          {t('training.configuration')}
        </div>
        <div className="grid grid-cols-2 gap-1.5 text-xs">
          <div className="flex justify-between">
            <span>{t('training.loraRank')}:</span>
            <span className="text-cyan-400 font-mono">{config.lora.rank}</span>
          </div>
          <div className="flex justify-between">
            <span>{t('training.alpha')}:</span>
            <span className="text-cyan-400 font-mono">{config.lora.alpha}</span>
          </div>
          <div className="flex justify-between">
            <span>{t('training.dropout')}:</span>
            <span className="text-cyan-400 font-mono">
              {config.lora.dropout}
            </span>
          </div>
          <div className="flex justify-between">
            <span>{t('training.learningRate')}:</span>
            <span className="text-cyan-400 font-mono">
              {formatLearningRate(config.lora.learningRate)}
            </span>
          </div>
        </div>
      </div>
    </div>

    {/* Training Button */}
    <div className="space-y-1.5">
      <button
        onClick={onStartTraining}
        disabled={!canStartTraining}
        className={`w-full py-2 px-3 rounded-lg font-semibold transition-all duration-200 text-sm ${
          !canStartTraining
            ? "bg-gray-700 text-gray-400 cursor-not-allowed"
            : "bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700 transform hover:scale-[1.02] shadow-lg hover:shadow-cyan-400/20"
        }`}
      >
        {selectedCount === 0
          ? t('training.selectConversationsFirst')
          : t('training.startTraining', { count: selectedCount })}
      </button>
    </div>
  </div>
  );
};
