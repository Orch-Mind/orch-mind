// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// IOpenAIService.ts
// Interface for the OpenAI service

import { NeuralSignalResponse } from "../neural/NeuralSignalTypes";
import { Message } from "../transcription/TranscriptionTypes";
import { ModelStreamResponse, StreamingCallback } from "./ICompletionService";

/**
 * Interface para serviços compatíveis com OpenAI (Ollama, HuggingFace, etc.)
 * Define os métodos que devem ser implementados por cada provedor de LLM
 */
export interface IOpenAIService {
  /**
   * Inicializa o cliente do provedor LLM com configuração opcional
   */
  initializeOpenAI(config?: string): void;

  /**
   * Carrega configurações do armazenamento local
   */
  loadApiKey(): Promise<void>;

  /**
   * Garante que o cliente está disponível e configurado
   */
  ensureOpenAIClient(): Promise<boolean>;

  /**
   * Envia mensagens para o LLM e processa resposta em stream
   * @param messages Array de mensagens da conversa
   * @param temperature Temperatura para geração (0.0-2.0)
   * @param onChunk Callback opcional para processar chunks de streaming
   */
  streamOpenAIResponse(
    messages: Message[],
    temperature?: number,
    onChunk?: StreamingCallback
  ): Promise<ModelStreamResponse>;

  /**
   * Cria embeddings para um texto
   */
  createEmbedding(text: string): Promise<number[]>;

  /**
   * Cria embeddings para múltiplos textos
   */
  createEmbeddings(texts: string[]): Promise<number[][]>;

  /**
   * Verifica se o cliente está inicializado
   */
  isInitialized(): boolean;

  /**
   * Gera sinais neurais baseados em prompt
   */
  generateNeuralSignal(
    prompt: string,
    temporaryContext?: string,
    language?: string
  ): Promise<NeuralSignalResponse>;

  /**
   * Batch semantic enrichment for multiple neural signals
   * Processes multiple signals in a single LLM call for improved efficiency
   * @param signals Array of signal data to enrich
   * @param language Language context for enrichment
   * @returns Array of enrichment results in the same order as input
   */
  enrichSemanticQuery(
    signals: Array<{
      core: string;
      query: string;
      intensity: number;
      context?: string;
    }>,
    language?: string
  ): Promise<Array<{ enrichedQuery: string; keywords: string[] }>>;

  /**
   * Chama o modelo com suporte a function calling
   */
  callOpenAIWithFunctions(options: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    tools?: Array<{
      type: string;
      function: {
        name: string;
        description: string;
        parameters: Record<string, unknown>;
      };
    }>;
    tool_choice?: { type: string; function: { name: string } };
    temperature?: number;
    max_tokens?: number;
  }): Promise<{
    choices: Array<{
      message: {
        content?: string;
        tool_calls?: Array<{
          function: {
            name: string;
            arguments: string | Record<string, any>;
          };
        }>;
      };
    }>;
  }>;
}
