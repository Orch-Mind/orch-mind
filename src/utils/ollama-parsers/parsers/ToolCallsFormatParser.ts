// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { IToolCallParser, ToolCall } from "../interfaces/IToolCallParser";
import { ParserUtils } from "../utils/ParserUtils";

/**
 * Parser para formato [TOOL_CALLS] usado por mistral-nemo
 * SRP: Responsável apenas por parsing de formato [TOOL_CALLS]
 * KISS: Implementação simples e direta
 */
export class ToolCallsFormatParser implements IToolCallParser {
  readonly formatName = "[TOOL_CALLS]";

  canParse(content: string): boolean {
    return content?.includes("[TOOL_CALLS]") || false;
  }

  parse(content: string): ToolCall[] {
    const match = content.match(/\[TOOL_CALLS\]\[(.*?)\]$/s);
    if (!match) return [];

    try {
      const toolCallsContent = `[${match[1]}]`;
      const parsed = ParserUtils.tryParseJSON(toolCallsContent);

      if (!Array.isArray(parsed)) return [];

      return parsed.map((call) => ({
        type: "function" as const,
        function: {
          name: call.name,
          arguments: call.arguments,
        },
      }));
    } catch (error) {
      console.warn(`[${this.formatName}] Parse failed:`, error);
      return [];
    }
  }
}
