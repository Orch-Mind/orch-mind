// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { IToolCallParser, ToolCall } from "../interfaces/IToolCallParser";
import { ParserUtils } from "../utils/ParserUtils";
import { ArgumentParser } from "./helpers/ArgumentParser";

/**
 * Parser para formato de chamada direta: functionName(arg1:value1, arg2:value2)
 * Exemplo: activateBrainArea(core:"planning", intensity:0.8, symbolic_query:{"query":"..."})
 *
 * SRP: Responsável apenas por parsing de chamadas diretas
 * KISS: Separou parsing de argumentos em classe auxiliar
 */
export class DirectCallParser implements IToolCallParser {
  readonly formatName = "Direct Call";

  canParse(content: string): boolean {
    if (!content || typeof content !== "string") return false;

    // Verifica se contém alguma função conhecida
    return ParserUtils.KNOWN_FUNCTIONS.some((func) =>
      content.includes(`${func}(`)
    );
  }

  parse(content: string): ToolCall[] {
    const toolCalls: ToolCall[] = [];
    const trimmed = content.trim();

    // Regex simplificado (KISS)
    const functionCallRegex = new RegExp(
      `(${ParserUtils.KNOWN_FUNCTIONS.join("|")})\\s*\\(` + // Funções conhecidas
        "([^)]*)" + // Captura argumentos (simplificado)
        "\\)",
      "gs"
    );

    let match;
    while ((match = functionCallRegex.exec(trimmed)) !== null) {
      const functionName = match[1];
      const argsString = match[2];

      try {
        // Delega parsing de argumentos (SRP)
        const args = ArgumentParser.parseArguments(argsString);

        toolCalls.push({
          type: "function",
          function: {
            name: functionName,
            arguments: args,
          },
        });

        console.log(`[${this.formatName}] Parsed function: ${functionName}`);
      } catch (error) {
        console.warn(
          `[${this.formatName}] Failed to parse: ${functionName}`,
          error
        );
      }
    }

    return toolCalls;
  }
}
