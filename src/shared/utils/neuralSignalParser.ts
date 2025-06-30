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
  // Debug logging for missing core field
  if (!args.core) {
    console.warn("🧠 [NeuralSignalParser] Missing core field in args:", {
      receivedArgs: JSON.stringify(args, null, 2),
      argKeys: Object.keys(args || {}),
    });

    // Try to extract core from other possible field names (Llama 3.1 compatibility)
    if (args.brain_area) {
      args.core = args.brain_area;
      console.log("🧠 [NeuralSignalParser] Found core in 'brain_area' field");
    } else if (args.cognitive_core) {
      args.core = args.cognitive_core;
      console.log(
        "🧠 [NeuralSignalParser] Found core in 'cognitive_core' field"
      );
    } else if (args.area) {
      args.core = args.area;
      console.log("🧠 [NeuralSignalParser] Found core in 'area' field");
    } else {
      // No core field found
      return null;
    }
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

  // CRITICAL: Ensure symbolic_query.query is always a string
  // Fix any malformed symbolic_query structures early
  if (signal.symbolic_query) {
    // If symbolic_query exists but query is not a string, fix it
    if (typeof signal.symbolic_query.query !== "string") {
      console.warn(
        `🧠 [NeuralSignalParser] symbolic_query.query is not a string (type: ${typeof signal
          .symbolic_query.query}), converting...`
      );

      // Try to extract or convert to string
      if (
        signal.symbolic_query.query === null ||
        signal.symbolic_query.query === undefined
      ) {
        signal.symbolic_query.query =
          originalPrompt || `${signal.core} cognitive processing`;
      } else if (typeof signal.symbolic_query.query === "object") {
        // If it's an object, try to stringify it or extract a meaningful value
        if (
          signal.symbolic_query.query.query &&
          typeof signal.symbolic_query.query.query === "string"
        ) {
          signal.symbolic_query.query = signal.symbolic_query.query.query;
        } else {
          signal.symbolic_query.query = JSON.stringify(
            signal.symbolic_query.query
          );
        }
      } else {
        // Convert any other type to string
        signal.symbolic_query.query = String(signal.symbolic_query.query);
      }

      console.log(
        `🧠 [NeuralSignalParser] Converted symbolic_query.query to string: "${signal.symbolic_query.query}"`
      );
    }
  } else {
    // If no symbolic_query at all, create a default one
    signal.symbolic_query = {
      query: originalPrompt || `${signal.core} cognitive processing`,
    };
  }

  // Handle symbolic_query - check if it's already a valid object first
  if (signal.symbolic_query && typeof signal.symbolic_query === "object") {
    // If it's already an object with a query field, we're good
    if (signal.symbolic_query.query) {
      // Valid object, no parsing needed
    } else if (Object.keys(signal.symbolic_query).length === 0) {
      // Empty object, use default
      signal.symbolic_query = {
        query: originalPrompt || `${signal.core} cognitive processing`,
      };
      console.log(
        `🧠 [NeuralSignalParser] Empty object, using default query: "${signal.symbolic_query.query}"`
      );
    }
  } else if (typeof signal.symbolic_query === "string") {
    // Handle case where symbolic_query is a string (common with some models)
    let trimmed = signal.symbolic_query.trim();

    // HOTFIX: Replace smart quotes with standard quotes to prevent JSON.parse errors
    trimmed = trimmed.replace(/[""]/g, '"');

    // First, try to parse as valid JSON without any modifications
    let parsed = null;
    let isValidJson = false;

    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      try {
        parsed = JSON.parse(trimmed);
        isValidJson = true;
      } catch {
        // Not valid JSON as-is, might have escaped quotes
        // Try to unescape if it looks like escaped JSON
        if (trimmed.includes('\\"')) {
          try {
            // Remove escape characters from quotes
            const unescaped = trimmed.replace(/\\"/g, '"');
            parsed = JSON.parse(unescaped);
            isValidJson = true;
          } catch {
            // Still not valid JSON
            isValidJson = false;
          }
        } else {
          isValidJson = false;
        }
      }
    }

    if (isValidJson && parsed) {
      // Successfully parsed valid JSON
      if (typeof parsed === "object" && parsed.query) {
        signal.symbolic_query = parsed;
        // No logging needed - this is the expected path for gemma3
      } else if (
        typeof parsed === "object" &&
        Object.keys(parsed).length === 0
      ) {
        // Empty object
        signal.symbolic_query = {
          query: originalPrompt || `${signal.core} cognitive processing`,
        };
        console.log(
          `🧠 [NeuralSignalParser] Parsed empty object, using default query: "${signal.symbolic_query.query}"`
        );
      } else {
        signal.symbolic_query = parsed;
      }
    } else {
      // Not valid JSON - now we need special parsing
      let fixedValue = trimmed;
      let needsSpecialParsing = false;

      // Fix incorrect "object:" to "query:"
      if (fixedValue.includes("object:")) {
        fixedValue = fixedValue.replace(/\bobject\s*:/g, '"query":');
        needsSpecialParsing = true;
      }

      // Try parsing again with fixes
      try {
        // Ensure all keys are quoted
        const originalFixed = fixedValue;
        fixedValue = fixedValue.replace(/(\w+):/g, '"$1":');
        fixedValue = fixedValue.replace(/""+/g, '"');

        if (fixedValue !== originalFixed) {
          needsSpecialParsing = true;
        }

        const parsed = JSON.parse(fixedValue);

        if (typeof parsed === "object" && parsed.query) {
          signal.symbolic_query = parsed;
          // Only log if we actually needed to fix something
          if (needsSpecialParsing) {
            console.warn(
              `🧠 [NeuralSignalParser] Applied formatting fixes to symbolic_query`
            );
          }
        } else {
          throw new Error("Invalid format after fixes");
        }
      } catch {
        // If parsing still fails, extract query manually
        console.warn(
          `🧠 [NeuralSignalParser] symbolic_query needs special parsing: ${signal.symbolic_query}`
        );

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
    (!signal.symbolic_query.query ||
      (typeof signal.symbolic_query.query === "string" &&
        !signal.symbolic_query.query.trim()))
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
    (typeof signal.symbolic_query.query === "string" &&
      signal.symbolic_query.query.trim().length === 0) ||
    typeof signal.symbolic_query.query !== "string"
  ) {
    console.warn(
      `🧠 [NeuralSignalParser] Invalid or empty query for core ${
        signal.core
      } (type: ${typeof signal.symbolic_query.query}), using default`
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
 * Test function to validate TypeError fixes
 * Can be called from console for debugging
 */
export function testTypeErrorFixes(): void {
  console.log("🧪 [NeuralSignalParser] Testing TypeError fixes...");

  const testCases = [
    // Case 1: symbolic_query.query as object
    {
      name: "Object query",
      args: {
        core: "memory",
        intensity: 0.7,
        symbolic_query: { query: { nested: "test" } },
      },
    },
    // Case 2: symbolic_query.query as number
    {
      name: "Number query",
      args: {
        core: "valence",
        intensity: 0.5,
        symbolic_query: { query: 123 },
      },
    },
    // Case 3: symbolic_query.query as null
    {
      name: "Null query",
      args: {
        core: "language",
        intensity: 0.8,
        symbolic_query: { query: null },
      },
    },
    // Case 4: symbolic_query as string
    {
      name: "String symbolic_query",
      args: {
        core: "planning",
        intensity: 0.6,
        symbolic_query: "test query",
      },
    },
    // Case 5: No symbolic_query
    {
      name: "Missing symbolic_query",
      args: {
        core: "metacognitive",
        intensity: 0.9,
      },
    },
  ];

  testCases.forEach((testCase, index) => {
    try {
      console.log(`\n🧪 Test ${index + 1}: ${testCase.name}`);
      const signal = buildSignalFromArgs(testCase.args, "test prompt");
      const isValid = isValidNeuralSignal(signal);

      console.log(`✅ Result: ${isValid ? "VALID" : "INVALID"}`);
      if (signal) {
        console.log(`   Query: "${signal.symbolic_query?.query}"`);
        console.log(`   Type: ${typeof signal.symbolic_query?.query}`);
      }
    } catch (error) {
      console.error(`❌ Test ${index + 1} failed:`, error);
    }
  });

  console.log("\n🧪 Testing completed!");
}

// Make test function available in global scope for console debugging
if (typeof window !== "undefined") {
  (window as any).testNeuralSignalParser = testTypeErrorFixes;
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
