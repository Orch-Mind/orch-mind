// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * Configurações avançadas para tool calling no Ollama
 * Baseado na documentação oficial: https://ollama.com/blog/tool-support
 */

export interface OllamaToolConfig {
  // Força o modelo a usar tools quando disponíveis
  forceToolUsage: boolean;

  // Adiciona instruções explícitas no system prompt para usar tools
  enhanceSystemPromptForTools: boolean;

  // Timeout para respostas com tools (ms)
  toolResponseTimeout: number;

  // Número máximo de tentativas para obter tool calls
  maxToolRetries: number;

  // Modelo padrão caso nenhum esteja configurado
  defaultModel: string;

  // Configurações gerais para todos os modelos
  defaultConfig: {
    temperature?: number;
    num_ctx?: number;
  };
}

/**
 * Configuração padrão otimizada para tool calling
 */
export const DEFAULT_OLLAMA_TOOL_CONFIG: OllamaToolConfig = {
  forceToolUsage: true,
  enhanceSystemPromptForTools: true,
  toolResponseTimeout: 30000, // 30 segundos
  maxToolRetries: 3,

  // Modelo padrão caso nenhum esteja configurado
  defaultModel: "gemma3:latest",

  // Configurações gerais para todos os modelos
  defaultConfig: {
    temperature: 0.1,
    num_ctx: 8192,
  },
};

/**
 * Helpers para trabalhar com configurações de tool
 */
export class OllamaToolConfigHelper {
  /**
   * Obtém a configuração padrão para qualquer modelo
   */
  static getModelConfig(
    config: OllamaToolConfig = DEFAULT_OLLAMA_TOOL_CONFIG
  ) {
    return config.defaultConfig || {};
  }
}
