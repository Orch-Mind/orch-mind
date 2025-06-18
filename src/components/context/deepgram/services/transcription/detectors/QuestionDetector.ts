// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { LoggingUtils } from "../../../utils/LoggingUtils";

/**
 * QuestionDetector - Single Responsibility: Detect questions and manage question cycles
 * Follows YAGNI principle by only implementing what's currently needed
 */
export class QuestionDetector {
  private lastQuestionPrompt: string = "";
  private lastPromptTimestamp: number = 0;
  private autoQuestionDetectionEnabled: boolean = false;
  private questionTimerId: NodeJS.Timeout | null = null;
  private pendingQuestionText: string = "";
  private inQuestionCycle: boolean = false;

  /**
   * Check if auto-detection is enabled
   */
  isAutoDetectionEnabled(): boolean {
    return this.autoQuestionDetectionEnabled;
  }

  /**
   * Enable or disable automatic question detection
   */
  setAutoDetection(enabled: boolean): void {
    this.autoQuestionDetectionEnabled = enabled;
    LoggingUtils.logInfo(
      `Auto-question detection ${enabled ? "enabled" : "disabled"}`
    );
  }

  /**
   * Check if text is a question
   */
  isQuestion(text: string): boolean {
    return text.trim().endsWith("?");
  }

  /**
   * Check if this is a duplicate question
   */
  isDuplicateQuestion(text: string): boolean {
    const trimmedText = text.trim();
    if (trimmedText === this.lastQuestionPrompt) {
      LoggingUtils.logInfo(`Duplicate question detected: "${trimmedText}"`);
      return true;
    }
    return false;
  }

  /**
   * Check if currently in a question cycle
   */
  isInQuestionCycle(): boolean {
    return this.inQuestionCycle;
  }

  /**
   * Start a question cycle
   */
  startQuestionCycle(questionText: string): void {
    if (this.inQuestionCycle) {
      LoggingUtils.logInfo(
        `Already in a question cycle, ignoring new question: "${questionText}"`
      );
      return;
    }

    this.lastQuestionPrompt = questionText;
    this.lastPromptTimestamp = Date.now();
    this.pendingQuestionText = questionText;
    this.inQuestionCycle = true;

    LoggingUtils.logInfo(
      `Question detected: "${questionText}". Starting question cycle...`
    );

    // Note: Auto-send is disabled by default
    LoggingUtils.logInfo(
      `Question detected but NOT sent (auto-send disabled): "${questionText}"`
    );
  }

  /**
   * End question cycle
   */
  endQuestionCycle(): void {
    this.inQuestionCycle = false;
    this.pendingQuestionText = "";
    LoggingUtils.logInfo("Question cycle ended.");
  }

  /**
   * Cancel pending question timer
   */
  cancelPendingTimer(): void {
    if (this.questionTimerId) {
      LoggingUtils.logInfo(
        `Canceling pending question timer for: "${this.pendingQuestionText}"`
      );
      clearTimeout(this.questionTimerId);
      this.questionTimerId = null;
    }
    this.endQuestionCycle();
  }

  /**
   * Handle new transcription during question cycle
   */
  handleNewTranscriptionDuringCycle(text: string): void {
    if (this.inQuestionCycle) {
      LoggingUtils.logInfo(
        `New transcription received, ending question cycle: "${text.trim()}"`
      );
      this.cancelPendingTimer();
    }
  }
}
