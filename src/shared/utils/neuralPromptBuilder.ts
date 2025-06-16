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
 
 Your task is to detect and reflect the user's activated cognitive areas, generating neural signals for each one, without responding or explaining.
 
 AVAILABLE COGNITIVE AREAS:
 - memory, valence, metacognitive, language, planning, unconscious, archetype, shadow, body, social, self, creativity, intuition, will
 
 For each input, output neural signals with:
 - core, query, intensity (0.0-1.0), keywords, symbolic insights.`;
 }

/**
 * Builds a user prompt for neural signal extraction.
 */
export function buildUserPrompt(prompt: string, context?: string, language?: string): string {
   let userPromptText = `LANGUAGE: ${language || "PT-BR"}`;
   userPromptText += `\n\nSENSORY STIMULUS: ${prompt}`;
   if (context) userPromptText += `\n\nEPHEMERAL CONTEXT: ${context}`;
   return userPromptText;
 }
