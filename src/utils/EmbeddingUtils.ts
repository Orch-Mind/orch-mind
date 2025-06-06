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
  // HuggingFace models - apenas os disponíveis na UI via SUPPORTED_HF_EMBEDDING_MODELS
  if (model.includes('all-MiniLM-L6-v2')) return 384;
  if (model.includes('paraphrase-multilingual-MiniLM-L12-v2')) return 384;
  if (model.includes('all-mpnet-base-v2')) return 768;
  if (model.includes('multilingual-e5-small')) return 384;
  if (model.includes('multilingual-e5-base')) return 768;
  if (model.includes('bge-m3')) return 1024;
  
  // OpenAI models - modelos padrão do serviço OpenAI
  if (model.includes('text-embedding-3-large')) return 3072;
  if (model.includes('text-embedding-3-small')) return 1536;
  if (model.includes('text-embedding-ada-002')) return 1536;
  
  // Fallbacks baseados em padrões de nomenclatura
  if (model.includes('MiniLM') || model.includes('mini')) return 384; // Modelos mini/MiniLM geralmente são 384d
  if (model.includes('e5-large') || model.includes('large')) return 1024;
  if (model.includes('e5-base') || model.includes('base')) return 768;
  if (model.includes('e5-small') || model.includes('small')) return 384;
  
  // Default para modelos desconhecidos - dimensão intermediária mais comum
  return 768;
};
