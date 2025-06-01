// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// OpenAICompletionService.ts
// Symbolic: Processamento de completions e function calling do modelo de linguagem

import { ICompletionService, ModelStreamResponse } from "../../../interfaces/openai/ICompletionService";
import { IClientManagementService } from "../../../interfaces/openai/IClientManagementService";
import { OrchOSModeEnum } from "../../../../../../services/ModeService";
import { ModeService } from "../../../../../../services/ModeService";
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
   * Obtém o modo atual do Orch-OS
   * Symbolic: Consulta estado global do sistema neural
   */
  private getCurrentMode(): OrchOSModeEnum {
    return ModeService.getMode();
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
      // Symbolic: If Orch-OS is in basic mode, use HuggingFaceLocalService for local inference
      if (this.getCurrentMode() === OrchOSModeEnum.BASIC) {
        try {
          // Import the local service dynamically to use local inference in basic mode
          const { HuggingFaceLocalService } = await import('../../../../../../services/huggingface/HuggingFaceLocalService');
          const huggingFaceLocal = new HuggingFaceLocalService();
          const modelId = getOption(STORAGE_KEYS.HF_MODEL) || 'onnx-community/Qwen2.5-0.5B-Instruct';
          await huggingFaceLocal.loadModel(modelId);
          
          // Symbolic: Map messages for neural-symbolic cortex compatibility
          const mappedMessages = options.messages.map(m => ({
            // Map possible 'developer' role to 'system' for compatibility
            role: m.role === 'developer' ? 'system' : (m.role as 'system' | 'user' | 'assistant'),
            content: m.content
          }));
          
          // Symbolic: If tools are provided, use function calling capabilities
          if (options.tools && options.tools.length > 0) {
            LoggingUtils.logInfo("Orch-OS Basic Mode: Using function calling with HuggingFace local model");
            
            // Symbolic: Neural pathway for function/tool execution with local model
            const result = await huggingFaceLocal.generateWithFunctions(
              mappedMessages,
              options.tools,
              {
                maxTokens: options.max_tokens || 512, // Increase max tokens for function calling
                temperature: options.temperature
              }
            );
            
            // Symbolic: Format response to match OpenAI API structure for consistent cortex processing
            return {
              choices: [
                {
                  message: result
                }
              ]
            };
          } else {
            // Standard text generation without functions
            const text = await huggingFaceLocal.generate(
              mappedMessages,
              {
                maxTokens: options.max_tokens,
                temperature: options.temperature
              }
            );
            
            return {
              choices: [
                {
                  message: {
                    content: text
                  }
                }
              ]
            };
          }
        } catch (error) {
          console.error('Error using HuggingFaceLocalService:', error);
          throw new Error(`Failed to generate text with local model: ${error}`);
        }
      }

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
      // If in basic mode, use a non-streaming approach since local models might not support streaming
      if (this.getCurrentMode() === OrchOSModeEnum.BASIC) {
        const { HuggingFaceLocalService } = await import('../../../../../../services/huggingface/HuggingFaceLocalService');
        const huggingFaceLocal = new HuggingFaceLocalService();
        const modelId = getOption(STORAGE_KEYS.HF_MODEL) || 'onnx-community/Qwen2.5-0.5B-Instruct';
        await huggingFaceLocal.loadModel(modelId);
        
        const mappedMessages = messages.map(m => ({
          role: m.role === 'developer' ? 'system' : (m.role as 'system' | 'user' | 'assistant'),
          content: m.content
        }));
        
        const text = await huggingFaceLocal.generate(mappedMessages, {
          maxTokens: 2048,
          temperature: 0.7
        });
        
        return {
          responseText: text,
          messageId: Date.now().toString(),
          isComplete: true,
          isDone: true
        };
      }
      
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
