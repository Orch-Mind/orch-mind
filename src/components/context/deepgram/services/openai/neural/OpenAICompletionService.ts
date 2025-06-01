// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// OpenAICompletionService.ts
// Symbolic: Processamento de completions e function calling do modelo de linguagem

import { ICompletionService, ModelStreamResponse } from "../../../interfaces/openai/ICompletionService";
import { IClientManagementService } from "../../../interfaces/openai/IClientManagementService";
import { LoggingUtils } from "../../../utils/LoggingUtils";
import { Message } from "../../../interfaces/transcription/TranscriptionTypes";
import { STORAGE_KEYS, getOption } from "../../../../../../services/StorageService";

/**
 * Serviço responsável por gerar completions com function calling
 * Symbolic: Neurônio especializado em processamento de texto e chamadas de funções
 */
export class OpenAICompletionService implements ICompletionService {
  private clientService: IClientManagementService;
  
  constructor(clientService: IClientManagementService) {
    this.clientService = clientService;
  }


  /**
   * Envia uma requisição ao modelo de linguagem com suporte a function calling
   * Symbolic: Processamento neural para geração de texto ou execução de função
   */
  async callModelWithFunctions(options: {
    model: string;
    messages: Array<{role: string; content: string}>;
    tools?: Array<{
      type: string;
      function: {
        name: string;
        description: string;
        parameters: Record<string, unknown>;
      }
    }>;
    tool_choice?: {type: string; function: {name: string}};
    temperature?: number;
    max_tokens?: number;
  }): Promise<{
    choices: Array<{
      message: {
        content?: string;
        tool_calls?: Array<{
          function: {
            name: string;
            arguments: string;
          }
        }>
      }
    }>
  }> {
    try {
      // Ensure the OpenAI client is available
      await this.clientService.ensureClient();
      
      // Get client from the client service
      const openai = this.clientService.getClient();
      
      // Perform the OpenAI chat completion
      const response = await openai.chat.completions.create({
        model: options.model || getOption(STORAGE_KEYS.CHATGPT_MODEL) || 'gpt-4o-mini',
        messages: options.messages.map(m => ({
          // Convert 'developer' to 'system' for OpenAI compatibility
          role: m.role === 'developer' ? 'system' : m.role as 'system' | 'user' | 'assistant',
          content: m.content
        })),
        tools: options.tools ? options.tools.map(tool => ({
          type: 'function' as const,
          function: {
            name: tool.function.name,
            description: tool.function.description,
            parameters: tool.function.parameters as Record<string, unknown>
          }
        })) : undefined,
        tool_choice: options.tool_choice ? {
          type: 'function' as const,
          function: { name: options.tool_choice.function.name }
        } : undefined,
        temperature: options.temperature,
        max_tokens: options.max_tokens,
        stream: false // Don't use stream for function calling
      });

      // Convert the response to expected format
      return {
        choices: response.choices.map(choice => ({
          message: {
            content: choice.message.content || undefined,
            tool_calls: choice.message.tool_calls?.map(toolCall => ({
              function: {
                name: toolCall.function.name,
                arguments: toolCall.function.arguments
              }
            }))
          }
        }))
      };
    } catch (error) {
      // Log the error
      LoggingUtils.logError(`Error calling language model: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Error in model completion call:', error);
      throw error;
    }
  }

  /**
   * Envia requisição para o modelo e processa o stream de resposta
   * Symbolic: Fluxo neural contínuo de processamento de linguagem
   */
  async streamModelResponse(messages: Array<{role: string; content: string}>): Promise<ModelStreamResponse> {
    try {      
      // Ensure the OpenAI client is available
      await this.clientService.ensureClient();
      
      // Get client from the client service
      const openai = this.clientService.getClient();
      
      // Create stream
      const stream = await openai.chat.completions.create({
        model: getOption(STORAGE_KEYS.CHATGPT_MODEL) || 'gpt-4o-mini',
        messages: messages.map(m => ({
          role: m.role === 'developer' ? 'system' : m.role as 'system' | 'user' | 'assistant',
          content: m.content
        })),
        stream: true,
        temperature: 0.7,
      });
      
      let fullResponse = '';
      let messageId = '';
      
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        fullResponse += content;
        
        if (!messageId && chunk.id) {
          messageId = chunk.id;
        }
      }
      
      return {
        responseText: fullResponse,
        messageId: messageId || Date.now().toString(),
        isComplete: true,
        isDone: true
      };
    } catch (error) {
      LoggingUtils.logError(`Error streaming model response: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}
