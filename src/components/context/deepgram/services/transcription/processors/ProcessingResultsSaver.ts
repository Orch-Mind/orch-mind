// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { IMemoryService } from "../../../interfaces/memory/IMemoryService";
import {
  NeuralProcessingResult,
  NeuralSignalResponse,
} from "../../../interfaces/neural/NeuralSignalTypes";
import { ITranscriptionStorageService } from "../../../interfaces/transcription/ITranscriptionStorageService";
import { ISpeakerIdentificationService } from "../../../interfaces/utils/ISpeakerIdentificationService";
import { SymbolicInsight } from "../../../types/SymbolicInsight";
import symbolicCognitionTimelineLogger from "../../utils/SymbolicCognitionTimelineLoggerSingleton";
import { SessionManager } from "./SessionManager";

/**
 * Neural processing results cognitive saver
 * Responsible for persisting processing results to memory and symbolic logs
 */
export class ProcessingResultsSaver {
  constructor(
    private memoryService: IMemoryService,
    private storageService: ITranscriptionStorageService,
    private speakerService: ISpeakerIdentificationService,
    private sessionManager: SessionManager
  ) {}

  /**
   * Save comprehensive processing results to memory and logs
   */
  async saveResults(
    transcription: string,
    response: string,
    neuralActivation: NeuralSignalResponse,
    processingResults: NeuralProcessingResult[]
  ): Promise<void> {
    // Log symbolic cognitive response with insights
    await this._logSymbolicResponse(response, processingResults);

    // Update conversation history
    this.memoryService.addToConversationHistory({
      role: "user",
      content: transcription,
    });

    // Save to long-term memory
    await this._saveToLongTermMemory(transcription, response);
  }

  /**
   * Log symbolic cognitive response with insights
   * This logs the response enriched with symbolic topics and insights
   * (Different from the raw response log in TranscriptionPromptProcessor)
   */
  private async _logSymbolicResponse(
    response: string,
    processingResults: NeuralProcessingResult[]
  ): Promise<void> {
    const symbolicTopics = processingResults.map((r) => r.core);
    const importantInsights: SymbolicInsight[] = processingResults
      .flatMap((r) => (Array.isArray(r.insights) ? r.insights : []))
      .filter((insight) => insight && typeof insight.type === "string");

    symbolicCognitionTimelineLogger.logGptResponse({
      response,
      symbolicTopics,
      insights: importantInsights,
    });
  }

  /**
   * Save interaction to long-term memory
   */
  private async _saveToLongTermMemory(
    transcription: string,
    response: string
  ): Promise<void> {
    await this.memoryService.saveToLongTermMemory(
      transcription,
      response,
      this.storageService.getSpeakerTranscriptions(),
      this.speakerService.getPrimaryUserSpeaker()
    );
  }
}
