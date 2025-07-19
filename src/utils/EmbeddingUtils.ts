// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * Utilitários para trabalhar com modelos de embedding
 * Implementa princípio DRY (Don't Repeat Yourself)
 */

/**
 * Retorna a dimensionalidade de um modelo de embedding com base em seu nome
 * Suporta apenas os modelos oficialmente disponíveis na UI do Orch-Mind
 * @param model Nome do modelo (Hugging Face ou OpenAI)
 * @returns Número de dimensões do embedding
 */
export const getModelDimensions = (model: string): number => {
  // Community models - modelos otimizados disponíveis na UI
  if (model.includes("all-MiniLM-L6-v2")) return 384;

  // Default para modelos desconhecidos - dimensão intermediária mais comum
  return 768;
};
