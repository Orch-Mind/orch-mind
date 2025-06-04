import { getPrimaryUser } from '../../../../../../config/UserConfig';
import { IMemoryService } from '../../../interfaces/memory/IMemoryService';
import { ITranscriptionStorageService } from '../../../interfaces/transcription/ITranscriptionStorageService';
import { SpeakerTranscription } from '../../../interfaces/transcription/TranscriptionTypes';
import { ISpeakerIdentificationService } from '../../../interfaces/utils/ISpeakerIdentificationService';
import { SessionManager } from './SessionManager';

/**
 * Configuration for transcription prompt processing
 */
export interface TranscriptionPromptConfig {
  transcription: string;
  temporaryContext?: string;
  sessionState: {
    sessionId: string;
    interactionCount: number;
    timestamp: string;
    language: string;
  };
  speakerMetadata: {
    primarySpeaker: string;
    detectedSpeakers: string[];
    speakerTranscriptions: SpeakerTranscription[];
  };
  userContextData?: any;
}

/**
 * Neural configuration synthesis builder
 * Responsible for constructing configuration objects for neural signal extraction
 */
export class NeuralConfigurationBuilder {
  constructor(
    private storageService: ITranscriptionStorageService,
    private memoryService: IMemoryService,
    private speakerService: ISpeakerIdentificationService,
    private sessionManager: SessionManager
  ) {}

  /**
   * Build comprehensive configuration for neural signal extraction
   */
  async buildExtractionConfig(
    transcriptionToSend: string, 
    temporaryContext?: string,
    currentLanguage: string = 'pt-BR'
  ): Promise<TranscriptionPromptConfig> {
    
    const userTranscriptions = this.storageService.getSpeakerTranscriptions()
      .filter(transcription => transcription.speaker.includes(getPrimaryUser()));
    
    const detectedSpeakers = this.storageService.getDetectedSpeakers();
    
    const externalTranscriptions = this.storageService.getSpeakerTranscriptions()
      .filter(transcription => transcription.speaker !== getPrimaryUser());

    const userContextData = await this.memoryService.fetchContextualMemory(
      userTranscriptions,
      externalTranscriptions,
      detectedSpeakers,
      temporaryContext
    );

    return {
      transcription: transcriptionToSend,
      temporaryContext,
      sessionState: {
        sessionId: this.sessionManager.getCurrentSessionId(),
        interactionCount: this.sessionManager.getCurrentInteractionCount(),
        timestamp: new Date().toISOString(),
        language: currentLanguage
      },
      speakerMetadata: {
        primarySpeaker: this.speakerService.getPrimaryUserSpeaker(),
        detectedSpeakers: Array.from(detectedSpeakers),
        speakerTranscriptions: userTranscriptions
      },
      userContextData
    };
  }
} 