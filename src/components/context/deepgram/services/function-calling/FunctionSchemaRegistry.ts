// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { IFunctionDefinition } from "../../interfaces/function-calling/IFunctionDefinition";
import { LoggingUtils } from "../../utils/LoggingUtils";

/**
 * Registry for centralized function schema management
 * Single source of truth for all function definitions
 */
export class FunctionSchemaRegistry {
  private static instance: FunctionSchemaRegistry;
  private schemas: Map<string, IFunctionDefinition> = new Map();

  private constructor() {
    this.registerDefaultSchemas();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): FunctionSchemaRegistry {
    if (!FunctionSchemaRegistry.instance) {
      FunctionSchemaRegistry.instance = new FunctionSchemaRegistry();
    }
    return FunctionSchemaRegistry.instance;
  }

  /**
   * Register a function schema
   */
  register(name: string, schema: IFunctionDefinition): void {
    this.schemas.set(name, schema);
    LoggingUtils.logInfo(`Registered function schema: ${name}`);
  }

  /**
   * Get a function schema by name
   */
  get(name: string): IFunctionDefinition | undefined {
    return this.schemas.get(name);
  }

  /**
   * Get all registered schemas
   */
  getAll(): IFunctionDefinition[] {
    return Array.from(this.schemas.values());
  }

  /**
   * Check if a schema exists
   */
  has(name: string): boolean {
    return this.schemas.has(name);
  }

  /**
   * Register default schemas used throughout the application
   */
  private registerDefaultSchemas(): void {
    // Neural signal activation function
    this.register("activateBrainArea", {
      name: "activateBrainArea",
      description:
        "Activates a cognitive processing area of the AI system, defining the focus, relevance, and search parameters.",
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
              "will",
            ],
            description: "Cognitive area to activate.",
          },
          intensity: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description: "Relevance intensity (0-1) for this cognitive area.",
          },
          symbolic_query: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Main query or search term.",
              },
              filters: {
                type: "object",
                additionalProperties: { type: "string" },
                description: "Optional filters for the query.",
              },
            },
            required: ["query"],
            description: "Query structure for semantic search.",
          },
          keywords: {
            type: "array",
            items: { type: "string" },
            description: "Keywords for expanded search.",
          },
          symbolicInsights: {
            type: "array",
            items: {
              type: "object",
              properties: {
                hypothesis: {
                  type: "string",
                  description: "A hypothesis or interpretation.",
                },
                emotionalTone: {
                  type: "string",
                  description: "Emotional tone detected in the input.",
                },
                archetypalResonance: {
                  type: "string",
                  description: "Core theme or pattern identified.",
                },
              },
              anyOf: [
                { required: ["hypothesis"] },
                { required: ["emotionalTone"] },
                { required: ["archetypalResonance"] },
              ],
              description:
                "At least one insight must be included: hypothesis, emotionalTone, or archetypalResonance.",
            },
            description: "Insights derived from the analysis.",
          },
          topK: {
            type: "number",
            minimum: 1,
            maximum: 20,
            description: "Number of memories to retrieve (1-20).",
          },
        },
        required: ["core", "intensity", "symbolic_query"],
      },
    });

    // Collapse strategy decision function
    this.register("decideCollapseStrategy", {
      name: "decideCollapseStrategy",
      description:
        "Decides the response generation strategy (deterministic or probabilistic) based on various factors from the user's input.",
      parameters: {
        type: "object",
        properties: {
          deterministic: {
            type: "boolean",
            description:
              "Whether to use deterministic (true) or probabilistic (false) approach.",
          },
          temperature: {
            type: "number",
            minimum: 0.1,
            maximum: 1.5,
            description: "Temperature value for response variation (0.1-1.5).",
          },
          justification: {
            type: "string",
            description: "Brief justification for the decision.",
          },
          emotionalIntensity: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description: "Overall emotional intensity detected (0-1).",
          },
          emergentProperties: {
            type: "array",
            items: { type: "string" },
            description:
              "Emergent properties detected: contradictions, patterns, redundancies, etc.",
          },
        },
        required: ["deterministic", "temperature", "justification"],
      },
    });

    // Semantic enrichment function
    this.register("enrichSemanticQuery", {
      name: "enrichSemanticQuery",
      description:
        "Enriches a semantic query with expanded keywords and contextual information for a specific brain core.",
      parameters: {
        type: "object",
        properties: {
          enrichedQuery: {
            type: "string",
            description:
              "The enriched version of the original query with expanded semantic context.",
          },
          keywords: {
            type: "array",
            items: { type: "string" },
            description:
              "Array of semantically related keywords for the query.",
          },
          contextualHints: {
            type: "object",
            description:
              "Additional contextual information to guide the search.",
            properties: {
              temporalScope: {
                type: "string",
                description:
                  "Temporal scope of the query (past, present, future).",
              },
              emotionalDepth: {
                type: "number",
                minimum: 0,
                maximum: 1,
                description: "Emotional depth of the query (0-1).",
              },
              abstractionLevel: {
                type: "string",
                enum: ["concrete", "conceptual", "symbolic", "archetypal"],
                description: "Level of abstraction for the query.",
              },
              contradictionHandling: {
                type: "string",
                enum: ["embrace", "resolve", "explore"],
                description: "How to handle contradictory information.",
              },
            },
          },
        },
        required: ["enrichedQuery", "keywords"],
      },
    });
  }
}
