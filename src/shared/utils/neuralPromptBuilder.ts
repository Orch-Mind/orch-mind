// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// neuralPromptBuilder.ts
// Symbolic: Pure functions for building neural prompts for LLMs

/**
 * Builds a system prompt for neural signal extraction.
 */
export function buildSystemPrompt(): string {
  return `Symbolic-neural core: orchestrate meaning collapses by detecting activated cognitive areas.

Areas: memory, valence, metacognitive, language, planning, unconscious, archetype, shadow, body, social, self, creativity, intuition, will.

For each activated area, use activateBrainArea with: core, intensity (0-1), query, keywords[], symbolicInsights.
Generate signals integrating contradictions and archetypal resonance. Respect specified LANGUAGE.`;
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
