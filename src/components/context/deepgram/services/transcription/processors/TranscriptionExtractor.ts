// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { ITranscriptionStorageService } from '../../../interfaces/transcription/ITranscriptionStorageService';

/**
 * Neural transcription extraction processor
 * Responsible for extracting new lines that haven't been processed yet
 */
export class TranscriptionExtractor {
  private lastSentLineIndex: number = -1;

  constructor(private storageService: ITranscriptionStorageService) {}

  /**
   * Extract new transcription lines that haven't been processed yet
   */
  extractNewLines(): string | null {
    const fullTranscription = this.storageService.getUITranscriptionText();
    const lines = fullTranscription.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const newLines = lines.slice(this.lastSentLineIndex + 1);

    if (newLines.length === 0) return null;

    // Update index after successful extraction
    this.lastSentLineIndex = lines.length - 1;
    return newLines.join('\n');
  }

  /**
   * Reset extraction state for new session
   */
  reset(): void {
    this.lastSentLineIndex = -1;
  }

  /**
   * Get current extraction index (for debugging/monitoring)
   */
  getCurrentIndex(): number {
    return this.lastSentLineIndex;
  }
} 