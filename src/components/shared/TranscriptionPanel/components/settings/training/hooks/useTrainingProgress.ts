// SPDX-License-Identifier: MIT OR Apache-2.0
// Hook for managing training progress - Following SRP
// Single responsibility: Handle training progress, status, and execution

import { useCallback, useState } from "react";
import type { TrainingRequest, TrainingResult } from "../types";
import { getProgressMessage, updateTimeEstimate } from "../utils";

export const useTrainingProgress = () => {
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [trainingStatus, setTrainingStatus] = useState<string>("");
  const [trainingStartTime, setTrainingStartTime] = useState<number | null>(
    null
  );
  const [estimatedTime, setEstimatedTime] = useState<string>("");
  const [trainingResult, setTrainingResult] = useState<TrainingResult | null>(
    null
  );

  const startTraining = useCallback(
    async (
      request: TrainingRequest,
      onSuccess: (result: TrainingResult) => void,
      onError: (error: string) => void
    ) => {
      setIsTraining(true);
      setTrainingProgress(0);
      setTrainingStatus("Preparing training data...");
      setTrainingStartTime(Date.now());
      setTrainingResult(null);

      // Always use master naming for incremental training
      const baseModelClean = request.baseModel
        .replace(":latest", "");
      const expectedModelName = `${baseModelClean}-custom:latest`;
      let progressInterval: NodeJS.Timeout | null = null;

      try {
        // Start progress simulation
        progressInterval = setInterval(() => {
          setTrainingProgress((prev) => {
            // More realistic progress simulation with smaller, smoother increments
            let increment: number;

            if (prev < 20) {
              increment = Math.random() * 8 + 2; // 2-10% increments for early stages
            } else if (prev < 60) {
              increment = Math.random() * 6 + 1; // 1-7% increments for middle stages
            } else if (prev < 85) {
              increment = Math.random() * 4 + 0.5; // 0.5-4.5% increments for later stages
            } else {
              increment = Math.random() * 2 + 0.2; // 0.2-2.2% increments for final stages
            }

            const newProgress = Math.min(prev + increment, 90);

            // Update status based on progress
            setTrainingStatus(getProgressMessage(newProgress));

            // Update time estimate
            if (trainingStartTime) {
              const estimate = updateTimeEstimate(
                newProgress,
                trainingStartTime
              );
              setEstimatedTime(estimate);
            }

            return newProgress;
          });
        }, 1500); // Update every 1.5 seconds for smoother animation

        // Training conversations already loaded with messages from TrainingSettings
        const trainingConversations = request.conversations;

        // Execute training via Electron API
        if (!window.electronAPI?.trainLoRAAdapter) {
          throw new Error("Training function not available");
        }

        const result = await window.electronAPI.trainLoRAAdapter({
          conversations: trainingConversations,
          baseModel: request.baseModel,
          outputName: "master", // Always master for incremental
        });

        // Clear progress interval
        if (progressInterval) {
          clearInterval(progressInterval);
        }

        if (result?.success) {
          setTrainingProgress(100);
          setTrainingStatus(
            `✅ Training completed! Model: ${expectedModelName}`
          );
          setTrainingResult(result);
          onSuccess(result);
        } else {
          setTrainingProgress(0);
          setTrainingStatus(
            `❌ Training failed: ${result?.error || "Unknown error"}`
          );
          onError(result?.error || "Unknown error");
        }
      } catch (error) {
        if (progressInterval) {
          clearInterval(progressInterval);
        }
        setTrainingProgress(0);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        setTrainingStatus(`❌ Training error: ${errorMessage}`);
        onError(errorMessage);
      } finally {
        setIsTraining(false);
        const endTime = Date.now();
        const duration = endTime - (trainingStartTime || 0);
        setEstimatedTime(`Completed in ${Math.round(duration / 1000)}s`);
      }
    },
    [trainingStartTime]
  );

  const resetProgress = useCallback(() => {
    setIsTraining(false);
    setTrainingProgress(0);
    setTrainingStatus("");
    setTrainingStartTime(null);
    setEstimatedTime("");
    setTrainingResult(null);
  }, []);

  const clearStatus = useCallback(() => {
    setTrainingStatus("");
  }, []);

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
    setTrainingStatus,
  };
};
