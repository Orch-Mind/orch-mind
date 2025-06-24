// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// neuralSignalParser.ts
// Symbolic: Pure functions for parsing neural signals from model output
import { NeuralSignal } from "../../components/context/deepgram/interfaces/neural/NeuralSignalTypes";

/**
 * Centralizes the construction of neural signals from parsed arguments
 * Ensures consistent validation and normalization across all services
 */
export function buildSignalFromArgs(
  args: any,
  originalPrompt?: string
): NeuralSignal | null {
  // Validate required fields
  if (!args.core) {
    console.warn("🧠 [NeuralSignalParser] Missing core field in args");
    return null;
  }

  // Initialize signal with defaults
  const signal: any = {
    core: args.core,
    intensity: Math.max(0.3, Math.min(1, args.intensity ?? 0.5)),
    symbolic_query: args.symbolic_query || {
      query: originalPrompt || "analyze user input",
    },
    keywords: Array.isArray(args.keywords) ? args.keywords : [],
    topK: args.topK,
    symbolicInsights: args.symbolicInsights,
  };

  // Handle case where symbolic_query is a string (common with gemma3 and other models)
  if (typeof signal.symbolic_query === "string") {
    // Try to parse it as JSON first
    try {
      // Try direct parse first (for clean JSON strings like gemma3)
      const parsed = JSON.parse(signal.symbolic_query);

      // Check if parsed result is valid
      if (typeof parsed === "object" && parsed.query) {
        signal.symbolic_query = parsed;
        // Success - no need to log, this is expected behavior for gemma3
      } else if (
        typeof parsed === "object" &&
        (!parsed.query || Object.keys(parsed).length === 0)
      ) {
        // Empty object or missing query
        signal.symbolic_query = {
          query: originalPrompt || `${signal.core} cognitive processing`,
        };
        console.log(
          `🧠 [NeuralSignalParser] Parsed empty object, using default query: "${signal.symbolic_query.query}"`
        );
      } else {
        signal.symbolic_query = parsed;
      }
    } catch {
      // Only log if we need to do special parsing
      console.warn(
        `🧠 [NeuralSignalParser] symbolic_query needs special parsing: ${signal.symbolic_query}`
      );

      // Try to fix common formatting issues
      let fixedValue = signal.symbolic_query;

      // Fix incorrect "object:" to "query:"
      if (fixedValue.includes("object:")) {
        fixedValue = fixedValue.replace(/\bobject\s*:/g, '"query":');
      }

      // Try parsing again with fixes
      try {
        // Ensure all keys are quoted
        fixedValue = fixedValue.replace(/(\w+):/g, '"$1":');
        fixedValue = fixedValue.replace(/""+/g, '"');

        const parsed = JSON.parse(fixedValue);

        if (typeof parsed === "object" && parsed.query) {
          signal.symbolic_query = parsed;
        } else {
          throw new Error("Invalid format after fixes");
        }
      } catch {
        // If parsing still fails, extract query manually
        const queryMatch = signal.symbolic_query.match(
          /(?:object|query)\s*:\s*"([^"]+)"/
        );
        if (queryMatch) {
          signal.symbolic_query = { query: queryMatch[1] };
        } else {
          // Last resort: use the original prompt or default
          signal.symbolic_query = {
            query: originalPrompt || `${signal.core} cognitive processing`,
          };
        }
      }
    }
  }

  // Handle both old and new formats for symbolic_query
  if (args.query && !signal.symbolic_query.query) {
    signal.symbolic_query = { query: args.query };
  }

  // Handle case where symbolic_query has 'type' instead of 'query' (llama3.1 issue)
  if (
    signal.symbolic_query &&
    typeof signal.symbolic_query === "object" &&
    !signal.symbolic_query.query
  ) {
    // Check if it has a 'type' field instead
    if (signal.symbolic_query.type) {
      // Use the type as part of the query construction
      signal.symbolic_query.query =
        originalPrompt ||
        `${signal.symbolic_query.type} about ${signal.core}` ||
        `${signal.core} cognitive processing`;
      console.log(
        `🧠 [NeuralSignalParser] Found 'type' instead of 'query', constructing query: "${signal.symbolic_query.query}"`
      );
    } else if (signal.keywords && signal.keywords.length > 0) {
      // Use keywords as fallback
      signal.symbolic_query.query = signal.keywords.join(" ");
    }
  }

  // Ensure symbolic_query has a query field
  if (!signal.symbolic_query.query && signal.keywords.length > 0) {
    signal.symbolic_query.query = signal.keywords.join(" ");
  }

  // CRITICAL FIX: Ensure symbolic_query.query is never empty
  // Check if symbolic_query exists but query is empty or just whitespace
  if (
    signal.symbolic_query &&
    (!signal.symbolic_query.query || !signal.symbolic_query.query.trim())
  ) {
    // Use originalPrompt as fallback
    signal.symbolic_query.query =
      originalPrompt || `${signal.core} activation for user input`;
    console.log(
      `🧠 [NeuralSignalParser] Fixed empty query for core ${signal.core}, using: "${signal.symbolic_query.query}"`
    );
  }

  // Additional validation to ensure we always have a non-empty query
  if (
    !signal.symbolic_query.query ||
    signal.symbolic_query.query.trim().length === 0
  ) {
    console.warn(
      `🧠 [NeuralSignalParser] Still empty query after fixes for core ${signal.core}, using default`
    );
    signal.symbolic_query.query = `${signal.core} cognitive processing`;
  }

  // Calculate topK if not provided
  if (typeof signal.topK !== "number" || isNaN(signal.topK)) {
    signal.topK = Math.round(5 + (signal.intensity || 0.5) * 10);
  }

  // Add optional fields if present
  if (args.filters) signal.filters = args.filters;
  if (args.valence) signal.valence = args.valence;
  if (typeof args.expand === "boolean") signal.expand = args.expand;

  return signal;
}

/**
 * Validates a neural signal object
 * Returns true if the signal has all required fields with valid values
 */
export function isValidNeuralSignal(signal: any): signal is NeuralSignal {
  return (
    signal &&
    typeof signal.core === "string" &&
    signal.core.length > 0 &&
    typeof signal.intensity === "number" &&
    signal.intensity >= 0 &&
    signal.intensity <= 1 &&
    signal.symbolic_query &&
    typeof signal.symbolic_query.query === "string" &&
    signal.symbolic_query.query.trim().length > 0
  );
}

/**
 * Attempts to parse a string as a NeuralSignal JSON object.
 * Returns undefined if parsing fails or required fields are missing.
 */
export function parseNeuralSignal(json: string): NeuralSignal | undefined {
  try {
    const args = JSON.parse(json);
    const signal = buildSignalFromArgs(args);
    return signal && isValidNeuralSignal(signal) ? signal : undefined;
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

  if (!text || typeof text !== "string") return matches;

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
