// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// ITranscriptionStorageService.ts
// Interface para o serviço de armazenamento de transcrições

import {
  SpeakerTranscription,
  SpeakerTranscriptionLog,
} from "./TranscriptionTypes";

export interface ITranscriptionStorageService {
  /**
   * Atualiza a UI com uma nova transcrição
   * @param text - o texto da transcrição a ser atualizado na UI
   */
  updateTranscriptionUI(text: string): void;

  /**
   * Retorna todas as transcrições já formatadas e enviadas para a UI, prontas para prompt
   */
  getUITranscriptionText(): string;
  /**
   * Adiciona uma nova transcrição ao armazenamento
   */
  addTranscription(text: string, speaker?: string): void;

  /**
   * Adiciona uma transcrição de um único falante
   */
  addSingleSpeakerTranscription(text: string, speaker: string): void;

  /**
   * Retorna a lista atual de transcrições
   */
  getTranscriptionList(): string[];

  /**
   * Retorna transcrições organizadas por falante
   */
  getSpeakerTranscriptions(): SpeakerTranscription[];

  /**
   * Retorna logs de transcrição agrupados por falante para depuração/UI
   */
  getTranscriptionLogs(): SpeakerTranscriptionLog[];

  /**
   * Limpa os dados de transcrição
   */
  clearTranscriptionData(): void;

  /**
   * Verifica se existem transcrições válidas por qualquer falante
   */
  hasValidTranscriptions(): boolean;

  /**
   * Retorna a última transcrição conhecida
   */
  getLastTranscription(): string;

  /**
   * Retorna a última mensagem do usuário principal
   */
  getLastMessageFromUser(): SpeakerTranscription | null;

  /**
   * Retorna as últimas mensagens de cada falante externo
   */
  getLastMessagesFromExternalSpeakers(): Map<string, SpeakerTranscription>;

  /**
   * Retorna o conjunto de falantes detectados
   */
  getDetectedSpeakers(): Set<string>;

  /**
   * Define o falante atual
   */
  setCurrentSpeaker(speaker: string): void;

  /**
   * Obtém o falante atual
   */
  getCurrentSpeaker(): string;

  /**
   * Flush all accumulated transcriptions to the UI
   * Should be called when recording stops or when sending a message
   */
  flushTranscriptionsToUI(): void;

  // New methods for incremental transcription sending
  getNewTranscriptions(): SpeakerTranscription[];
  markTranscriptionsAsSent(): void;
  hasNewTranscriptions(): boolean;
  updateUIWithNewTranscriptions(): void;
  extractAndMarkAsSent(): SpeakerTranscription[];
}
