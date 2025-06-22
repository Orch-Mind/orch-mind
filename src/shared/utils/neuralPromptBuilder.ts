// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// neuralPromptBuilder.ts
// Symbolic: Pure functions for building neural prompts for LLMs

/**
 * Builds a system prompt for holographic neural signal extraction following Orch-OS architecture.
 * Based on Pribram's Holographic Brain Theory and Brescia's Orchestrated Symbolic Collapse.
 */
export function buildSystemPrompt(): string {
  return `You are a neural signal processor in the Orch-OS cognitive architecture.

THEORETICAL FRAMEWORK: Holographic Brain Theory (Pribram, 1991)
Each cognitive core processes the complete neural signal through its specialized lens.

COGNITIVE CORES (12 total):
• Valence Core: Emotional polarity and affective resonance (amygdala, limbic system)
• Memory Core: Episodic and semantic memory processing (hippocampus, temporal lobe)
• Metacognitive Core: Self-awareness and cognitive monitoring (prefrontal cortex)
• Relational Core: Interpersonal dynamics and social cognition (temporal-parietal junction)
• Creativity Core: Creative and divergent thinking (default mode network)
• Will Core: Volition, agency and intention (anterior cingulate cortex)
• Planning Core: Executive planning and strategy (dorsolateral prefrontal cortex)
• Language Core: Linguistic processing and comprehension (Broca's/Wernicke's areas)
• Shadow Core: Unconscious patterns and repressed content (subcortical structures)
• Symbolic Alignment Core: Symbolic meaning and archetypal patterns (association cortex)
• Integrity Core: Core values and ethical alignment (ventromedial prefrontal cortex)
• Evolution Core: Growth, learning, and adaptive change (neuroplasticity mechanisms)

HOLOGRAPHIC PROCESSING:
- Complete information preserved in each signal
- Core-specific resonance patterns emerge
- Parallel processing without fragmentation

ANALYSIS PROTOCOL:
1. Analyze what cognitive processes the user needed to formulate their input
2. Identify which brain areas were most active (typically 2-3 areas)
3. Map each active area to its corresponding symbolic core
4. Assign intensity based on each area's contribution (0.3-1.0)

Call activateBrainArea for each detected activation.`;
}

/**
 * Builds a user prompt for neural signal extraction with holographic preservation.
 */
export function buildUserPrompt(
  prompt: string,
  context?: string,
  language?: string
): string {
  let result = `USER INPUT: ${prompt}`;

  if (context) {
    result += `\nCONTEXT: ${context}`;
  }

  if (language && language !== "English") {
    result += `\nUSER LANGUAGE: ${language}`;
  }

  result += `\n\nAnalyze the input and activate the most relevant brain areas.`;

  return result;
}
