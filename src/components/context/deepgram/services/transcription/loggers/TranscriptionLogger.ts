// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import {
  EXTERNAL_SPEAKER_LABEL,
  SpeakerTranscription,
  SpeakerTranscriptionLog,
} from "../../../interfaces/transcription/TranscriptionTypes";
import { ISpeakerIdentificationService } from "../../../interfaces/utils/ISpeakerIdentificationService";

/**
 * TranscriptionLogger - Single Responsibility: Format transcription logs
 * Follows KISS principle by keeping formatting logic simple and clear
 */
export class TranscriptionLogger {
  private speakerService: ISpeakerIdentificationService;

  constructor(speakerService: ISpeakerIdentificationService) {
    this.speakerService = speakerService;
  }

  /**
   * Generate transcription logs grouped by speaker
   */
  generateLogs(
    speakerTranscriptions: SpeakerTranscription[]
  ): SpeakerTranscriptionLog[] {
    return this.getTranscriptionLogsByUser(speakerTranscriptions);
  }

  /**
   * Returns logs grouped by speaker
   */
  private getTranscriptionLogsByUser(
    speakerTranscriptions: SpeakerTranscription[]
  ): SpeakerTranscriptionLog[] {
    const tempGroups = new Map<
      string,
      {
        isUser: boolean;
        displayName: string;
        transcriptions: { text: string; timestamp: string }[];
      }
    >();

    const processedTexts = new Map<string, Set<string>>();
    const speakerNumbers = new Map<string, string>();

    for (const transcription of speakerTranscriptions) {
      this.processTranscription(
        transcription,
        tempGroups,
        processedTexts,
        speakerNumbers
      );
    }

    return this.formatLogsOutput(tempGroups);
  }

  /**
   * Process a single transcription
   */
  private processTranscription(
    transcription: SpeakerTranscription,
    tempGroups: Map<string, any>,
    processedTexts: Map<string, Set<string>>,
    speakerNumbers: Map<string, string>
  ): void {
    if (transcription.text.includes("[") && transcription.text.includes("]")) {
      const segments = this.speakerService.splitMixedTranscription(
        transcription.text
      );

      for (const segment of segments) {
        this.processSegment(
          segment,
          transcription.timestamp,
          tempGroups,
          processedTexts,
          speakerNumbers
        );
      }
    } else {
      this.processSimpleTranscription(
        transcription,
        tempGroups,
        processedTexts,
        speakerNumbers
      );
    }
  }

  /**
   * Process a segment
   */
  private processSegment(
    segment: { text: string; speaker: string },
    timestamp: string,
    tempGroups: Map<string, any>,
    processedTexts: Map<string, Set<string>>,
    speakerNumbers: Map<string, string>
  ): void {
    const segmentText = segment.text.replace(/^\[[^\]]+\]\s*/, "");
    const { displayName, groupKey, isUserMsg } = this.getSpeakerInfo(
      segment.text,
      segment.speaker,
      speakerNumbers
    );

    this.addToGroup(
      groupKey,
      displayName,
      isUserMsg,
      segmentText,
      timestamp,
      tempGroups,
      processedTexts
    );
  }

  /**
   * Process simple transcription without segments
   */
  private processSimpleTranscription(
    transcription: SpeakerTranscription,
    tempGroups: Map<string, any>,
    processedTexts: Map<string, Set<string>>,
    speakerNumbers: Map<string, string>
  ): void {
    const { displayName, groupKey, isUserMsg } = this.getSpeakerInfo(
      transcription.text,
      transcription.speaker,
      speakerNumbers
    );

    this.addToGroup(
      groupKey,
      displayName,
      isUserMsg,
      transcription.text,
      transcription.timestamp,
      tempGroups,
      processedTexts
    );
  }

  /**
   * Get speaker information
   */
  private getSpeakerInfo(
    text: string,
    speaker: string,
    speakerNumbers: Map<string, string>
  ): { displayName: string; groupKey: string; isUserMsg: boolean } {
    const normalizedSpeaker = speaker;
    const isUserMsg =
      normalizedSpeaker === this.speakerService.getPrimaryUserSpeaker();

    if (isUserMsg) {
      return {
        displayName: this.speakerService.getPrimaryUserSpeaker(),
        groupKey: this.speakerService.getPrimaryUserSpeaker(),
        isUserMsg: true,
      };
    }

    // Extract speaker info for external speakers
    const originalSpeakerMatch = text.match(/^\[([^\]]+)\]/);
    const originalSpeaker = originalSpeakerMatch?.[1]?.trim();

    if (originalSpeaker?.toLowerCase().includes("speaker")) {
      const speakerNumberMatch = originalSpeaker.match(/speaker\s*(\d+)/i);
      const speakerNum = speakerNumberMatch?.[1];

      if (speakerNum) {
        const groupKey = `speaker_${speakerNum}`;
        const displayName = originalSpeaker;
        speakerNumbers.set(groupKey, displayName);
        return { displayName, groupKey, isUserMsg: false };
      }
    }

    // Check text for speaker mentions
    const textSpeakerMatch = text.toLowerCase().match(/speaker\s*(\d+)/i);
    if (textSpeakerMatch?.[1]) {
      const speakerNum = textSpeakerMatch[1];
      const groupKey = `speaker_${speakerNum}`;
      const displayName =
        speakerNumbers.get(groupKey) || `Speaker ${speakerNum}`;
      speakerNumbers.set(groupKey, displayName);
      return { displayName, groupKey, isUserMsg: false };
    }

    return {
      displayName: EXTERNAL_SPEAKER_LABEL,
      groupKey: "external_generic",
      isUserMsg: false,
    };
  }

  /**
   * Add transcription to group
   */
  private addToGroup(
    groupKey: string,
    displayName: string,
    isUser: boolean,
    text: string,
    timestamp: string,
    tempGroups: Map<string, any>,
    processedTexts: Map<string, Set<string>>
  ): void {
    if (!tempGroups.has(groupKey)) {
      tempGroups.set(groupKey, {
        isUser,
        displayName,
        transcriptions: [],
      });
      processedTexts.set(groupKey, new Set());
    }

    const groupTexts = processedTexts.get(groupKey);
    if (groupTexts && !groupTexts.has(text)) {
      const group = tempGroups.get(groupKey);
      if (group) {
        group.transcriptions.push({ text, timestamp });
        groupTexts.add(text);
      }
    }
  }

  /**
   * Format logs output
   */
  private formatLogsOutput(
    tempGroups: Map<string, any>
  ): SpeakerTranscriptionLog[] {
    const logs: SpeakerTranscriptionLog[] = Array.from(
      tempGroups.entries()
    ).map(([groupKey, data]) => {
      const sortedTranscriptions = [...data.transcriptions].sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      const formattedTranscriptions = sortedTranscriptions.map((t, index) => {
        const text = index === 0 ? `[${data.displayName}] ${t.text}` : t.text;
        return { text, timestamp: t.timestamp };
      });

      return {
        speaker: data.displayName,
        isUser: data.isUser,
        transcriptions: formattedTranscriptions,
      };
    });

    return this.sortLogs(logs);
  }

  /**
   * Sort logs by speaker priority
   */
  private sortLogs(logs: SpeakerTranscriptionLog[]): SpeakerTranscriptionLog[] {
    return logs.sort((a, b) => {
      if (a.isUser) return -1;
      if (b.isUser) return 1;

      const numA = a.speaker.match(/speaker\s*(\d+)/i)?.[1];
      const numB = b.speaker.match(/speaker\s*(\d+)/i)?.[1];

      if (numA && numB) {
        return parseInt(numA) - parseInt(numB);
      }

      return a.speaker.localeCompare(b.speaker);
    });
  }
}
