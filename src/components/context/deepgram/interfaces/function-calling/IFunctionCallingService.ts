// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { Message } from "../transcription/TranscriptionTypes";
import { IFunctionDefinition, AIFunctionDefinition } from "./IFunctionDefinition";

/**
 * Options for function calling
 */
export interface FunctionCallOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  toolChoice?: {
    type: string;
    function: { name: string };
  };
}

/**
 * Response from function calling
 */
export interface FunctionCallResponse {
  choices: Array<{
    message: {
      content?: string;
      tool_calls?: Array<{
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
  }>;
}

/**
 * Interface for services that support function calling
 * Part of SOLID refactoring to abstract function calling mechanism
 */
export interface IFunctionCallingService {
  /**
   * Call AI model with function definitions
   * @param messages Conversation messages
   * @param functions Function definitions
   * @param options Additional options
   * @returns Function call response
   */
  callWithFunctions(
    messages: Message[],
    functions: IFunctionDefinition[],
    options?: FunctionCallOptions
  ): Promise<FunctionCallResponse>;

  /**
   * Check if the service supports function calling
   */
  supportsFunctionCalling(): boolean;
}