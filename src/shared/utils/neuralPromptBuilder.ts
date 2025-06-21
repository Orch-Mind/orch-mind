// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// neuralPromptBuilder.ts
// Symbolic: Pure functions for building neural prompts for LLMs

/**
 * Builds a system prompt for neural signal extraction.
 */
export function buildSystemPrompt(): string {
  return `Analyze user input and activate relevant cognitive areas using the activateBrainArea function.
Areas: memory, valence, metacognitive, language, planning, unconscious, archetype, shadow, body, social, self, creativity, intuition, will.

Rules:
- Use the activateBrainArea function to respond
- intensity: 0.1-1.0
- symbolic_query must have a 'query' field
- keywords: 3-8 relevant terms
- Query should be natural search terms`;
}

/**
 * Builds a user prompt for neural signal extraction.
 */
export function buildUserPrompt(
  prompt: string,
  context?: string,
  language?: string
): string {
  let result = `USER INPUT: ${prompt}`;
  if (context) {
    result += `\nADDITIONAL CONTEXT: ${context}`;
  }
  if (language && language !== "English") {
    result += `\nRESPOND IN: ${language}`;
  }
  return result;
}
