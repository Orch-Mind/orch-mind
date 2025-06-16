// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// IOpenAIService.ts
// Interface para o serviço de comunicação com a API OpenAI

import { NeuralSignalResponse } from "../neural/NeuralSignalTypes";
import { Message } from "../transcription/TranscriptionTypes";
import { ModelStreamResponse } from "./ICompletionService";

export interface IOpenAIService {
  /**
   * Inicializa o cliente OpenAI
   */
  initializeOpenAI(apiKey: string): void;

  /**
   * Carrega a chave da API do OpenAI do ambiente
   */
  loadApiKey(): Promise<void>;

  /**
   * Garante que o cliente OpenAI está disponível
   */
  ensureOpenAIClient(): Promise<boolean>;

  /**
   * Envia requisição para OpenAI e processa o stream de resposta
   */
  streamOpenAIResponse(messages: Message[]): Promise<ModelStreamResponse>;

  /**
   * Cria embeddings para o texto fornecido
   * @param text Texto para gerar embedding
   * @param model Modelo de embedding a ser usado (opcional)
   */
  createEmbedding(text: string, model?: string): Promise<number[]>;

  /**
   * Cria embeddings para um lote de textos (processamento em batch)
   * @param texts Array de textos para gerar embeddings
   * @param model Modelo de embedding a ser usado (opcional)
   * @returns Array de arrays de numbers representando os embeddings
   */
  createEmbeddings?(texts: string[], model?: string): Promise<number[][]>;

  /**
   * Verifica se o cliente OpenAI está inicializado
   */
  isInitialized(): boolean;

  /**
   * Gera sinais neurais simbólicos baseados em um prompt para ativação do cérebro artificial
   * @param prompt O prompt estruturado para gerar sinais neurais (estímulo sensorial)
   * @param temporaryContext Contexto temporário opcional (campo contextual efêmero)
   * @returns Resposta contendo array de sinais neurais para ativação das áreas cerebrais
   */
  generateNeuralSignal(
    prompt: string,
    temporaryContext?: string,
    language?: string
  ): Promise<NeuralSignalResponse>;

  /**
   * Expande semanticamente a query de um núcleo cerebral, retornando uma versão enriquecida, palavras-chave e dicas de contexto.
   */
  enrichSemanticQueryForSignal(
    core: string,
    query: string,
    intensity: number,
    context?: string,
    language?: string
  ): Promise<{ enrichedQuery: string; keywords: string[] }>;

  /**
   * Envia uma requisição ao OpenAI com suporte a function calling
   * @param options Opções da requisição incluindo modelo, mensagens, ferramentas, etc.
   * @returns Resposta completa após o processamento
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
