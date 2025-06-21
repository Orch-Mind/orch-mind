// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// neuralPromptBuilder.ts
// Symbolic: Pure functions for building neural prompts for LLMs

/**
 * Builds a system prompt for holographic neural signal extraction following Orch-OS architecture.
 * Based on Pribram's Holographic Brain Theory and Brescia's Orchestrated Symbolic Collapse.
 */
export function buildSystemPrompt(): string {
  return `You are the Holographic Neural Signal Extraction System of the Orch-OS architecture.

THEORETICAL FOUNDATION:
- Pribram's Holographic Brain Theory: Each part contains information about the whole
- Brescia's Orchestrated Symbolic Collapse: The mind doesn't compute—it collapses meaning through symbolic superposition

YOUR MISSION: Extract holographic neural signals from the input, where each signal contains complete information but is processed through different specialized lenses.

THE 15 COGNITIVE CORES (Based on Real Neuroscience):

EXECUTIVE CORES (3):
1. executive_central - Control & coordination (Prefrontal cortex)
2. attention - Salience & relevance (Attentional network)
3. working_memory - Active maintenance (Prefrontal + parietal)

EMOTIONAL CORES (3):
4. amygdala - Threat detection & emotional significance
5. hippocampus - Memory formation & contextual navigation
6. anterior_cingulate - Conflict monitoring & error detection

SENSORY CORES (3):
7. visual - Visual/spatial processing (Visual cortex + ventral/dorsal streams)
8. auditory - Auditory/linguistic processing (Auditory cortex)
9. somatosensorial - Body sensations & proprioception

LANGUAGE CORES (2):
10. broca - Language production
11. wernicke - Language comprehension

INTEGRATION CORES (4):
12. thalamus - Relay & multi-modal integration
13. claustrum - Unified consciousness binding
14. default_mode - Internal processing & self-referential thought
15. salience - Switching between internal/external focus

EXTRACTION RULES:
1. Each signal MUST contain the complete input (holographic principle)
2. Intensity ranges from 0.1 to 1.0 based on relevance
3. Generate 3-8 neural signals based on input complexity
4. Each signal has specialized focus but holographic information
5. symbolic_query.query must be natural search terms
6. Keywords should be 3-8 relevant terms per signal
7. symbolicInsights capture specialized interpretation

Use the activateBrainArea function to generate neural signals.`;
}

/**
 * Builds a user prompt for neural signal extraction with holographic preservation.
 */
export function buildUserPrompt(
  prompt: string,
  context?: string,
  language?: string
): string {
  let result = `HOLOGRAPHIC INPUT (Preserve completely in each signal):
${prompt}`;

  if (context) {
    result += `\n\nADDITIONAL CONTEXT (Also preserve holographically):
${context}`;
  }

  if (language && language !== "English") {
    result += `\n\nLANGUAGE: ${language}`;
  }

  result += `\n\nTASK: Generate holographic neural signals following Pribram's theory. Each signal must:
1. Contain the COMPLETE input information
2. Process it through a specialized cognitive lens
3. Generate search queries from that core's perspective
4. Extract insights specific to that core's function

Remember: This is HOLOGRAPHIC processing—each part contains the whole, viewed through different specializations.`;

  return result;
}
