// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// TranscriptionStorageService.ts
// Refactored using SOLID, DRY, KISS, and YAGNI principles
// Acts as a Facade orchestrating smaller, focused components

import { ITranscriptionStorageService } from "../../interfaces/transcription/ITranscriptionStorageService";
import {
  SpeakerTranscription,
  SpeakerTranscriptionLog,
  UIUpdater,
} from "../../interfaces/transcription/TranscriptionTypes";
import { ISpeakerIdentificationService } from "../../interfaces/utils/ISpeakerIdentificationService";
import { LoggingUtils } from "../../utils/LoggingUtils";
import { DeepgramTranscriptionService } from "../DeepgramTranscriptionService";

// Import refactored components
import { QuestionDetector } from "./detectors/QuestionDetector";
import { TranscriptionLogger } from "./loggers/TranscriptionLogger";
import { TranscriptionUIManager } from "./managers/TranscriptionUIManager";
import { TranscriptionProcessor } from "./processors/TranscriptionProcessor";
import { TranscriptionStore } from "./stores/TranscriptionStore";

/**
 * TranscriptionStorageService - Refactored using SOLID principles
 * Acts as a Facade Pattern orchestrating smaller, focused components
 * Each component has a single responsibility, making the code more maintainable
 */
export class TranscriptionStorageService
  implements ITranscriptionStorageService
{
  // Components following Single Responsibility Principle
  private store: TranscriptionStore;
  private questionDetector: QuestionDetector;
  private processor: TranscriptionProcessor;
  private logger: TranscriptionLogger;
  private uiManager: TranscriptionUIManager;

  // Service dependencies
  private speakerService: ISpeakerIdentificationService;
  private transcriptionService: DeepgramTranscriptionService | null = null;

  constructor(
    speakerService: ISpeakerIdentificationService,
    setTexts: UIUpdater
  ) {
    // Initialize all components - Dependency Injection
    this.speakerService = speakerService;
    this.store = new TranscriptionStore();
    this.questionDetector = new QuestionDetector();
    this.processor = new TranscriptionProcessor(speakerService);
    this.logger = new TranscriptionLogger(speakerService);
    this.uiManager = new TranscriptionUIManager(setTexts);
  }

  /**
   * Sets the transcription service for auto-prompt functionality
   */
  setTranscriptionService(service: DeepgramTranscriptionService): void {
    this.transcriptionService = service;
  }

  /**
   * Adds a new transcription to the storage
   * Delegates to appropriate components following Single Responsibility
   */
  addTranscription(text: string, speaker?: string): void {
    if (!text || !text.trim()) return;

    const cleanText = text.trim();

    // Handle question cycle interruption
    this.questionDetector.handleNewTranscriptionDuringCycle(cleanText);

    // Check for duplicates
    if (
      this.processor.isDuplicate(
        cleanText,
        this.store.getSpeakerTranscriptions()
      )
    ) {
      return;
    }

    // Process segments if text has speaker markers
    if (this.processor.hasSpeakerMarkers(cleanText)) {
      const segments = this.processor.processSegments(cleanText);

      for (const segment of segments) {
        if (
          !this.processor.isDuplicate(
            segment.text,
            this.store.getSpeakerTranscriptions()
          )
        ) {
          this.addSingleSpeakerTranscription(segment.text, segment.speaker);
          this.store.setCurrentSpeaker(segment.speaker);
        }
      }
      return;
    }

    // Process speaker without markers
    const { speaker: processedSpeaker, cleanText: processedText } =
      this.processor.processSpeaker(
        cleanText,
        speaker,
        this.store.getCurrentSpeaker()
      );

    this.addSingleSpeakerTranscription(processedText, processedSpeaker);
    this.store.setCurrentSpeaker(processedSpeaker);
  }

  /**
   * Adds a single speaker transcription
   * Simplified by delegating to components
   */
  addSingleSpeakerTranscription(text: string, speaker: string): void {
    if (!text || !text.trim()) return;

    LoggingUtils.logInfo(`Adding transcription for "${speaker}": "${text}"`);

    // Store the transcription
    this.store.addTranscription(text, speaker, new Date().toISOString());

    // Always update UI to show only new (unsent) transcriptions
    // This prevents accumulation of sent transcriptions in the display
    this.updateUIWithNewTranscriptions();

    // Check if we should detect questions
    if (
      this.questionDetector.isAutoDetectionEnabled() &&
      this.transcriptionService &&
      this.questionDetector.isQuestion(text) &&
      speaker === this.speakerService.getPrimaryUserSpeaker() &&
      this.transcriptionService.isOnlyUserSpeaking() &&
      !this.questionDetector.isDuplicateQuestion(text) &&
      !this.questionDetector.isInQuestionCycle()
    ) {
      this.questionDetector.startQuestionCycle(text);
    }
  }

  /**
   * Flush all accumulated transcriptions to the UI
   * Delegates to UI manager
   */
  public flushTranscriptionsToUI(): void {
    const transcriptions = this.store.getUITranscriptionList();
    LoggingUtils.logInfo(
      `Flushing ${transcriptions.length} transcriptions to UI`
    );
    this.uiManager.flushToUI(transcriptions);
  }

  /**
   * Update transcription UI directly
   * Delegates to UI manager
   */
  public updateTranscriptionUI(transcription: string): void {
    console.log(
      `🖥️ [TranscriptionStorageService] Updating UI with: "${transcription}"`
    );
    // Always show only new transcriptions, not the full history
    // This prevents accumulation of sent transcriptions in the UI
    this.updateUIWithNewTranscriptions();
  }

  /**
   * Enable or disable automatic question detection
   * Delegates to question detector
   */
  setAutoQuestionDetection(enabled: boolean): void {
    this.questionDetector.setAutoDetection(enabled);
  }

  /**
   * Cancel pending question timer
   * Delegates to question detector
   */
  cancelPendingQuestionTimer(): void {
    this.questionDetector.cancelPendingTimer();
  }

  /**
   * Get UI transcription text
   * Delegates to store
   */
  getUITranscriptionText(): string {
    return this.store.getUITranscriptionText();
  }

  /**
   * Alias for getUITranscriptionText
   */
  getTranscriptionPromptText(): string {
    return this.getUITranscriptionText();
  }

  /**
   * Get transcription list
   * Delegates to store
   */
  getTranscriptionList(): string[] {
    return this.store.getTranscriptionList();
  }

  /**
   * Get speaker transcriptions
   * Delegates to store
   */
  getSpeakerTranscriptions(): SpeakerTranscription[] {
    return this.store.getSpeakerTranscriptions();
  }

  /**
   * Get transcription logs
   * Delegates to logger
   */
  getTranscriptionLogs(): SpeakerTranscriptionLog[] {
    return this.logger.generateLogs(this.store.getSpeakerTranscriptions());
  }

  /**
   * Clear transcription data
   * Delegates to components
   */
  clearTranscriptionData(): void {
    this.store.clear();
    this.uiManager.clear();
    this.updateUI({ transcription: "" });
  }

  /**
   * Check if has valid transcriptions
   * Delegates to store
   */
  hasValidTranscriptions(): boolean {
    return this.store.hasValidTranscriptions();
  }

  /**
   * Get last transcription
   * Delegates to store
   */
  getLastTranscription(): string {
    return this.store.getLastTranscription();
  }

  /**
   * Get last message from user
   * Delegates to processor
   */
  getLastMessageFromUser(): SpeakerTranscription | null {
    return this.processor.getLastUserMessage(
      this.store.getSpeakerTranscriptions(),
      this.speakerService.getPrimaryUserSpeaker()
    );
  }

  /**
   * Get last messages from external speakers
   * Delegates to processor
   */
  getLastMessagesFromExternalSpeakers(): Map<string, SpeakerTranscription> {
    return this.processor.getLastExternalMessages(
      this.store.getSpeakerTranscriptions(),
      this.store.getDetectedSpeakers()
    );
  }

  /**
   * Get detected speakers
   * Delegates to store
   */
  getDetectedSpeakers(): Set<string> {
    return this.store.getDetectedSpeakers();
  }

  /**
   * Set current speaker
   * Delegates to store
   */
  setCurrentSpeaker(speaker: string): void {
    this.store.setCurrentSpeaker(speaker);
  }

  /**
   * Get current speaker
   * Delegates to store
   */
  getCurrentSpeaker(): string {
    return this.store.getCurrentSpeaker();
  }

  /**
   * Private method to update UI with other properties
   * Uses UI manager for consistency
   */
  private updateUI(update: Record<string, unknown>): void {
    this.uiManager.updateOther(update);
  }

  /**
   * Get only new transcriptions that haven't been sent yet
   */
  getNewTranscriptions(): SpeakerTranscription[] {
    return this.store.getNewTranscriptions();
  }

  /**
   * Mark current transcriptions as sent
   */
  markTranscriptionsAsSent(): void {
    this.store.markTranscriptionsAsSent();
  }

  /**
   * Check if there are new transcriptions to send
   */
  hasNewTranscriptions(): boolean {
    return this.store.hasNewTranscriptions();
  }

  /**
   * Update UI to show only new transcriptions
   */
  updateUIWithNewTranscriptions(): void {
    const newTranscriptionsText = this.uiManager.getNewTranscriptionsText(
      this.store
    );
    // Use setTranscriptionDirectly to avoid adding to history
    this.uiManager.setTranscriptionDirectly(newTranscriptionsText);
    console.log(
      `🖥️ Updated UI with ${
        this.store.getNewTranscriptions().length
      } new transcriptions`
    );
  }

  /**
   * Extract new transcriptions and mark them as sent atomically
   * This prevents race conditions where transcriptions could be added
   * between extraction and marking
   */
  extractAndMarkAsSent(): SpeakerTranscription[] {
    // Get new transcriptions
    const newTranscriptions = this.store.getNewTranscriptions();

    if (newTranscriptions.length > 0) {
      // Mark them as sent immediately
      this.store.markTranscriptionsAsSent(newTranscriptions);
      console.log(
        `🚀 Extracted and marked ${newTranscriptions.length} transcriptions as sent`
      );

      // Clear UI history to prevent showing sent transcriptions
      this.uiManager.clearSentTranscriptions();

      // Update UI to show empty (no new transcriptions)
      this.updateUIWithNewTranscriptions();
    }

    return newTranscriptions;
  }

  /**
   * Get all transcriptions with their sent status
   * Used by UI to show which transcriptions have been sent
   */
  getAllTranscriptionsWithStatus(): SpeakerTranscription[] {
    return this.store.getAllTranscriptionsWithStatus();
  }
}
