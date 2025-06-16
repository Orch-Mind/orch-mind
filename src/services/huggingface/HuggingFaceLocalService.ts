// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { AutoTokenizer } from "@huggingface/transformers";
import { cleanThinkTags } from "../../components/context/deepgram/utils/ThinkTagCleaner";

// Flag to enable legacy chat_template fallback for models missing template
const ENABLE_FALLBACK_CHAT_TEMPLATE = false;

// modelos suportados no navegador (geração de texto)
export const SUPPORTED_HF_BROWSER_MODELS = [
  "Xenova/distilgpt2", // ~353MB, DistilGPT-2 otimizado - FUNCIONA
  "Xenova/gpt2", // ~548MB, GPT-2 base estável - FUNCIONA
  "Xenova/llama2.c-stories15M", // ~15MB, modelo muito pequeno - FUNCIONA
  "Xenova/TinyLlama-1.1B-Chat-v1.0", // ~1.1B, modelo de chat pequeno - FUNCIONA
] as const;

export type HuggingFaceLocalOptions = {
  model?: (typeof SUPPORTED_HF_BROWSER_MODELS)[number];
  maxTokens?: number;
  temperature?: number;
  dtype?: "q4" | "q8" | "fp32" | "fp16"; // Ordered by performance vs. quality
  device?: "webgpu" | "wasm" | "auto";
  forceReload?: boolean; // Force reload model even if already loaded
};

export class HuggingFaceLocalService {
  private generator: any = null;
  private tokenizer: any = null;
  private currentModel: string | null = null;
  private initialized = false;
  private isLoading = false;

  constructor() {
    // Initialize environment asynchronously
    this.initializeEnvironment().catch((error) => {
      console.error("[HFS] Environment initialization failed:", error);
    });
  }

  /**
   * Initialize transformers.js environment using centralized configuration
   */
  private async initializeEnvironment() {
    if (this.initialized) return;

    try {
      console.log("[HFS] Initializing transformers.js environment...");

      this.initialized = true;
      console.log("✅ [HFS] Environment initialized successfully");
    } catch (error) {
      console.error(
        "❌ [HFS] Failed to initialize transformers environment:",
        error
      );
      throw new Error(
        `Environment initialization failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Load model using centralized configuration with enhanced error handling
   */
  async loadModel(opts: {
    modelId: string;
    device: HuggingFaceLocalOptions["device"];
    dtype: HuggingFaceLocalOptions["dtype"];
    forceReload?: boolean;
  }) {
    const { modelId, forceReload } = opts;

    console.log(`[HFS] 🔍 DEBUG: loadModel called with original opts:`, opts);

    // FORCE correct configurations - ignore any incorrect device/dtype from opts
    const device = "wasm"; // Always use wasm for browser compatibility
    const dtype = "fp32"; // Always use fp32 - model-specific configs will override if needed

    console.log(`[HFS] 🔍 DEBUG: Forced device: ${device}, dtype: ${dtype}`);

    // Prevent concurrent loading
    if (this.isLoading) {
      console.log("[HFS] Model loading already in progress, waiting...");
      return;
    }

    // Check if model is already loaded
    if (this.currentModel === modelId && this.generator && !forceReload) {
      console.log(`[HFS] Model ${modelId} already loaded`);
      return;
    }

    // Validate model is supported
    if (!SUPPORTED_HF_BROWSER_MODELS.includes(modelId as any)) {
      throw new Error(
        `Unsupported model: ${modelId}. Supported models: ${SUPPORTED_HF_BROWSER_MODELS.join(
          ", "
        )}`
      );
    }

    // Ensure environment is initialized
    if (!this.initialized) {
      await this.initializeEnvironment();
    }

    this.isLoading = true;
    console.log(
      `[HFS] Loading model: ${modelId} with device: ${device}, dtype: ${dtype}`
    );

    try {
      // Clean up previous model if exists
      if (this.generator && forceReload) {
        await this.dispose();
      }

      // Use loadModelWithOptimalConfig from centralized configuration
      const { loadModelWithOptimalConfig } = await import(
        "../../utils/transformersEnvironment"
      );

      const additionalOptions = {
        // Enhanced progress callback for better user feedback
        progress_callback: (data: any) => {
          if (data.status === "downloading") {
            console.log(
              `[HFS] Downloading: ${data.name || data.file} - ${Math.round(
                data.progress || 0
              )}%`
            );
          } else if (data.status === "loading") {
            console.log(`[HFS] Loading: ${data.name || data.file}`);
          } else if (data.status === "ready") {
            console.log(`[HFS] Ready: ${data.name || data.file}`);
          }
        },

        // Enhanced session options for better performance
        session_options: {
          logSeverityLevel: 3, // Reduce logging noise
          graphOptimizationLevel: "all",
          enableMemPattern: true,
          enableCpuMemArena: true,
          // Always use wasm for browser compatibility
          executionProviders: ["wasm"],
        },

        // Cache configuration - allow downloads but prefer cache
        cache_dir: undefined, // Use environment default
        local_files_only: false, // Allow downloads if not in cache
        use_auth_token: false,

        // Retry configuration for network issues
        max_retries: 3,
        retry_delay: 1000, // 1 second delay between retries

        // IMPORTANT: Don't override device/dtype here - let model-specific configs take precedence
        // Only pass device/dtype if they are explicitly different from defaults
        // This allows model-specific configurations to take precedence
      };

      console.log(
        `[HFS] 🔍 DEBUG: additionalOptions being passed:`,
        additionalOptions
      );

      console.log(`[HFS] Loading with configuration:`, {
        modelId,
        device,
        dtype,
        cache_dir: "using environment default",
        local_files_only: additionalOptions.local_files_only,
      });

      this.generator = await loadModelWithOptimalConfig(
        modelId,
        "text-generation",
        additionalOptions
      );

      // Load tokenizer for chat template
      this.tokenizer = await AutoTokenizer.from_pretrained(modelId);

      // Add default chat template for models that don't have one
      // Fallback chat_template injection disabled for vLLM-only setup
      if (ENABLE_FALLBACK_CHAT_TEMPLATE && !this.tokenizer.chat_template) {
        console.log(`[HFS] Adding default chat template for ${modelId}`);

        // Define a simple but effective chat template
        this.tokenizer.chat_template = `{% for message in messages %}{% if message['role'] == 'system' %}System: {{ message['content'] }}
{% elif message['role'] == 'user' %}User: {{ message['content'] }}
{% elif message['role'] == 'assistant' %}Assistant: {{ message['content'] }}
{% endif %}{% endfor %}{% if add_generation_prompt %}Assistant: {% endif %}`;

        // Also ensure apply_chat_template method exists
        if (!this.tokenizer.apply_chat_template) {
          this.tokenizer.apply_chat_template = function (
            messages: any[],
            options: any = {}
          ) {
            let result = "";

            // Process messages
            for (const message of messages) {
              if (message.role === "system") {
                result += `System: ${message.content}\n`;
              } else if (message.role === "user") {
                result += `User: ${message.content}\n`;
              } else if (message.role === "assistant") {
                result += `Assistant: ${message.content}\n`;
              }
            }

            // Add generation prompt if requested
            if (options.add_generation_prompt) {
              result += "Assistant: ";
            }

            return result;
          };
        }
      }

      this.currentModel = modelId;
      console.log(
        `[HFS] ✅ Model loaded successfully: ${modelId} (${device}/${dtype})`
      );
    } catch (error) {
      console.error(`[HFS] ❌ Failed to load model ${modelId}:`, error);

      // Enhanced error messages with specific guidance
      if (error instanceof Error) {
        if (error.message.includes("<!DOCTYPE")) {
          throw new Error(
            `Model loading failed: Server returned HTML instead of model files. ` +
              `This usually means:\n` +
              `1. The model "${modelId}" doesn't exist or isn't available\n` +
              `2. Network connectivity issues\n` +
              `3. HuggingFace server issues\n` +
              `Try a different model or check your internet connection.`
          );
        } else if (error.message.includes("CORS")) {
          throw new Error(
            `CORS error loading model ${modelId}. This may be due to:\n` +
              `1. Network configuration issues\n` +
              `2. Proxy server problems\n` +
              `3. Browser security settings\n` +
              `Try refreshing the application or check network settings.`
          );
        } else if (
          error.message.includes("fetch") ||
          error.message.includes("NetworkError")
        ) {
          throw new Error(
            `Network error loading model ${modelId}. Please:\n` +
              `1. Check your internet connection\n` +
              `2. Verify the model exists on HuggingFace\n` +
              `3. Try again in a few moments\n` +
              `4. Consider using a smaller model for testing`
          );
        } else if (
          error.message.includes("quota") ||
          error.message.includes("storage")
        ) {
          throw new Error(
            `Storage error loading model ${modelId}. This may be due to:\n` +
              `1. Insufficient disk space\n` +
              `2. Cache directory permissions\n` +
              `3. Storage quota exceeded\n` +
              `Try clearing cache or freeing up disk space.`
          );
        }
      }

      throw new Error(
        `Failed to load model "${modelId}": ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Generate text using the loaded model.
   */
  async generate(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    opts: HuggingFaceLocalOptions = {}
  ): Promise<string> {
    if (!this.initialized || !this.generator) {
      throw new Error("Model not initialized. Call loadModel() first.");
    }

    try {
      // Build conversation prompt
      const prompt =
        messages
          .map(
            (m) =>
              `${m.role === "assistant" ? "Assistant" : "User"}: ${m.content}`
          )
          .join("\n\n") + "\n\nAssistant:";

      const generationOptions = {
        max_new_tokens: opts.maxTokens || 512,
        temperature: opts.temperature ?? 0.7,
        do_sample: (opts.temperature ?? 0.7) > 0,
      } as any;

      const result: any[] = await this.generator(prompt, generationOptions);

      let first = result[0];
      if (Array.isArray(first)) first = first[0];

      // Extract content depending on result structure
      let generatedTextRaw = first?.generated_text ?? first?.text ?? undefined;

      if (typeof generatedTextRaw === "undefined") {
        throw new Error("Invalid generation result format");
      }

      const content = Array.isArray(generatedTextRaw)
        ? generatedTextRaw.at(-1)?.content ?? JSON.stringify(generatedTextRaw)
        : String(generatedTextRaw);

      // Remove the original prompt from the response if it's included
      let responseText = content;
      if (responseText.includes(prompt)) {
        responseText = responseText.replace(prompt, "").trim();
      }

      // Clean think tags from the response
      const cleanedResponse = cleanThinkTags(responseText);

      return cleanedResponse;
    } catch (error) {
      console.error("[HFS] ❌ Generation error:", error);
      throw error;
    }
  }

  /**
   * Generate text with function calling support.
   */
  async generateWithFunctions(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    tools: Array<{
      type: string;
      function: {
        name: string;
        description: string;
        parameters: Record<string, unknown>;
      };
    }> = [],
    opts: {
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<{ content?: string; tool_calls?: Array<any> }> {
    if (!this.initialized || !this.generator) {
      throw new Error("Model not initialized. Call loadModel() first.");
    }

    try {
      // Function to extract tool calls from generated text
      const extractToolCalls = (text: string) => {
        const toolCalls: any[] = [];

        // Look for JSON-like function calls in the text
        const functionCallRegex =
          /\{"function":\s*\{"name":\s*"([^"]+)",\s*"arguments":\s*(\{[^}]*\})\}\}/g;
        let match;

        while ((match = functionCallRegex.exec(text)) !== null) {
          try {
            const functionName = match[1];
            const argumentsStr = match[2];
            const args = JSON.parse(argumentsStr);

            toolCalls.push({
              function: {
                name: functionName,
                arguments: args,
              },
            });
          } catch (e) {
            // Skip invalid JSON
            continue;
          }
        }

        // Alternative format: look for function calls in a more flexible way
        if (toolCalls.length === 0) {
          const altRegex = /(\w+)\s*\(\s*([^)]*)\s*\)/g;
          while ((match = altRegex.exec(text)) !== null) {
            const functionName = match[1];
            const argsStr = match[2];

            // Check if this function name matches any of our tools
            const matchingTool = tools.find(
              (t) => t.function.name === functionName
            );
            if (matchingTool) {
              try {
                // Try to parse arguments as JSON or create simple object
                let args = {};
                if (argsStr.trim()) {
                  if (argsStr.includes(":")) {
                    // Try to parse as JSON-like
                    args = JSON.parse(`{${argsStr}}`);
                  } else {
                    // Simple string argument
                    args = { value: argsStr.trim() };
                  }
                }

                toolCalls.push({
                  function: {
                    name: functionName,
                    arguments: args,
                  },
                });
              } catch (e) {
                // Skip invalid arguments
                continue;
              }
            }
          }
        }

        return toolCalls;
      };

      // Build chat prompt passing the tools array per HF docs, with fallback
      let prompt: string | undefined;
      let usedChatTemplate = false;

      // NOTA: Muitos modelos pequenos/comunitários não têm chat_template (ex: Xenova/llama2.c-stories15M)
      // Isso é normal e usaremos um fallback manual nesses casos

      // Verificação inicial se temos um tokenizer com chat_template
      const rawTemplate = (this.tokenizer as any)?.chat_template;
      const hasChatTemplate =
        this.tokenizer &&
        typeof this.tokenizer.apply_chat_template === "function" &&
        typeof rawTemplate === "string" &&
        rawTemplate.trim().length > 0;

      if (!hasChatTemplate) {
        // Model doesn't have chat template - this is expected for many models
        // We'll use manual formatting without logging warnings
      } else {
        try {
          // Formato da chamada seguindo exatamente a documentação
          const templateOpts: any = {
            add_generation_prompt: true,
            tokenize: false, // Force string output
          };

          // Adicionar ferramentas apenas se existirem
          if (Array.isArray(tools) && tools.length > 0) {
            templateOpts.tools = tools;
          }

          let tmpPrompt2: any = this.tokenizer.apply_chat_template(
            messages as any,
            templateOpts
          );
          if (Array.isArray(tmpPrompt2)) {
            tmpPrompt2 = tmpPrompt2.join(" ");
          }
          prompt = String(tmpPrompt2);

          // Verificação extra de qualidade
          if (prompt && prompt.trim().length > 0) {
            usedChatTemplate = true;
            console.log("[HFS] Successfully used chat template");
          } else {
            // Chat template produced empty prompt - use fallback without warning
            prompt = undefined;
          }
        } catch (err) {
          // apply_chat_template failed - use fallback without warning
          // This is expected behavior for some models
          prompt = undefined;
        }
      }

      if (
        !prompt ||
        (typeof prompt === "string" && prompt.trim().length === 0)
      ) {
        // Use simple prompt with tool injection for models without chat template
        // This is the expected behavior, not an error

        // Construir uma representação simples das ferramentas disponíveis para injetar no prompt
        let toolsPrompt = "";
        if (Array.isArray(tools) && tools.length > 0) {
          toolsPrompt = "\n\nAvailable tools:\n";
          tools.forEach((tool) => {
            if (tool.function) {
              toolsPrompt += `- ${tool.function.name}: ${
                tool.function.description || ""
              }\n`;

              // Adicionar informações sobre parâmetros se disponíveis
              if (
                tool.function.parameters &&
                typeof tool.function.parameters === "object"
              ) {
                if (tool.function.parameters.properties) {
                  toolsPrompt += "  Parameters:\n";
                  Object.entries(tool.function.parameters.properties).forEach(
                    ([paramName, paramDef]) => {
                      const paramInfo = paramDef as any;
                      toolsPrompt += `  - ${paramName}: ${
                        paramInfo.description || paramInfo.type || ""
                      }\n`;
                    }
                  );
                }
              }
            }
          });

          toolsPrompt +=
            '\nWhen you need to use a tool, use the format: {"function": {"name": "tool_name", "arguments": {"param1": "value1"}}}\n\n';
        }

        // Construir o prompt completo
        prompt =
          toolsPrompt +
          messages
            .map(
              (m) =>
                `${m.role === "assistant" ? "Assistant" : "User"}: ${m.content}`
            )
            .join("\n\n") +
          "\n\nAssistant:";
      }

      const generationOptions = {
        max_new_tokens: opts.maxTokens || 512,
        temperature: opts.temperature ?? 0.7,
        // For better function calling compliance we disable sampling penalties
        do_sample: (opts.temperature ?? 0.7) > 0,
        stop: opts.maxTokens ? undefined : undefined,
      } as any;

      const result: any[] = await this.generator(prompt, generationOptions);

      let first = result[0];
      if (Array.isArray(first)) first = first[0];

      // Extract content depending on result structure
      let generatedTextRaw = first?.generated_text ?? first?.text ?? undefined;

      if (typeof generatedTextRaw === "undefined") {
        throw new Error("Invalid generation result format");
      }

      const content = Array.isArray(generatedTextRaw)
        ? generatedTextRaw.at(-1)?.content ?? JSON.stringify(generatedTextRaw)
        : String(generatedTextRaw);

      // Clean think tags from the content before processing tool calls
      const cleanedContent = cleanThinkTags(content);

      let tool_calls = extractToolCalls(cleanedContent);

      return {
        content: cleanedContent || undefined,
        tool_calls: tool_calls.length > 0 ? tool_calls : undefined,
      };
    } catch (error) {
      console.error("[HFS] ❌ generateWithFunctions error:", error);
      throw error;
    }
  }

  /**
   * Simple wrapper to generate a plain response string (without tool parsing).
   */
  async generateResponse(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    opts: { temperature?: number; maxTokens?: number } = {}
  ): Promise<{ response: string }> {
    const responseText = await this.generate(messages, {
      temperature: opts.temperature,
      maxTokens: opts.maxTokens,
    });
    return { response: responseText };
  }

  /**
   * Get current model status
   */
  getStatus(): {
    initialized: boolean;
    currentModel: string | null;
    isLoading: boolean;
  } {
    return {
      initialized: this.initialized,
      currentModel: this.currentModel,
      isLoading: this.isLoading,
    };
  }

  /**
   * Dispose model and free resources.
   */
  async dispose() {
    console.log("[HFS] Disposing model resources...");
    this.generator = null;
    this.tokenizer = null;
    this.currentModel = null;
    this.initialized = false;
  }

  /**
   * Force reload of the current model.
   */
  async forceReload(): Promise<void> {
    if (this.currentModel) {
      const modelId = this.currentModel;
      await this.dispose();
      console.log(`[HFS] Prepared force reload for model: ${modelId}`);
    }
  }
}
