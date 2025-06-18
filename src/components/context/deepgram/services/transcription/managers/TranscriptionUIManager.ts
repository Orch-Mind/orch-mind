// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { UIUpdater } from "../../../interfaces/transcription/TranscriptionTypes";

/**
 * TranscriptionUIManager - Single Responsibility: Manage UI updates
 * Follows Interface Segregation principle by depending only on UIUpdater interface
 */
export class TranscriptionUIManager {
  private setTexts: UIUpdater;
  private uiTranscriptionHistory: string[] = [];

  constructor(setTexts: UIUpdater) {
    this.setTexts = setTexts;
  }

  /**
   * Update UI with new transcription
   */
  updateTranscription(transcription: string): void {
    if (!transcription || !transcription.trim()) return;

    const newText = transcription.trim();

    // Check if this is an incremental update
    const isIncremental = this.handleIncrementalUpdate(newText);

    if (!isIncremental) {
      this.addNewTranscription(newText);
    }

    // Update UI with complete history
    this.updateUI();
  }

  /**
   * Handle incremental updates (extending previous messages)
   */
  private handleIncrementalUpdate(newText: string): boolean {
    for (let i = this.uiTranscriptionHistory.length - 1; i >= 0; i--) {
      const existingText = this.uiTranscriptionHistory[i];

      if (newText.startsWith(existingText) && newText !== existingText) {
        console.log(`🛠️ Replacing incremental message:`);
        console.log(`  Previous: "${existingText}"`);
        console.log(`  New: "${newText}"`);

        this.uiTranscriptionHistory[i] = newText;
        return true;
      }
    }
    return false;
  }

  /**
   * Add new transcription to history
   */
  private addNewTranscription(text: string): void {
    if (
      this.uiTranscriptionHistory.length === 0 ||
      this.uiTranscriptionHistory[this.uiTranscriptionHistory.length - 1] !==
        text
    ) {
      console.log(`💾 Adding new message: "${text}"`);
      this.uiTranscriptionHistory.push(text);
    }
  }

  /**
   * Update UI with current transcription history
   */
  private updateUI(): void {
    const fullText = this.uiTranscriptionHistory.join("\n");
    console.log(
      `📄 UI state: ${fullText.length} chars, ${this.uiTranscriptionHistory.length} messages`
    );

    this.setTexts((prev) => ({
      ...prev,
      transcription: fullText,
    }));
  }

  /**
   * Flush all pending transcriptions to UI
   */
  flushToUI(transcriptions: string[]): void {
    if (transcriptions.length === 0) {
      console.log("No transcriptions to flush");
      return;
    }

    const allTranscriptions = transcriptions.join("\n");
    console.log(`Flushing ${transcriptions.length} transcriptions to UI`);

    this.updateTranscription(allTranscriptions);
  }

  /**
   * Update UI with other properties
   */
  updateOther(update: Record<string, unknown>): void {
    this.setTexts((prev) => ({ ...prev, ...update }));
  }

  /**
   * Clear UI transcription history
   */
  clear(): void {
    this.uiTranscriptionHistory = [];
    this.updateUI();
  }

  /**
   * Get current UI transcription history
   */
  getHistory(): string[] {
    return [...this.uiTranscriptionHistory];
  }

  /**
   * Set transcription text directly without managing history
   * Used when we want to show only new transcriptions after sending
   */
  setTranscriptionDirectly(text: string): void {
    console.log(`🔄 Setting UI transcription directly: "${text}"`);

    // Clear history and set new text
    this.uiTranscriptionHistory = text ? [text] : [];

    // Update UI
    this.setTexts((prev) => ({
      ...prev,
      transcription: text,
    }));
  }

  /**
   * Get only new transcriptions text for UI display
   */
  getNewTranscriptionsText(store: any): string {
    const newTranscriptions = store.getNewTranscriptions();
    return newTranscriptions.map((t: any) => t.text).join("\n");
  }

  /**
   * Clear sent transcriptions from UI history
   * Called after transcriptions are marked as sent
   */
  clearSentTranscriptions(): void {
    console.log(`🧹 Clearing UI history after sending transcriptions`);
    this.uiTranscriptionHistory = [];
  }
}
