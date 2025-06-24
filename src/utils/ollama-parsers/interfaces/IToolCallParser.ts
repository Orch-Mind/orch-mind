// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * Interface base para parsers de tool calls
 * SOLID: Interface Segregation Principle - Interface específica para parsing
 */
export interface ToolCall {
  type: "function";
  function: {
    name: string;
    arguments: string | Record<string, any>;
  };
}

/**
 * Interface para parsers de diferentes formatos
 * SOLID: Dependency Inversion - Depende de abstração, não de implementação
 */
export interface IToolCallParser {
  /**
   * Verifica se o conteúdo pode ser processado por este parser
   */
  canParse(content: string): boolean;

  /**
   * Realiza o parsing do conteúdo
   */
  parse(content: string): ToolCall[];

  /**
   * Nome do formato para logging
   */
  readonly formatName: string;
}
