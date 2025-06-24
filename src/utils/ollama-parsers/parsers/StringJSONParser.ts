// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { IToolCallParser, ToolCall } from "../interfaces/IToolCallParser";

/**
 * Parser para extrair uma chamada de ferramenta que é um objeto JSON
 * formatado como uma string.
 * Exemplo: '{"name": "func", "parameters": {...}}'
 *
 * Este formato é usado por modelos como llama3.1 em certos cenários.
 */
export class StringJSONParser implements IToolCallParser {
  public formatName = "StringifiedJSON";

  canParse(content: string): boolean {
    if (!content || typeof content !== "string") {
      return false;
    }
    const trimmed = content.trim();

    // Garante que é uma string contendo um objeto JSON, e não um array
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      const innerContent = trimmed.substring(1, trimmed.length - 1).trim();
      return innerContent.startsWith("{") && innerContent.endsWith("}");
    }
    return false;
  }

  parse(content: string): ToolCall[] {
    if (!this.canParse(content)) {
      return [];
    }

    try {
      const parsed = JSON.parse(content.trim());
      const name = parsed.name || (parsed.function && parsed.function.name);
      const args = parsed.arguments || parsed.parameters;

      if (name && args) {
        return [
          {
            type: "function",
            function: {
              name,
              arguments: args,
            },
          },
        ];
      }
    } catch (e) {
      // Retorna array vazio em caso de erro, já que canParse deveria ter prevenido.
    }

    return [];
  }
}
