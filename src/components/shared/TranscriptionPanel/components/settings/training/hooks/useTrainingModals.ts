// SPDX-License-Identifier: MIT OR Apache-2.0
// Hook for managing training modals - Following SRP
// Single responsibility: Handle modal states and interactions

import { useState } from 'react';
import type { ModalState } from '../types';

export const useTrainingModals = () => {
  const [modalState, setModalState] = useState<ModalState>({
    showSuccess: false,
    showReset: false,
    showDeleteModel: false,
    modelToDelete: "",
  });
  const [trainedModelName, setTrainedModelName] = useState("");

  const showSuccessModal = (modelName: string) => {
    setTrainedModelName(modelName);
    setModalState(prev => ({ ...prev, showSuccess: true }));
  };

  const hideSuccessModal = () => {
    setModalState(prev => ({ ...prev, showSuccess: false }));
    setTrainedModelName("");
  };

  const showResetModal = () => {
    setModalState(prev => ({ ...prev, showReset: true }));
  };

  const hideResetModal = () => {
    setModalState(prev => ({ ...prev, showReset: false }));
  };

  const showDeleteModelModal = (modelName: string) => {
    setModalState(prev => ({ 
      ...prev, 
      showDeleteModel: true, 
      modelToDelete: modelName 
    }));
  };

  const hideDeleteModelModal = () => {
    setModalState(prev => ({ 
      ...prev, 
      showDeleteModel: false, 
      modelToDelete: "" 
    }));
  };

  return {
    modalState,
    trainedModelName,
    showSuccessModal,
    hideSuccessModal,
    showResetModal,
    hideResetModal,
    showDeleteModelModal,
    hideDeleteModelModal,
  };
};