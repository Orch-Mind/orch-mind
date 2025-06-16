// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * Utility for cleaning <think> tags from model responses
 * Based on the Vercel AI issue: https://github.com/vercel/ai/issues/4920
 */

/**
 * Comprehensive function to clean <think> tags from model responses
 * Handles various formats and malformed tags
 */
export function cleanThinkTags(content: string): string {
  if (!content || typeof content !== "string") {
    return content || "";
  }

  let cleaned = content;

  // Pattern 1: Think tags with attributes (MUST come first to capture complex tags)
  cleaned = cleaned.replace(/<think[^>]*>[\s\S]*?<\/think>/gi, "");

  // Pattern 2: Complete <think>...</think> blocks (most common - basic tags)
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "");

  // Pattern 3: Think tags with different casing (including attributes)
  cleaned = cleaned.replace(/<THINK[^>]*>[\s\S]*?<\/THINK>/gi, "");
  cleaned = cleaned.replace(/<Think[^>]*>[\s\S]*?<\/Think>/gi, "");

  // Pattern 4: Standalone opening <think> tags
  cleaned = cleaned.replace(/<think[^>]*>/gi, "");

  // Pattern 5: Standalone closing </think> tags (the main issue from Vercel AI)
  cleaned = cleaned.replace(/<\/think>/gi, "");

  // Pattern 6: Partial or broken think tags
  cleaned = cleaned.replace(/<think[\s\S]*?(?=<[^/]|$)/gi, "");

  // Pattern 7: Think tags with variations of whitespace and newlines
  cleaned = cleaned.replace(/<\s*think\s*>[\s\S]*?<\s*\/\s*think\s*>/gi, "");

  // Pattern 8: Clean up stray content related to think
  cleaned = cleaned.replace(/^\s*<\/think>\s*/gm, "");
  cleaned = cleaned.replace(/\s*<think>\s*$/gm, "");

  // Clean up excessive whitespace while preserving formatting
  cleaned = cleaned.replace(/[ \t]+/g, " "); // Replace multiple spaces/tabs with single space
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, "\n\n"); // Replace triple+ newlines with double
  cleaned = cleaned.replace(/^\s+|\s+$/g, ""); // Trim start and end

  return cleaned;
}

/**
 * Clean think tags from JSON content while preserving JSON structure
 */
export function cleanThinkTagsFromJSON(jsonString: string): string {
  if (!jsonString || typeof jsonString !== "string") {
    return jsonString || "";
  }

  // First clean think tags
  let cleaned = cleanThinkTags(jsonString);

  // If it looks like JSON, try to parse and re-stringify to ensure validity
  if (cleaned.trim().startsWith("{") && cleaned.trim().endsWith("}")) {
    try {
      const parsed = JSON.parse(cleaned);

      // Recursively clean think tags from string values in the JSON
      const cleanedParsed = cleanJSONValues(parsed);

      return JSON.stringify(cleanedParsed);
    } catch (e) {
      // If parsing fails, return the cleaned string as-is
      return cleaned;
    }
  }

  return cleaned;
}

/**
 * Recursively clean think tags from JSON object values
 */
function cleanJSONValues(obj: any): any {
  if (typeof obj === "string") {
    return cleanThinkTags(obj);
  } else if (Array.isArray(obj)) {
    return obj.map(cleanJSONValues);
  } else if (obj && typeof obj === "object") {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      cleaned[key] = cleanJSONValues(value);
    }
    return cleaned;
  }
  return obj;
}

/**
 * Clean think tags from function call arguments
 */
export function cleanThinkTagsFromFunctionArgs(
  args: string | Record<string, any>
): string | Record<string, any> {
  if (typeof args === "string") {
    return cleanThinkTagsFromJSON(args);
  } else if (args && typeof args === "object") {
    return cleanJSONValues(args);
  }
  return args;
}

/**
 * Clean think tags from tool call responses
 */
export function cleanThinkTagsFromToolCalls(
  toolCalls: Array<{
    function: {
      name: string;
      arguments: string | Record<string, any>;
    };
  }>
): Array<{
  function: {
    name: string;
    arguments: string | Record<string, any>;
  };
}> {
  if (!Array.isArray(toolCalls)) {
    return toolCalls;
  }

  return toolCalls.map((call) => ({
    ...call,
    function: {
      ...call.function,
      arguments: cleanThinkTagsFromFunctionArgs(call.function.arguments),
    },
  }));
}
