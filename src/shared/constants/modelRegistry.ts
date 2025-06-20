// SPDX-License-Identifier: MIT OR Apache-2.0
// Dynamic Model Registry - API-based model discovery
// No hardcoded models - everything comes from Ollama API with default versions

export enum ModelSource {
  LOCAL = "local",
  WEB = "web",
}

export interface LocalModelMeta {
  /** API model name (e.g., "llama3.2", "qwen3") */
  id: string;
  /** UI display name */
  label: string;
  /** Ollama repo name - always using default/latest tag */
  repo: string;
  /** Estimated size in GB (from API) */
  sizeGB: number;
  /** Model family/type */
  family?: string;
  /** Whether model is currently installed */
  isInstalled?: boolean;
  /** Last modified timestamp from API */
  modified?: string;
}

/**
 * Normalizes model names to use default versions only
 * Always strips version tags to use latest/default
 */
export function normalizeModelName(modelName: string): string {
  // Remove any existing tags to always use default
  const baseName = modelName.split(":")[0];

  // Convert underscores to dots for proper model names
  const cleanName = baseName.replace(/_/g, ".");

  // Return clean model name without any version tags
  // Ollama will automatically use the default/latest version
  return cleanName;
}

/**
 * Converts model name to display-friendly format
 */
export function getDisplayName(modelName: string): string {
  const baseName = normalizeModelName(modelName);

  // Convert to title case and add proper spacing
  return baseName
    .split(".")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * Estimates model size category for UI purposes
 */
export function getModelSizeCategory(
  sizeGB: number
): "small" | "medium" | "large" {
  if (sizeGB < 3) return "small";
  if (sizeGB < 8) return "medium";
  return "large";
}

/**
 * Gets minimum RAM requirement based on model size
 */
export function getMinRamRequirement(sizeGB: number): number {
  // Rule of thumb: model size * 2 for comfortable inference
  return Math.max(4, Math.ceil(sizeGB * 2));
}
