// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { ParserUtils } from "../../utils/ParserUtils";

/**
 * Parser auxiliar para argumentos de funções
 * SRP: Responsável apenas por parsing de argumentos
 * DRY: Centraliza lógica complexa de parsing
 */
export class ArgumentParser {
  /**
   * Parse de argumentos no formato key:value ou key=value
   * KISS: Interface simples, complexidade encapsulada
   */
  static parseArguments(argsString: string): Record<string, any> {
    const args: Record<string, any> = {};

    if (!argsString) return args;

    // Regex aprimorado para capturar pares chave-valor de forma mais robusta.
    // 1. Chave: (\w+)
    // 2. Separador: \s*[=:]\s*
    // 3. Valor (com prioridade):
    //    a. Objeto JSON: (\{.*?\}) - Não guloso para evitar consumir além do objeto
    //    b. Array JSON: (\[.*?\]) - Não guloso
    //    c. String com aspas: ("(?:[^"\\]|\\.)*")
    //    d. Valor sem aspas: ([^,)]+)
    const argPattern =
      /(\w+)\s*[=:]\s*((?:\{[\s\S]*?\}|\[[\s\S]*?\]|"(?:[^"\\]|\\.)*"|'[^']*'|[^,)]+))/g;

    let match;

    while ((match = argPattern.exec(argsString)) !== null) {
      const key = match[1];
      const rawValue = match[2];

      args[key] = this.parseArgumentValue(key, rawValue);
    }

    return args;
  }

  /**
   * Parse de valor individual
   * KISS: Lógica clara e sequencial
   */
  private static parseArgumentValue(key: string, rawValue: string): any {
    // String entre aspas
    if (this.isQuotedString(rawValue)) {
      return ParserUtils.unquote(rawValue);
    }

    // Array
    if (rawValue.startsWith("[") && rawValue.endsWith("]")) {
      return ParserUtils.tryParseJSON(rawValue) || [];
    }

    // Objeto (incluindo symbolic_query)
    if (rawValue.startsWith("{") && rawValue.endsWith("}")) {
      return this.parseObjectValue(key, rawValue);
    }

    // Outros valores (números, booleanos)
    return ParserUtils.parseValue(rawValue);
  }

  /**
   * Verifica se é string com aspas
   * KISS: Função simples e clara
   */
  private static isQuotedString(value: string): boolean {
    return (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    );
  }

  /**
   * Parse de valores objeto com tratamento especial
   * DRY: Centraliza lógica de correção de JSONs
   */
  private static parseObjectValue(key: string, objectValue: string): any {
    // Tenta parse direto
    let parsed = ParserUtils.tryParseJSON(objectValue);
    if (parsed) return parsed;

    // Aplica correções comuns
    let fixed = objectValue;

    // Correção específica para symbolic_query
    if (key === "symbolic_query" && objectValue.includes("object:")) {
      fixed = objectValue.replace(/\bobject\s*:/g, '"query":');
    }

    // Aplica correções gerais
    fixed = ParserUtils.fixCommonJSONIssues(fixed);

    parsed = ParserUtils.tryParseJSON(fixed);
    if (parsed) return parsed;

    // Se ainda falhar, tenta extrair manualmente para symbolic_query
    if (key === "symbolic_query") {
      const queryMatch = objectValue.match(/(?:object|query)\s*:\s*"([^"]+)"/);
      if (queryMatch) {
        return { query: queryMatch[1] };
      }
    }

    // Fallback: retorna como string
    return objectValue;
  }
}
