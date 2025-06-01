// OpenAINeuralSignalService.ts
// Symbolic: Neural signal extraction service using OpenAI (cortex: openai)
import { INeuralSignalService } from '../../../domain/core/neural/INeuralSignalService';
import { ISemanticEnricher } from '../../../domain/core/neural/ISemanticEnricher';
import { NeuralSignalResponse } from '../../../components/context/deepgram/interfaces/neural/NeuralSignalTypes';
import { buildSystemPrompt, buildUserPrompt } from '../../../shared/utils/neuralPromptBuilder';
import { OpenAICompletionService } from '../../../components/context/deepgram/services/openai/neural/OpenAICompletionService';
import { parseNeuralSignal } from '../../../shared/utils/neuralSignalParser';
import { STORAGE_KEYS, getOption } from '../../../services/StorageService';

export class OpenAINeuralSignalService implements INeuralSignalService, ISemanticEnricher {
  // Dependency injection via constructor if needed
  constructor(private openAICompletionService: OpenAICompletionService) { }

  /**
   * Symbolic: Extracts neural signals using OpenAI
   */
  async generateNeuralSignal(prompt: string, temporaryContext?: string, language?: string): Promise<NeuralSignalResponse> {
    const systemPrompt = {
      role: 'developer',
      content: buildSystemPrompt(),
    };
    const userPrompt = {
      role: 'user',
      content: buildUserPrompt(prompt, temporaryContext, language),
    };
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
    try {
      const model = getOption(STORAGE_KEYS.CHATGPT_MODEL) || 'gpt-4o-mini';
      const response = await this.openAICompletionService.callModelWithFunctions({
        model,
        messages: [systemPrompt, userPrompt],
        tools: tools,
        tool_choice: { type: 'function', function: { name: 'activateBrainArea' } },
        temperature: 0.7
      });
      const toolCalls = response.choices?.[0]?.message?.tool_calls;
      let signals: NeuralSignalResponse['signals'] = [];
      if (toolCalls && Array.isArray(toolCalls)) {
        signals = toolCalls
          .filter((call: any) => call.function?.name === 'activateBrainArea')
          .map((call: any): any => {
            try {
              const args = call.function?.arguments ? JSON.parse(call.function.arguments) : {};
              const baseSignal: Partial<any> = {
                core: args.core,
                intensity: Math.max(0, Math.min(1, args.intensity ?? 0.5)),
                symbolic_query: { query: args.query ?? '' }
              };
              if (Array.isArray(args.keywords)) baseSignal.keywords = args.keywords;
              if (args.filters) baseSignal.filters = args.filters;
              if (typeof args.expand === 'boolean') baseSignal.expand = args.expand;
              if (args.symbolicInsights) baseSignal.symbolicInsights = args.symbolicInsights;
              if (typeof args.topK !== 'undefined') baseSignal.topK = args.topK;
              if (typeof baseSignal.core !== 'undefined') return baseSignal;
              return undefined;
            } catch {
              return undefined;
            }
          })
          .filter((signal: any): signal is any => !!signal && typeof signal.core !== 'undefined');
      }
      return { signals };
    } catch (error) {
      console.error(error);
      return { signals: [] };
    }
  }

  /**
   * Symbolic: Semantic enrichment using OpenAI
   */
  async enrichSemanticQueryForSignal(
    core: string,
    query: string,
    intensity: number,
    context?: string,
    language?: string
  ): Promise<{ enrichedQuery: string; keywords: string[] }> {
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
    const systemPrompt = {
      role: 'developer',
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

IMPORTANT: Always honor the neural core's specific domain and intensity level. High intensity should produce deeper symbolic resonance; lower intensity should favor clarity and precision. Ensure the enriched query is produced in the same language as specified in the 'LANGUAGE' field.`,
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

    const userPrompt = {
      role: 'user',
      content: userPromptText,
    };
    
    try {
      const model = getOption(STORAGE_KEYS.CHATGPT_MODEL) || 'gpt-4o-mini';
      const response = await this.openAICompletionService.callModelWithFunctions({
        model, 
        messages: [systemPrompt, userPrompt],
        tools: [enrichmentTool],
        tool_choice: { type: 'function', function: { name: 'enrichSemanticQuery' } },
        temperature: 0.7,
      });
      // Symbolic: Use central neural signal parser for all JSON arguments (tool_calls)
      const toolCalls = response.choices?.[0]?.message?.tool_calls;
      if (toolCalls && Array.isArray(toolCalls) && toolCalls[0]?.function?.arguments) {
        const signal = parseNeuralSignal(toolCalls[0].function.arguments);
        if (signal && signal.symbolic_query?.query) {
          return {
            enrichedQuery: signal.symbolic_query.query,
            keywords: signal.keywords || [],
          };
        } else {
          return { enrichedQuery: query, keywords: [] };
        }
      }
      return { enrichedQuery: query, keywords: [] };

    } catch (error) {
      console.error(error);
      return { enrichedQuery: query, keywords: [] };
    }
  }
}
