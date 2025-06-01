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
 * Extracts all JSON-like objects from a string (for multiple signals in one output).
 */
export function extractNeuralSignalJsons(text: string): string[] {
  return text.match(/\{[\s\S]*?\}(?=\s*$)/g) || [];
}
