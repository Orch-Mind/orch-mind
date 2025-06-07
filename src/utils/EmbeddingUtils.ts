// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * Utilitários para trabalhar com modelos de embedding
 * Implementa princípio DRY (Don't Repeat Yourself)
 */

/**
 * Retorna a dimensionalidade de um modelo de embedding com base em seu nome
 * Suporta apenas os modelos oficialmente disponíveis na UI do Orch-OS
 * @param model Nome do modelo (Hugging Face ou OpenAI)
 * @returns Número de dimensões do embedding
 */
export const getModelDimensions = (model: string): number => {
  // ONNX Community models - novos modelos ONNX otimizados disponíveis na UI
  if (model.includes("Qwen3-Embedding-0.6B-ONNX")) return 1024;
  if (model.includes("gte-multilingual-base")) return 768;

  // OpenAI models - modelos padrão do serviço OpenAI
  if (model.includes("text-embedding-3-large")) return 3072;
  if (model.includes("text-embedding-3-small")) return 1536;
  if (model.includes("text-embedding-ada-002")) return 1536;

  // Default para modelos desconhecidos - dimensão intermediária mais comum
  return 768;
};
