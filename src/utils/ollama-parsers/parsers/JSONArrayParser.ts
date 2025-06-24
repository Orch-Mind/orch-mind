// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { IToolCallParser, ToolCall } from "../interfaces/IToolCallParser";

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
    if (!content || typeof content !== "string") {
      return false;
    }
    const trimmed = content.trim();
    // Apenas para arrays de JSON
    return trimmed.startsWith("[") && trimmed.endsWith("]");
  }

  parse(content: string): ToolCall[] {
    if (!this.canParse(content)) {
      return [];
    }

    try {
      const parsed = JSON.parse(content.trim());

      if (Array.isArray(parsed)) {
        return parsed
          .map((item: any) => {
            let name = item.name || (item.function && item.function.name);
            let args = item.arguments || item.parameters;

            if (name && args) {
              // Correção específica para mistral:latest
              if (name === "activateBrainArea" && args?.symbolic_query) {
                args = this.fixSymbolicQuery(args);
              }

              return {
                type: "function",
                function: {
                  name,
                  arguments: args,
                },
              };
            }
            return null;
          })
          .filter((call): call is ToolCall => call !== null);
      }
    } catch (e) {
      // Falha no parse, não é um JSON válido
      return [];
    }

    return [];
  }

  /**
   * Corrige formato incorreto de symbolic_query para o mistral
   */
  private fixSymbolicQuery(args: any): any {
    if (!args.symbolic_query) {
      return args;
    }

    let sq = args.symbolic_query;

    // Caso 1: symbolic_query é uma string, precisa ser um objeto
    if (typeof sq === "string") {
      args.symbolic_query = { query: sq };
      return args;
    }

    // Caso 2: symbolic_query é um objeto, mas não tem a propriedade 'query'
    if (typeof sq === "object" && sq !== null && !sq.query) {
      const queryParts = Object.values(sq).filter(
        (val) => typeof val === "string" || typeof val === "number"
      );

      if (queryParts.length > 0) {
        args.symbolic_query = {
          query: queryParts.join(" "),
        };
      } else {
        // Fallback: se não houver partes válidas, cria uma query genérica
        args.symbolic_query = { query: "analyze user input" };
      }
    }

    return args;
  }
}
