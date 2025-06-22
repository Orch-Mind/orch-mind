// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// OllamaCompletionService.ts
// Symbolic: Processamento de completions e function calling com Ollama local
import {
  STORAGE_KEYS,
  getOption,
} from "../../../../../../services/StorageService";
import { IClientManagementService } from "../../../interfaces/openai/IClientManagementService";
import {
  ICompletionService,
  ModelStreamResponse,
} from "../../../interfaces/openai/ICompletionService";
import { LoggingUtils } from "../../../utils/LoggingUtils";
import {
  cleanThinkTags,
  cleanThinkTagsFromToolCalls,
} from "../../../utils/ThinkTagCleaner";

/**
 * Serviço responsável por gerar completions com function calling usando Ollama
 * Symbolic: Neurônio especializado em processamento de texto e chamadas de funções
 */
export class OllamaCompletionService implements ICompletionService {
  private clientService: IClientManagementService;

  constructor(clientService: IClientManagementService) {
    this.clientService = clientService;
  }

  /**
   * Envia uma requisição ao modelo de linguagem com suporte a function calling
   * Symbolic: Processamento neural para geração de texto ou execução de função
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
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
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
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
      try {
        // Ensure the Ollama client is available
        await this.clientService.ensureClient();

        // Convert messages to Ollama format and handle tool results
        const formattedMessages = options.messages.map((m) => {
          // Handle tool result messages
          if (m.role === "tool") {
            return {
              role: "tool",
              content: m.content,
            };
          }

          // Convert 'system' role properly
          return {
            role:
              m.role === "system" || m.role === "developer" ? "system" : m.role,
            content: m.content,
          };
        });

        // Get model with fallback logic
        let selectedModel = getOption(STORAGE_KEYS.OLLAMA_MODEL) || "qwen3:4b";

        // Verify model is available before making the request
        try {
          const modelsResponse = await fetch("http://localhost:11434/api/tags");
          if (modelsResponse.ok) {
            const modelsData = await modelsResponse.json();
            const availableModels =
              modelsData.models?.map((m: any) => m.name) || [];

            if (!availableModels.includes(selectedModel)) {
              // Try to use the first available model that supports tools
              const toolSupportModels = [
                "qwen3:4b",
                "qwen3:latest",
                "qwen2.5:latest",
                "llama3.1:latest",
                "granite3.3:latest",
                "mistral-nemo:latest",
              ];
              const availableFallback = toolSupportModels.find((model) =>
                availableModels.includes(model)
              );
              if (availableFallback) {
                selectedModel = availableFallback;
              }
            }
          }
        } catch (modelCheckError) {
          // Ignore model check errors
        }

        // Build request options following Ollama native API documentation
        const requestBody: any = {
          model: selectedModel,
          messages: formattedMessages,
          stream: !!options.stream,
          options: {
            temperature: options.temperature ?? 0.7,
            // num_predict controls the maximum tokens in the response
            num_predict: options.max_tokens ?? 2048,
            // num_ctx is the context window size (should be larger)
            num_ctx: 8192,
            // Remove format: "json" for Command R7B as it causes empty responses
            // See: https://github.com/ollama/ollama/issues/6771
          },
        };

        // Add format: "json" only for models that handle it well
        // Command R7B has issues with JSON format causing empty responses
        const modelsWithGoodJsonSupport = ["qwen3", "llama3.1", "llama3.2"];
        const modelBase = selectedModel.split(":")[0].toLowerCase();

        if (modelsWithGoodJsonSupport.includes(modelBase)) {
          // Don't force JSON format when using tools - let the model decide
          if (!options.tools || options.tools.length === 0) {
            requestBody.format = "json";
          }
        }

        // Add tools in native Ollama format if provided
        if (options.tools && options.tools.length > 0) {
          requestBody.tools = options.tools;

          // Force the model to use a tool (supported in newer Ollama versions)
          // This helps ensure the model understands it should use tools
          // Commented out for compatibility with older Ollama versions
          // requestBody.tool_choice = "required";
        }

        // Add GPU control for Metal acceleration issues (macOS)
        if (retryCount > 0) {
          // On retry, force CPU mode to avoid Metal acceleration issues
          requestBody.options.num_gpu = 0;
          LoggingUtils.logWarning(
            `🦙 [OllamaCompletion] Retry ${retryCount}: Forcing CPU mode due to potential Metal acceleration issues`
          );
        }

        LoggingUtils.logInfo(
          `🦙 [OllamaCompletion] Calling Ollama API with model: ${selectedModel}`
        );

        // Perform the Ollama chat completion using the official API endpoint
        try {
          const response = await fetch("http://localhost:11434/api/chat", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(
              `🦙 [OllamaCompletion] API Error - Status: ${response.status}, Text: ${errorText}`
            );
            throw new Error(
              `Ollama API error: ${response.statusText} - ${errorText}`
            );
          }

          const data = await response.json();

          // Extract content and tool calls from native Ollama response
          const rawContent = data.message?.content || "";
          const content = cleanThinkTags(rawContent);
          const nativeToolCalls = data.message?.tool_calls || [];

          // Process native tool calls from Ollama (already in correct format)
          let tool_calls:
            | Array<{
                function: {
                  name: string;
                  arguments: string | Record<string, any>;
                };
              }>
            | undefined;

          if (
            nativeToolCalls &&
            Array.isArray(nativeToolCalls) &&
            nativeToolCalls.length > 0
          ) {
            tool_calls = nativeToolCalls.map((call: any) => {
              // Ollama returns tool calls in the correct format already
              const functionName = call.function?.name;
              let functionArgs = call.function?.arguments;

              // Ensure arguments are properly formatted as string
              if (typeof functionArgs === "object" && functionArgs !== null) {
                functionArgs = JSON.stringify(functionArgs);
              } else if (typeof functionArgs !== "string") {
                functionArgs = JSON.stringify(functionArgs || {});
              }

              return {
                function: {
                  name: functionName,
                  arguments: functionArgs,
                },
              };
            });

            // Clean think tags from tool calls if present
            tool_calls = cleanThinkTagsFromToolCalls(tool_calls);
          }

          // Return the response in expected format
          // When there are tool calls, content should be undefined (as per OpenAI spec)
          return {
            choices: [
              {
                message: {
                  content:
                    tool_calls && tool_calls.length > 0 ? undefined : content,
                  tool_calls,
                },
              },
            ],
          };
        } catch (error) {
          throw error; // Re-throw to be handled by outer try-catch
        }
      } catch (error) {
        retryCount++;

        // Check if this is a Metal acceleration error
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const isMetalError =
          errorMessage.includes("Metal") ||
          errorMessage.includes("Internal Error") ||
          errorMessage.includes("command buffer") ||
          errorMessage.includes("status 5");

        if (isMetalError && retryCount <= maxRetries) {
          LoggingUtils.logWarning(
            `🦙 [OllamaCompletion] Metal acceleration error detected, retrying with CPU mode (attempt ${retryCount}/${maxRetries})`
          );
          continue; // Retry with CPU mode
        }

        // Log the error
        LoggingUtils.logError(
          `Error calling language model (attempt ${retryCount}/${
            maxRetries + 1
          }): ${errorMessage}`
        );

        if (retryCount > maxRetries) {
          console.error("Error in model completion call:", error);
          throw error;
        }
      }
    }

    // This should never be reached, but TypeScript requires it
    throw new Error("Maximum retries exceeded");
  }

  /**
   * Envia requisição para o modelo e processa o stream de resposta
   * Symbolic: Fluxo neural contínuo de processamento de linguagem
   */
  async streamModelResponse(
    messages: Array<{ role: string; content: string }>,
    temperature?: number
  ): Promise<ModelStreamResponse> {
    try {
      // Ensure the Ollama client is available
      await this.clientService.ensureClient();

      // Convert messages to Ollama format
      const formattedMessages = messages.map((m) => ({
        role: m.role === "system" ? "system" : m.role,
        content: m.content,
      }));

      // Use the official Ollama API endpoint
      const response = await fetch("http://localhost:11434/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: getOption(STORAGE_KEYS.OLLAMA_MODEL) || "qwen3:latest",
          messages: formattedMessages,
          stream: false,
          options: {
            temperature: temperature ?? 0.7,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Ollama API error: ${response.statusText} - ${errorText}`
        );
      }

      const data = await response.json();
      const rawResponse = data.message?.content || "";

      // Clean think tags from streaming response
      const fullResponse = cleanThinkTags(rawResponse);

      return {
        responseText: fullResponse,
        messageId: Date.now().toString(),
        isComplete: true,
        isDone: true,
      };
    } catch (error) {
      LoggingUtils.logError(
        `Error streaming model response: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }
}
