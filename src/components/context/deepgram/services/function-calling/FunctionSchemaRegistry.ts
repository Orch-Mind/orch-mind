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
                description: "A symbolic hypothesis or interpretative conjecture."
              },
              emotionalTone: {
                type: "string",
                description: "Emotional tone associated with the symbolic material."
              },
              archetypalResonance: {
                type: "string",
                description: "Archetypal patterns or figures evoked."
              }
            }
          }
        },
        required: ["core", "intensity", "query", "symbolicInsights"]
      }
    });

    // Collapse strategy decision function
    this.register("decideCollapseStrategy", {
      name: "decideCollapseStrategy",
      description: "Decides the symbolic collapse strategy (deterministic or not) based on emotional intensity, symbolic tension, and nature of the user's input.",
      parameters: {
        type: "object",
        properties: {
          deterministic: {
            type: "boolean",
            description: "Whether to use deterministic collapse (true) or probabilistic collapse (false)."
          },
          temperature: {
            type: "number",
            minimum: 0.1,
            maximum: 1.5,
            description: "Temperature for probabilistic collapse (0.1-1.5)."
          },
          justification: {
            type: "string",
            description: "Reasoning behind the collapse strategy decision."
          },
          userIntent: {
            type: "object",
            description: "User intent weights for different categories. Each value represents the intensity/importance of that intent type (0-1).",
            properties: {
              practical: { type: "number", minimum: 0, maximum: 1, description: "Weight for practical intent." },
              analytical: { type: "number", minimum: 0, maximum: 1, description: "Weight for analytical intent." },
              reflective: { type: "number", minimum: 0, maximum: 1, description: "Weight for reflective intent." },
              existential: { type: "number", minimum: 0, maximum: 1, description: "Weight for existential intent." },
              symbolic: { type: "number", minimum: 0, maximum: 1, description: "Weight for symbolic intent." },
              emotional: { type: "number", minimum: 0, maximum: 1, description: "Weight for emotional intent." },
              narrative: { type: "number", minimum: 0, maximum: 1, description: "Weight for narrative intent." },
              mythic: { type: "number", minimum: 0, maximum: 1, description: "Weight for mythic intent." },
              trivial: { type: "number", minimum: 0, maximum: 1, description: "Weight for trivial intent." },
              ambiguous: { type: "number", minimum: 0, maximum: 1, description: "Weight for ambiguous intent." }
            }
          },
          emergentProperties: {
            type: "array",
            description: "Emergent properties detected in the neural responses, such as redundancies, contradictions, or patterns",
            items: {
              type: "string"
            }
          }
        },
        required: ["deterministic", "temperature", "justification", "userIntent", "emergentProperties"]
      }
    });

    // Semantic enrichment function
    this.register("enrichSemanticQuery", {
      name: "enrichSemanticQuery",
      description: "Enriches a semantic query with expanded keywords and contextual information for a specific brain core.",
      parameters: {
        type: "object",
        properties: {
          enrichedQuery: {
            type: "string",
            description: "The enriched version of the original query with expanded semantic context."
          },
          keywords: {
            type: "array",
            items: { type: "string" },
            description: "Array of semantically related keywords for the query."
          },
          contextualHints: {
            type: "object",
            description: "Additional contextual information to guide the search.",
            properties: {
              temporalScope: {
                type: "string",
                description: "Temporal scope of the query (past, present, future)."
              },
              emotionalDepth: {
                type: "number",
                minimum: 0,
                maximum: 1,
                description: "Emotional depth of the query (0-1)."
              },
              abstractionLevel: {
                type: "string",
                enum: ["concrete", "conceptual", "symbolic", "archetypal"],
                description: "Level of abstraction for the query."
              }
            }
          }
        },
        required: ["enrichedQuery", "keywords"]
      }
    });
  }
}