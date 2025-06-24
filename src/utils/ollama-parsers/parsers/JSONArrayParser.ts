// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { IToolCallParser, ToolCall } from "../interfaces/IToolCallParser";
import { ParserUtils } from "../utils/ParserUtils";

/**
 * Parser para formato JSON array: [{"name":"function", "arguments":{...}}]
 * Também suporta formato único: {"name":"function", "parameters":{...}}
 *
 * SRP: Responsável apenas por parsing de formato JSON
 * KISS: Lógica simplificada e focada
 */
export class JSONArrayParser implements IToolCallParser {
  readonly formatName = "JSON Array";

  canParse(content: string): boolean {
    if (!content || typeof content !== "string") return false;

    const trimmed = content.trim();
    return (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    );
  }

  parse(content: string): ToolCall[] {
    const trimmed = content.trim();

    // Tenta parse direto primeiro (KISS)
    const parsed = ParserUtils.tryParseJSON(trimmed);
    if (!parsed) return [];

    // Se for objeto único
    if (!Array.isArray(parsed)) {
      return this.parseSingleObject(parsed);
    }

    // Se for array
    return this.parseArray(parsed);
  }

  /**
   * Parse de objeto único
   * KISS: Método focado e simples
   */
  private parseSingleObject(obj: any): ToolCall[] {
    if (!obj.name || (!obj.arguments && !obj.parameters)) {
      return [];
    }

    const args = this.fixEscapedStrings(obj.arguments || obj.parameters);

    return [
      {
        type: "function" as const,
        function: {
          name: obj.name,
          arguments: args,
        },
      },
    ];
  }

  /**
   * Parse de array de objetos
   * KISS: Método focado e simples
   */
  private parseArray(arr: any[]): ToolCall[] {
    return arr
      .filter((call) => call.name && (call.arguments || call.parameters))
      .map((call) => {
        let args = call.arguments || call.parameters;

        // Correção específica para mistral:latest
        if (call.name === "activateBrainArea" && args?.symbolic_query) {
          args = this.fixSymbolicQuery(args);
        }

        return {
          type: "function" as const,
          function: {
            name: call.name || call.function,
            arguments: args,
          },
        };
      });
  }

  /**
   * Corrige strings JSON escapadas
   * DRY: Lógica extraída e reutilizável
   */
  private fixEscapedStrings(args: any): any {
    if (typeof args !== "object" || !args) return args;

    const fixed: any = {};

    for (const [key, value] of Object.entries(args)) {
      if (typeof value === "string") {
        const trimmed = value.trim();

        // Tenta parse se parecer JSON
        if (
          (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
          (trimmed.startsWith("[") && trimmed.endsWith("]"))
        ) {
          const parsed = ParserUtils.tryParseJSON(trimmed);
          if (parsed) {
            fixed[key] = parsed;
            continue;
          }

          // Tenta remover escaping
          const unescaped = trimmed.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
          const parsedUnescaped = ParserUtils.tryParseJSON(unescaped);
          fixed[key] = parsedUnescaped || value;
        } else {
          fixed[key] = value;
        }
      } else {
        fixed[key] = value;
      }
    }

    return fixed;
  }

  /**
   * Corrige formato incorreto de symbolic_query
   * KISS: Lógica específica isolada
   */
  private fixSymbolicQuery(args: any): any {
    const sq = args.symbolic_query;

    if (!sq.query && typeof sq === "object") {
      const queryParts = Object.keys(sq).filter((key) => sq[key]);
      if (queryParts.length > 0) {
        args.symbolic_query = {
          query: queryParts.join(" "),
        };
      }
    }

    return args;
  }
}
