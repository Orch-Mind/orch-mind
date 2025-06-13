// SPDX-License-Identifier: MIT OR Apache-2.0
// Utility helpers for HuggingFace tools conversion / parsing
// Centralizes logic so every service uses the same code path.

export interface GenericToolDefinition {
  type?: string;
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

export interface HuggingFaceToolDefinition {
  type: string;
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

/**
 * Convert generic tool definitions (possibly from OpenAI style) into the
 * structure expected by HuggingFace function-calling prompt templates.
 * Guarantees the presence of the "type" field (defaults to "function").
 */
export function toHuggingFaceTools(
  tools: GenericToolDefinition[] | undefined | null
): HuggingFaceToolDefinition[] {
  if (!Array.isArray(tools) || tools.length === 0) return [];
  return tools.map((tool) => ({
    type: tool.type || "function",
    function: {
      name: tool.function.name,
      description: tool.function.description ?? "",
      parameters: tool.function.parameters ?? {},
    },
  }));
}

// ------------ Parsing Helpers ---------------

export interface ParsedToolCall {
  function: {
    name: string;
    arguments: string;
  };
}

function tryParseJSON(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Extracts tool calls from model output text or JSON. It looks for JSON code
 * blocks or inline JSON objects and returns them as ParsedToolCall[]
 */
export function extractToolCalls(output: string): ParsedToolCall[] {
  const toolCalls: ParsedToolCall[] = [];

  if (!output) return toolCalls;

  const jsonBlockRegex = /```json([\s\S]*?)```/gi;
  const jsonSnippetRegex = /\{[\s\S]*?\}/g; // naive but works for simple outputs

  const candidates: string[] = [];

  // Collect fenced JSON blocks
  let match: RegExpExecArray | null;
  while ((match = jsonBlockRegex.exec(output)) !== null) {
    candidates.push(match[1]);
  }

  // Collect inline snippets
  const inline = output.match(jsonSnippetRegex);
  if (inline) candidates.push(...inline);

  for (const snippet of candidates) {
    const parsed = tryParseJSON(snippet);
    if (!parsed) continue;

    // Support both direct function format and wrapper with .function
    if (parsed && (parsed.name || parsed.function?.name)) {
      const name = parsed.function?.name || parsed.name;
      const args = parsed.function?.arguments || parsed.arguments || {};
      toolCalls.push({
        function: {
          name: String(name),
          arguments: typeof args === "string" ? args : JSON.stringify(args),
        },
      });
    }
  }

  return toolCalls;
}
