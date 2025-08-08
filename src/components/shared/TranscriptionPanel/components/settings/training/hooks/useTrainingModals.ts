// SPDX-License-Identifier: MIT OR Apache-2.0
// Hook for managing training modals - Refactored to use a singleton store
// Single responsibility: Handle modal states and interactions via a persistent store

import { useState, useEffect, useCallback } from "react";
import type { ModalState } from "../types";

// Interface for the state managed by the store
interface TrainingModalInfo {
  modalState: ModalState;
  adapterName: string;
  trainedModelName: string;
}

// Singleton store to hold modal state, ensuring it persists across unmounts
class TrainingModalStateStore {
  private static instance: TrainingModalStateStore;
  private state: TrainingModalInfo;
  private subscribers: ((state: TrainingModalInfo) => void)[] = [];

  private constructor() {
    this.state = {
      modalState: {
        showSuccess: false,
        showReset: false,
        showDeleteModel: false,
        showDeleteAdapter: false,
        modelToDelete: "",
        adapterToDelete: "",
      },
      adapterName: "",
      trainedModelName: "",
    };
  }

  public static getInstance(): TrainingModalStateStore {
    if (!TrainingModalStateStore.instance) {
      TrainingModalStateStore.instance = new TrainingModalStateStore();
    }
    return TrainingModalStateStore.instance;
  }

  public getState(): TrainingModalInfo {
    return this.state;
  }

  public subscribe(callback: (state: TrainingModalInfo) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  private notify() {
    this.subscribers.forEach((callback) => callback(this.state));
  }

  public updateState(updates: Partial<TrainingModalInfo>) {
    this.state = { ...this.state, ...updates };
    this.notify();
  }

  public setModalState(modalState: ModalState) {
    this.updateState({ modalState });
  }

  public setAdapterName(adapterName: string) {
    this.updateState({ adapterName });
  }

  public setTrainedModelName(trainedModelName: string) {
    this.updateState({ trainedModelName });
  }
}

// The refactored hook that uses the singleton store
export const useTrainingModals = () => {
  const store = TrainingModalStateStore.getInstance();
  const [state, setState] = useState<TrainingModalInfo>(store.getState());

  useEffect(() => {
    const unsubscribe = store.subscribe(setState);
    return unsubscribe;
  }, [store]);

  const showSuccessModal = useCallback((modelName: string) => {
    store.setTrainedModelName(modelName);
    store.setAdapterName(modelName); // For backward compatibility
    store.setModalState({ ...store.getState().modalState, showSuccess: true });
  }, [store]);

  const hideSuccessModal = useCallback(() => {
    store.setTrainedModelName("");
    store.setAdapterName("");
    store.setModalState({ ...store.getState().modalState, showSuccess: false });
  }, [store]);

  const showResetModal = useCallback(() => {
    store.setModalState({ ...store.getState().modalState, showReset: true });
  }, [store]);

  const hideResetModal = useCallback(() => {
    store.setModalState({ ...store.getState().modalState, showReset: false });
  }, [store]);

  const showDeleteModelModal = useCallback((modelName: string) => {
    store.setModalState({
      ...store.getState().modalState,
      showDeleteModel: true,
      modelToDelete: modelName,
    });
  }, [store]);

  const hideDeleteModelModal = useCallback(() => {
    store.setModalState({
      ...store.getState().modalState,
      showDeleteModel: false,
      modelToDelete: "",
    });
  }, [store]);

  const showDeleteAdapterModal = useCallback((adapterId: string) => {
    store.setModalState({
      ...store.getState().modalState,
      showDeleteAdapter: true,
      adapterToDelete: adapterId,
    });
  }, [store]);

  const hideDeleteAdapterModal = useCallback(() => {
    store.setModalState({
      ...store.getState().modalState,
      showDeleteAdapter: false,
      adapterToDelete: "",
    });
  }, [store]);

  return {
    modalState: state.modalState,
    trainedModelName: state.trainedModelName,
    adapterName: state.adapterName,
    showSuccessModal,
    hideSuccessModal,
    showResetModal,
    hideResetModal,
    showDeleteModelModal,
    hideDeleteModelModal,
    showDeleteAdapterModal,
    hideDeleteAdapterModal,
  };
};
