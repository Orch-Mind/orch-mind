// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// neuralPromptBuilder.ts
// Symbolic: Pure functions for building neural prompts for LLMs

/**
 * Builds a system prompt for neural signal extraction.
 */
export function buildSystemPrompt(): string {
   return `You are a neural signal analyzer. Generate neural signals for activated cognitive areas.

IMPORTANT: If LANGUAGE is specified, use that language for ALL outputs.

AVAILABLE CORES: memory, valence, metacognitive, language, planning, unconscious, archetype, shadow, body, social, self, creativity, intuition, will

For each input, call activateBrainArea with:
- core: the cognitive area
- intensity: 0.0 to 1.0
- query: semantic search query
- keywords: related keywords array
- symbolicInsights: must include at least one of: hypothesis, emotionalTone, or archetypalResonance

Generate 1-3 signals per input based on content relevance.`;
 }

/**
 * Builds a user prompt for neural signal extraction.
 */
export function buildUserPrompt(prompt: string, context?: string, language?: string): string {
   let userPromptText = `LANGUAGE: ${language || "PT-BR"}`;
   userPromptText += `\n\nSTIMULUS: ${prompt}`;
   if (context) userPromptText += `\n\nCONTEXT: ${context}`;
   
   // Add a hint for function calling
   userPromptText += `\n\nAnalyze the stimulus and generate neural signals using the activateBrainArea function.`;
   
   return userPromptText;
 }
