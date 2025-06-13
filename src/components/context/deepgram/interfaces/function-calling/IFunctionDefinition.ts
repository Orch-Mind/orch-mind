// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * Interface for function definitions used in AI function calling
 * Part of SOLID refactoring to centralize function schemas
 */
export interface IFunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, unknown>;
    required: string[];
  };
}

/**
 * Standard function definition format for AI providers
 */
export interface AIFunctionDefinition {
  type: string;
  function: IFunctionDefinition;
}