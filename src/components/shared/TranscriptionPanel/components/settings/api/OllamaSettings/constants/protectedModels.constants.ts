// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * Models that are protected from deletion
 * These models are essential for the system to function properly
 */
export const PROTECTED_MODELS = {
  MAIN_MODEL: "gemma3:latest",
  EMBEDDING_MODEL: "bge-m3:latest"
} as const;

/**
 * Array of all protected model IDs for easier checking
 */
export const PROTECTED_MODEL_IDS = Object.values(PROTECTED_MODELS);

/**
 * Check if a model is protected from deletion
 */
export const isProtectedModel = (modelId: string): boolean => {
  return PROTECTED_MODEL_IDS.includes(modelId as any);
};

/**
 * Get the default models to auto-select when a selected model is deleted
 */
export const getDefaultModelsForAutoSelection = () => {
  return {
    mainModel: PROTECTED_MODELS.MAIN_MODEL,
    embeddingModel: PROTECTED_MODELS.EMBEDDING_MODEL
  };
};
