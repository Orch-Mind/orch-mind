// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// OllamaCompletionService.ts
// Symbolic: Processamento de completions e function calling com Ollama local
import { OllamaToolConfigHelper } from "../../../../../../config/OllamaToolConfig";
import {
  STORAGE_KEYS,
  getOption,
} from "../../../../../../services/StorageService";
import { OllamaToolCallParser } from "../../../../../../utils/OllamaToolCallParser";
import { IClientManagementService } from "../../../interfaces/openai/IClientManagementService";
import {
  ICompletionService,
  ModelStreamResponse,
  StreamingCallback,
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

        // Get model directly - no verification needed as all models are compatible
        const selectedModel =
          getOption(STORAGE_KEYS.OLLAMA_MODEL) || "qwen3:latest";

        // Get model-specific configuration
        const modelConfig =
          OllamaToolConfigHelper.getModelConfig(selectedModel);

        // Check for specific model families
        const modelNameLower = selectedModel.toLowerCase();
        const isGemma = modelNameLower.includes("gemma");
        const isQwen = modelNameLower.includes("qwen");
        const isLlama3 =
          modelNameLower.includes("llama3") ||
          modelNameLower.includes("llama-3");
        const isMistral = modelNameLower.includes("mistral");

        // Debug logging for model detection
        console.log(
          `🦙 [OllamaCompletion] Model detection for ${selectedModel}:`,
          {
            isGemma,
            isQwen,
            isLlama3,
            isMistral,
          }
        );

        // Build request options following Ollama native API documentation
        const requestBody: any = {
          model: selectedModel,
          messages: formattedMessages,
          stream: !!options.stream,
          options: {
            temperature: modelConfig.temperature ?? options.temperature ?? 0.5,
            // num_predict controls the maximum tokens in the response
            num_predict: modelConfig.num_predict ?? options.max_tokens ?? 2048,
            // num_ctx is the context window size (should be larger)
            num_ctx: modelConfig.num_ctx ?? 8192,
          },
        };

        // Important: Do NOT use format: "json" when using tools
        // This can interfere with the model's ability to generate proper tool calls
        // Only use JSON format for non-tool requests
        if (!options.tools || options.tools.length === 0) {
          requestBody.format = "json";
        }

        // Handle tools based on model capabilities
        if (options.tools && options.tools.length > 0) {
          if (isGemma) {
            // Gemma doesn't support native tools, use direct instruction format
            LoggingUtils.logInfo(
              `🦙 [OllamaCompletion] Detected ${selectedModel}, using direct instruction format instead of native tools`
            );

            const toolFunction = options.tools[0].function;

            // Build dynamic parameter list based on actual function schema
            const params = toolFunction.parameters.properties || {};
            const requiredParams = Array.isArray(
              toolFunction.parameters.required
            )
              ? toolFunction.parameters.required
              : [];

            // Create example parameter format based on types
            const paramExamples = Object.entries(params)
              .map(([key, prop]: [string, any]) => {
                const isRequired = requiredParams.includes(key);
                let example = "";

                if (prop.type === "string") {
                  example = `${key}:"<${prop.description || "text"}>"`;
                } else if (prop.type === "number") {
                  const min = prop.minimum || 0;
                  const max = prop.maximum || 1;
                  example = `${key}:<${min}-${max}>`;
                } else if (prop.type === "boolean") {
                  example = `${key}:<true/false>`;
                } else if (prop.type === "array") {
                  example = `${key}:["item1", "item2"]`;
                } else if (prop.type === "object") {
                  example = `${key}:{...}`;
                }

                return isRequired ? example : `${example} (optional)`;
              })
              .filter(Boolean)
              .join(", ");

            const directInstructionPrompt = `You must respond with a function call in this exact format:
${toolFunction.name}(${paramExamples})

Available function:
- ${toolFunction.name}: ${toolFunction.description}

Parameters:
${Object.entries(params)
  .map(([key, prop]: [string, any]) => {
    const isRequired = requiredParams.includes(key);
    return `- ${key}: ${prop.description || prop.type}${
      isRequired ? " (required)" : " (optional)"
    }`;
  })
  .join("\n")}`;

            // Modify the system message to include direct instructions
            if (
              formattedMessages.length > 0 &&
              formattedMessages[0].role === "system"
            ) {
              formattedMessages[0].content =
                directInstructionPrompt + "\n\n" + formattedMessages[0].content;
            } else {
              formattedMessages.unshift({
                role: "system",
                content: directInstructionPrompt,
              });
            }
            // Don't add tools to request for gemma3
          } else if (isLlama3 || isQwen) {
            // Llama3 and Qwen seem to have issues with native tool calling, use direct format like Gemma
            LoggingUtils.logInfo(
              `🦙 [OllamaCompletion] Detected ${selectedModel}, using direct instruction format instead of native tools`
            );

            const toolFunction = options.tools[0].function;

            // Build dynamic parameter list based on actual function schema
            const params = toolFunction.parameters.properties || {};
            const requiredParams = Array.isArray(
              toolFunction.parameters.required
            )
              ? toolFunction.parameters.required
              : [];

            // Create example parameter format based on types
            const paramExamples = Object.entries(params)
              .map(([key, prop]: [string, any]) => {
                const isRequired = requiredParams.includes(key);
                let example = "";

                if (prop.type === "string") {
                  example = `${key}:"<${prop.description || "text"}>"`;
                } else if (prop.type === "number") {
                  const min = prop.minimum || 0;
                  const max = prop.maximum || 1;
                  example = `${key}:<${min}-${max}>`;
                } else if (prop.type === "boolean") {
                  example = `${key}:<true/false>`;
                } else if (prop.type === "array") {
                  example = `${key}:["item1", "item2"]`;
                } else if (prop.type === "object") {
                  example = `${key}:{...}`;
                }

                return isRequired ? example : `${example} (optional)`;
              })
              .filter(Boolean)
              .join(", ");

            const directInstructionPrompt = `You must respond with a function call in this exact format:
${toolFunction.name}(${paramExamples})

Available function:
- ${toolFunction.name}: ${toolFunction.description}

Parameters:
${Object.entries(params)
  .map(([key, prop]: [string, any]) => {
    const isRequired = requiredParams.includes(key);
    return `- ${key}: ${prop.description || prop.type}${
      isRequired ? " (required)" : " (optional)"
    }`;
  })
  .join("\n")}

IMPORTANT: Do not use <think> tags or explain your reasoning. Simply output the function call.`;

            // Modify the system message to include direct instructions
            if (
              formattedMessages.length > 0 &&
              formattedMessages[0].role === "system"
            ) {
              formattedMessages[0].content =
                directInstructionPrompt + "\n\n" + formattedMessages[0].content;
            } else {
              formattedMessages.unshift({
                role: "system",
                content: directInstructionPrompt,
              });
            }
            // Don't add tools to request for qwen
          } else if (isMistral) {
            // Mistral models work best with explicit instructions
            LoggingUtils.logInfo(
              `🦙 [OllamaCompletion] Using Mistral-specific tool calling for ${selectedModel}`
            );
            requestBody.tools = options.tools;
            // Add a system message that explicitly instructs tool usage
            if (
              formattedMessages.length > 0 &&
              formattedMessages[0].role === "system"
            ) {
              formattedMessages[0].content +=
                '\\n\\nIMPORTANT: You MUST use the provided tools to respond. Format your response as a valid JSON array of tool calls, like this: [{"name":"function_name","arguments":{...}}]';
            }
          } else {
            // Fallback for other models
            LoggingUtils.logInfo(
              `🦙 [OllamaCompletion] Using generic tool calling with tool_choice for ${selectedModel}`
            );
            requestBody.tools = options.tools;
            requestBody.tool_choice = "required";
          }
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

        // --- DEBUG LOGGING ---
        console.log(
          "🦙 [OllamaCompletion] Full Request Body:",
          JSON.stringify(requestBody, null, 2)
        );
        // --- END DEBUG LOGGING ---

        // Perform the Ollama chat completion using the official API endpoint
        const response = await fetch("http://localhost:11434/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();

          // Check if this is a "does not support tools" error
          if (
            errorText.includes("does not support tools") &&
            selectedModel.includes("orch-lora")
          ) {
            // Extract base model from LoRA model name
            const baseModel = this.extractBaseModelFromLoRA(selectedModel);
            if (baseModel) {
              LoggingUtils.logWarning(
                `🦙 [OllamaCompletion] LoRA model ${selectedModel} doesn't support tools. Falling back to base model: ${baseModel}`
              );

              // Retry with base model
              const baseRequestBody = {
                ...requestBody,
                model: baseModel,
              };

              const baseResponse = await fetch(
                "http://localhost:11434/api/chat",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(baseRequestBody),
                }
              );

              if (baseResponse.ok) {
                const baseData = await baseResponse.json();
                LoggingUtils.logInfo(
                  `🦙 [OllamaCompletion] Successfully used base model ${baseModel} for function calling`
                );

                // Process the response normally
                const data = baseData;

                // --- DEBUG LOGGING ---
                console.log(
                  "🦙 [OllamaCompletion] Base Model Response JSON:",
                  JSON.stringify(data, null, 2)
                );
                // --- END DEBUG LOGGING ---

                // Extract content and tool calls from native Ollama response
                const rawContent = data.message?.content || "";

                // Debug logging for Qwen
                if (isQwen && rawContent) {
                  console.log(
                    "🦙 [OllamaCompletion] Qwen raw content before cleaning:",
                    rawContent.substring(0, 500) +
                      (rawContent.length > 500 ? "..." : "")
                  );
                }

                const content = cleanThinkTags(rawContent);

                // Debug logging for Qwen after cleaning
                if (isQwen && content) {
                  console.log(
                    "🦙 [OllamaCompletion] Qwen content after cleaning think tags:",
                    content.substring(0, 500) +
                      (content.length > 500 ? "..." : "")
                  );
                }

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

                // Handle base model response (same logic as main flow)
                if (nativeToolCalls && nativeToolCalls.length > 0) {
                  tool_calls = nativeToolCalls.map((call: any) => {
                    // Ollama returns tool calls in the correct format already
                    const functionName = call.function?.name;
                    const functionArgs = call.function?.arguments;

                    return {
                      function: {
                        name: functionName,
                        arguments: functionArgs, // Keep arguments as-is (can be string or object)
                      },
                    };
                  });

                  // Clean think tags from tool calls if present
                  if (tool_calls) {
                    tool_calls = cleanThinkTagsFromToolCalls(tool_calls);
                  }
                } else if (content) {
                  // Fallback for models that return tools in content
                  if (OllamaToolCallParser.looksLikeToolCall(content)) {
                    const parsedCalls =
                      OllamaToolCallParser.parseAlternativeFormats(content);
                    if (parsedCalls && parsedCalls.length > 0) {
                      tool_calls = parsedCalls;
                      LoggingUtils.logInfo(
                        `🦙 [OllamaCompletion] Parsed ${parsedCalls.length} tool call(s) from base model ${baseModel} content`
                      );
                    }
                  }
                }

                // Return the response in expected format
                return {
                  choices: [
                    {
                      message: {
                        content:
                          tool_calls && tool_calls.length > 0
                            ? undefined
                            : content,
                        tool_calls,
                      },
                    },
                  ],
                };
              }
            }
          }

          console.error(
            `🦙 [OllamaCompletion] API Error - Status: ${response.status}, Text: ${errorText}`
          );
          throw new Error(
            `Ollama API error: ${response.statusText} - ${errorText}`
          );
        }

        const data = await response.json();

        // --- DEBUG LOGGING ---
        console.log(
          "🦙 [OllamaCompletion] Raw Response JSON:",
          JSON.stringify(data, null, 2)
        );
        // --- END DEBUG LOGGING ---

        // Extract content and tool calls from native Ollama response
        const rawContent = data.message?.content || "";

        // Debug logging for Qwen
        if (isQwen && rawContent) {
          console.log(
            "🦙 [OllamaCompletion] Qwen raw content before cleaning:",
            rawContent.substring(0, 500) +
              (rawContent.length > 500 ? "..." : "")
          );
        }

        const content = cleanThinkTags(rawContent);

        // Debug logging for Qwen after cleaning
        if (isQwen && content) {
          console.log(
            "🦙 [OllamaCompletion] Qwen content after cleaning think tags:",
            content.substring(0, 500) + (content.length > 500 ? "..." : "")
          );
        }

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

        // For gemma3 and qwen, we expect the tool call in the content
        if (
          (isGemma || isQwen || isLlama3) &&
          options.tools &&
          options.tools.length > 0 &&
          content
        ) {
          LoggingUtils.logInfo(
            `🦙 [OllamaCompletion] Processing ${selectedModel} response for tool calls`
          );

          // Parse tool calls from content using OllamaToolCallParser
          const parser = new OllamaToolCallParser();
          const parsedToolCalls = parser.parse(content);

          if (parsedToolCalls.length > 0) {
            tool_calls = parsedToolCalls.map((call) => ({
              function: {
                name: call.function.name,
                arguments: call.function.arguments,
              },
            }));
            LoggingUtils.logInfo(
              `🦙 [OllamaCompletion] Parsed ${tool_calls.length} tool call(s) from ${selectedModel} response`
            );
          }
        } else if (nativeToolCalls && nativeToolCalls.length > 0) {
          tool_calls = nativeToolCalls.map((call: any) => {
            // Ollama returns tool calls in the correct format already
            const functionName = call.function?.name;
            const functionArgs = call.function?.arguments;

            return {
              function: {
                name: functionName,
                arguments: functionArgs, // Keep arguments as-is (can be string or object)
              },
            };
          });

          // Clean think tags from tool calls if present
          if (tool_calls) {
            tool_calls = cleanThinkTagsFromToolCalls(tool_calls);
          }
        } else if (content) {
          // Fallback for models that return tools in content
          // Check if the processedData already extracted tool calls from content
          if (!tool_calls || tool_calls.length === 0) {
            LoggingUtils.logInfo(
              `🦙 [OllamaCompletion] No native tool calls found, checking content for model ${selectedModel}`
            );

            // Try to parse tool calls from content
            if (OllamaToolCallParser.looksLikeToolCall(content)) {
              const parsedCalls =
                OllamaToolCallParser.parseAlternativeFormats(content);
              if (parsedCalls && parsedCalls.length > 0) {
                tool_calls = parsedCalls;
                LoggingUtils.logInfo(
                  `🦙 [OllamaCompletion] Parsed ${parsedCalls.length} tool call(s) from content for model ${selectedModel}`
                );
              }
            }
          }
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
    temperature?: number,
    onChunk?: StreamingCallback
  ): Promise<ModelStreamResponse> {
    try {
      // Ensure the Ollama client is available
      await this.clientService.ensureClient();

      // Convert messages to Ollama format
      const formattedMessages = messages.map((m) => ({
        role: m.role === "system" ? "system" : m.role,
        content: m.content,
      }));

      // Use the official Ollama API endpoint with streaming
      const response = await fetch("http://localhost:11434/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: getOption(STORAGE_KEYS.OLLAMA_MODEL) || "qwen3:latest",
          messages: formattedMessages,
          stream: true, // Enable streaming
          options: {
            temperature: temperature ?? 0.5,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Ollama API error: ${response.statusText} - ${errorText}`
        );
      }

      // Process streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body reader available");
      }

      const decoder = new TextDecoder();
      let fullResponse = "";
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Decode the chunk
          buffer += decoder.decode(value, { stream: true });

          // Process complete lines
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.trim() === "") continue;

            try {
              const data = JSON.parse(line);

              // Extract content from the chunk
              const chunkContent = data.message?.content || "";

              if (chunkContent) {
                fullResponse += chunkContent;

                // Send chunk to callback if provided
                if (onChunk) {
                  onChunk(chunkContent);
                }
              }

              // Check if streaming is complete
              if (data.done) {
                // Process any remaining buffer
                if (buffer.trim()) {
                  try {
                    const finalData = JSON.parse(buffer);
                    const finalContent = finalData.message?.content || "";
                    if (finalContent) {
                      fullResponse += finalContent;
                      if (onChunk) {
                        onChunk(finalContent);
                      }
                    }
                  } catch (e) {
                    // Ignore parsing errors for incomplete data
                  }
                }
                break;
              }
            } catch (e) {
              // Skip invalid JSON lines
              LoggingUtils.logWarning(`Skipping invalid JSON line: ${line}`);
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      // Clean think tags from the complete response
      const cleanedResponse = cleanThinkTags(fullResponse);

      // Return the complete response text
      return {
        responseText: cleanedResponse, // Return the accumulated response
        messageId: Date.now().toString(),
        isComplete: true,
        isDone: true,
      };
    } catch (error) {
      console.error("Error streaming from Ollama:", error);
      if (onChunk) {
        onChunk("Error during streaming.");
      }
      throw error;
    }
  }

  private extractBaseModelFromLoRA(loraModel: string): string | null {
    try {
      // Pattern: orch-lora-{outputName}:latest
      // We need to get the base model from storage or use a default

      // First, try to get the original base model from storage
      // This is the model that was used to train the LoRA
      const currentBaseModel = getOption(STORAGE_KEYS.OLLAMA_MODEL);

      // Check if the current model in storage is not a LoRA model
      if (currentBaseModel && !currentBaseModel.includes("orch-lora")) {
        LoggingUtils.logInfo(
          `🦙 [OllamaCompletion] Using stored base model: ${currentBaseModel}`
        );
        return currentBaseModel;
      }

      // Fallback: try to determine from common base models
      const commonBaseModels = [
        "llama3.1:latest",
        "llama3.1:8b",
        "mistral:latest",
        "mistral:7b",
        "qwen3:latest",
        "qwen3:7b",
      ];

      // Check which base models are available in Ollama
      // For now, return the most common one as fallback
      LoggingUtils.logWarning(
        `🦙 [OllamaCompletion] Could not determine base model, using llama3.1:latest as fallback`
      );
      return "llama3.1:latest";
    } catch (error) {
      LoggingUtils.logError(
        `🦙 [OllamaCompletion] Error extracting base model: ${error}`
      );
      return "llama3.1:latest"; // Safe fallback
    }
  }
}
