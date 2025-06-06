// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useState } from 'react';
import { ModeService } from '../../../../services/ModeService';
import { ToastVariant } from '../../../ui/toast';
import { ImportMode } from '../types/interfaces';

// Custom hook following Single Responsibility and Open/Closed principles
export const useChatGptImport = (
  showToast: (title: string, description: string, variant: ToastVariant) => void
) => {
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importUserName, setImportUserName] = useState<string>("");
  const [importMode, setImportMode] = useState<ImportMode>('increment');
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
  const handleStartImport = async (userName: string) => {
    console.log('[useChatGptImport] handleStartImport chamado. importMode:', importMode, '| importUserName:', userName, '| importFile:', !!importFile);

    if (!importFile) return;
    
    setIsImporting(true);
    setImportProgress(0);
    setImportStage(""); // Clear stage on new import
    setImportSummary("");
    
    try {
      // Read file as buffer
      const fileBuffer = await importFile.arrayBuffer();
      
      type ProgressData = { processed: number; total: number; percentage?: number; stage?: string };

      // Vamos usar a solução original com uma pequena modificação
      // para evitar pulos bruscos
      
      // Armazenar o último percentual para evitar regressão
      let lastPercent = 0;
      
      // Get current application mode to pass to import process
      const applicationMode = ModeService.getMode();
      console.log('[useChatGptImport] Using applicationMode:', applicationMode);
      
      const result = await window.electronAPI.importChatHistory({
        fileBuffer,
        mode: importMode,
        user: userName,
        applicationMode,
        onProgress: (data: ProgressData) => {
          // Usar o percentual enviado ou calcular
          let percent = data.percentage !== undefined 
            ? data.percentage 
            : Math.round((data.processed / Math.max(1, data.total)) * 100);
          
          // Garantir que o progresso nunca regride
          if (percent < lastPercent && lastPercent < 95) {
            percent = lastPercent;
          } else {
            lastPercent = percent;
          }
          
          // Atualizar o estado
          setImportProgress(percent);
          if (data.stage) setImportStage(data.stage);
          
          // Atualizar o título e log
          document.title = `Importing... ${percent}%`;
          console.log(`[RENDERER] Progress: ${percent}% (${data.processed}/${data.total}) | Stage: ${data.stage || ''}`);
        },
      });
      
      // Ensure progress bar is visible for at least a minimum duration
      const minDisplay = process.env.NODE_ENV === 'test' ? 1000 : 200;
      await new Promise(res => setTimeout(res, minDisplay));
      
      setIsImporting(false);
      setImportProgress(100);
      
      // Update summary based on result
      if (result?.imported !== undefined && result?.skipped !== undefined) {
        setImportSummary(`Import complete! Imported: ${result.imported}, Skipped: ${result.skipped}`);
        showToast("Import complete", `Imported: ${result.imported}, Ignored: ${result.skipped}`, "success");
      } else if (result?.success) {
        setImportSummary('Import complete!');
        showToast("Import complete", "Process completed successfully", "success");
      } else {
        setImportSummary(`Error: ${result?.error || "Unknown failure"}`);
        showToast("Error", result?.error || "Unknown failure", "error");
      }
    } catch (err: unknown) {
      setIsImporting(false);
      let errorMsg = "Import failed";
      if (err instanceof Error) {
        errorMsg = err.message;
      } else if (typeof err === "string") {
        errorMsg = err;
      }
      setImportSummary(`Error: ${errorMsg}`);
      showToast("Error", errorMsg, "error");
    }
  };

  // Handler to close import modal
  const handleCloseImportModal = () => {
    setShowImportModal(false);
    setImportFile(null);
    setImportProgress(0);
    setImportSummary("");
    setIsImporting(false);
  };

  return {
    // State
    importFile,
    setImportFile,
    importUserName,
    setImportUserName,
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
    handleCloseImportModal
  };
};
