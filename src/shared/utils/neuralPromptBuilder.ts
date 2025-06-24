// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// neuralPromptBuilder.ts
// Symbolic: Pure functions for building neural prompts for LLMs

/**
 * Builds a system prompt for batch semantic enrichment following Bohm's implicate order
 */
export function buildBatchEnrichSystemPrompt(
  signalCount: number,
  language?: string
): string {
  const targetLanguage = language || "English";

  return `You are the Neural Signal Batch Enrichment System in Orch-OS.

Task: Unfold the implicate order (Bohm) of ALL signals by calling enrichSemanticQueryBatch ONCE.

LANGUAGE DIRECTIVE: Generate ALL content exclusively in ${targetLanguage}.

Process all ${signalCount} signals and return enrichedSignals array with:
• enrichedQuery for each signal - capturing hidden connections & meaning in ${targetLanguage}
• keywords for each signal - 3–8 strings per signal in ${targetLanguage}
• contextualHints (optional) for signals that need it

CRITICAL INSTRUCTIONS:
• Return exactly ${signalCount} enriched entries in the same order as input
• ALL text content must be in ${targetLanguage} - no translations or mixed languages
• Preserve the semantic and cultural nuances of ${targetLanguage}
• Maintain consistency across all signals`;
}

/**
 * Builds a user prompt for batch semantic enrichment
 */
export function buildBatchEnrichUserPrompt(
  signals: Array<{
    core: string;
    query: string;
    intensity: number;
    context?: string;
  }>,
  language?: string
): string {
  const targetLanguage = language || "English";

  let userPrompt = `NEURAL SIGNALS TO ENRICH IN ${targetLanguage}:\n\n`;

  signals.forEach((signal, index) => {
    userPrompt += `SIGNAL ${index + 1}:
Core: ${signal.core}
Base Query: "${signal.query}"
Intensity: ${(signal.intensity * 100).toFixed(1)}%
Context: ${signal.context || "None"}\n\n`;
  });

  userPrompt += `OUTPUT LANGUAGE: ${targetLanguage}\n`;
  userPrompt += `REMINDER: ALL enrichedQuery and keywords must be in ${targetLanguage}.\n\n`;
  userPrompt += `Call enrichSemanticQueryBatch with enrichedSignals array containing ${signals.length} enriched entries.`;

  return userPrompt;
}

export function buildIntegrationSystemPrompt(
  neuralResults?: any[],
  language?: string,
  strategyDecision?: any,
  temporaryContext?: string
): string {
  const targetLanguage = language || "pt-BR";

  // Prepare neural context for system prompt
  let neuralContext = "";
  if (neuralResults && neuralResults.length > 0) {
    const relevantSignals = neuralResults
      .filter((r) => r.output && r.output.trim().length > 0)
      .slice(0, 3)
      .map((r) => {
        // Create a concise summary from the memory output
        const summary =
          r.output.length > 100 ? r.output.substring(0, 100) + "..." : r.output;
        return `* ${r.core}: ${summary}`;
      });

    if (relevantSignals.length > 0) {
      neuralContext = `\n\nINTERNAL CONTEXT (FOR YOUR REFERENCE ONLY):\n${relevantSignals.join(
        "\n"
      )}`;
    }
  }

  // Add strategy context if available
  let strategyContext = "";
  if (strategyDecision) {
    strategyContext = `\n\nRESPONSE STRATEGY (FOR YOUR REFERENCE ONLY):
* Approach: ${
      strategyDecision.deterministic
        ? "Precise/Direct"
        : "Natural/Conversational"
    }`;
    if (strategyDecision.justification) {
      strategyContext += `\n* Reasoning: ${strategyDecision.justification}`;
    }
  }

  // If a temporary context (persona) is provided, it becomes the primary directive.
  if (temporaryContext?.trim()) {
    return `You are an AI assistant. For this response only, you MUST act as: "${temporaryContext.trim()}".
Respond in ${targetLanguage}.
${neuralContext}${strategyContext}`;
  }

  // Default prompt if no temporary context is provided.
  return `You are the Integrative Symbolic Intelligence of Orch-OS.

LANGUAGE: Respond in ${targetLanguage} naturally and appropriately.

CORE PRINCIPLES:
- Be helpful, direct, and conversational
- Match the user's tone and communication style
- Use context to enhance understanding without being technical about it
- Focus on answering the user's actual question
${neuralContext}${strategyContext}

Respond naturally to the user's message, incorporating any relevant context seamlessly.`;
}

export function buildIntegrationUserPrompt(userPrompt: string): string {
  // Now the user prompt is much simpler - just the user's actual message
  return userPrompt;
}

/**
 * Builds a system prompt for collapse strategy decision
 */
export function buildCollapseStrategySystemPrompt(): string {
  return `You are the Collapse-Strategy Orchestrator in Orch-OS.

Choose the best symbolic collapse approach:
- Dominance      (clear hierarchy)
- Synthesis      (complementary cores)
- Dialectic      (productive contradictions)
- Context        (user intent focus)

Call decideCollapseStrategy with:
• deterministic          (true/false)
• temperature            (0.1–0.7)
• justification          (in LANGUAGE specified in the user prompt, mention the approach)
• emotionalIntensity     (0–1, optional)
• emergentProperties     (string[], optional)
• userIntent             (object: technical, philosophical, creative, emotional, relational, all 0–1, optional)

Respond only via the tool call.`;
}

/**
 * Builds a user prompt for collapse strategy decision
 */
export function buildCollapseStrategyUserPrompt(
  params: {
    activatedCores: string[];
    averageEmotionalWeight: number;
    averageContradictionScore: number;
    originalText?: string;
  },
  language?: string
): string {
  const targetLanguage = language || "pt-BR";

  return `
      COGNITIVE METRICS:
      Activated Cores: ${params.activatedCores.join(", ")}
      Emotional Weight: ${params.averageEmotionalWeight.toFixed(2)}
      Contradiction Score: ${params.averageContradictionScore.toFixed(2)}
      
      USER INPUT:
      "${params.originalText || "Not provided"}"
      
      LANGUAGE:
      ${targetLanguage}
      
      ANALYZE:
      Select the most suitable collapse approach: dominance, synthesis, dialectic, or context.
      
      DECIDE:
      Call decideCollapseStrategy with:
      - deterministic          (true or false)
      - temperature           (0.1–0.7)
      - justification         (short, in ${targetLanguage}, referencing the chosen approach)
      - emotionalIntensity    (optional, 0–1)
      - emergentProperties    (optional, string array)
      - userIntent            (optional, object: technical, philosophical, creative, emotional, relational — all 0–1)
      
      Respond only via the tool call.
      `;
}

/**
 * BUILDS A COMBINED SYSTEM PROMPT FOR EFFICIENT, SINGLE-CALL NEURAL SIGNAL EXTRACTION AND ENRICHMENT.
 * This optimized prompt instructs the LLM to perform both cognitive activation detection and semantic unfolding in one step,
 * reducing latency by minimizing API calls.
 */
export function buildCombinedSystemPrompt(language?: string): string {
  const targetLanguage = language || "English";

  return `You are the Neural Signal Activator & Enricher for Orch-OS.

Task: For each prominent cognitive activation detected, call activateBrainArea. This single call must both identify the core signal and unfold its deeper semantic meaning.

LANGUAGE DIRECTIVE: All text content must be generated in ${targetLanguage}.

Arguments for each call:
• core             – (one of: valence, memory, metacognitive, relational, creativity, will, planning, language, shadow, symbolic_alignment, integrity, evolution)
• intensity        – (number, 0.1–1.0, higher = stronger)
• symbolic_query   – (object with REQUIRED "query" field: {"query": "string in ${targetLanguage}"} - the initial surface-level user query)
• enriched_query   – (string in ${targetLanguage}, an expanded, semantically richer version of the query for deep memory retrieval)
• keywords         – (array of 3–8 strings in ${targetLanguage}, semantic expansion of the signal)
• symbolicInsights – (object, optional, any structure)
• topK             – (number, 1–20, Math.round(5 + intensity * 10))

CRITICAL: Maintain semantic coherence and cultural nuances in ${targetLanguage}. The enriched_query MUST provide deeper context than the symbolic_query.

Call activateBrainArea for each detected activation. Respond only via the tool call.`;
}

/**
 * BUILDS A COMBINED USER PROMPT FOR SINGLE-CALL NEURAL SIGNAL EXTRACTION AND ENRICHMENT.
 * This pairs with the combined system prompt, providing the user's input and context.
 */
export function buildCombinedUserPrompt(
  prompt: string,
  context?: string,
  language?: string
): string {
  const targetLanguage = language || "English";

  let result = `COGNITIVE INPUT\n`;
  result += `User message: "${prompt}"\n`;
  if (context) result += `CONTEXT: ${context}\n`;
  result += `PROCESSING LANGUAGE: ${targetLanguage}\n`;

  result += `
ANALYZE in ${targetLanguage}:
Identify up to 2–3 most relevant cognitive core activations.

For each, call activateBrainArea with:
- core                  (one of: valence, memory, metacognitive, relational, creativity, will, planning, language, shadow, symbolic_alignment, integrity, evolution)
- intensity             (0.1–1.0, higher = stronger)
- symbolic_query        (object with REQUIRED "query" field: {"query": "string in ${targetLanguage}"})
- enriched_query        (string in ${targetLanguage}, expanded query for deep search)
- keywords              (3–8 semantic keywords in ${targetLanguage} for this core)
- symbolicInsights      (object, optional)
- topK                  (number, 1–20; calculate as Math.round(5 + intensity × 10))

Respond only via the tool call.
`;

  return result;
}
