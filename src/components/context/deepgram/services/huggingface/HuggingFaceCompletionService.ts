// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// HuggingFaceCompletionService.ts
// Symbolic: Processamento de completions e function calling com HuggingFace local

import {
  ICompletionService,
  ModelStreamResponse,
} from "../../interfaces/openai/ICompletionService";
import { LoggingUtils } from "../../utils/LoggingUtils";
import { HuggingFaceClientService } from "./neural/HuggingFaceClientService";
import { toHuggingFaceTools } from "../../../../../utils/hfToolUtils";

/**
 * Serviço responsável por gerar completions com function calling usando HuggingFace
 * Symbolic: Neurônio especializado em processamento de texto local e chamadas de funções
 */
export class HuggingFaceCompletionService implements ICompletionService {
  constructor(private clientService: HuggingFaceClientService) {}

  /**
   * Envia uma requisição ao modelo local HuggingFace com suporte a function calling
   * Symbolic: Processamento neural local para geração de texto ou execução de função
   */
  async callModelWithFunctions(options: {
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
            arguments: string;
          };
        }>;
      };
    }>;
  }> {
    try {
      // Ensure HuggingFace client is available
      await this.clientService.ensureClient();

      // Convert messages to HuggingFace format
      const formattedMessages = options.messages.map((m) => ({
        role: m.role as "system" | "user" | "assistant",
        content: m.content,
      }));

      const hfTools = toHuggingFaceTools(options.tools);

      // Call HuggingFace service with function calling support
      const response = await this.clientService
        .getClient()
        .generateWithFunctions(formattedMessages, hfTools as any, {
          temperature: options.temperature || 0.7,
          maxTokens: options.max_tokens || 500,
        });

      // Convert HuggingFace response to expected format
      return {
        choices: [
          {
            message: {
              content: response.content || undefined,
              tool_calls: response.tool_calls?.map((toolCall: any) => ({
                function: {
                  name: toolCall.function.name,
                  arguments: toolCall.function.arguments,
                },
              })),
            },
          },
        ],
      };
    } catch (error) {
      // Log the error
      LoggingUtils.logError(
        `Error calling HuggingFace model: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      console.error("Error in HuggingFace completion call:", error);
      throw error;
    }
  }

  /**
   * Envia requisição para o modelo HuggingFace e processa o stream de resposta
   * Symbolic: Fluxo neural contínuo de processamento de linguagem local
   */
  async streamModelResponse(
    messages: Array<{ role: string; content: string }>
  ): Promise<ModelStreamResponse> {
    try {
      // Ensure HuggingFace client is available
      await this.clientService.ensureClient();

      // Convert messages to HuggingFace format
      const formattedMessages = messages.map((m) => ({
        role: m.role as "system" | "user" | "assistant",
        content: m.content,
      }));

      // Generate response using HuggingFace service
      const response = await this.clientService
        .getClient()
        .generateResponse(formattedMessages);

      // Since HuggingFace service doesn't support true streaming yet,
      // we simulate the streaming response format
      return {
        responseText: response.response,
        messageId: Date.now().toString(),
        isComplete: true,
        isDone: true,
      };
    } catch (error) {
      LoggingUtils.logError(
        `Error streaming HuggingFace model response: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }
}
