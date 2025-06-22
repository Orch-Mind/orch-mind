// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// HuggingFaceCompletionService.ts
// Symbolic: Processamento de completions e function calling com HuggingFace local

import {
  getOption,
  STORAGE_KEYS,
} from "../../../../../services/StorageService";
import { toHuggingFaceTools } from "../../../../../utils/hfToolUtils";
import { IClientManagementService } from "../../interfaces/openai/IClientManagementService";
import {
  ICompletionService,
  ModelStreamResponse,
  StreamingCallback,
} from "../../interfaces/openai/ICompletionService";
import { LoggingUtils } from "../../utils/LoggingUtils";
import { cleanThinkTags } from "../../utils/ThinkTagCleaner";

/**
 * Serviço responsável por gerar completions com function calling usando HuggingFace
 * Symbolic: Neurônio especializado em processamento de texto local e chamadas de funções
 */
export class HuggingFaceCompletionService implements ICompletionService {
  constructor(private clientService: IClientManagementService) {}

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
            arguments: string | Record<string, any>;
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

      // Detect if the chosen model is a LOCAL vLLM model (desktop Electron)
      const selectedModel = getOption(STORAGE_KEYS.HF_MODEL) as string | null;
      const isLocal =
        !!selectedModel &&
        //   AVAILABLE_MODELS.some((m) => m.id === selectedModel) &&
        typeof window !== "undefined" &&
        (window as any).electronAPI?.vllmGenerate;

      if (isLocal) {
        // ---------- Local vLLM branch ----------
        const electronAPI = (window as any).electronAPI;
        // Wait until model is ready (max 30 seconds)
        for (let i = 0; i < 30; i++) {
          const statusRes = await electronAPI.vllmModelStatus();
          if (statusRes.success && statusRes.status?.state === "ready") break;
          await new Promise((res) => setTimeout(res, 1000));
          if (i === 29) {
            throw new Error("Local model not ready after 30s timeout");
          }
        }
        const payload: any = {
          model: selectedModel,
          messages: formattedMessages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.max_tokens ?? 500,
        };
        if (options.tools && options.tools.length)
          payload.tools = options.tools;
        if (options.tool_choice) payload.tool_choice = options.tool_choice;

        const genRes = await electronAPI.vllmGenerate(payload);
        if (!genRes.success) {
          throw new Error(genRes.error || "vLLM generation failed");
        }

        // Clean think tags from vLLM response
        const choices = genRes.data?.choices ?? [];
        const cleanedChoices = choices.map((choice: any) => ({
          ...choice,
          message: {
            ...choice.message,
            content: choice.message?.content
              ? cleanThinkTags(choice.message.content)
              : choice.message?.content,
          },
        }));

        return {
          choices: cleanedChoices,
        };
      }

      // ---------- Browser (transformers.js) branch ----------
      const hfTools = toHuggingFaceTools(options.tools);
      const hfService = (window as any).hfLocalService;

      if (!hfService) {
        throw new Error("HuggingFace local service not available");
      }

      const result = await hfService.generateWithFunctions(
        formattedMessages,
        hfTools,
        {
          temperature: options.temperature,
          maxTokens: options.max_tokens,
        }
      );

      // Clean think tags from browser response
      const cleanedContent = result.response
        ? cleanThinkTags(result.response)
        : result.response;

      return {
        choices: [
          {
            message: {
              content: result.tool_calls ? undefined : cleanedContent,
              tool_calls: result.tool_calls,
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
    messages: Array<{ role: string; content: string }>,
    temperature?: number,
    onChunk?: StreamingCallback
  ): Promise<ModelStreamResponse> {
    try {
      // Ensure HuggingFace client is available
      await this.clientService.ensureClient();

      // Convert messages to HuggingFace format
      const formattedMessages = messages.map((m) => ({
        role: m.role as "system" | "user" | "assistant",
        content: m.content,
      }));

      const hfService = (window as any).hfLocalService;
      if (!hfService) {
        throw new Error("HuggingFace local service not available");
      }

      // Note: HuggingFace local doesn't support true streaming yet
      // We'll generate the full response and simulate streaming
      const response = await hfService.generateResponse(formattedMessages, {
        temperature: temperature ?? 0.7,
      });

      // Clean think tags from response
      const cleanedResponse = cleanThinkTags(response.response);

      // Simulate streaming by sending chunks
      if (onChunk && cleanedResponse) {
        const words = cleanedResponse.split(" ");
        const chunkSize = 3; // Send 3 words at a time

        for (let i = 0; i < words.length; i += chunkSize) {
          const chunk = words.slice(i, i + chunkSize).join(" ");
          const isLastChunk = i + chunkSize >= words.length;

          onChunk(chunk + (isLastChunk ? "" : " "));

          // Small delay to simulate streaming
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }

      return {
        responseText: cleanedResponse,
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
