// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { ITranscriptionStorageService } from "../../../interfaces/transcription/ITranscriptionStorageService";

/**
 * Neural transcription extraction processor
 * Responsible for extracting new lines that haven't been processed yet
 */
export class TranscriptionExtractor {
  constructor(private storageService: ITranscriptionStorageService) {}

  /**
   * Extract new transcription lines that haven't been processed yet
   * WITHOUT marking them as sent (for preview/validation purposes)
   */
  extractNewLines(): string | null {
    const newTranscriptions = this.storageService.getNewTranscriptions();

    if (newTranscriptions.length === 0) {
      console.log("📭 No new transcriptions to extract");
      return null;
    }

    // Format transcriptions with speaker information
    const formattedLines = newTranscriptions.map((t) => {
      return `${t.speaker}: ${t.text}`;
    });

    console.log(`📤 Extracting ${newTranscriptions.length} new transcriptions`);
    return formattedLines.join("\n");
  }

  /**
   * Extract new transcriptions AND immediately mark them as sent
   * This ensures atomic operation preventing duplicate sends
   */
  extractAndMarkAsSent(): string | null {
    // Use the atomic method from storage service
    const newTranscriptions = this.storageService.extractAndMarkAsSent();

    if (newTranscriptions.length === 0) {
      console.log("📭 No new transcriptions to extract");
      return null;
    }

    // Format transcriptions with speaker information
    const formattedLines = newTranscriptions.map((t) => {
      return `${t.speaker}: ${t.text}`;
    });

    console.log(
      `📤 Extracted and marked ${newTranscriptions.length} transcriptions as sent`
    );

    return formattedLines.join("\n");
  }

  /**
   * Reset extraction state for new session
   */
  reset(): void {
    // No longer need to track index manually
    console.log("🔄 Transcription extractor reset");
  }

  /**
   * Check if there are new transcriptions available
   */
  hasNewTranscriptions(): boolean {
    return this.storageService.hasNewTranscriptions();
  }
}
