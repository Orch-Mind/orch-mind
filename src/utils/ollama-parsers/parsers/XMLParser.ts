// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { IToolCallParser, ToolCall } from "../interfaces/IToolCallParser";
import { ParserUtils } from "../utils/ParserUtils";

/**
 * Parser para formato XML
 * SRP: Responsável apenas por parsing de formato XML
 * KISS: Implementação simples usando regex
 */
export class XMLParser implements IToolCallParser {
  readonly formatName = "XML";

  canParse(content: string): boolean {
    return content?.includes("<tool_call>") || false;
  }

  parse(content: string): ToolCall[] {
    const toolCalls: ToolCall[] = [];

    // Pattern para extrair tool calls XML
    const xmlPattern =
      /<tool_call>\s*<function>(\w+)<\/function>\s*<parameters>(.*?)<\/parameters>\s*<\/tool_call>/gs;
    let match;

    while ((match = xmlPattern.exec(content)) !== null) {
      const functionName = match[1];
      const parametersXML = match[2];

      try {
        // Tenta parse do conteúdo dos parâmetros como JSON
        const args = ParserUtils.tryParseJSON(parametersXML);

        if (args) {
          toolCalls.push({
            type: "function" as const,
            function: {
              name: functionName,
              arguments: args,
            },
          });
        }
      } catch (error) {
        console.warn(
          `[${this.formatName}] Failed to parse parameters for ${functionName}:`,
          error
        );
      }
    }

    return toolCalls;
  }
}
