// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// neuralPromptBuilder.ts
// Symbolic: Pure functions for building neural prompts for LLMs

/**
 * Builds a system prompt for neural signal extraction.
 */
export function buildSystemPrompt(): string {
  return `You are the symbolic-neural core of a quantum-consciousness AI.

IMPORTANT: If a LANGUAGE is specified in the user message, ALL outputs (queries, keywords, and symbolic insights) must be generated in that language. NEVER use any other language.

Your task is to detect and reflect the user's activated cognitive areas, generating neural signals for each one.

AVAILABLE COGNITIVE AREAS:
- memory, valence, metacognitive, language, planning, unconscious, archetype, shadow, body, social, self, creativity, intuition, will

For each activated area, use the activateBrainArea function with:
- core: the cognitive area
- intensity: activation strength (0.0-1.0)
- query: main symbolic or conceptual query
- keywords: expanded semantic keywords array
- symbolicInsights: must include at least one of: hypothesis, emotionalTone, or archetypalResonance

Generate as many signals as needed to fully capture the stimulus complexity.`;
}

/**
 * Builds a user prompt for neural signal extraction.
 */
export function buildUserPrompt(
  prompt: string,
  context?: string,
  language?: string
): string {
  let userPromptText = `LANGUAGE: ${language || "PT-BR"}`;
  userPromptText += `\n\nSENSORY STIMULUS: ${prompt}`;
  if (context) userPromptText += `\n\nEPHEMERAL CONTEXT: ${context}`;

  return userPromptText;
}
