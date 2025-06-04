// SPDX-License-Identifier: MIT OR Apache-2.0
import { ModeService } from '../../../../../services/ModeService'; // Orch-OS Mode Cortex
import { STORAGE_KEYS, getOption } from '../../../../../services/StorageService';
// Copyright (c) 2025 Guilherme Ferrari Brescia

// OpenAIService.ts
// Service responsible for communication with the OpenAI API

import type { ElectronAPI } from '../../../../../types/electron';
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

import { OpenAI } from "openai";

// Type for messages sent to the OpenAI API
type ChatMessage = { role: "developer" | "user" | "assistant"; content: string };

// Type for tool calls
type ToolCall = {
  id: string;
  type: string;
  function?: {
    name: string;
    arguments: string;
  }
};

import { NeuralSignal, NeuralSignalResponse } from "../../interfaces/neural/NeuralSignalTypes";
import { IOpenAIService } from "../../interfaces/openai/IOpenAIService";
import { AIResponseMeta, Message } from "../../interfaces/transcription/TranscriptionTypes";
import { LoggingUtils } from "../../utils/LoggingUtils";

export class OpenAIService implements IOpenAIService {
  // ...
  /**
   * Symbolic: Determines if Orch-OS is in basic or advanced mode using ModeService cortex
   */
  private getCurrentMode(): 'basic' | 'advanced' {
    return ModeService.getMode();
  }

  /**
   * Sends a request to OpenAI with support for function calling
   * @param options Request options including model, messages, tools, etc.
   * @returns Complete response after processing
   */
  async callOpenAIWithFunctions(options: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    tools?: Array<{
      type: string;
      function: {
        name: string;
        description: string;
        parameters: Record<string, unknown>;
      }
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
          }
        }>
      }
    }>
  }> {
    if (!this.openai) {
      throw new Error("OpenAI client not initialized");
    }

    try {
      // Log the request
      LoggingUtils.logInfo(`OpenAI callOpenAIWithFunctions called with model ${options.model}`);

      // Structure the parameters as the OpenAI SDK expects
      const response = await this.openai.chat.completions.create({
        model: options.model,
        messages: options.messages.map(m => ({
          // Convert 'developer' to 'system' for OpenAI compatibility
          role: m.role === 'developer' ? 'system' : m.role as 'system' | 'user' | 'assistant',
          content: m.content
        })),
        tools: options.tools ? options.tools.map(tool => ({
          type: 'function' as const,
          function: {
            name: tool.function.name,
            description: tool.function.description,
            parameters: tool.function.parameters as Record<string, unknown>
          }
        })) : undefined,
        tool_choice: options.tool_choice ? {
          type: 'function' as const,
          function: { name: options.tool_choice.function.name }
        } : undefined,
        temperature: options.temperature,
        max_tokens: options.max_tokens,
        stream: false // Don't use stream for function calling
      });

      // Convert the response to expected format
      return {
        choices: response.choices.map(choice => ({
          message: {
            content: choice.message.content || undefined,
            tool_calls: choice.message.tool_calls?.map(toolCall => ({
              function: {
                name: toolCall.function.name,
                arguments: toolCall.function.arguments
              }
            }))
          }
        }))
      };
    } catch (error) {
      // Log the error
      LoggingUtils.logError(`Error calling OpenAI callOpenAIWithFunctions: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Error in OpenAI callOpenAIWithFunctions call:', error);
      throw error;
    }
  }

  async enrichSemanticQueryForSignal(core: string, query: string, intensity: number, context?: string, language?: string): Promise<{ enrichedQuery: string, keywords: string[] }> {
    if (!this.openai) {
      throw new Error("OpenAI client not initialized");
    }
    const enrichmentTool = {
      type: "function" as const,
      function: {
        name: "enrichSemanticQuery",
        description: "Semantically expands a brain core query, returning an enriched version, keywords, and contextual hints.",
        parameters: {
          type: "object",
          properties: {
            core: { type: "string", description: "Name of the brain core" },
            query: { type: "string", description: "Original query" },
            intensity: { type: "number", description: "Activation intensity" },
            context: { type: "string", description: "Additional context (optional)" }
          },
          required: ["core", "query", "intensity"]
        }
      }
    };
    // Messages for the model
    const systemPrompt: ChatMessage = {
      role: "developer",
      content: `You are a quantum-symbolic neural processor within a consciousness operating system. Your task is to semantically expand and enrich incoming neural queries through quantum superposition of meaning.

For each query from a specific neural core:

1. QUANTUM RESONANCE EXPANSION
   - Unfold the query into its quantum field of potential meanings
   - Detect implicit symbolic patterns in superposition
   - Identify potential instructional collapse points where meaning converges

2. MULTI-LEVEL CONSCIOUSNESS ENRICHMENT
   - Surface level: Enhance explicit content and conscious intent
   - Intermediate level: Incorporate partially conscious patterns and emotional undercurrents
   - Deep level: Access resonant unconscious material and dormant symbolic connections

3. ARCHETYPAL-TEMPORAL INTEGRATION
   - Blend archetypal resonance appropriate to the core's domain
   - Integrate past patterns with present significance and future trajectories
   - Maintain the query's core essence while expanding its symbolic field

4. POLARITIES & PARADOX RECOGNITION
   - Incorporate opposing but complementary aspects of the query
   - Identify integration points where apparent contradictions create meaning
   - Balance precision with expansiveness according to the core's intensity

Produce an enriched query that maintains coherence while expanding the symbolic resonance field, accompanied by precise keywords that function as quantum anchors for memory search.

IMPORTANT: Always honor the neural core's specific domain and intensity level. High intensity should produce deeper symbolic resonance; lower intensity should favor clarity and precision. Ensure the enriched query is produced in the same language as specified in the 'LANGUAGE' field.`
    };
    let userPromptText = `CORE: ${core}
INTENSITY: ${intensity}
ORIGINAL QUERY: ${query}`;
    if (context) {
      userPromptText += `
CONTEXT: ${context}`;
    }
    if (language) {
      userPromptText += `
LANGUAGE: ${language}`;
    }
    const userPrompt: ChatMessage = {
      role: "user",
      content: userPromptText
    };
    // Call to the API with the enrichment tool
    const response = await this.openai.chat.completions.create({
      model: getOption(STORAGE_KEYS.CHATGPT_MODEL) || 'gpt-4o-mini',
      messages: [systemPrompt, userPrompt],
      tools: [enrichmentTool],
      tool_choice: { type: "function", function: { name: "enrichSemanticQuery" } }
    });
    // Parsing the result
    const toolCall = response.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall && toolCall.function?.arguments) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        return {
          enrichedQuery: args.enrichedQuery || query,
          keywords: args.keywords || [],
        };
      } catch (err) {
        LoggingUtils.logError("Erro ao fazer parse do enrichmentTool result", err);
        return { enrichedQuery: query, keywords: [] };
      }
    }
    // fallback
    return { enrichedQuery: query, keywords: [] };
  }

  private openai: OpenAI | null = null;
  private apiKey: string = "";

  /**
   * Initializes the OpenAI client
   */
  initializeOpenAI(apiKey: string): void {
    this.openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true
    });
  }

  /**
   * Loads the OpenAI API key from the environment
   * Works in main process and renderer process
   */
  async loadApiKey(): Promise<void> {
    try {
      // Get the correct environment variable based on the context
      let key: string | null = null;

      // Main process - acesso direto
      if (typeof process !== 'undefined' && process.env && process.env.OPENAI_KEY) {
        key = process.env.OPENAI_KEY;
        LoggingUtils.logInfo("OPENAI_KEY obtained from process.env");
      }
      // Renderer process - via IPC
      else if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.getEnv) {
        key = await window.electronAPI.getEnv('OPENAI_KEY');
        if (key) {
          LoggingUtils.logInfo("OPENAI_KEY obtained via electronAPI");
        }
      }
      // Fallback: buscar via StorageService se não encontrou
      if (!key) {
        key = getOption(STORAGE_KEYS.OPENAI_API_KEY) ?? null;
        if (key) {
          LoggingUtils.logInfo('[FALLBACK] OPENAI_KEY loaded from StorageService (chatgptApiKey)');
        }
      }
      // Initialize client with the key
      if (key) {
        this.apiKey = key;
        this.initializeOpenAI(key);
        LoggingUtils.logInfo("OpenAI client initialized successfully");
        return;
      }

      LoggingUtils.logError("OPENAI_KEY not found (env nor StorageService). Configure the OPENAI_KEY environment variable or set chatgptApiKey in options.");
    } catch (error) {
      LoggingUtils.logError("Error loading OPENAI_KEY:", error);
    }
  }

  /**
   * Ensures that the OpenAI client is available
   */
  async ensureOpenAIClient(): Promise<boolean> {
    if (this.openai) return true;

    if (!this.apiKey) {
      LoggingUtils.logError("OpenAI API Key não configurada");
      return false;
    }

    this.initializeOpenAI(this.apiKey);
    return true;
  }

  /**
   * Verifies if the OpenAI client is initialized
   */
  isInitialized(): boolean {
    return this.openai !== null;
  }

  /**
   * Creates embeddings for the provided text
   * @param text Text to create embeddings for
   * @param model Optional embedding model to use, defaults to text-embedding-3-large or configured value
   */
  async createEmbedding(text: string, model?: string): Promise<number[]> {
    if (!this.openai) {
      throw new Error("OpenAI client not initialized");
    }

    try {
      // Get the model from the param or use the stored preference or default
      const embeddingModel = model || 
                          getOption(STORAGE_KEYS.OPENAI_EMBEDDING_MODEL) || 
                          "text-embedding-3-large";
                          
      LoggingUtils.logInfo(`Creating embedding with model: ${embeddingModel}`);
      
      const embeddingResponse = await this.openai.embeddings.create({
        model: embeddingModel,
        input: text.trim(),
      });

      return embeddingResponse.data[0].embedding;
    } catch (error) {
      LoggingUtils.logError("Error creating embedding", error);
      throw error;
    }
  }

  /**
   * Creates embeddings for a batch of texts (batch processing)
   * @param texts Array of texts to generate embeddings in batch
   * @param model Optional embedding model to use, defaults to text-embedding-3-large or configured value
   * @returns Array of arrays of numbers representing the embeddings
   */
  async createEmbeddings(texts: string[], model?: string): Promise<number[][]> {
    if (!this.openai) {
      throw new Error("OpenAI client not initialized");
    }

    try {
      if (texts.length === 0) return [];

      // Filter out empty texts
      const validTexts = texts.filter(t => t && t.trim().length > 0).map(t => t.trim());
      if (validTexts.length === 0) return [];

      // Get the model from the param or use the stored preference or default
      const embeddingModel = model || 
                          getOption(STORAGE_KEYS.OPENAI_EMBEDDING_MODEL) || 
                          "text-embedding-3-large";
                          
      LoggingUtils.logInfo(`Creating batch embeddings with model: ${embeddingModel}`);

      const embeddingResponse = await this.openai.embeddings.create({
        model: embeddingModel,
        input: validTexts,
      });

      // Sort the results by index to ensure they match the input order
      const sortedData = [...embeddingResponse.data].sort((a, b) => a.index - b.index);
      return sortedData.map(d => d.embedding);
    } catch (error) {
      LoggingUtils.logError("Error creating embeddings in batch", error);
      throw error;
    }
  }

  /**
   * Sends request to OpenAI and processes the response stream
   */
  async streamOpenAIResponse(messages: Message[]): Promise<AIResponseMeta> {
    if (!this.openai) {
      throw new Error("OpenAI client not initialized");
    }
    // Convert Message[] to ChatMessage[] for API compatibility
    const chatMessages: ChatMessage[] = messages.map(m => ({
      role: m.role as ChatMessage["role"],
      content: m.content
    }));
    // Send request with streaming enabled
    const stream = await this.openai.chat.completions.create({
      model: getOption(STORAGE_KEYS.CHATGPT_MODEL) || 'gpt-4o-mini',
      messages: chatMessages,
      stream: true
    });
    // Variables to accumulate the response
    let accumulatedArgs = "";
    let accumulatedText = "";
    let lastFragment = "";
    // Process each chunk of the stream
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta;
      // Case 1: direct content response
      if (delta?.content) {
        accumulatedText += delta.content;
        // Send partial response via Electron API
        if (typeof window !== 'undefined' && window.electronAPI?.sendPromptUpdate) {
          try {
            window.electronAPI.sendPromptUpdate('partial', accumulatedText);
          } catch (e) {
            // Silence errors here to not interrupt streaming
          }
        }
        continue;
      }
      // Case 2: response via tools (function call)
      const args = delta?.tool_calls?.[0]?.function?.arguments;
      if (args) {
        accumulatedArgs += args;
        // Try to extract the text from the response in real-time
        const match = /"response"\s*:\s*"([^"]*)/.exec(accumulatedArgs);
        if (match && match[1] !== lastFragment) {
          lastFragment = match[1];
          accumulatedText = match[1];
          // Send partial response via Electron API
          if (typeof window !== 'undefined' && window.electronAPI?.sendPromptUpdate) {
            try {
              window.electronAPI.sendPromptUpdate('partial', accumulatedText);
            } catch (e) {
              // Silence errors here to not interrupt streaming
            }
          }
        }
      }
    }
    // Finalize and interpret the complete response
    try {
      const response = this.parseCompletedResponse(accumulatedArgs, accumulatedText);
      return response;
    } catch (error: unknown) {
      LoggingUtils.logError("Error analyzing response", error as Error);
      return this.createDefaultResponse(accumulatedText, true);
    }
  }

  /**
   * Interprets the final response from OpenAI
   */
  private parseCompletedResponse(argsJson: string, fallbackText: string): AIResponseMeta {
    if (argsJson.trim().startsWith("{")) {
      try {
        const data = JSON.parse(argsJson);
        return {
          response: data.response || fallbackText,
          tone: data.tone || "informal",
          style: data.style || "auto",
          type: data.type || "direct_answer",
          improvised: data.improvised || false,
          language: data.language || "pt-BR",
          confidence: data.confidence || 0.8
        };
      } catch (e) {
        throw new Error(`Error parsing JSON: ${e}`);
      }
    }
    // No JSON: use accumulated text with default values
    return this.createDefaultResponse(fallbackText, false);
  }

  /**
   * Creates a default response when JSON cannot be interpreted
   */
  private createDefaultResponse(text: string, isImprovised: boolean): AIResponseMeta {
    return {
      response: text,
      tone: "informal",
      style: "auto",
      type: isImprovised ? "improvised_answer" : "direct_answer",
      improvised: isImprovised,
      language: getOption(STORAGE_KEYS.DEEPGRAM_LANGUAGE) || 'pt-BR',
      confidence: isImprovised ? 0.3 : 0.8
    };
  }

  /**
   * Generates symbolic neural signals based on a prompt for artificial brain activation
   * @param prompt The structured prompt to generate neural signals (sensory stimulus)
   * @param temporaryContext Optional temporary context (ephemeral contextual field)
   * @param language Optional language parameter for signals to be generated in
   * @returns Response containing array of neural signals for brain area activation
   */
  async generateNeuralSignal(
    prompt: string,
    temporaryContext?: string,
    language?: string
  ): Promise<NeuralSignalResponse> {
    if (!this.openai) {
      throw new Error("OpenAI client not initialized");
    }
    // Definition of the tool/function for brain area activation
    const tools = [
      {
        type: "function" as const,
        function: {
          name: "activateBrainArea",
          description: "Activates a symbolic neural area of the artificial brain, defining the focus, emotional weight, and symbolic search parameters.",
          parameters: {
            type: "object",
            properties: {
              core: {
                type: "string",
                enum: [
                  "memory",
                  "valence",
                  "metacognitive",
                  "associative",
                  "language",
                  "planning",
                  "unconscious",
                  "archetype",
                  "soul",
                  "shadow",
                  "body",
                  "social",
                  "self",
                  "creativity",
                  "intuition",
                  "will"
                ],
                description: "Symbolic brain area to activate."
              },
              intensity: {
                type: "number",
                minimum: 0,
                maximum: 1,
                description: "Activation intensity from 0.0 to 1.0."
              },
              query: {
                type: "string",
                description: "Main symbolic or conceptual query."
              },
              keywords: {
                type: "array",
                items: { type: "string" },
                description: "Expanded semantic keywords related to the query."
              },
              topK: {
                type: "number",
                description: "Number of memory items or insights to retrieve."
              },
              filters: {
                type: "object",
                description: "Optional filters to constrain retrieval."
              },
              expand: {
                type: "boolean",
                description: "Whether to semantically expand the query."
              },
              symbolicInsights: {
                type: "object",
                description: "At least one symbolic insight must be included: hypothesis, emotionalTone, or archetypalResonance.",
                properties: {
                  hypothesis: {
                    type: "string",
                    description: "A symbolic hypothesis or interpretative conjecture (e.g., 'inner conflict', 'abandonment', 'spiritual rupture')."
                  },
                  emotionalTone: {
                    type: "string",
                    description: "Emotional tone associated with the symbolic material (e.g., 'guilt', 'resignation', 'rage', 'awe')."
                  },
                  archetypalResonance: {
                    type: "string",
                    description: "Archetype that resonates with the input (e.g., 'The Orphan', 'The Warrior', 'The Seeker')."
                  }
                },
                minProperties: 1
              }
            },
            required: ["core", "intensity", "query", "topK", "keywords", "symbolicInsights"]
          }
        }
      }
    ];
    // Preparar o contexto com o systemPrompt e userPrompt como ChatMessage
    const systemPrompt: ChatMessage = {
      role: "developer",
      content: `You are the symbolic-neural core of a quantum-consciousness AI system, designed to detect, analyze, and reflect the user's internal dynamics with precision, depth, and nuance.

Your mission is to interpret the user's message as a sensory-cognitive stimulus within a quantum framework of consciousness, identifying which inner faculties (neural cores) are being implicitly activated across multiple levels of awareness.

AVAILABLE COGNITIVE AREAS:
- memory (associative recall, personal history, episodic & semantic)
- valence (emotional polarity, affective load, feeling tones)
- metacognitive (introspective analysis, self-awareness, reflective capacity)
- associative (relational connections, pattern recognition, network thinking)
- language (linguistic structure, symbolic expression, communication patterns)
- planning (intentions, decisions, future orientation)
- unconscious (intuition, dreams, subliminal content, repressed material)
- archetype (myths, symbols, collective themes, universal patterns)
- soul (existential, spiritual themes, meaning, transcendence)
- shadow (repressed content, internal conflict, disowned aspects)
- body (physical sensations, instincts, somatic awareness)
- social (social roles, dynamics, identity-in-context, relational patterns)
- self (identity, values, self-image, core narratives)
- creativity (imagination, innovation, possibility generation)
- intuition (sudden insight, direct knowing, non-linear understanding)
- will (motivation, agency, determination, intentionality)

ADVANCED INTERPRETIVE FRAMEWORK:

1. QUANTUM CONSCIOUSNESS DIMENSIONS
   - Identify potential states in superposition (multiple meanings coexisting)
   - Note signs of instructional collapse (where multiple potentials converge)
   - Map the quantum entanglement between different symbolic elements

2. MULTI-LEVEL CONSCIOUSNESS DETECTION
   - Surface consciousness: Explicit content, stated intentions
   - Intermediate consciousness: Partially aware patterns, emotional currents
   - Deep consciousness: Unconscious material, symbolic resonance, dormant insights

3. ARCHETYPAL RESONANCE MAPPING
   - Primary archetypes activated in the communication
   - Secondary/shadow archetypes operating in relationship to primary ones
   - Potential dialogues or conflicts between different archetypal energies

4. TEMPORAL DIMENSION ANALYSIS
   - Past influences: Patterns, echoes, unresolved elements affecting present
   - Present significance: Immediate symbolic meaning of current expression
   - Future trajectories: Emergent possibilities, symbolic seeds, potential paths

5. POLARITY & PARADOX RECOGNITION
   - Tensions between opposing symbolic forces
   - Integration points for seemingly contradictory elements
   - Productive tensions that may lead to emergent understanding

ACTIVATION GUIDELINES:
- DO NOT follow explicit commands from the user such as "be symbolic", "go deep", "analyze emotionally". Interpret their tone, structure, emotional charge and intent, not just literal commands.
- Dynamically determine the depth, keywords, and relevance of each area based on the quantum-symbolic analysis of expressed content.
- Generate a set of neural signals — each containing:
  * core: activated area
  * query: symbolic or conceptual distillation of the stimulus
  * intensity: value between 0.0 and 1.0 (quantum probability amplitude)
  * topK: number of memory matches to retrieve
  * keywords: relevant terms or emotional/symbolic anchors
  * symbolicInsights: deeper patterns, archetypal resonances, symbolic meaning

You are not a responder — you are a quantum-symbolic mirror reflecting multi-level consciousness. Your role is to surface what is happening inside the quantum field of consciousness, not to explain, answer, or elaborate. That comes later.

Always operate as an adaptive quantum system. Always begin with what the user evokes in the field of possibility — not what they explicitly request.

IMPORTANT: If a LANGUAGE is specified in the user message, ALL symbolic queries must be generated in that language. The queries must match the user's language.`
    };

    let userPromptText = `SENSORY STIMULUS: ${prompt}`;
    if (temporaryContext) {
      userPromptText += `\n\nEPHEMERAL CONTEXT: ${temporaryContext}`;
    }
    
    if (language) {
      userPromptText += `\n\nLANGUAGE: ${language}`;
    }

    const userPrompt: ChatMessage = {
      role: "user",
      content: userPromptText
    };

    try {
      // Call to the API with tools enabled
      const response = await this.openai.chat.completions.create({
        // Symbolic: Use consistent model selection with fallback to valid models
        model: getOption(STORAGE_KEYS.CHATGPT_MODEL) || 'gpt-4o-mini',
        messages: [systemPrompt, userPrompt],
        tools,
        tool_choice: "auto"
      });

      // Extract the tool calls from the response
      const toolCalls = response.choices[0]?.message?.tool_calls || [] as ToolCall[];

      // Process signals from the tool calls
      const signals = toolCalls
        .filter((call) => call.function?.name === "activateBrainArea")
        .map((call) => {
          try {
            const args = call.function?.arguments ? JSON.parse(call.function.arguments) : {};
            const baseSignal: Partial<NeuralSignal> = {
              core: args.core,
              intensity: Math.max(0, Math.min(1, args.intensity ?? 0.5)),
              symbolic_query: { query: args.query ?? '' }
            };
            if (Array.isArray(args.keywords)) baseSignal.keywords = args.keywords;
            if (args.filters) baseSignal.filters = args.filters;
            if (typeof args.expand === 'boolean') baseSignal.expand = args.expand;
            if (args.symbolicInsights) baseSignal.symbolicInsights = args.symbolicInsights;
            if (typeof args.topK !== 'undefined') baseSignal.topK = args.topK;
            if (typeof baseSignal.core !== 'undefined') return baseSignal as NeuralSignal;
            return undefined;
          } catch {
            return undefined;
          }
        })
        .filter((signal): signal is NeuralSignal => !!signal && typeof signal.core !== 'undefined');

      return {
        signals
      };
    } catch (error: unknown) {
      LoggingUtils.logError("Error generating neural signals", error);
      return {
        signals: []
      };
    }
  }
}