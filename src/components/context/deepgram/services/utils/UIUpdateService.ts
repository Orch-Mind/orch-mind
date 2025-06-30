// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// UIUpdateService.ts
// Service responsible for updating the UI

import React from "react";
import { IUIUpdateService } from "../../interfaces/utils/IUIUpdateService";
import { LoggingUtils } from "../../utils/LoggingUtils";
import { UIUpdater } from "../../interfaces/transcription/TranscriptionTypes";

export class UIUpdateService implements IUIUpdateService {
  constructor(
    private setTexts: UIUpdater
  ) {}

  updateUI(update: Partial<Record<string, any>>, source?: string): void {
    const logSource = source || "unknown";

    // Prevent updating with empty or generic status-like values for aiResponse
    if ("aiResponse" in update && typeof update.aiResponse === "string") {
      const textValue = (update.aiResponse || "").trim();
      const isGeneric =
        textValue === "Generating Response..." ||
        textValue === "Processando...";

      if (!textValue || isGeneric) {
        LoggingUtils.logInfo(
          `[UIUpdateService] Skipped empty/generic AI response update from ${logSource}`
        );
        // If there are other updates besides aiResponse, process them
        const { aiResponse, ...rest } = update;
        if (Object.keys(rest).length > 0) {
          this.setTexts((prev: Record<string, any>) => ({ ...prev, ...rest }));
        }
        return;
      }
    }

    LoggingUtils.logInfo(
      `[UIUpdateService] Updating state from ${logSource}: ${JSON.stringify(
        update
      )}`
    );
    this.setTexts((prev: Record<string, any>) => ({ ...prev, ...update }));
  }

  /**
   * Notifies the start of prompt processing via IPC
   */
  notifyPromptProcessingStarted(temporaryContext?: string): void {
    if (typeof window !== "undefined" && window.electronAPI?.sendPromptUpdate) {
      try {
        window.electronAPI.sendPromptUpdate("partial", "Processing...");
        LoggingUtils.logInfo(
          `Prompt processing started${temporaryContext ? " with context" : ""}`
        );
      } catch (e) {
        LoggingUtils.logError("Error notifying prompt start via IPC", e);
      }
    }
  }

  /**
   * Notifies the completion of the prompt via IPC
   */
  notifyPromptComplete(response: string): void {
    if (typeof window !== "undefined" && window.electronAPI?.sendPromptUpdate) {
      try {
        window.electronAPI.sendPromptUpdate("complete", response);
        LoggingUtils.logInfo("Final response sent via IPC");
      } catch (e) {
        LoggingUtils.logError("Error sending final response via IPC", e);
      }
    }
  }

  /**
   * Notifies an error during the prompt processing via IPC
   */
  notifyPromptError(errorMessage: string): void {
    if (typeof window !== "undefined" && window.electronAPI?.sendPromptUpdate) {
      try {
        window.electronAPI.sendPromptUpdate("error", errorMessage);
        LoggingUtils.logError("Error notified via IPC: " + errorMessage);
      } catch (e) {
        LoggingUtils.logError("Error notifying error via IPC", e);
      }
    }
  }

  /**
   * Notifies the start of streaming response
   */
  notifyStreamingStarted(): void {
    // Call window handler if available
    if (
      typeof window !== "undefined" &&
      (window as any).__handleStreamingStart
    ) {
      (window as any).__handleStreamingStart();
    }

    // Send via IPC if available
    if (typeof window !== "undefined" && window.electronAPI?.sendPromptUpdate) {
      try {
        window.electronAPI.sendPromptUpdate("stream-start", "");
        LoggingUtils.logInfo("Streaming started");
      } catch (e) {
        LoggingUtils.logError("Error notifying streaming start via IPC", e);
      }
    }
  }

  /**
   * Sends a chunk of streaming response
   */
  notifyStreamingChunk(chunk: string): void {
    // Call window handler if available
    if (
      typeof window !== "undefined" &&
      (window as any).__handleStreamingChunk
    ) {
      (window as any).__handleStreamingChunk(chunk);
    }

    // Send via IPC if available
    if (typeof window !== "undefined" && window.electronAPI?.sendPromptUpdate) {
      try {
        window.electronAPI.sendPromptUpdate("stream-chunk", chunk);
      } catch (e) {
        LoggingUtils.logError("Error sending streaming chunk via IPC", e);
      }
    }
  }

  /**
   * Notifies the end of streaming response
   */
  notifyStreamingComplete(): void {
    // Call window handler if available
    if (typeof window !== "undefined" && (window as any).__handleStreamingEnd) {
      (window as any).__handleStreamingEnd();
    }

    // Send via IPC if available
    if (typeof window !== "undefined" && window.electronAPI?.sendPromptUpdate) {
      try {
        window.electronAPI.sendPromptUpdate("stream-end", "");
        LoggingUtils.logInfo("Streaming completed");
      } catch (e) {
        LoggingUtils.logError("Error notifying streaming end via IPC", e);
      }
    }
  }
}
