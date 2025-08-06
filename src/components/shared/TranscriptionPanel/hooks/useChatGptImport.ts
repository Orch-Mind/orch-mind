// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { getOption, STORAGE_KEYS } from "../../../../services/StorageService";
import { ToastVariant } from "../../../ui/toast";
import { ImportMode } from "../types/interfaces";

// Custom hook following Single Responsibility and Open/Closed principles
export const useChatGptImport = (
  showToast: (title: string, description: string, variant: ToastVariant) => void
) => {
  const { t } = useTranslation();
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>("increment");
  const [importProgress, setImportProgress] = useState<number>(0);
  const [importStage, setImportStage] = useState<string>("");
  const [importSummary, setImportSummary] = useState<string>("");
  const [isImporting, setIsImporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Handler for file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImportFile(e.target.files[0]);
      setImportSummary("");
    }
  };

  // Handler for starting the import process
  const handleStartImport = async () => {
    // Get userName from storage settings
    // This uses the same userName configured in General Settings (Settings modal)
    // The user can update their name in Settings → General → User Name
    const userName = getOption(STORAGE_KEYS.USER_NAME) || "User";

    console.log(
      "[useChatGptImport] handleStartImport called. importMode:",
      importMode,
      "| userName from settings:",
      userName,
      "| importFile:",
      !!importFile
    );

    if (!importFile) return;

    setIsImporting(true);
    setImportProgress(0);
    setImportStage("Preparing..."); // Initial stage
    setImportSummary("");

    try {
      // Read file as buffer
      const fileBuffer = await importFile.arrayBuffer();

      type ProgressData = {
        processed: number;
        total: number;
        percentage?: number;
        stage?: string;
      };

      // Track the last valid progress to ensure smooth progression
      let lastValidProgress = 0;
      let stageStartTime = Date.now();

      const result = await window.electronAPI.importChatHistory({
        fileBuffer,
        mode: importMode,
        user: userName,
        onProgress: (data: ProgressData) => {
          // Use the percentage directly from backend (now with weighted stages)
          const currentProgress = data.percentage ?? 0;

          // Ensure progress never goes backwards
          const finalProgress = Math.max(
            lastValidProgress,
            Math.min(currentProgress, 100)
          );
          lastValidProgress = finalProgress;

          // Update progress state
          setImportProgress(finalProgress);

          // Update stage with user-friendly text
          if (data.stage) {
            const stageText = getStageText(data.stage);
            setImportStage(stageText);

            // Log stage transitions for debugging
            const elapsed = Date.now() - stageStartTime;
            console.log(
              `[RENDERER] Stage transition: ${data.stage} (${stageText}) after ${elapsed}ms`
            );
            stageStartTime = Date.now();
          }

          // Update window title
          document.title = `Importing... ${finalProgress}%`;

          // Detailed logging for debugging
          console.log(
            `[RENDERER] Progress: ${finalProgress}% | Stage: ${
              data.stage || "unknown"
            } | Raw: ${data.processed}/${data.total}`
          );
        },
      });

      // Ensure progress reaches 100% on completion
      setImportProgress(100);
      setImportStage("Complete");

      // Reset window title
      document.title = "Orch-Mind";

      // Small delay before hiding progress to show completion
      await new Promise((res) => setTimeout(res, 500));

      setIsImporting(false);

      // Update summary based on result
      if (result?.imported !== undefined && result?.skipped !== undefined) {
        setImportSummary(
          `Import complete! Imported: ${result.imported}, Skipped: ${result.skipped}`
        );
        showToast(
          "Import complete",
          `Imported: ${result.imported}, Ignored: ${result.skipped}`,
          "success"
        );
      } else if (result?.success) {
        setImportSummary("Import complete!");
        showToast(
          "Import complete",
          "Process completed successfully",
          "success"
        );
      } else {
        setImportSummary(`Error: ${result?.error || "Unknown failure"}`);
        showToast("Error", result?.error || "Unknown failure", "error");
      }
    } catch (err: unknown) {
      setIsImporting(false);
      setImportProgress(0);
      setImportStage("");

      let errorMsg = "Import failed";
      if (err instanceof Error) {
        errorMsg = err.message;
      } else if (typeof err === "string") {
        errorMsg = err;
      }

      setImportSummary(`Error: ${errorMsg}`);
      showToast("Error", errorMsg, "error");

      // Reset window title on error
      document.title = "Orch-Mind";
    }
  };

  // Helper function to get user-friendly stage text
  const getStageText = (stage: string): string => {
    switch (stage) {
      case "parsing":
        return t('chatMessages.readingMessages');
      case "deduplicating":
        return t('chatMessages.checkingDuplicates');
      case "generating_embeddings":
        return t('chatMessages.generatingEmbeddings');
      case "saving":
        return t('chatMessages.savingToDatabase');
      default:
        return stage || t('chatMessages.processing');
    }
  };

  // Handler to close import modal
  const handleCloseImportModal = () => {
    setShowImportModal(false);
    setImportFile(null);
    setImportProgress(0);
    setImportStage("");
    setImportSummary("");
    setIsImporting(false);
  };

  return {
    // State
    importFile,
    setImportFile,
    importMode,
    setImportMode,
    importProgress,
    importStage,
    importSummary,
    isImporting,
    showImportModal,
    setShowImportModal,

    // Methods
    handleFileChange,
    handleStartImport,
    handleCloseImportModal,
  };
};
