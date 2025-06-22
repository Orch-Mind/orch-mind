// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// ICompletionService.ts
// Symbolic: Neural pathway for language model completions and function executions

/**
 * Interface que define o retorno de uma resposta de streaming do modelo
 */
export interface ModelStreamResponse {
  responseText: string;
  messageId: string;
  isComplete: boolean;
  isDone: boolean;
}

/**
 * Callback para processar chunks de streaming
 */
export type StreamingCallback = (chunk: string) => void;

/**
 * Interface para o serviço de completions com ou sem function calling
 * Symbolic: Representa o córtex de geração de texto e execução de funções simbólicas
 */
export interface ICompletionService {
  /**
   * Envia uma requisição ao modelo de linguagem com suporte a function calling
   * @param options Opções da requisição incluindo modelo, mensagens, ferramentas, etc.
   * @returns Resposta completa após o processamento
   */
  callModelWithFunctions(options: {
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

  /**
   * Envia requisição para o modelo e processa o stream de resposta
   * Symbolic: Fluxo neural contínuo de processamento de linguagem
   * @param messages Array de mensagens
   * @param temperature Temperatura para geração
   * @param onChunk Callback opcional para processar chunks de streaming
   */
  streamModelResponse(
    messages: Array<{ role: string; content: string }>,
    temperature?: number,
    onChunk?: StreamingCallback
  ): Promise<ModelStreamResponse>;
}
