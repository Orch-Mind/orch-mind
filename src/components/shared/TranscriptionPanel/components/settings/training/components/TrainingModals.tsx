// SPDX-License-Identifier: MIT OR Apache-2.0
// Training Modals Component - Following SRP and KISS
// Single responsibility: Handle all training-related modals

import React from 'react';
import type { ModalState, TrainingDetails } from '../types';

interface TrainingModalsProps {
  modalState: ModalState;
  trainedModelName: string;
  trainingDetails: TrainingDetails | null;
  isDeleting: boolean;
  onActivateModel: () => void;
  onResetTraining: () => void;
  onDeleteModel: () => void;
  onHideSuccessModal: () => void;
  onHideResetModal: () => void;
  onHideDeleteModal: () => void;
}

export const TrainingModals: React.FC<TrainingModalsProps> = ({
  modalState,
  trainedModelName,
  trainingDetails,
  isDeleting,
  onActivateModel,
  onResetTraining,
  onDeleteModel,
  onHideSuccessModal,
  onHideResetModal,
  onHideDeleteModal,
}) => {
  return (
    <>
      {/* Success Modal */}
      {modalState.showSuccess && (
        <SuccessModal
          modelName={trainedModelName}
          trainingDetails={trainingDetails}
          onActivate={onActivateModel}
          onClose={onHideSuccessModal}
        />
      )}

      {/* Reset Modal */}
      {modalState.showReset && (
        <ResetModal
          onConfirm={onResetTraining}
          onClose={onHideResetModal}
        />
      )}

      {/* Delete Model Modal */}
      {modalState.showDeleteModel && (
        <DeleteModelModal
          modelName={modalState.modelToDelete}
          isDeleting={isDeleting}
          onConfirm={onDeleteModel}
          onClose={onHideDeleteModal}
        />
      )}
    </>
  );
};

// Success Modal Component (SRP)
interface SuccessModalProps {
  modelName: string;
  trainingDetails: TrainingDetails | null;
  onActivate: () => void;
  onClose: () => void;
}

const SuccessModal: React.FC<SuccessModalProps> = ({
  modelName,
  trainingDetails,
  onActivate,
  onClose,
}) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[2000] flex items-center justify-center">
    <div className="bg-gray-900 border border-cyan-400/30 rounded-lg p-6 max-w-md mx-4">
      <div className="text-center">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h3 className="text-xl font-semibold text-white mb-2">
          Training Completed!
        </h3>
        <p className="text-gray-300 mb-4">
          Your custom model{" "}
          <span className="text-cyan-400 font-mono text-sm">
            {modelName}
          </span>{" "}
          has been created successfully.
        </p>

        {trainingDetails && (
          <div className="mb-4 p-3 bg-gray-800/50 rounded-lg text-sm">
            <div className="text-gray-300">
              <div className="flex justify-between">
                <span>Training Examples:</span>
                <span className="text-cyan-400">
                  {trainingDetails.trainingExamples}
                </span>
              </div>
              {trainingDetails.trainingDuration && (
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span className="text-cyan-400">
                    {Math.round(trainingDetails.trainingDuration / 1000)}s
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <p className="text-sm text-gray-400 mb-6">
          Would you like to activate this model now?
        </p>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Keep Current Model
          </button>
          <button
            onClick={onActivate}
            className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors font-semibold"
          >
            Activate New Model
          </button>
        </div>
      </div>
    </div>
  </div>
);

// Reset Modal Component (SRP)
interface ResetModalProps {
  onConfirm: () => void;
  onClose: () => void;
}

const ResetModal: React.FC<ResetModalProps> = ({ onConfirm, onClose }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[2000] flex items-center justify-center">
    <div className="bg-gray-900 border border-yellow-400/30 rounded-lg p-6 max-w-md mx-4">
      <div className="text-center">
        <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-yellow-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>

        <h3 className="text-xl font-semibold text-white mb-2">
          Reset Training Data?
        </h3>
        <p className="text-gray-300 mb-4">
          This will clear all training history and reset conversation processing status.
        </p>

        <div className="mb-4 p-3 bg-yellow-900/20 rounded-lg text-sm text-yellow-200">
          <p className="font-medium mb-1">This action will:</p>
          <ul className="text-left space-y-1">
            <li>• Clear all conversation processing status</li>
            <li>• Remove training history from localStorage</li>
            <li>• Reset trained models list</li>
            <li>• <strong>NOT</strong> delete actual models from Ollama</li>
          </ul>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-semibold"
          >
            Reset Training Data
          </button>
        </div>
      </div>
    </div>
  </div>
);

// Delete Model Modal Component (SRP)
interface DeleteModelModalProps {
  modelName: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const DeleteModelModal: React.FC<DeleteModelModalProps> = ({
  modelName,
  isDeleting,
  onConfirm,
  onClose,
}) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[2000] flex items-center justify-center">
    <div className="bg-gray-900 border border-red-400/30 rounded-lg p-6 max-w-md mx-4">
      <div className="text-center">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </div>

        <h3 className="text-xl font-semibold text-white mb-2">
          Delete Model?
        </h3>
        <p className="text-gray-300 mb-4">
          Are you sure you want to delete the model{" "}
          <span className="text-red-400 font-mono text-sm">
            {modelName}
          </span>
          ?
        </p>

        <div className="mb-4 p-3 bg-red-900/20 rounded-lg text-sm text-red-200">
          <p className="font-medium mb-1">This action will:</p>
          <ul className="text-left space-y-1">
            <li>• Permanently delete the model from Ollama</li>
            <li>• Remove the model from your trained models list</li>
            <li>• Free up disk space used by the model</li>
          </ul>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50"
          >
            {isDeleting ? "Deleting..." : "Delete Model"}
          </button>
        </div>
      </div>
    </div>
  </div>
);