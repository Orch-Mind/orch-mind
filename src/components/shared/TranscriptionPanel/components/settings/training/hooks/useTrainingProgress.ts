// SPDX-License-Identifier: MIT OR Apache-2.0
// Hook for managing training progress - Following SRP
// Single responsibility: Handle training progress, status, and execution

import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { TrainingRequest, TrainingResult } from "../types";
import { usePersistedTrainingState } from "./usePersistedTrainingState";

export const useTrainingProgress = () => {
  const { t } = useTranslation();
  
  // Use persistent training state hook
  const {
    isTraining,
    trainingProgress,
    trainingStatus,
    trainingStartTime,
    estimatedTime,
    trainingResult,
    setIsTraining,
    setProgress,
    setStatus,
    setStartTime,
    setEstimatedTime,
    setResult,
    resetTrainingState
  } = usePersistedTrainingState();

  // Set up real-time progress listener
  useEffect(() => {
    if (!window.electronAPI?.onTrainingProgress) {
      console.warn("[Training] onTrainingProgress not available");
      return;
    }

    const cleanup = window.electronAPI.onTrainingProgress((data) => {
      console.log(
        `[Training] Real progress: ${data.progress}% - ${data.message}`
      );

      setProgress(data.progress);
      setStatus(data.message);

      // Update time estimate based on real progress
      if (trainingStartTime && data.progress > 0 && data.progress < 100) {
        const elapsed = Date.now() - trainingStartTime;
        const estimated = (elapsed / data.progress) * (100 - data.progress);
        const estimatedSeconds = Math.round(estimated / 1000);

        if (estimatedSeconds > 60) {
          const minutes = Math.floor(estimatedSeconds / 60);
          const seconds = estimatedSeconds % 60;
          setEstimatedTime(`~${minutes}m ${seconds}s remaining`);
        } else {
          setEstimatedTime(`~${estimatedSeconds}s remaining`);
        }
      }
    });

    return cleanup;
  }, [trainingStartTime, setProgress, setStatus, setEstimatedTime]);

  const startTraining = useCallback(
    async (
      request: TrainingRequest,
      onSuccess: (result: TrainingResult) => void,
      onError: (error: string) => void
    ) => {
      setIsTraining(true);
      setProgress(0);
      setStatus("Preparing training data...");
      setStartTime(Date.now());
      setResult(null);

      // Use the provided outputName from the request (generated in TrainingSettings)
      const baseModelClean = request.baseModel.replace(":latest", "");
      const expectedModelName = `${baseModelClean}-custom:latest`;

      try {
        // Training conversations already loaded with messages from TrainingSettings
        const trainingConversations = request.conversations;

        // Execute training via Electron API
        if (!window.electronAPI?.trainLoRAAdapter) {
          throw new Error("Training function not available");
        }

        console.log(
          "[Training] Starting real LoRA training with progress tracking..."
        );
        console.log(`[Training] Using adapter name: ${request.outputName}`);

        const result = await window.electronAPI.trainLoRAAdapter({
          conversations: trainingConversations,
          baseModel: request.baseModel,
          outputName: request.outputName, // Use the generated adapter name from TrainingSettings
        });

        if (result?.success) {
          setProgress(100);
          setStatus(
            `✅ ${t('training.trainingCompleted')} ${expectedModelName}`
          );
          setResult(result);
          onSuccess(result);
        } else {
          setProgress(0);
          setStatus(
            `❌ Training failed: ${result?.error || "Unknown error"}`
          );
          onError(result?.error || "Unknown error");
        }
      } catch (error) {
        setProgress(0);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        setStatus(`❌ Training error: ${errorMessage}`);
        onError(errorMessage);
      } finally {
        setIsTraining(false);
        const endTime = Date.now();
        const duration = endTime - (trainingStartTime || 0);
        setEstimatedTime(`Completed in ${Math.round(duration / 1000)}s`);
      }
    },
    [trainingStartTime, setIsTraining, setProgress, setStatus, setStartTime, setResult, setEstimatedTime]
  );

  const resetProgress = useCallback(() => {
    resetTrainingState();
  }, [resetTrainingState]);

  const clearStatus = useCallback(() => {
    setStatus("");
  }, [setStatus]);

  return {
    isTraining,
    trainingProgress,
    trainingStatus,
    trainingStartTime,
    estimatedTime,
    trainingResult,
    startTraining,
    resetProgress,
    clearStatus,
    setTrainingStatus: setStatus,
  };
};
