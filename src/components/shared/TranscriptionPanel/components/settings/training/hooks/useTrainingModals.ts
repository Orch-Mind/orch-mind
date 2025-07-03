// SPDX-License-Identifier: MIT OR Apache-2.0
// Hook for managing training modals - Following SRP
// Single responsibility: Handle modal states and interactions

import { useState } from "react";
import type { ModalState } from "../types";

export const useTrainingModals = () => {
  const [modalState, setModalState] = useState<ModalState>({
    showSuccess: false,
    showReset: false,
    showDeleteModel: false,
    showDeleteAdapter: false, // New for adapters
    modelToDelete: "",
    adapterToDelete: "", // New for adapters
  });
  const [trainedModelName, setTrainedModelName] = useState("");
  const [adapterName, setAdapterName] = useState(""); // New for adapters

  const showSuccessModal = (modelName: string) => {
    setTrainedModelName(modelName);
    setAdapterName(modelName); // For backward compatibility
    setModalState((prev) => ({ ...prev, showSuccess: true }));
  };

  const hideSuccessModal = () => {
    setModalState((prev) => ({ ...prev, showSuccess: false }));
    setTrainedModelName("");
    setAdapterName("");
  };

  const showResetModal = () => {
    setModalState((prev) => ({ ...prev, showReset: true }));
  };

  const hideResetModal = () => {
    setModalState((prev) => ({ ...prev, showReset: false }));
  };

  const showDeleteModelModal = (modelName: string) => {
    setModalState((prev) => ({
      ...prev,
      showDeleteModel: true,
      modelToDelete: modelName,
    }));
  };

  const hideDeleteModelModal = () => {
    setModalState((prev) => ({
      ...prev,
      showDeleteModel: false,
      modelToDelete: "",
    }));
  };

  // New functions for adapters
  const showDeleteAdapterModal = (adapterId: string) => {
    setModalState((prev) => ({
      ...prev,
      showDeleteAdapter: true,
      adapterToDelete: adapterId,
    }));
  };

  const hideDeleteAdapterModal = () => {
    setModalState((prev) => ({
      ...prev,
      showDeleteAdapter: false,
      adapterToDelete: "",
    }));
  };

  return {
    modalState,
    trainedModelName,
    adapterName, // New export
    showSuccessModal,
    hideSuccessModal,
    showResetModal,
    hideResetModal,
    showDeleteModelModal,
    hideDeleteModelModal,
    showDeleteAdapterModal, // New export
    hideDeleteAdapterModal, // New export
  };
};
