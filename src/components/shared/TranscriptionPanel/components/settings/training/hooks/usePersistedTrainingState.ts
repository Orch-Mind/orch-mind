// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useEffect, useState, useCallback } from "react";
import type { TrainingResult } from "../types";

// Interface for training state info
export interface TrainingStateInfo {
  isTraining: boolean;
  progress: number;
  status: string;
  startTime: number | null;
  estimatedTime: string;
  result: TrainingResult | null;
}

// Global store for persistent training state
class TrainingStateStore {
  private static instance: TrainingStateStore;
  private trainingState: TrainingStateInfo = {
    isTraining: false,
    progress: 0,
    status: "",
    startTime: null,
    estimatedTime: "",
    result: null
  };
  private listeners: Set<(state: TrainingStateInfo) => void> = new Set();

  static getInstance(): TrainingStateStore {
    if (!TrainingStateStore.instance) {
      TrainingStateStore.instance = new TrainingStateStore();
    }
    return TrainingStateStore.instance;
  }

  getTrainingState(): TrainingStateInfo {
    return { ...this.trainingState };
  }

  updateTrainingState(updates: Partial<TrainingStateInfo>): void {
    this.trainingState = {
      ...this.trainingState,
      ...updates
    };
    this.notifyListeners();
  }

  setIsTraining(isTraining: boolean): void {
    this.trainingState.isTraining = isTraining;
    this.notifyListeners();
  }

  setProgress(progress: number): void {
    this.trainingState.progress = progress;
    this.notifyListeners();
  }

  setStatus(status: string): void {
    this.trainingState.status = status;
    this.notifyListeners();
  }

  setStartTime(startTime: number | null): void {
    this.trainingState.startTime = startTime;
    this.notifyListeners();
  }

  setEstimatedTime(estimatedTime: string): void {
    this.trainingState.estimatedTime = estimatedTime;
    this.notifyListeners();
  }

  setResult(result: TrainingResult | null): void {
    this.trainingState.result = result;
    this.notifyListeners();
  }

  resetTrainingState(): void {
    this.trainingState = {
      isTraining: false,
      progress: 0,
      status: "",
      startTime: null,
      estimatedTime: "",
      result: null
    };
    this.notifyListeners();
  }

  subscribe(listener: (state: TrainingStateInfo) => void): () => void {
    this.listeners.add(listener);
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const currentState = this.getTrainingState();
    this.listeners.forEach(listener => listener(currentState));
  }
}

/**
 * Hook para gerenciar estado persistente de treinamento
 * Mantém o estado mesmo quando o componente é desmontado (troca de abas)
 */
export const usePersistedTrainingState = () => {
  const store = TrainingStateStore.getInstance();
  const [trainingState, setTrainingState] = useState<TrainingStateInfo>(
    store.getTrainingState()
  );

  useEffect(() => {
    // Subscribe to store changes
    const unsubscribe = store.subscribe((state) => {
      setTrainingState(state);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, [store]);

  const updateTrainingState = useCallback((updates: Partial<TrainingStateInfo>) => {
    store.updateTrainingState(updates);
  }, [store]);

  const setIsTraining = useCallback((isTraining: boolean) => {
    store.setIsTraining(isTraining);
  }, [store]);

  const setProgress = useCallback((progress: number) => {
    store.setProgress(progress);
  }, [store]);

  const setStatus = useCallback((status: string) => {
    store.setStatus(status);
  }, [store]);

  const setStartTime = useCallback((startTime: number | null) => {
    store.setStartTime(startTime);
  }, [store]);

  const setEstimatedTime = useCallback((estimatedTime: string) => {
    store.setEstimatedTime(estimatedTime);
  }, [store]);

  const setResult = useCallback((result: TrainingResult | null) => {
    store.setResult(result);
  }, [store]);

  const resetTrainingState = useCallback(() => {
    store.resetTrainingState();
  }, [store]);

  return {
    // Current state
    isTraining: trainingState.isTraining,
    trainingProgress: trainingState.progress,
    trainingStatus: trainingState.status,
    trainingStartTime: trainingState.startTime,
    estimatedTime: trainingState.estimatedTime,
    trainingResult: trainingState.result,
    
    // State setters
    setIsTraining,
    setProgress,
    setStatus,
    setStartTime,
    setEstimatedTime,
    setResult,
    resetTrainingState,
    updateTrainingState
  };
};
