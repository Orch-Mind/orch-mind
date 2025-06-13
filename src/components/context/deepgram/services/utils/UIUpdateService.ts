// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// UIUpdateService.ts
// Service responsible for updating the UI and sending notifications

import { UIUpdater } from "../../interfaces/transcription/TranscriptionTypes";
import { IUIUpdateService } from "../../interfaces/utils/IUIUpdateService";
import { LoggingUtils } from "../../utils/LoggingUtils";

export class UIUpdateService implements IUIUpdateService {
  private setTexts: UIUpdater;
  
  constructor(setTexts: UIUpdater) {
    this.setTexts = setTexts;
  }
  
  /**
   * Updates the UI with new values
   */
  updateUI(update: Record<string, any>): void {
    this.setTexts((prev: any) => ({ ...prev, ...update }));
  }
  
  /**
   * Notifies the start of prompt processing via IPC
   */
  notifyPromptProcessingStarted(temporaryContext?: string): void {
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        // 1. Notify that we are sending the prompt (for UI to show loading)
        if (window.electronAPI.sendPromptUpdate) {
          window.electronAPI.sendPromptUpdate('partial', "Processing...");
        }
        
        // 2. Send command to main process via IPC
        if (window.electronAPI.sendNeuralPrompt) {
          window.electronAPI.sendNeuralPrompt(temporaryContext);
          LoggingUtils.logInfo("Prompt sent to main process");
        }
      } catch (e) {
        LoggingUtils.logError("Error sending notifications via IPC", e);
      }
    }
  }
  
  /**
   * Notifies the completion of the prompt via IPC
   */
  notifyPromptComplete(response: string): void {
    if (typeof window !== 'undefined' && window.electronAPI?.sendPromptUpdate) {
      try {
        window.electronAPI.sendPromptUpdate('complete', response);
        LoggingUtils.logInfo("Final response sent via IPC");
      } catch (e) {
        LoggingUtils.logError("Error sending final response via IPC", e);
      }
    }
  }
  
  /**
   * Notifies an error in prompt processing via IPC
   */
  notifyPromptError(errorMessage: string): void {
    if (typeof window !== 'undefined' && window.electronAPI?.sendPromptUpdate) {
      try {
        window.electronAPI.sendPromptUpdate('error', errorMessage);
      } catch (e) {
        LoggingUtils.logError("Error sending error notification via IPC", e);
      }
    }
  }
} 