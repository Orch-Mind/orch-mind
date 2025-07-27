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
    // Brain area functions (legacy)
    "activateBrainArea",
    "decideCollapseStrategy",
    "enrichSemanticQueryBatch",
    "activateAndEnrichBrainArea",
    // Agent tool functions (universal agent)
    "createFile",
    "editFile",
    "deleteFile",
    "executeCommand",
    "searchFiles",
  ];

  /**
   * Extrai o primeiro bloco JSON completo e válido (objeto ou array) de uma string.
   * Isso é robusto contra streams incompletos ou texto extra ao redor do JSON.
   * @param text A string que pode conter um bloco JSON.
   * @returns A string do bloco JSON ou null se não for encontrado um JSON completo e válido.
   */
  static extractJson(text: string): string | null {
    let startIndex = -1;
    // Encontra o primeiro caractere de início de JSON
    for (let i = 0; i < text.length; i++) {
      if (text[i] === "{" || text[i] === "[") {
        startIndex = i;
        break;
      }
    }

    if (startIndex === -1) {
      return null;
    }

    const opener = text[startIndex];
    const closer = opener === "{" ? "}" : "]";
    let balance = 0;
    let inString = false;

    for (let i = startIndex; i < text.length; i++) {
      const char = text[i];

      // Lógica simples para detectar se estamos dentro de uma string
      if (char === '"' && (i === 0 || text[i - 1] !== "\\")) {
        inString = !inString;
      }

      if (!inString) {
        if (char === opener) {
          balance++;
        } else if (char === closer) {
          balance--;
        }
      }

      // Se o balanço for zero, encontramos um potencial JSON completo
      if (balance === 0) {
        const potentialJson = text.substring(startIndex, i + 1);
        try {
          JSON.parse(potentialJson);
          return potentialJson; // É um JSON válido e completo
        } catch (e) {
          // Se o parse falhar, pode ser um falso positivo. Continuamos procurando.
        }
      }
    }

    return null; // Nenhum bloco JSON completo e válido foi encontrado
  }
}
