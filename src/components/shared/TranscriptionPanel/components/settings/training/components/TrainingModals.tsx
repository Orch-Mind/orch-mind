// SPDX-License-Identifier: MIT OR Apache-2.0
// Training Modals Component - Following SRP and KISS
// Single responsibility: Handle all training-related modals

import React from "react";
import { useTranslation } from "react-i18next";
import type { ModalState, TrainingDetails } from "../types";

interface TrainingModalsProps {
  modalState: ModalState;
  adapterName: string;
  trainingDetails: TrainingDetails | null;
  isDeleting: boolean;
  onResetTraining: () => void;
  onDeleteAdapter: () => void;
  onHideSuccessModal: () => void;
  onHideResetModal: () => void;
  onHideDeleteModal: () => void;
}

export const TrainingModals: React.FC<TrainingModalsProps> = ({
  modalState,
  adapterName,
  trainingDetails,
  isDeleting,
  onResetTraining,
  onDeleteAdapter,
  onHideSuccessModal,
  onHideResetModal,
  onHideDeleteModal,
}) => {
  return (
    <>
      {/* Success Modal */}
      {modalState.showSuccess && (
        <SuccessModal
          adapterName={adapterName}
          trainingDetails={trainingDetails}
          onClose={onHideSuccessModal}
        />
      )}

      {/* Reset Modal */}
      {modalState.showReset && (
        <ResetModal onConfirm={onResetTraining} onClose={onHideResetModal} />
      )}

      {/* Delete Adapter Modal */}
      {modalState.showDeleteAdapter && (
        <DeleteAdapterModal
          adapterId={modalState.adapterToDelete}
          isDeleting={isDeleting}
          onConfirm={onDeleteAdapter}
          onClose={onHideDeleteModal}
        />
      )}
    </>
  );
};

// Success Modal Component (SRP)
interface SuccessModalProps {
  adapterName: string;
  trainingDetails: TrainingDetails | null;
  onClose: () => void;
}

const SuccessModal: React.FC<SuccessModalProps> = ({
  adapterName,
  trainingDetails,
  onClose,
}) => {
  const { t } = useTranslation();
  
  return (
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
          LoRA Adapter Created!
        </h3>
        <p className="text-gray-300 mb-4">
          {t("training.successModal.description", "Your LoRA adapter")}{" "}
          <span className="text-cyan-400 font-mono text-sm">{adapterName}</span>{" "}
          {t("training.successModal.descriptionEnd", "has been created successfully.")}
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
          The adapter is ready to be enabled/disabled from the LoRA Adapters
          panel.
        </p>

        <div className="flex justify-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors font-semibold"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  </div>
  );
};

// Reset Modal Component (SRP)
interface ResetModalProps {
  onConfirm: () => void;
  onClose: () => void;
}

const ResetModal: React.FC<ResetModalProps> = ({ onConfirm, onClose }) => {
  const { t } = useTranslation();
  
  return (
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
          {t("training.resetModal.title", "Delete All LoRA Adapters?")}
        </h3>
        <p className="text-gray-300 mb-4">
          {t("training.resetModal.description", "This will permanently delete all your LoRA adapters. Your conversations will be preserved.")}
        </p>

        <div className="mb-4 p-3 bg-red-900/20 rounded-lg text-sm text-red-200">
          <p className="font-medium mb-1">{t("training.resetModal.actionWillLabel", "This action will:")}</p>
          <ul className="text-left space-y-1">
            <li>• {t("training.resetModal.deleteAdapters", "Delete all LoRA adapters from localStorage")}</li>
            <li>• {t("training.resetModal.clearHistory", "Clear training status history")}</li>
            <li>
              • <strong>{t("training.resetModal.preserve", "PRESERVE")}</strong> {t("training.resetModal.preserveConversations", "all conversations and chat history")}
            </li>
            <li>
              • <strong>{t("training.resetModal.notDelete", "NOT")}</strong> {t("training.resetModal.notDeleteFiles", "delete actual adapter files from disk")}
            </li>
          </ul>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            {t("training.resetModal.cancel", "Cancel")}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
          >
            {t("training.resetModal.deleteAdaptersButton", "Delete Adapters")}
          </button>
        </div>
      </div>
    </div>
  </div>
  );
};

// Delete Adapter Modal Component (SRP)
interface DeleteAdapterModalProps {
  adapterId: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const DeleteAdapterModal: React.FC<DeleteAdapterModalProps> = ({
  adapterId,
  isDeleting,
  onConfirm,
  onClose,
}) => {
  const { t } = useTranslation();
  
  return (
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
          {t("training.deleteModal.title", "Delete LoRA Adapter?")}
        </h3>
        <p className="text-gray-300 mb-4">
          {t("training.deleteModal.description", "Are you sure you want to delete the LoRA adapter")}{" "}
          <span className="text-red-400 font-mono text-sm">{adapterId}</span>?
        </p>

        <div className="mb-4 p-3 bg-red-900/20 rounded-lg text-sm text-red-200">
          <p className="font-medium mb-1">{t("training.deleteModal.actionWillLabel", "This action will:")}</p>
          <ul className="text-left space-y-1">
            <li>• {t("training.deleteModal.deleteFiles", "Permanently delete the adapter files")}</li>
            <li>• {t("training.deleteModal.removeFromList", "Remove the adapter from your adapters list")}</li>
            <li>• {t("training.deleteModal.disableAdapter", "Disable the adapter if currently enabled")}</li>
          </ul>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            {t("training.deleteModal.cancel", "Cancel")}
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50"
          >
            {isDeleting ? t("training.deleteModal.deleting", "Deleting...") : t("training.deleteModal.deleteButton", "Delete Adapter")}
          </button>
        </div>
      </div>
    </div>
  </div>
  );
};
