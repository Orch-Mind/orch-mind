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

    // Processa cada função conhecida individualmente para lidar com parênteses aninhados
    for (const functionName of ParserUtils.KNOWN_FUNCTIONS) {
      const functionPattern = `${functionName}\\s*\\(`;
      const regex = new RegExp(functionPattern, 'g');
      let match;
      
      while ((match = regex.exec(trimmed)) !== null) {
        const startIndex = match.index + match[0].length;
        
        // Encontra os argumentos balanceando parênteses
        const argsString = this.extractBalancedArguments(trimmed, startIndex);
        
        if (argsString !== null) {
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
      }
    }

    return toolCalls;
  }

  /**
   * Extrai argumentos balanceando parênteses para lidar com conteúdo aninhado
   * Por exemplo: content:"public class Main { public static void main(String[] args) { ... } }"
   */
  private extractBalancedArguments(content: string, startIndex: number): string | null {
    let balance = 1; // Já estamos dentro do primeiro parêntese
    let i = startIndex;
    
    while (i < content.length && balance > 0) {
      const char = content[i];
      
      if (char === '(') {
        balance++;
      } else if (char === ')') {
        balance--;
      }
      
      i++;
    }
    
    if (balance === 0) {
      // Encontrou o parêntese de fechamento balanceado
      return content.substring(startIndex, i - 1); // -1 para excluir o ')' final
    }
    
    return null; // Parênteses não balanceados
  }
}
