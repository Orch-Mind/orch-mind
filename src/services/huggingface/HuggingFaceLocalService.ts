// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// HuggingFaceLocalService.ts
// Symbolic cortex: Provides local inference using Hugging Face Transformers.js in the browser.
// Processes symbolic text generation for Orch-OS in basic mode, without backend or API key.

import { pipeline } from "@huggingface/transformers";
import { OnnxRuntimeConfig } from "../../config/onnxruntimeConfig";
import { getOption, STORAGE_KEYS } from "../StorageService";

/**
 * Symbolic: Supported browser models for local inference (expand as needed)
 */
// Symbolic: Supported browser models for local text-generation (must match settings UI)
export const SUPPORTED_HF_BROWSER_MODELS = [
  "onnx-community/Qwen2.5-0.5B-Instruct", // Qwen2.5-0.5B-Instruct (Chat, fast, recommended)
  "Xenova/phi-3-mini-4k-instruct",        // Phi-3 Mini (Chat, experimental)
  "Xenova/TinyLlama-1.1B-Chat-v1.0",      // TinyLlama 1.1B (Chat, lightweight)
  "HuggingFaceTB/SmolLM2-135M-Instruct",  // SmolLM2-135M (Ultra lightweight, chat)
  "Xenova/distilgpt2"                     // DistilGPT2 (Basic text generation)
];

export type HuggingFaceLocalOptions = {
  model?: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
};

/**
 * Interface matching the expected function tool call format from OpenAI
 * Symbolic: Represents the neural signal schema for function execution
 */
export interface ToolCall {
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Response format that matches OpenAI function calling API
 * Symbolic: Neural response pattern with potential tool activation
 */
export interface HuggingFaceResponse {
  content?: string;
  tool_calls?: ToolCall[];
}

export class HuggingFaceLocalService {
  // Using 'any' to avoid TypeScript union complexity errors with pipeline()
  private generator: any = null;
  private currentModel: string | null = null;

  constructor() {
    this.initialize(); // Auto-inicializa o serviço
  }

  /**
   * Symbolic: Initializes the service by loading the user-selected HuggingFace model from storage.
   * If no model is set, loads the default model.
   * This ensures persistence of user preference across reloads.
   */
  async initialize(): Promise<void> {
    const savedModel = getOption(STORAGE_KEYS.HF_MODEL) || SUPPORTED_HF_BROWSER_MODELS[0];
    await this.loadModel(savedModel);
  }

  /**
   * Loads a supported model for local inference with auto device/dtype fallback.
   * Symbolic: Tries WebGPU + quantized (q4), depois q8, depois fp32, depois WASM.
   * Maximizes browser compatibility and performance for Orch-OS.
   * Uses optimized ONNX Runtime configuration to suppress warnings and improve performance.
   */
  async loadModel(modelId: string): Promise<void> {
    if (this.currentModel === modelId && this.generator) return;
    let lastError: any = null;
    
    // Configuration array for all device/dtype combinations with proper typing
    const configurations: Array<{device: 'webgpu' | 'wasm', dtype: 'q4' | 'q8' | 'fp32'}> = [
      { device: "webgpu", dtype: "q4" },
      { device: "webgpu", dtype: "q8" },
      { device: "webgpu", dtype: "fp32" },
      { device: "wasm", dtype: "q4" },
      { device: "wasm", dtype: "q8" },
      { device: "wasm", dtype: "fp32" }
    ];
    
    for (const config of configurations) {
      try {
        // Use optimized ONNX Runtime configuration to suppress warnings and improve performance
        const pipelineConfig: any = {
          device: config.device,
          dtype: config.dtype,
          // Apply ONNX Runtime optimizations following community best practices
          session_options: OnnxRuntimeConfig.getOptimizedSessionOptions(config.device),
          // Cache configuration for better performance
          cache_dir: typeof window !== 'undefined' ? './.cache' : undefined,
          local_files_only: false, // Allow download but prefer cache
        };
        
        this.generator = await pipeline("text-generation", modelId, pipelineConfig);
        this.currentModel = modelId;
        console.log(`[HuggingFaceLocalService] ✅ Successfully loaded ${modelId} with ${config.device} + ${config.dtype}`);
        return;
      } catch (e) { 
        lastError = e;
        console.log(`[HuggingFaceLocalService] ⚠️ Failed to load ${modelId} with ${config.device} + ${config.dtype}, trying next configuration...`);
      }
    }
    
    // If all attempts fail, throw last error
    throw new Error(`Failed to load model ${modelId} on any supported device/dtype. Last error: ${lastError}`);
  }

  /**
   * Generates a completion using the loaded model and messages (system+user), streaming output in real time.
   * Symbolic: Each message is a neuron; the cortex fuses them for context. Emits tokens/chunks as they are generated.
   *
   * @param messages - Array of messages (system/user/assistant)
   * @param opts - Generation options (maxTokens, temperature, etc)
   * @param onToken - Optional callback invoked with each new piece of text generated
   * @returns The full accumulated output as a string
   */
  async generate(
    messages: { role: "system" | "user" | "assistant"; content: string }[],
    opts?: HuggingFaceLocalOptions,
    onToken?: (text: string) => void
  ): Promise<string> {
    // Symbolic: Auto-load model if not initialized
    if (!this.generator) {
      const modelId = opts?.model || getOption(STORAGE_KEYS.HF_MODEL) || SUPPORTED_HF_BROWSER_MODELS[0];
      await this.loadModel(modelId);
    }
    // Symbolic: Compose context for the LLM
    const prompt = messages.map(m => m.content).join("\n");

    // Import TextStreamer dynamically (for browser/Node compatibility)
    // @ts-ignore
    const { TextStreamer } = await import("@huggingface/transformers");
    // @ts-ignore
    const tokenizer = this.generator.tokenizer;

    let accumulated = "";
    const streamer = new TextStreamer(tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function: (text: string) => {
        accumulated += text;
        if (onToken) onToken(text);
      }
    });

    await this.generator(prompt, {
      temperature: opts?.temperature || 0.7,
      streamer
    });

    return accumulated.trim();
  }

  /**
   * Generates a completion with function calling capabilities using the loaded model .
   * Symbolic: This method ALWAYS constructs the system prompt (including the function schema/tools) itself, in English.
   * Only user/assistant messages should be passed in; any upstream system prompt will be ignored.
   * This is prompt engineering to simulate function calling, NOT native function calling (transformers.js local does not support tools argument).
   */
  /**
   * Generates a completion with simulated function calling, supporting streaming output.
   * Symbolic: Streams both direct content and function call arguments in real time for UI/UX parity with OpenAI.
   *
   * @param messages - Array of user/assistant messages (system prompt is constructed internally)
   * @param tools - Function schemas (see OpenAI format)
   * @param opts - Generation options
   * @param onToken - Optional callback for streaming partial output
   * @returns HuggingFaceResponse (tool_calls or content)
   */
  async generateWithFunctions(
    messages: { role: "system" | "user" | "assistant"; content: string }[],
    tools: Array<{
      type: string;
      function: {
        name: string;
        description: string;
        parameters: Record<string, unknown>;
      }
    }>,
    opts?: HuggingFaceLocalOptions,
    onToken?: (partial: string) => void
  ): Promise<HuggingFaceResponse> {
    // Symbolic: Auto-load model if not initialized
    if (!this.generator) {
      const modelId = opts?.model || getOption(STORAGE_KEYS.HF_MODEL) || SUPPORTED_HF_BROWSER_MODELS[0];
      await this.loadModel(modelId);
    }

    // Filter out any incoming system prompts; only user/assistant messages allowed
    const filteredMessages = messages.filter(m => m.role !== "system");

    // Symbolic: Create neural schema for function activation (English, for consistency)
    const toolsJSON = JSON.stringify(tools.map(t => ({
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters
    })), null, 2);

    // Symbolic: Neural instruction pattern for symbolic function execution (prompt engineering)
    const systemPrompt = `You have access to the following functions (tools):\n${toolsJSON}\n\nIf you need to call a function, respond EXACTLY in this format:\n<function_call>\n{\n  "name": "function_name",\n  "arguments": {\n    "param1": "value1",\n    "param2": "value2"\n  }\n}\n</function_call>\n\nIf you do not need to call a function, respond with normal text.\n\nIMPORTANT: Do not invent functions or arguments. Only use the provided schema. Always use the exact format above if calling a function.`;

    // Compose the full prompt: system prompt (with schema) + user/assistant messages
    const augmentedMessages = [
      { role: "system" as const, content: systemPrompt },
      ...filteredMessages
    ];

    // --- Streaming logic ---
    let accumulatedText = "";
    let accumulatedArgs = "";
    let lastFunctionCallFragment = "";

    // Symbolic: Generate neural response with potential function activation, streaming partials
    const text = await this.generate(
      augmentedMessages,
      {
        temperature: opts?.temperature || 0.7
      },
      (partial: string) => {
        accumulatedText += partial;
        // Try to accumulate function call args in real time (simulate OpenAI tool_call streaming)
        const match = /<function_call>\s*(\{[\s\S]*?\})\s*<\/function_call>/.exec(accumulatedText);
        if (match && typeof match[1] === 'string' && match[1] !== lastFunctionCallFragment) {
          lastFunctionCallFragment = match[1];
          accumulatedArgs = match[1];
          if (onToken) onToken(match[1]); // Optionally send partial function call
        } else {
          if (onToken) onToken(accumulatedText);
        }
      }
    );

    // Symbolic: Extract potential function call from neural response
    const functionCallMatch = accumulatedArgs
      ? [null, accumulatedArgs]
      : text.match(/<function_call>\s*(\{[\s\S]*?\})\s*<\/function_call>/);

    if (functionCallMatch && typeof functionCallMatch[1] === 'string') {
      try {
        // Symbolic: Parse neural function signal into symbolic structure
        const functionCall = JSON.parse(functionCallMatch[1]);
        return {
          tool_calls: [{
            function: {
              name: functionCall.name,
              arguments: JSON.stringify(functionCall.arguments)
            }
          }]
        };
      } catch (e) {
        console.error("Erro ao parsear chamada de função:", e);
        return { content: text };
      }
    }
    // If no function call detected, return as normal content
    return { content: text };
  }
}

