// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { SpeakerTranscription } from "../../../interfaces/transcription/TranscriptionTypes";

/**
 * TranscriptionStore - Single Responsibility: Store and retrieve transcriptions
 * Follows KISS principle by keeping storage logic simple and focused
 */
export class TranscriptionStore {
  private transcriptionList: string[] = [""];
  private speakerTranscriptions: SpeakerTranscription[] = [];
  private detectedSpeakers: Set<string> = new Set();
  private lastTranscription: string = "";
  private currentSpeaker: string = "";
  private uiTranscriptionList: string[] = [];

  /**
   * Add a transcription to all relevant stores
   */
  addTranscription(text: string, speaker: string, timestamp: string): void {
    // Add to traditional list
    this.transcriptionList.push(text);
    this.lastTranscription = text;

    // Add to speaker-specific list with sent status
    this.speakerTranscriptions.push({
      text: text.trim(),
      speaker,
      timestamp,
      sent: false, // New transcriptions are not sent by default
    });

    // Add speaker to detected speakers
    this.detectedSpeakers.add(speaker);

    // Add to UI transcription list
    this.uiTranscriptionList.push(text.trim());
  }

  /**
   * Get all transcriptions as a single string
   */
  getUITranscriptionText(): string {
    return this.uiTranscriptionList.join("\n");
  }

  /**
   * Get only new transcriptions that haven't been sent yet
   */
  getNewTranscriptions(): SpeakerTranscription[] {
    return this.speakerTranscriptions.filter((t) => !t.sent);
  }

  /**
   * Get all transcriptions with their sent status
   */
  getAllTranscriptionsWithStatus(): SpeakerTranscription[] {
    return this.speakerTranscriptions;
  }

  /**
   * Mark specific transcriptions as sent
   */
  markTranscriptionsAsSent(transcriptions?: SpeakerTranscription[]): void {
    if (transcriptions) {
      // Mark specific transcriptions as sent
      transcriptions.forEach((t) => {
        const index = this.speakerTranscriptions.findIndex(
          (st) => st.timestamp === t.timestamp && st.text === t.text
        );
        if (index !== -1) {
          this.speakerTranscriptions[index].sent = true;
        }
      });
    } else {
      // Mark all unsent transcriptions as sent
      this.speakerTranscriptions.forEach((t) => {
        if (!t.sent) {
          t.sent = true;
        }
      });
    }

    const sentCount = this.speakerTranscriptions.filter((t) => t.sent).length;
    console.log(`📍 Marked transcriptions as sent. Total sent: ${sentCount}`);
  }

  /**
   * Get the transcription list
   */
  getTranscriptionList(): string[] {
    return this.transcriptionList;
  }

  /**
   * Get speaker transcriptions
   */
  getSpeakerTranscriptions(): SpeakerTranscription[] {
    return this.speakerTranscriptions;
  }

  /**
   * Get detected speakers
   */
  getDetectedSpeakers(): Set<string> {
    return this.detectedSpeakers;
  }

  /**
   * Get last transcription
   */
  getLastTranscription(): string {
    return this.lastTranscription;
  }

  /**
   * Get/Set current speaker
   */
  getCurrentSpeaker(): string {
    return this.currentSpeaker;
  }

  setCurrentSpeaker(speaker: string): void {
    this.currentSpeaker = speaker;
  }

  /**
   * Get UI transcription list
   */
  getUITranscriptionList(): string[] {
    return this.uiTranscriptionList;
  }

  /**
   * Check if there are valid transcriptions
   */
  hasValidTranscriptions(): boolean {
    return (
      this.speakerTranscriptions.length > 0 ||
      this.transcriptionList.some((text) => text && text.trim().length > 0)
    );
  }

  /**
   * Check if there are new transcriptions to send
   */
  hasNewTranscriptions(): boolean {
    return this.speakerTranscriptions.some((t) => !t.sent);
  }

  /**
   * Clear all transcription data
   */
  clear(): void {
    this.transcriptionList = [""];
    this.speakerTranscriptions = [];
    this.detectedSpeakers = new Set();
    this.lastTranscription = "";
    this.uiTranscriptionList = [];
  }
}
