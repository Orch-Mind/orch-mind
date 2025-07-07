// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

export class OllamaModelValidator {
  /**
   * Retorna sempre true - todos os modelos são compatíveis
   */
  static supportsFunctionCalling(modelName: string): boolean {
    return true;
  }

  /**
   * Valida o formato do nome do modelo
   */
  static isValidModelName(modelName: string): boolean {
    return !!modelName && modelName.length > 0;
  }

  /**
   * Extrai o nome base do modelo (sem a tag)
   */
  static getBaseModelName(modelName: string): string {
    return modelName.split(":")[0];
  }

  /**
   * Retorna o modelo padrão
   */
  static getDefaultModel(): string {
    return "gemma3:latest";
  }
}
