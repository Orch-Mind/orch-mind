// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// IPersistenceService.ts
// Interface for persistence services

import { SpeakerTranscription } from "../transcription/TranscriptionTypes";

export interface IPersistenceService {
  /**
   * Saves interaction to long-term memory
   */
  saveInteraction(
    question: string,
    answer: string,
    speakerTranscriptions: SpeakerTranscription[],
    primaryUserSpeaker: string
  ): Promise<void>;

  /**
   * Saves interaction directly to long-term memory bypassing buffer system
   * Used for immediate persistence of chat messages and simple interactions
   */
  saveDirectInteraction(
    question: string,
    answer: string,
    speakerTranscriptions: SpeakerTranscription[],
    primaryUserSpeaker: string,
    forceSave?: boolean
  ): Promise<void>;

  /**
   * Checks if the persistence service is available
   */
  isAvailable(): boolean;

  /**
   * Creates a vector entry for the persistence store
   */
  createVectorEntry(
    id: string,
    embedding: number[],
    metadata: Record<string, unknown>
  ): unknown;

  /**
   * Salva vetores no Pinecone
   */
  saveToPinecone(
    vectors: Array<{
      id: string;
      values: number[];
      metadata: Record<string, unknown>;
    }>
  ): Promise<void>;

  /**
   * Queries the memory store
   */
  queryMemory(
    embedding: number[],
    topK?: number,
    keywords?: string[],
    filters?: Record<string, unknown>
  ): Promise<string>;
}
