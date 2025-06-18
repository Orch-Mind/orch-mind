// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { SpeakerTranscription } from "../../../interfaces/transcription/TranscriptionTypes";
import { ISpeakerIdentificationService } from "../../../interfaces/utils/ISpeakerIdentificationService";
import { LoggingUtils } from "../../../utils/LoggingUtils";

/**
 * TranscriptionProcessor - Single Responsibility: Process transcriptions (duplicates, speakers)
 * Follows DRY principle by centralizing all transcription processing logic
 */
export class TranscriptionProcessor {
  private speakerService: ISpeakerIdentificationService;

  constructor(speakerService: ISpeakerIdentificationService) {
    this.speakerService = speakerService;
  }

  /**
   * Check if transcription is a duplicate
   */
  isDuplicate(
    text: string,
    existingTranscriptions: SpeakerTranscription[]
  ): boolean {
    const cleanText = text.trim();
    const isDuplicate = existingTranscriptions.some(
      (st) =>
        st.text === cleanText &&
        Date.now() - new Date(st.timestamp).getTime() < 2000 // Within 2 seconds
    );

    if (isDuplicate) {
      LoggingUtils.logInfo(`Ignoring duplicate transcription: "${cleanText}"`);
    }

    return isDuplicate;
  }

  /**
   * Process speaker from transcription text
   */
  processSpeaker(
    text: string,
    providedSpeaker?: string,
    currentSpeaker?: string
  ): { speaker: string; cleanText: string } {
    const cleanText = text.trim();

    // Check for explicit speaker markers
    if (this.hasSpeakerMarkers(cleanText)) {
      const segments = this.speakerService.splitMixedTranscription(cleanText);
      if (segments.length > 0) {
        // Return the first segment's speaker
        return {
          speaker: segments[0].speaker,
          cleanText: segments[0].text,
        };
      }
    }

    // Use provided speaker if available
    if (providedSpeaker?.trim()) {
      const normalizedSpeaker = this.speakerService.normalizeAndIdentifySpeaker(
        providedSpeaker.trim()
      );
      return {
        speaker: normalizedSpeaker,
        cleanText,
      };
    }

    // Fall back to current speaker or primary user
    const speakerToUse =
      currentSpeaker || this.speakerService.getPrimaryUserSpeaker();

    LoggingUtils.logInfo(
      `Speaker assigned: "${speakerToUse}" for text without marker: "${cleanText.substring(
        0,
        30
      )}..."`
    );

    return {
      speaker: speakerToUse,
      cleanText,
    };
  }

  /**
   * Check if text has speaker markers
   */
  hasSpeakerMarkers(text: string): boolean {
    return (
      text.includes("[") &&
      text.includes("]") &&
      /\[(Guilherme|Speaker\s*\d+)\]/i.test(text)
    );
  }

  /**
   * Process transcription segments
   */
  processSegments(text: string): Array<{ text: string; speaker: string }> {
    if (!this.hasSpeakerMarkers(text)) {
      return [];
    }

    return this.speakerService.splitMixedTranscription(text);
  }

  /**
   * Filter transcriptions by user
   */
  filterByUser(
    transcriptions: SpeakerTranscription[],
    primaryUserSpeaker: string
  ): SpeakerTranscription[] {
    return transcriptions.filter((st) => st.speaker === primaryUserSpeaker);
  }

  /**
   * Get last message from user
   */
  getLastUserMessage(
    transcriptions: SpeakerTranscription[],
    primaryUserSpeaker: string
  ): SpeakerTranscription | null {
    const userMessages = this.filterByUser(transcriptions, primaryUserSpeaker);
    return userMessages.length > 0
      ? userMessages[userMessages.length - 1]
      : null;
  }

  /**
   * Get last messages from external speakers
   */
  getLastExternalMessages(
    transcriptions: SpeakerTranscription[],
    detectedSpeakers: Set<string>
  ): Map<string, SpeakerTranscription> {
    const lastMessages = new Map<string, SpeakerTranscription>();

    if (detectedSpeakers.has("external")) {
      const messages = this.speakerService.filterTranscriptionsBySpeaker(
        "external",
        transcriptions
      );
      if (messages.length > 0) {
        lastMessages.set("external", messages[messages.length - 1]);
      }
    }

    return lastMessages;
  }
}
