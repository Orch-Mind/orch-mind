// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// IUIUpdateService.ts
// Interface for the UI update service and notifications

export interface IUIUpdateService {
  /**
   * Updates the UI with new values
   */
  updateUI(update: Record<string, any>): void;

  /**
   * Notifies the start of prompt processing via IPC
   */
  notifyPromptProcessingStarted(temporaryContext?: string): void;

  /**
   * Notifies the completion of prompt processing via IPC
   */
  notifyPromptComplete(response: string): void;

  /**
   * Notifies an error in prompt processing via IPC
   */
  notifyPromptError(errorMessage: string): void;

  /**
   * Shows a processing phase status in the UI
   */
  showProcessingPhase?(
    phaseName: string,
    phaseNumber?: number,
    totalPhases?: number
  ): void;

  /**
   * Notifies the start of streaming response
   */
  notifyStreamingStarted?(): void;

  /**
   * Sends a chunk of streaming response
   */
  notifyStreamingChunk?(chunk: string): void;

  /**
   * Notifies the end of streaming response
   */
  notifyStreamingComplete?(): void;
}
