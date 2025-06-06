// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// HuggingFaceNeuralSignalService.ts
// Symbolic: Neural signal extraction service using HuggingFace (cortex: huggingface)
import { INeuralSignalService } from '../../../domain/core/neural/INeuralSignalService';
import { ISemanticEnricher } from '../../../domain/core/neural/ISemanticEnricher';
import { NeuralSignalResponse } from '../../../components/context/deepgram/interfaces/neural/NeuralSignalTypes';
import { buildSystemPrompt, buildUserPrompt } from '../../../shared/utils/neuralPromptBuilder';
import { parseNeuralSignal, extractNeuralSignalJsons } from '../../../shared/utils/neuralSignalParser';
import { HuggingFaceLocalService } from '../../../services/huggingface/HuggingFaceLocalService';

/**
 * Symbolic: HuggingFace implementation of neural signal service
 * This service extracts symbolic neural signals and performs semantic enrichment
 * using local HuggingFace models.
 */
export class HuggingFaceNeuralSignalService implements INeuralSignalService, ISemanticEnricher {
  /**
   * Constructor with dependency injection for HuggingFaceLocalService
   */
  constructor(private huggingFaceClient: HuggingFaceLocalService) {}

  /**
   * Symbolic: Extracts neural signals using HuggingFace
   */
  async generateNeuralSignal(prompt: string, temporaryContext?: string, language?: string): Promise<NeuralSignalResponse> {
    try {
      const systemPromptContent = buildSystemPrompt();
      const userPromptContent = buildUserPrompt(prompt, temporaryContext, language);
      
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
      
      const messages = [
        { role: 'system' as const, content: systemPromptContent },
        { role: 'user' as const, content: userPromptContent }
      ];
      
      const response = await this.huggingFaceClient.generateWithFunctions(messages, tools);
      
      // Parse neural signals from the response
      let signals: NeuralSignalResponse['signals'] = [];
      if (response.tool_calls && Array.isArray(response.tool_calls)) {
        signals = response.tool_calls
          .filter(call => call.function?.name === 'activateBrainArea')
          .map(call => {
            try {
              const args = call.function?.arguments ? JSON.parse(call.function.arguments) : {};
              // Create a properly structured neural signal with core quantum properties
              const baseSignal: Partial<NeuralSignalResponse['signals'][0]> = {
                core: args.core,
                intensity: Math.max(0, Math.min(1, args.intensity ?? 0.5)),
                symbolic_query: { query: args.query ?? '' }
              };
              if (Array.isArray(args.keywords)) baseSignal.keywords = args.keywords;
              if (args.filters) baseSignal.filters = args.filters;
              if (typeof args.expand === 'boolean') baseSignal.expand = args.expand;
              if (args.symbolicInsights) baseSignal.symbolicInsights = args.symbolicInsights;
              if (typeof args.topK !== 'undefined') baseSignal.topK = args.topK;
              // Only return signals with valid core activation
              return typeof baseSignal.core !== 'undefined' ? baseSignal as NeuralSignalResponse['signals'][0] : undefined;
            } catch {
              return undefined;
            }
          })
          .filter((signal): signal is NeuralSignalResponse['signals'][0] => !!signal && typeof signal.core !== 'undefined');
      }
      
      // If unable to extract function calls, try to extract text-based signals
      if (signals.length === 0 && response.content) {
        // Parse neural signals using the utility parsers
        const extractedSignals = extractNeuralSignalJsons(response.content)
          .map(parseNeuralSignal)
          .filter((signal): signal is NeuralSignalResponse['signals'][0] => signal !== null);
        signals = extractedSignals;
      }
      
      return { signals };
    } catch (error) {
      // Log error and return empty signals for graceful degradation
      console.error('Neural signal extraction error:', error);
      return { signals: [] };
    }
  }

  /**
   * Symbolic: Semantic enrichment using HuggingFace
   */
  async enrichSemanticQueryForSignal(
    core: string,
    query: string,
    intensity: number,
    context?: string,
    language?: string
  ): Promise<{ enrichedQuery: string; keywords: string[] }> {
    try {
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
      
      // Symbolic: Quantum-symbolic instruction pattern for semantic enrichment
      const systemPromptContent = `You are a quantum-symbolic neural processor within a consciousness operating system. Your task is to semantically expand and enrich incoming neural queries through quantum superposition of meaning.

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

IMPORTANT: Always honor the neural core's specific domain and intensity level. High intensity should produce deeper symbolic resonance; lower intensity should favor clarity and precision. Ensure the enriched query is produced in the same language as specified in the 'LANGUAGE' field.`;
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

      const messages = [
        { role: 'system' as const, content: systemPromptContent },
        { role: 'user' as const, content: userPromptText }
      ];
      
      const response = await this.huggingFaceClient.generateWithFunctions(messages, [enrichmentTool]);
      
      // Symbolic: Use central neural signal parser for all JSON arguments (tool_calls)
      if (response.tool_calls && Array.isArray(response.tool_calls) && response.tool_calls[0]?.function?.arguments) {
        const signal = parseNeuralSignal(response.tool_calls[0].function.arguments);
        if (signal && signal.symbolic_query?.query) {
          return {
            enrichedQuery: signal.symbolic_query.query,
            keywords: signal.keywords || []
          };
        } else {
          return { enrichedQuery: query, keywords: [] };
        }
      }
      
      // Symbolic: Quantum collapse to extract meaning if function structure failed
      // Fallback to simple text extraction if no tool_calls are present
      if (response.content) {
        // Symbolic: Use central neural signal parser for all JSON content
        const jsonMatch = response.content.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          const signal = parseNeuralSignal(jsonMatch[0]);
          if (signal && signal.symbolic_query?.query) {
            return {
              enrichedQuery: signal.symbolic_query.query,
              keywords: signal.keywords || []
            };
          }
        }
        // Simple extraction of enriched text as fallback
        return {
          enrichedQuery: response.content.trim() || query,
          keywords: []
        };
      }
      
      return { enrichedQuery: query, keywords: [] };
    } catch (error) {
      // Handle general service errors with original query fallback
      console.error('Semantic enrichment error:', error);
      return { enrichedQuery: query, keywords: [] };
    }
  }
}
