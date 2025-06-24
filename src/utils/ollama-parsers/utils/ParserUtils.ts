// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * Utilitários comuns para parsing
 * DRY: Elimina duplicação de código entre parsers
 * KISS: Funções simples e focadas
 */
export class ParserUtils {
  /**
   * Tenta fazer parse de JSON com fallback
   * DRY: Reutilizado em múltiplos parsers
   */
  static tryParseJSON<T = any>(content: string): T | null {
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Remove quotes de strings
   * KISS: Função simples e clara
   */
  static unquote(value: string): string {
    const trimmed = value.trim();
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return trimmed.slice(1, -1);
    }
    return trimmed;
  }

  /**
   * Converte valor para tipo apropriado
   * DRY: Lógica comum de conversão
   */
  static parseValue(value: string): any {
    const trimmed = value.trim();

    // Boolean
    if (trimmed.toLowerCase() === "true") return true;
    if (trimmed.toLowerCase() === "false") return false;

    // Number
    if (!isNaN(Number(trimmed))) return Number(trimmed);

    // String (remove quotes if present)
    return ParserUtils.unquote(trimmed);
  }

  /**
   * Corrige formatação comum de JSON
   * DRY: Usado em vários parsers para corrigir JSONs mal formatados
   */
  static fixCommonJSONIssues(json: string): string {
    let fixed = json;

    // Garante que todas as chaves estão entre aspas
    fixed = fixed.replace(/(\w+):/g, '"$1":');

    // Remove aspas duplas
    fixed = fixed.replace(/""+/g, '"');

    return fixed;
  }

  /**
   * Extrai conteúdo entre delimitadores
   * KISS: Função genérica e simples
   */
  static extractBetween(
    content: string,
    start: string,
    end: string
  ): string | null {
    const startIndex = content.indexOf(start);
    if (startIndex === -1) return null;

    const endIndex = content.indexOf(end, startIndex + start.length);
    if (endIndex === -1) return null;

    return content.substring(startIndex + start.length, endIndex);
  }

  /**
   * Lista de funções conhecidas
   * DRY: Centralizado em um lugar
   */
  static readonly KNOWN_FUNCTIONS = [
    "activateBrainArea",
    "decideCollapseStrategy",
    "enrichSemanticQueryBatch",
    "activateAndEnrichBrainArea",
  ];
}
