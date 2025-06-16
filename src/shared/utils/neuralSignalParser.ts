// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// neuralSignalParser.ts
// Symbolic: Pure functions for parsing neural signals from model output
import { NeuralSignal } from '../../components/context/deepgram/interfaces/neural/NeuralSignalTypes';

/**
 * Attempts to parse a string as a NeuralSignal JSON object.
 * Returns undefined if parsing fails or required fields are missing.
 */
export function parseNeuralSignal(json: string): NeuralSignal | undefined {
  try {
    const args = JSON.parse(json);
    if (args.core || args.query || args.intensity) {
      const baseSignal: Partial<NeuralSignal> = {
        core: args.core || null,
        intensity: Math.max(0, Math.min(1, args.intensity ?? 0.5)),
        symbolic_query: { query: args.query ?? '' }
      };
      if (Array.isArray(args.keywords)) baseSignal.keywords = args.keywords;
      if (args.filters) baseSignal.filters = args.filters;
      if (typeof args.expand === 'boolean') baseSignal.expand = args.expand;
      if (args.symbolicInsights) baseSignal.symbolicInsights = args.symbolicInsights;
      if (typeof args.topK !== 'undefined') baseSignal.topK = args.topK;
      if (typeof baseSignal.core !== 'undefined') return baseSignal as NeuralSignal;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Extracts all JSON-like objects (or JSON code blocks) from a string.
 * Accepts objects that appear anywhere in the text, including inside ```json``` blocks.
 */
export function extractNeuralSignalJsons(text: string): string[] {
  const matches: string[] = [];

  if (!text || typeof text !== 'string') return matches;

  // 1. Capture fenced ```json``` blocks
  const codeBlockRegex = /```(?:json)?[\s\n]*([\s\S]*?)```/gi;
  let codeMatch: RegExpExecArray | null;
  while ((codeMatch = codeBlockRegex.exec(text)) !== null) {
    if (codeMatch[1]) {
      matches.push(codeMatch[1].trim());
    }
  }

  // 2. Capture standalone JSON objects { ... } that may appear outside blocks
  //    This regex is intentionally simple; deeper validation is performed during JSON.parse.
  const objectRegex = /\{[^\{\}]*\}/g;
  const objectMatches = text.match(objectRegex);
  if (objectMatches) {
    matches.push(...objectMatches.map((m) => m.trim()));
  }

  return matches;
}
