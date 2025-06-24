// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import {
  IToolCallParser,
  ToolCall,
} from "./ollama-parsers/interfaces/IToolCallParser";
import { DirectCallParser } from "./ollama-parsers/parsers/DirectCallParser";
import { JSONArrayParser } from "./ollama-parsers/parsers/JSONArrayParser";
import { MarkdownJSONParser } from "./ollama-parsers/parsers/MarkdownJSONParser";
import { StringJSONParser } from "./ollama-parsers/parsers/StringJSONParser";
import { ToolCallsFormatParser } from "./ollama-parsers/parsers/ToolCallsFormatParser";
import { XMLParser } from "./ollama-parsers/parsers/XMLParser";

/**
 * Parser principal para extrair tool calls de diferentes formatos
 *
 * SOLID: Open/Closed Principle - Extensível para novos parsers sem modificação
 * SRP: Responsável apenas por coordenar os parsers específicos
 * DRY: Remove duplicação delegando para parsers especializados
 * KISS: Interface simples e clara
 *
 * Modelos suportados:
 * - qwen3:latest, llama3.1:latest: tool_calls nativo (não precisa deste parser)
 * - mistral:latest: JSON array no content
 * - mistral-nemo:latest: formato [TOOL_CALLS]
 * - gemma3:latest: formato direto functionName(arg:value, ...)
 * - granite, outros: vários formatos alternativos
 */
export class OllamaToolCallParser {
  private readonly parsers: IToolCallParser[];

  constructor() {
    // Lista de parsers em ordem de prioridade
    // SOLID: Facilmente extensível com novos parsers
    this.parsers = [
      new MarkdownJSONParser(),
      new StringJSONParser(),
      new JSONArrayParser(),
      new ToolCallsFormatParser(),
      new DirectCallParser(),
      new XMLParser(),
    ];
  }

  /**
   * Parse content to detect and extract tool calls in various formats
   * KISS: Interface simples que delega complexidade
   */
  parse(content: string): ToolCall[] {
    if (!content || typeof content !== "string") {
      return [];
    }

    // Log para debugging (mantido para compatibilidade)
    if (content.includes("activateBrainArea")) {
      console.log(
        "[OllamaToolCallParser] Content contains activateBrainArea, attempting to parse..."
      );
    }

    // Tenta cada parser em ordem
    // KISS: Loop simples e claro
    for (const parser of this.parsers) {
      if (parser.canParse(content)) {
        const toolCalls = parser.parse(content);

        if (toolCalls.length > 0) {
          console.log(
            `[OllamaToolCallParser] Parsed ${toolCalls.length} calls using ${parser.formatName} format`
          );
          return toolCalls;
        }
      }
    }

    // Nenhum parser conseguiu extrair tool calls
    console.log("[OllamaToolCallParser] No tool calls detected in any format");
    console.log(
      "[OllamaToolCallParser] Content preview:",
      content.substring(0, 200)
    );

    return [];
  }

  /**
   * Check if the content might contain tool calls in alternative formats
   * KISS: Delegação simples para utilitários
   */
  static looksLikeToolCall(content: string): boolean {
    if (!content || typeof content !== "string") return false;

    const patterns = [
      /function_name\s*[:=]/i,
      /activateBrainArea\s*\(/i,
      /<tool_call>/i,
      /\[TOOL_CALLS\]/i,
      /{"name":\s*"activateBrainArea"/,
      /\bfunction:\s*activateBrainArea/i,
    ];

    return patterns.some((pattern) => pattern.test(content));
  }

  /**
   * Parse alternative tool call formats (método estático para compatibilidade)
   * DRY: Reutiliza a mesma lógica do método de instância
   */
  static parseAlternativeFormats(content: string): any[] {
    const parser = new OllamaToolCallParser();
    const toolCalls = parser.parse(content);

    // Converte para formato legado se necessário
    return toolCalls.map((call) => ({
      function: {
        name: call.function.name,
        arguments:
          typeof call.function.arguments === "string"
            ? call.function.arguments
            : JSON.stringify(call.function.arguments),
      },
    }));
  }
}

// Re-exporta a interface para compatibilidade
export type { ToolCall } from "./ollama-parsers/interfaces/IToolCallParser";
