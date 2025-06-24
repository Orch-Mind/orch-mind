// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { IToolCallParser, ToolCall } from "../interfaces/IToolCallParser";
import { ParserUtils } from "../utils/ParserUtils";

/**
 * Parser para formato Markdown com blocos JSON/tool
 * SRP: Responsável apenas por parsing de blocos markdown
 * KISS: Lógica simplificada para extração de blocos
 */
export class MarkdownJSONParser implements IToolCallParser {
  readonly formatName = "Markdown JSON";

  canParse(content: string): boolean {
    return content?.includes("```") || false;
  }

  parse(content: string): ToolCall[] {
    const toolCalls: ToolCall[] = [];

    // Tenta blocos ```tool primeiro (gemma3)
    const toolBlocks = this.extractBlocks(content, "tool");
    for (const block of toolBlocks) {
      const parsed = this.parseToolBlock(block);
      if (parsed) toolCalls.push(parsed);
    }

    if (toolCalls.length > 0) return toolCalls;

    // Tenta blocos ```json
    const jsonBlocks = this.extractBlocks(content, "json");
    for (const block of jsonBlocks) {
      const parsed = this.parseJSONBlock(block);
      toolCalls.push(...parsed);
    }

    return toolCalls;
  }

  /**
   * Extrai blocos de código markdown
   * KISS: Função genérica e reutilizável
   */
  private extractBlocks(content: string, type: string): string[] {
    const blocks: string[] = [];
    const regex = new RegExp(`\`\`\`${type}?\\s*([\\s\\S]*?)\`\`\``, "g");
    let match;

    while ((match = regex.exec(content)) !== null) {
      if (match[1]) blocks.push(match[1].trim());
    }

    return blocks;
  }

  /**
   * Parse de bloco tool (gemma3)
   * KISS: Lógica específica isolada
   */
  private parseToolBlock(block: string): ToolCall | null {
    const parsed = ParserUtils.tryParseJSON(block);
    if (!parsed?.call) return null;

    // Inferir nome da função do contexto
    const functionName = this.inferFunctionName(block);

    return {
      type: "function" as const,
      function: {
        name: functionName,
        arguments: parsed.call,
      },
    };
  }

  /**
   * Parse de bloco JSON padrão
   * KISS: Suporta objetos únicos e arrays
   */
  private parseJSONBlock(block: string): ToolCall[] {
    const parsed = ParserUtils.tryParseJSON(block);
    if (!parsed) return [];

    // Objeto único
    if (!Array.isArray(parsed) && parsed.name && parsed.arguments) {
      return [
        {
          type: "function" as const,
          function: {
            name: parsed.name,
            arguments: parsed.arguments,
          },
        },
      ];
    }

    // Array de objetos
    if (Array.isArray(parsed)) {
      return parsed
        .filter((call) => call.name && call.arguments)
        .map((call) => ({
          type: "function" as const,
          function: {
            name: call.name,
            arguments: call.arguments,
          },
        }));
    }

    return [];
  }

  /**
   * Infere nome da função baseado no contexto
   * KISS: Lógica simples de inferência
   */
  private inferFunctionName(block: string): string {
    // Lista de possíveis nomes de função para buscar
    for (const func of ParserUtils.KNOWN_FUNCTIONS) {
      if (block.includes(func)) return func;
    }

    // Default para decideCollapseStrategy se não encontrar
    return "decideCollapseStrategy";
  }
}
