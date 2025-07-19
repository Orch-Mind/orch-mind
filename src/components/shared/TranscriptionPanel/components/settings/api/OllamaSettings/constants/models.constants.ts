// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { OllamaModel } from "../types/ollama.types";

export const AVAILABLE_MODELS: OllamaModel[] = [
  // Main models that support tools/function calling
  {
    id: "gemma3:latest",
    name: "Gemma3 Latest",
    description: "Gemma3's latest model with excellent tools integration",
    size: "3.3GB",
    category: "main",
  },
  {
    id: "gemma3n:latest",
    name: "Gemma3n E4B",
    description: "Gemma3n E4B's latest model with excellent tools integration",
    size: "7.5GB",
    category: "main",
  },
  // Embedding models
  {
    id: "bge-m3:latest",
    name: "BGE-M3 Latest",
    description:
      "Advanced multilingual embedding model (dense + sparse + multi-vector)",
    size: "2.4GB",
    category: "embedding",
    isDownloaded: false,
    isDownloading: false,
  }
];

export const DEFAULT_STORAGE_PATH = "./orch-mind-memory";

export const OLLAMA_API_URLS = {
  LIST_MODELS: "http://localhost:11434/api/tags",
  PULL_MODEL: "http://localhost:11434/api/pull",
  DELETE_MODEL: "http://localhost:11434/api/delete",
} as const;
