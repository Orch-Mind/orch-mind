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
        "Activates a cognitive processing area following Orch-OS holographic architecture. Each activation contains complete information processed through specialized neural lenses.",
      parameters: {
        type: "object",
        properties: {
          core: {
            type: "string",
            enum: [
              // Executive cores (3)
              "executive_central",
              "attention",
              "working_memory",
              // Emotional cores (3)
              "amygdala",
              "hippocampus",
              "anterior_cingulate",
              // Sensory cores (3)
              "visual",
              "auditory",
              "somatosensorial",
              // Language cores (2)
              "broca",
              "wernicke",
              // Integration cores (4)
              "thalamus",
              "claustrum",
              "default_mode",
              "salience",
            ],
            description:
              "Cognitive core to activate. Prefer new 15-core architecture names when possible.",
          },
          intensity: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description:
              "Activation intensity (0-1) representing relevance to this cognitive specialization.",
          },
          symbolic_query: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description:
                  "Natural language search query from this core's perspective.",
              },
              filters: {
                type: "object",
                additionalProperties: { type: "string" },
                description: "Optional contextual filters for the query.",
              },
            },
            required: ["query"],
            description:
              "Holographic query containing complete information viewed through this core's lens.",
          },
          keywords: {
            type: "array",
            items: { type: "string" },
            description:
              "3-8 keywords unfolding the implicate order (Bohm) of this signal.",
          },
          symbolicInsights: {
            type: "object",
            description:
              "Specialized insights from this core's processing perspective.",
            additionalProperties: true,
          },
          topK: {
            type: "number",
            minimum: 1,
            maximum: 20,
            description:
              "Number of memories to retrieve (1-20), adjusted by intensity.",
          },
        },
        required: ["core", "intensity", "symbolic_query"],
      },
    });

    // Collapse strategy decision function
    this.register("decideCollapseStrategy", {
      name: "decideCollapseStrategy",
      description:
        "Determines the optimal symbolic collapse strategy following Orch-OS architecture. Analyzes cognitive state metrics to choose between: 1) Collapse by Dominance (clear hierarchy), 2) Collapse by Synthesis (complementary cores), 3) Collapse by Dialectic (productive contradictions), or 4) Collapse by Context (user intent focus). Outputs whether collapse should be deterministic or probabilistic with appropriate temperature.",
      parameters: {
        type: "object",
        properties: {
          deterministic: {
            type: "boolean",
            description:
              "True for deterministic collapse (single interpretation dominates or clear context). False for probabilistic collapse (synthesis/dialectic needed).",
          },
          temperature: {
            type: "number",
            minimum: 0.1,
            maximum: 1.5,
            description:
              "Temperature for response variation. Lower (0.1-0.5) for dominance/context, higher (0.8-1.5) for synthesis/dialectic.",
          },
          justification: {
            type: "string",
            description:
              "Explanation of chosen strategy referencing: dominance, synthesis, dialectic, or context approach.",
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
              "Emergent symbolic patterns detected: interference patterns, contradictions, resonances, phase alignments, etc.",
          },
          userIntent: {
            type: "object",
            description:
              "Inferred user intent weights across cognitive dimensions",
            properties: {
              social: { type: "number", minimum: 0, maximum: 1 },
              trivial: { type: "number", minimum: 0, maximum: 1 },
              reflective: { type: "number", minimum: 0, maximum: 1 },
              practical: { type: "number", minimum: 0, maximum: 1 },
            },
          },
        },
        required: ["deterministic", "temperature", "justification"],
      },
    });

    // Semantic enrichment function
    this.register("enrichSemanticQuery", {
      name: "enrichSemanticQuery",
      description:
        "Enriches a neural signal by unfolding its implicate order (Bohm). Reveals hidden connections, memories, and patterns folded within the information through semantic expansion.",
      parameters: {
        type: "object",
        properties: {
          enrichedQuery: {
            type: "string",
            description:
              "The unfolded query revealing implicit connections and hidden dimensions of meaning.",
          },
          keywords: {
            type: "array",
            items: { type: "string" },
            description:
              "3-8 keywords that unfold the implicate order: episodic memories, semantic networks, emotional resonances, cultural contexts, and developmental potentials.",
          },
          contextualHints: {
            type: "object",
            description:
              "Bohm-inspired contextual dimensions unfolded from the signal.",
            properties: {
              temporalScope: {
                type: "string",
                enum: ["past", "present", "future", "timeless"],
                description: "Temporal unfolding of the query's meaning.",
              },
              emotionalDepth: {
                type: "number",
                minimum: 0,
                maximum: 1,
                description: "Depth of emotional resonance unfolded (0-1).",
              },
              abstractionLevel: {
                type: "string",
                enum: ["concrete", "conceptual", "symbolic", "archetypal"],
                description: "Level of abstraction revealed through unfolding.",
              },
              contradictionHandling: {
                type: "string",
                enum: ["embrace", "resolve", "explore", "transcend"],
                description:
                  "How to handle contradictions in the implicate order.",
              },
            },
          },
        },
        required: ["enrichedQuery", "keywords"],
      },
    });
  }
}
