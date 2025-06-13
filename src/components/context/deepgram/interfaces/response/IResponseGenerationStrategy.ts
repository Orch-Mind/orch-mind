// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { Message } from "../transcription/TranscriptionTypes";

/**
 * Context for response generation
 */
export interface ResponseGenerationContext {
  messages: Message[];
  temporaryContext?: string;
  language?: string;
  useStreaming?: boolean;
}

/**
 * Result from response generation
 */
export interface ResponseGenerationResult {
  response: string;
  messageId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Strategy interface for response generation
 * Part of SOLID refactoring to support different response generation approaches
 */
export interface IResponseGenerationStrategy {
  /**
   * Generate a response using the specific strategy
   * @param prompt The integrated prompt
   * @param context Additional context
   * @returns Generated response
   */
  generateResponse(
    prompt: string,
    context: ResponseGenerationContext
  ): Promise<ResponseGenerationResult>;

  /**
   * Get the strategy name for logging/debugging
   */
  getStrategyName(): string;
}