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
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
      try {
        // Ensure the Ollama client is available
        await this.clientService.ensureClient();

        // Convert messages to Ollama format
        const formattedMessages = options.messages.map((m) => ({
          // Convert 'developer' to 'system' for Ollama compatibility
          role: m.role === "developer" ? "system" : m.role,
          content: m.content,
        }));

        // Get model with fallback logic
        let selectedModel =
          getOption(STORAGE_KEYS.OLLAMA_MODEL) || "mistral:7b-instruct";

        console.log(`🦙 [OllamaCompletion] Selected model: ${selectedModel}`);

        // Verify model is available before making the request
        try {
          console.log(
            `🦙 [OllamaCompletion] Checking if model ${selectedModel} is available...`
          );
          const modelsResponse = await fetch("http://localhost:11434/api/tags");
          if (modelsResponse.ok) {
            const modelsData = await modelsResponse.json();
            const availableModels =
              modelsData.models?.map((m: any) => m.name) || [];
            console.log(
              `🦙 [OllamaCompletion] Available models: ${availableModels.join(
                ", "
              )}`
            );

            if (!availableModels.includes(selectedModel)) {
              console.warn(
                `🦙 [OllamaCompletion] Model ${selectedModel} not found, available: ${availableModels.join(
                  ", "
                )}`
              );
              // Try to use the first available model that matches our filtered list
              const fallbackModels = [
                "qwen3:4b",
                "mistral:latest",
                "mistral-nemo:latest",
                "llama3.2:latest",
              ];
              const availableFallback = fallbackModels.find((model) =>
                availableModels.includes(model)
              );
              if (availableFallback) {
                console.log(
                  `🦙 [OllamaCompletion] Using fallback model: ${availableFallback}`
                );
                selectedModel = availableFallback;
              }
            }
          }
        } catch (modelCheckError) {
          console.warn(
            `🦙 [OllamaCompletion] Could not check available models:`,
            modelCheckError
          );
        }

        // Build request options following Ollama native API documentation
        const requestOptions: any = {
          model: selectedModel,
          messages: formattedMessages,
          stream: false, // Don't use stream for function calling
          options: {
            temperature: options.temperature || 0.1, // Lower temperature for more consistent function calling
            num_predict: options.max_tokens || 4096,
            top_p: 0.9,
            repeat_penalty: 1.1,
          },
        };

        // Add tools in native Ollama format if provided
        if (options.tools && options.tools.length > 0) {
          // Convert tools to Ollama's native format
          requestOptions.tools = options.tools.map((tool) => ({
            type: "function",
            function: {
              name: tool.function.name,
              description: tool.function.description,
              parameters: tool.function.parameters,
            },
          }));

          LoggingUtils.logInfo(
            `🦙 [OllamaCompletion] Using native tools: ${JSON.stringify(
              requestOptions.tools,
              null,
              2
            )}`
          );
        }

        // Add GPU control for Metal acceleration issues (macOS)
        if (retryCount > 0) {
          // On retry, force CPU mode to avoid Metal acceleration issues
          requestOptions.options.num_gpu = 0;
          LoggingUtils.logWarning(
            `🦙 [OllamaCompletion] Retry ${retryCount}: Forcing CPU mode due to potential Metal acceleration issues`
          );
        }

        LoggingUtils.logInfo(
          `🦙 [OllamaCompletion] Calling Ollama API with model: ${selectedModel}`
        );
        LoggingUtils.logInfo(
          `🦙 [OllamaCompletion] Request options: ${JSON.stringify(
            requestOptions,
            null,
            2
          )}`
        );

        // Perform the Ollama chat completion using the official API endpoint
        console.log(`🦙 [OllamaCompletion] About to fetch with timeout...`);

        let data: any;

        try {

          const response = await fetch("http://localhost:11434/api/chat", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestOptions),
          });

          console.log(
            `🦙 [OllamaCompletion] Fetch completed, response status: ${response.status}`
          );
          console.log(`🦙 [OllamaCompletion] Response ok: ${response.ok}`);

          if (!response.ok) {
            const errorText = await response.text();
            console.error(
              `🦙 [OllamaCompletion] API Error - Status: ${response.status}, Text: ${errorText}`
            );
            throw new Error(
              `Ollama API error: ${response.statusText} - ${errorText}`
            );
          }

          console.log(`🦙 [OllamaCompletion] About to parse JSON response...`);
          data = await response.json();
          console.log(`🦙 [OllamaCompletion] JSON parsed successfully`);
        } catch (fetchError: any) {
          console.warn(
            `🦙 [OllamaCompletion] Fetch failed, trying curl fallback:`,
            fetchError.message
          );
        }

        LoggingUtils.logInfo(
          `🦙 [OllamaCompletion] Raw response data: ${JSON.stringify(
            data,
            null,
            2
          )}`
        );

        // Clean think tags from content immediately after receiving response
        const rawContent = data.message?.content || "";
        const content = cleanThinkTags(rawContent);
        const nativeToolCalls = data.message?.tool_calls || [];

        LoggingUtils.logInfo(
          `🦙 [OllamaCompletion] Content (cleaned): ${content.substring(
            0,
            200
          )}...`
        );
        LoggingUtils.logInfo(
          `🦙 [OllamaCompletion] Native tool calls: ${JSON.stringify(
            nativeToolCalls,
            null,
            2
          )}`
        );

        // Process native tool calls from Ollama
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
            const functionName = call.function?.name || call.name;
            let functionArgs = call.function?.arguments || call.arguments;

            // Ensure arguments are properly formatted
            if (typeof functionArgs === "object" && functionArgs !== null) {
              // If it's already an object, stringify it for consistency
              functionArgs = JSON.stringify(functionArgs);
            } else if (typeof functionArgs !== "string") {
              // If it's neither string nor object, convert to string
              functionArgs = JSON.stringify(functionArgs);
            }

            LoggingUtils.logInfo(
              `🦙 [OllamaCompletion] Processed tool call: ${functionName} with args: ${functionArgs}`
            );

            return {
              function: {
                name: functionName,
                arguments: functionArgs,
              },
            };
          });

          // Clean think tags from tool calls
          tool_calls = cleanThinkTagsFromToolCalls(tool_calls);

          LoggingUtils.logInfo(
            `🦙 [OllamaCompletion] Successfully processed ${tool_calls.length} native tool calls (cleaned)`
          );
        }

        // Fallback: Try to parse function calls from content if no native tool calls
        if (!tool_calls || tool_calls.length === 0) {
          try {
            const cleanContent = content.trim();

            // Try multiple parsing strategies for function calls
            let functionCallData = null;

            // Strategy 1: Direct JSON parsing (most common case)
            if (cleanContent.startsWith("{") && cleanContent.endsWith("}")) {
              try {
                functionCallData = JSON.parse(cleanContent);
                LoggingUtils.logInfo(
                  `🦙 [OllamaCompletion] Direct JSON parse successful (fallback)`
                );
              } catch (e) {
                LoggingUtils.logWarning(
                  `🦙 [OllamaCompletion] Direct JSON parse failed: ${e}`
                );
              }
            }

            // Strategy 2: Extract JSON from markdown or mixed content
            if (!functionCallData) {
              const jsonMatches = [
                // Look for JSON in code blocks
                /```(?:json)?\s*(\{[\s\S]*?\})\s*```/g,
                // Look for standalone JSON objects
                /(\{[\s\S]*?"function_name"[\s\S]*?\})/g,
                // Look for any JSON object with parameters
                /(\{[\s\S]*?"parameters"[\s\S]*?\})/g,
                // Look for any JSON object
                /(\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})/g,
              ];

              for (const regex of jsonMatches) {
                const matches = [...cleanContent.matchAll(regex)];
                for (const match of matches) {
                  try {
                    const candidate = JSON.parse(match[1]);
                    if (candidate.function_name || candidate.parameters) {
                      functionCallData = candidate;
                      LoggingUtils.logInfo(
                        `🦙 [OllamaCompletion] JSON extracted from content (fallback)`
                      );
                      break;
                    }
                  } catch (e) {
                    continue;
                  }
                }
                if (functionCallData) break;
              }
            }

            // Convert to OpenAI-compatible format if we found a function call
            if (functionCallData) {
              let functionName = "";
              let functionArgs: any = {};

              // Handle our simplified format
              if (
                functionCallData.function_name &&
                functionCallData.parameters
              ) {
                functionName = functionCallData.function_name;
                functionArgs = functionCallData.parameters;
              }
              // Handle OpenAI-like format if present
              else if (functionCallData.function_call) {
                functionName = functionCallData.function_call.name;
                functionArgs =
                  typeof functionCallData.function_call.arguments === "string"
                    ? JSON.parse(functionCallData.function_call.arguments)
                    : functionCallData.function_call.arguments;
              }

              if (functionName) {
                // Ensure arguments is properly formatted and cleaned
                const argumentsString =
                  typeof functionArgs === "string"
                    ? cleanThinkTags(functionArgs)
                    : cleanThinkTags(JSON.stringify(functionArgs));

                tool_calls = [
                  {
                    function: {
                      name: functionName,
                      arguments: argumentsString,
                    },
                  },
                ];

                LoggingUtils.logInfo(
                  `🦙 [OllamaCompletion] Successfully parsed function call from content (fallback, cleaned): ${functionName}`
                );
              }
            }
          } catch (parseError) {
            LoggingUtils.logError(
              `🦙 [OllamaCompletion] Function call parsing error (fallback): ${parseError}`
            );
            LoggingUtils.logError(
              `🦙 [OllamaCompletion] Raw content for debugging: ${content}`
            );
          }
        }

        console.log(
          `🦙 [OllamaCompletion] About to return response with tool_calls: ${
            tool_calls ? "YES" : "NO"
          }`
        );
        console.log(
          `🦙 [OllamaCompletion] Tool calls count: ${tool_calls?.length || 0}`
        );

        // Convert the response to expected format
        return {
          choices: [
            {
              message: {
                content: tool_calls ? undefined : content,
                tool_calls,
              },
            },
          ],
        };
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
    messages: Array<{ role: string; content: string }>
  ): Promise<ModelStreamResponse> {
    try {
      // Ensure the Ollama client is available
      await this.clientService.ensureClient();

      // Convert messages to Ollama format
      const formattedMessages = messages.map((m) => ({
        role: m.role === "developer" ? "system" : m.role,
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
