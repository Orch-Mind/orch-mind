// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { IMemoryService } from '../../../interfaces/memory/IMemoryService';
import { NeuralProcessingResult, NeuralSignalResponse } from '../../../interfaces/neural/NeuralSignalTypes';
import { ITranscriptionStorageService } from '../../../interfaces/transcription/ITranscriptionStorageService';
import { ISpeakerIdentificationService } from '../../../interfaces/utils/ISpeakerIdentificationService';
import { SymbolicInsight } from '../../../types/SymbolicInsight';
import { LoggingUtils } from '../../../utils/LoggingUtils';
import symbolicCognitionTimelineLogger from '../../utils/SymbolicCognitionTimelineLoggerSingleton';
import { SessionManager } from './SessionManager';

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
    
    // Log symbolic cognitive response
    await this._logSymbolicResponse(response, processingResults);

    // Update conversation history
    this.memoryService.addToConversationHistory({ role: "user", content: transcription });

    // Save to long-term memory
    await this._saveToLongTermMemory(transcription, response);

    // Save neural processing data for brain evolution tracking
    await this._saveNeuralProcessingData(neuralActivation, processingResults);
  }

  /**
   * Log symbolic cognitive response with insights
   */
  private async _logSymbolicResponse(response: string, processingResults: NeuralProcessingResult[]): Promise<void> {
    const symbolicTopics = processingResults.map(r => r.core);
    const importantInsights: SymbolicInsight[] = processingResults
      .flatMap(r => Array.isArray(r.insights) ? r.insights : [])
      .filter(insight => insight && typeof insight.type === 'string');
    
    symbolicCognitionTimelineLogger.logGptResponse({
      response,
      symbolicTopics,
      insights: importantInsights
    });
  }

  /**
   * Save interaction to long-term memory
   */
  private async _saveToLongTermMemory(transcription: string, response: string): Promise<void> {
    await this.memoryService.saveToLongTermMemory(
      transcription,
      response,
      this.storageService.getSpeakerTranscriptions(),
      this.speakerService.getPrimaryUserSpeaker()
    );
  }

  /**
   * Save neural processing data for brain evolution tracking
   */
  private async _saveNeuralProcessingData(
    activation: NeuralSignalResponse,
    processingResults: NeuralProcessingResult[] = []
  ): Promise<void> {
    try {
      const neuralData = {
        sessionId: this.sessionManager.getCurrentSessionId(),
        timestamp: new Date().toISOString(),
        activation,
        results: processingResults,
        interactionCount: this.sessionManager.incrementInteraction()
      };

      // TODO: Implement neural data persistence storage
      LoggingUtils.logInfo(`Neural processing data saved: ${JSON.stringify(neuralData)}`);
    } catch (error) {
      LoggingUtils.logError("Error saving neural processing data", error);
    }
  }
} 