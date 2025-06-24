// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * Parser para extrair tool calls de diferentes formatos
 * Alguns modelos podem retornar tool calls em formatos não padrão
 *
 * Modelos suportados:
 * - qwen3:latest, llama3.1:latest: tool_calls nativo (não precisa deste parser)
 * - mistral:latest: JSON array no content
 * - mistral-nemo:latest: formato [TOOL_CALLS]
 * - gemma3:latest: formato direto functionName(arg:value, ...)
 * - granite, outros: vários formatos alternativos
 */

export interface ToolCall {
  type: "function";
  function: {
    name: string;
    arguments: string | Record<string, any>;
  };
}

export interface ParsedToolCall {
  function: {
    name: string;
    arguments: string | Record<string, any>;
  };
}

export class OllamaToolCallParser {
  /**
   * Parse alternative tool call formats that some models return
   */
  static parseAlternativeFormats(content: string): any[] {
    const toolCalls: any[] = [];

    // Try [TOOL_CALLS] format (mistral-nemo)
    const toolCallsMatch = content.match(/\[TOOL_CALLS\]\[(.*?)\]$/s);
    if (toolCallsMatch) {
      try {
        const toolCallsContent = `[${toolCallsMatch[1]}]`;
        const parsed = JSON.parse(toolCallsContent);
        if (Array.isArray(parsed)) {
          return parsed.map((call) => ({
            function: {
              name: call.name,
              arguments:
                typeof call.arguments === "string"
                  ? call.arguments
                  : JSON.stringify(call.arguments),
            },
          }));
        }
      } catch (e) {
        console.warn("Failed to parse [TOOL_CALLS] format:", e);
      }
    }

    // Try JSON format (qwen3, some mistral versions)
    try {
      const parsed = JSON.parse(content);
      if (parsed.name && parsed.arguments) {
        return [
          {
            function: {
              name: parsed.name,
              arguments:
                typeof parsed.arguments === "string"
                  ? parsed.arguments
                  : JSON.stringify(parsed.arguments),
            },
          },
        ];
      }
      if (Array.isArray(parsed)) {
        return parsed.map((call) => ({
          function: {
            name: call.name || call.function,
            arguments:
              typeof call.arguments === "string"
                ? call.arguments
                : JSON.stringify(call.arguments || call.parameters),
          },
        }));
      }
    } catch (e) {
      // Not JSON format
    }

    // Try Python-like format
    const pythonMatch = content.match(/(\w+)\s*\((.*?)\)/gs);
    if (pythonMatch) {
      pythonMatch.forEach((match) => {
        const funcMatch = match.match(/(\w+)\s*\((.*)\)/s);
        if (funcMatch && funcMatch[1] === "activateBrainArea") {
          try {
            // Parse Python-like arguments
            const argsStr = funcMatch[2];
            const args = this.parsePythonArgs(argsStr);
            toolCalls.push({
              function: {
                name: funcMatch[1],
                arguments: JSON.stringify(args),
              },
            });
          } catch (e) {
            console.warn("Failed to parse Python-like format:", e);
          }
        }
      });
    }

    // Try XML format
    const xmlMatches = content.matchAll(
      /<tool_call>\s*<function>(\w+)<\/function>\s*<parameters>(.*?)<\/parameters>\s*<\/tool_call>/gs
    );
    for (const match of xmlMatches) {
      try {
        const args = JSON.parse(match[2]);
        toolCalls.push({
          function: {
            name: match[1],
            arguments: JSON.stringify(args),
          },
        });
      } catch (e) {
        console.warn("Failed to parse XML format:", e);
      }
    }

    return toolCalls;
  }

  /**
   * Check if the content might contain tool calls in alternative formats
   */
  static looksLikeToolCall(content: string): boolean {
    if (!content || typeof content !== "string") return false;

    const patterns = [
      /function_name\s*[:=]/i,
      /activateBrainArea\s*\(/i,
      /<tool_call>/i,
      /\[TOOL_CALLS\]/i, // Mistral-nemo format
      /{"name":\s*"activateBrainArea"/,
      /\bfunction:\s*activateBrainArea/i,
    ];

    return patterns.some((pattern) => pattern.test(content));
  }

  /**
   * Parse Python-style function arguments
   */
  private static parsePythonArgs(argsStr: string): any {
    const args: any = {};

    // Handle nested objects like symbolic_query
    const symbolicQueryMatch = argsStr.match(
      /symbolic_query\s*[:=]\s*\{([^}]+)\}/
    );
    if (symbolicQueryMatch) {
      const queryMatch = symbolicQueryMatch[1].match(
        /["']?query["']?\s*[:=]\s*["']([^"']+)["']/
      );
      if (queryMatch) {
        args.symbolic_query = { query: queryMatch[1] };
      }
      // Remove the symbolic_query part from argsStr for easier parsing of other args
      argsStr = argsStr.replace(/symbolic_query\s*[:=]\s*\{[^}]+\}/, "");
    }

    // Parse simple key:value pairs
    const simpleArgs = argsStr.matchAll(/(\w+)\s*[:=]\s*([^,{}]+)/g);
    for (const match of simpleArgs) {
      const key = match[1];
      let value = match[2].trim();

      // Skip if already parsed (like symbolic_query)
      if (key === "symbolic_query") continue;

      // Remove quotes
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      // Parse numbers
      if (!isNaN(Number(value))) {
        args[key] = Number(value);
      } else {
        args[key] = value;
      }
    }

    return args;
  }

  /**
   * Parse content to detect and extract tool calls in various formats
   * @param content The response content that may contain tool calls
   * @returns Array of parsed tool calls in standard format
   */
  parse(content: string): ToolCall[] {
    const toolCalls: ToolCall[] = [];

    if (!content || typeof content !== "string") {
      return toolCalls;
    }

    // Log content for debugging
    if (content.includes("activateBrainArea")) {
      console.log(
        "[OllamaToolCallParser] Content contains activateBrainArea, attempting to parse..."
      );
    }

    // Try each parsing strategy
    // 0. Try Markdown JSON format first (gemma3 uses ```tool blocks)
    const markdownFormat = this.parseMarkdownJSONFormat(content);
    if (markdownFormat.length > 0) {
      console.log(
        `[OllamaToolCallParser] Parsed ${markdownFormat.length} calls using Markdown JSON format`
      );
      return markdownFormat;
    }

    // 1. Try direct JSON array format (mistral:latest format)
    const jsonArrayFormat = this.parseJSONArrayFormat(content);
    if (jsonArrayFormat.length > 0) {
      console.log(
        `[OllamaToolCallParser] Parsed ${jsonArrayFormat.length} calls using JSON array format`
      );
      return jsonArrayFormat;
    }

    // 2. [TOOL_CALLS] format (mistral-nemo)
    const toolCallsFormat = this.parseToolCallsFormat(content);
    if (toolCallsFormat.length > 0) {
      console.log(
        `[OllamaToolCallParser] Parsed ${toolCallsFormat.length} calls using TOOL_CALLS format`
      );
      return toolCallsFormat;
    }

    // 3. Direct function call format: functionName(arg1:value1, arg2:value2)
    const directCallFormat = this.parseDirectCallFormat(content);
    if (directCallFormat.length > 0) {
      console.log(
        `[OllamaToolCallParser] Parsed ${directCallFormat.length} calls using direct call format`
      );
      return directCallFormat;
    }

    // 4. Python code format
    const pythonFormat = this.parsePythonFormat(content);
    if (pythonFormat.length > 0) {
      console.log(
        `[OllamaToolCallParser] Parsed ${pythonFormat.length} calls using Python format`
      );
      return pythonFormat;
    }

    // 5. XML format
    const xmlFormat = this.parseXMLFormat(content);
    if (xmlFormat.length > 0) {
      console.log(
        `[OllamaToolCallParser] Parsed ${xmlFormat.length} calls using XML format`
      );
      return xmlFormat;
    }

    console.log("[OllamaToolCallParser] No tool calls detected in any format");
    console.log(
      "[OllamaToolCallParser] Content preview:",
      content.substring(0, 200)
    );

    return toolCalls;
  }

  /**
   * Parse direct function call format: functionName(arg1:value1, arg2:value2)
   * Example: activateBrainArea(core:"planning", intensity:0.8, symbolic_query:{"query":"..."})
   *
   * Used by models:
   * - gemma3:latest (100% consistency when properly instructed)
   * - mistral:latest (sometimes uses this format)
   * - Other models when instructed to use direct function calls
   */
  private parseDirectCallFormat(content: string): ToolCall[] {
    const toolCalls: ToolCall[] = [];

    // Trim content to handle leading/trailing spaces
    const trimmedContent = content.trim();

    // Match function calls like: functionName(arguments)
    // Updated regex to handle multi-line and multiple calls separated by semicolons
    // Also handles nested JSON objects better
    // Modified to only match known function names to avoid false positives
    const knownFunctions = [
      "activateBrainArea",
      "decideCollapseStrategy",
      "enrichSemanticQueryBatch",
      "activateAndEnrichBrainArea",
    ];

    // Improved regex to handle nested structures better
    // This regex uses a more careful approach to match balanced parentheses
    const functionCallRegex = new RegExp(
      `(${knownFunctions.join("|")})\\s*\\(` + // Match known function names
        "(" + // Start capturing arguments
        "(?:" + // Non-capturing group for content
        "[^(){}\"']|" + // Any char except parens, braces, quotes
        '"(?:[^"\\\\]|\\\\.)*"|' + // Double quoted strings
        "'(?:[^'\\\\]|\\\\.)*'|" + // Single quoted strings
        "\\{[^{}]*\\}|" + // Simple objects
        "\\{[^{}]*\\{[^{}]*\\}[^{}]*\\}" + // Nested objects (2 levels)
        ")*" + // Repeat
        ")" + // End capturing arguments
        "\\)(?:\\s*;)?", // Match closing paren and optional semicolon
      "gs"
    );
    let match;

    while ((match = functionCallRegex.exec(trimmedContent)) !== null) {
      const functionName = match[1];
      const argsString = match[2];

      // Skip if not a known function name to avoid false positives
      // (This check is now redundant since the regex only matches known functions,
      // but keeping it for safety)
      if (!knownFunctions.includes(functionName)) {
        continue;
      }

      console.log(
        `[OllamaToolCallParser] Found valid function call: ${functionName}(...)`
      );

      try {
        // Parse arguments like: core:"value", intensity:0.8, symbolic_query:{...}
        // Also support Python style: core="value", intensity=0.8
        const args: any = {};

        // Use regex to match key=value or key:value pairs more accurately
        // This regex handles nested objects and arrays better
        const argPattern =
          /(\w+)\s*[=:]\s*(?:("(?:[^"\\]|\\.)*")|(\[[^\]]*\])|(\{[^{}]*(?:\{[^{}]*\}[^{}]*)?\})|([^,()]+))/g;
        let argMatch;

        while ((argMatch = argPattern.exec(argsString)) !== null) {
          const key = argMatch[1];
          const quotedString = argMatch[2];
          const arrayValue = argMatch[3];
          const objectValue = argMatch[4];
          const otherValue = argMatch[5];

          let value: any;

          if (quotedString) {
            // Remove quotes and unescape
            value = quotedString.slice(1, -1).replace(/\\"/g, '"');
          } else if (arrayValue) {
            // Parse array
            try {
              value = JSON.parse(arrayValue);
            } catch {
              value = [];
            }
          } else if (objectValue) {
            // Parse object
            try {
              // Fix common formatting issues
              let fixedValue = objectValue;

              // Fix incorrect "object:" to "query:" for symbolic_query
              if (key === "symbolic_query" && objectValue.includes("object:")) {
                fixedValue = objectValue.replace(/\bobject\s*:/g, '"query":');
              }

              // Ensure all keys are quoted
              fixedValue = fixedValue.replace(/(\w+):/g, '"$1":');
              fixedValue = fixedValue.replace(/""+/g, '"');

              value = JSON.parse(fixedValue);
            } catch {
              // Special handling for symbolic_query
              if (key === "symbolic_query") {
                const queryMatch = objectValue.match(
                  /(?:object|query)\s*:\s*"([^"]+)"/
                );
                if (queryMatch) {
                  value = { query: queryMatch[1] };
                } else {
                  value = objectValue;
                }
              } else {
                value = objectValue;
              }
            }
          } else if (otherValue) {
            // Handle other values (numbers, booleans, etc.)
            const trimmed = otherValue.trim();
            if (trimmed.toLowerCase() === "true") {
              value = true;
            } else if (trimmed.toLowerCase() === "false") {
              value = false;
            } else if (!isNaN(Number(trimmed))) {
              value = Number(trimmed);
            } else {
              value = trimmed;
            }
          }

          args[key] = value;
        }

        console.log(`[OllamaToolCallParser] Parsed arguments:`, args);

        toolCalls.push({
          type: "function",
          function: {
            name: functionName,
            arguments: args,
          },
        });
      } catch (error) {
        console.warn(`Failed to parse direct call format: ${match[0]}`, error);
      }
    }

    return toolCalls;
  }

  /**
   * Split arguments string by commas, respecting nested braces and brackets
   */
  private splitArguments(argsString: string): string[] {
    const args: string[] = [];
    let current = "";
    let braceLevel = 0;
    let bracketLevel = 0;
    let inQuotes = false;
    let quoteChar = "";

    for (let i = 0; i < argsString.length; i++) {
      const char = argsString[i];

      if (!inQuotes && (char === '"' || char === "'")) {
        inQuotes = true;
        quoteChar = char;
      } else if (inQuotes && char === quoteChar && argsString[i - 1] !== "\\") {
        inQuotes = false;
      }

      if (!inQuotes) {
        if (char === "{") braceLevel++;
        else if (char === "}") braceLevel--;
        else if (char === "[") bracketLevel++;
        else if (char === "]") bracketLevel--;
        else if (char === "," && braceLevel === 0 && bracketLevel === 0) {
          args.push(current.trim());
          current = "";
          continue;
        }
      }

      current += char;
    }

    if (current.trim()) {
      args.push(current.trim());
    }

    return args;
  }

  /**
   * Parse [TOOL_CALLS] format used by mistral-nemo
   */
  private parseToolCallsFormat(content: string): ToolCall[] {
    const toolCalls: ToolCall[] = [];
    const match = content.match(/\[TOOL_CALLS\]\[(.*?)\]$/s);

    if (match) {
      try {
        const toolCallsContent = `[${match[1]}]`;
        const parsed = JSON.parse(toolCallsContent);
        if (Array.isArray(parsed)) {
          return parsed.map((call) => ({
            type: "function" as const,
            function: {
              name: call.name,
              arguments:
                typeof call.arguments === "string"
                  ? call.arguments
                  : call.arguments,
            },
          }));
        }
      } catch (e) {
        console.warn("Failed to parse [TOOL_CALLS] format:", e);
      }
    }

    return toolCalls;
  }

  /**
   * Parse Python format (already implemented as parseDirectCallFormat)
   */
  private parsePythonFormat(content: string): ToolCall[] {
    // This is handled by parseDirectCallFormat
    return [];
  }

  /**
   * Parse XML format
   */
  private parseXMLFormat(content: string): ToolCall[] {
    const toolCalls: ToolCall[] = [];
    const xmlMatches = content.matchAll(
      /<tool_call>\s*<function>(\w+)<\/function>\s*<parameters>(.*?)<\/parameters>\s*<\/tool_call>/gs
    );

    for (const match of xmlMatches) {
      try {
        const args = JSON.parse(match[2]);
        toolCalls.push({
          type: "function" as const,
          function: {
            name: match[1],
            arguments: args,
          },
        });
      } catch (e) {
        console.warn("Failed to parse XML format:", e);
      }
    }

    return toolCalls;
  }

  /**
   * Parse Markdown JSON format
   */
  private parseMarkdownJSONFormat(content: string): ToolCall[] {
    const toolCalls: ToolCall[] = [];

    // First, check for gemma3's specific ```tool format
    const toolBlocks = content.matchAll(/```tool\s*([\s\S]*?)```/g);
    for (const block of toolBlocks) {
      try {
        const parsed = JSON.parse(block[1]);

        // Gemma3 format: { "call": { "deterministic": true, ... } }
        if (parsed.call && typeof parsed.call === "object") {
          // Try to infer the function name from the content or use a default
          let functionName = "decideCollapseStrategy";

          // Check if we can determine the function from context
          if (content.includes("decideCollapseStrategy")) {
            functionName = "decideCollapseStrategy";
          } else if (content.includes("activateBrainArea")) {
            functionName = "activateBrainArea";
          }

          toolCalls.push({
            type: "function" as const,
            function: {
              name: functionName,
              arguments: parsed.call,
            },
          });

          console.log(
            `[OllamaToolCallParser] Parsed gemma3 tool format for ${functionName}`
          );
        }
      } catch (e) {
        console.warn("Failed to parse tool block:", e);
      }
    }

    // If we found tool blocks, return those
    if (toolCalls.length > 0) {
      return toolCalls;
    }

    // Otherwise, look for standard ```json blocks
    const jsonBlocks = content.matchAll(/```json\s*([\s\S]*?)```/g);

    for (const block of jsonBlocks) {
      try {
        const parsed = JSON.parse(block[1]);
        if (parsed.name && parsed.arguments) {
          toolCalls.push({
            type: "function" as const,
            function: {
              name: parsed.name,
              arguments: parsed.arguments,
            },
          });
        } else if (Array.isArray(parsed)) {
          parsed.forEach((call) => {
            if (call.name && call.arguments) {
              toolCalls.push({
                type: "function" as const,
                function: {
                  name: call.name,
                  arguments: call.arguments,
                },
              });
            }
          });
        }
      } catch (e) {
        console.warn("Failed to parse markdown JSON format:", e);
      }
    }

    return toolCalls;
  }

  /**
   * Parse direct JSON array format: [{"name":"function", "arguments":{...}}]
   * Also handles single JSON object format: {"name":"function", "parameters":{...}}
   * Used by mistral:latest, llama3.1:latest and some other models
   */
  private parseJSONArrayFormat(content: string): ToolCall[] {
    const toolCalls: ToolCall[] = [];

    // First try to parse the entire content as JSON
    try {
      const trimmed = content.trim();

      // Handle single JSON object (llama3.1 format)
      if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        const parsed = JSON.parse(trimmed);
        if (parsed.name && (parsed.arguments || parsed.parameters)) {
          const args = parsed.arguments || parsed.parameters;

          // Fix escaped JSON strings in parameters (llama3.1 issue)
          const fixedArgs: any = {};
          for (const [key, value] of Object.entries(args)) {
            if (typeof value === "string") {
              // Check if it's an escaped JSON string
              try {
                // Remove extra escaping if present and try to parse
                const trimmed = value.trim();
                if (
                  (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
                  (trimmed.startsWith("[") && trimmed.endsWith("]"))
                ) {
                  // Try to parse directly first
                  try {
                    fixedArgs[key] = JSON.parse(trimmed);
                  } catch {
                    // If that fails, it might be escaped, remove escaping
                    const unescaped = trimmed
                      .replace(/\\"/g, '"')
                      .replace(/\\\\/g, "\\");
                    fixedArgs[key] = JSON.parse(unescaped);
                  }
                } else {
                  fixedArgs[key] = value;
                }
              } catch {
                // If all parsing attempts fail, keep as string
                fixedArgs[key] = value;
              }
            } else {
              fixedArgs[key] = value;
            }
          }

          console.log(
            `[OllamaToolCallParser] Parsed single JSON object format for ${parsed.name}`
          );

          return [
            {
              type: "function" as const,
              function: {
                name: parsed.name,
                arguments: fixedArgs,
              },
            },
          ];
        }
      }

      // Handle JSON array format
      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((call) => {
            // Fix mistral:latest incorrect symbolic_query format
            if (
              call.name === "activateBrainArea" &&
              call.arguments?.symbolic_query
            ) {
              const sq = call.arguments.symbolic_query;
              // If symbolic_query doesn't have a 'query' property, fix it
              if (!sq.query && typeof sq === "object") {
                // Convert object keys to query string
                const queryParts = Object.keys(sq).filter((key) => sq[key]);
                if (queryParts.length > 0) {
                  call.arguments.symbolic_query = {
                    query: queryParts.join(" "),
                  };
                }
              }
            }

            return {
              type: "function" as const,
              function: {
                name: call.name || call.function,
                arguments: call.arguments || call.parameters,
              },
            };
          });
        }
      }
    } catch (e) {
      // Not a pure JSON array or object
    }

    // Try to find JSON arrays in the content using a more robust approach
    // Look for patterns that start with [ and end with ]
    let startIndex = content.indexOf("[");

    while (startIndex !== -1) {
      // Try to find the matching closing bracket
      let braceCount = 0;
      let inString = false;
      let escapeNext = false;
      let endIndex = -1;

      for (let i = startIndex; i < content.length; i++) {
        const char = content[i];

        if (escapeNext) {
          escapeNext = false;
          continue;
        }

        if (char === "\\") {
          escapeNext = true;
          continue;
        }

        if (char === '"' && !inString) {
          inString = true;
        } else if (char === '"' && inString) {
          inString = false;
        }

        if (!inString) {
          if (char === "[" || char === "{") {
            braceCount++;
          } else if (char === "]" || char === "}") {
            braceCount--;
            if (braceCount === 0 && char === "]") {
              endIndex = i;
              break;
            }
          }
        }
      }

      if (endIndex !== -1) {
        const jsonString = content.substring(startIndex, endIndex + 1);
        try {
          const parsed = JSON.parse(jsonString);
          if (Array.isArray(parsed)) {
            parsed.forEach((call) => {
              if (call.name && call.arguments) {
                // Fix mistral:latest incorrect symbolic_query format
                if (
                  call.name === "activateBrainArea" &&
                  call.arguments.symbolic_query
                ) {
                  const sq = call.arguments.symbolic_query;
                  // If symbolic_query doesn't have a 'query' property, fix it
                  if (!sq.query && typeof sq === "object") {
                    // Convert object keys to query string
                    const queryParts = Object.keys(sq).filter((key) => sq[key]);
                    if (queryParts.length > 0) {
                      call.arguments.symbolic_query = {
                        query: queryParts.join(" "),
                      };
                    }
                  }
                }

                toolCalls.push({
                  type: "function" as const,
                  function: {
                    name: call.name,
                    arguments: call.arguments,
                  },
                });
              }
            });
          }
        } catch (e) {
          // Not valid JSON, continue searching
        }
      }

      // Look for next potential JSON array
      startIndex = content.indexOf("[", startIndex + 1);
    }

    return toolCalls;
  }
}
