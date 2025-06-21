// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * Utility para validar compatibilidade de modelos Ollama com function calling
 * Baseado na documentação oficial do Ollama: https://ollama.com/blog/tool-support
 */

export interface OllamaModelInfo {
  name: string;
  supportsFunctionCalling: boolean;
  recommended: boolean;
  description: string;
}

/**
 * Lista oficial de modelos que suportam function calling no Ollama
 * Filtrada conforme especificação do usuário - apenas modelos que aceitam tools
 */
export const OLLAMA_FUNCTION_CALLING_MODELS: OllamaModelInfo[] = [
  {
    name: "qwen3",
    supportsFunctionCalling: true,
    recommended: true,
    description: "Qwen 3 - Excelente suporte multilíngue e tools",
  },
  {
    name: "granite3.3:latest",
    supportsFunctionCalling: true,
    recommended: true,
    description: "Granite 3.3 Latest - Excelente integração com tools",
  },
];

export class OllamaModelValidator {
  /**
   * Verifica se um modelo suporta function calling
   */
  static supportsFunctionCalling(modelName: string): boolean {
    const baseModelName = modelName.split(":")[0];
    return OLLAMA_FUNCTION_CALLING_MODELS.some(
      (model) =>
        model.name === baseModelName || baseModelName.includes(model.name)
    );
  }

  /**
   * Obter informações sobre um modelo
   */
  static getModelInfo(modelName: string): OllamaModelInfo | null {
    const baseModelName = modelName.split(":")[0];
    return (
      OLLAMA_FUNCTION_CALLING_MODELS.find(
        (model) =>
          model.name === baseModelName || baseModelName.includes(model.name)
      ) || null
    );
  }

  /**
   * Obter lista de modelos recomendados para function calling
   */
  static getRecommendedModels(): OllamaModelInfo[] {
    return OLLAMA_FUNCTION_CALLING_MODELS.filter((model) => model.recommended);
  }

  /**
   * Obter o melhor modelo fallback para function calling
   */
  static getBestFallbackModel(): string {
    const recommended = this.getRecommendedModels();
    return recommended.length > 0
      ? `${recommended[0].name}:latest`
      : "qwen3:4b";
  }

  /**
   * Validar e sugerir modelo alternativo se necessário
   */
  static validateAndSuggest(modelName: string): {
    isValid: boolean;
    originalModel: string;
    suggestedModel?: string;
    reason?: string;
  } {
    if (this.supportsFunctionCalling(modelName)) {
      return {
        isValid: true,
        originalModel: modelName,
      };
    }

    const suggestedModel = this.getBestFallbackModel();
    return {
      isValid: false,
      originalModel: modelName,
      suggestedModel,
      reason: `Modelo ${modelName} não suporta function calling. Sugerido: ${suggestedModel}`,
    };
  }
}
