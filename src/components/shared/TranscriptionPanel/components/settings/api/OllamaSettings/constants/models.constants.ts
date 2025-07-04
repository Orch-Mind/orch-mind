// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { OllamaModel } from "../types/ollama.types";

export const AVAILABLE_MODELS: OllamaModel[] = [
  // Main models that support tools/function calling
  {
    id: "qwen3:latest",
    name: "Qwen3 Latest (Thinking)",
    description: "Advanced reasoning model with tools support",
    size: "5.2GB",
    category: "main",
    isDownloaded: false,
    isDownloading: false,
  },
  {
    id: "llama3.1:latest",
    name: "Llama 3.1 Latest",
    description: "Llama's latest model with excellent tools integration",
    size: "4.9GB",
    category: "main",
    isDownloaded: false,
    isDownloading: false,
  },
  {
    id: "mistral-nemo:latest",
    name: "Mistral Nemo Latest",
    description: "Mistral's latest model with excellent tools integration",
    size: "7.1GB",
    category: "main",
    isDownloaded: false,
    isDownloading: false,
  },
  {
    id: "mistral:latest",
    name: "Mistral Latest",
    description: "Mistral's latest model with excellent tools integration",
    size: "4.1GB",
    category: "main",
    isDownloaded: false,
    isDownloading: false,
  },
  {
    id: "gemma3:latest",
    name: "Gemma3 Latest",
    description: "Gemma3's latest model with excellent tools integration",
    size: "3.3GB",
    category: "main",
  },
  {
    id: "gemma3n:e4b",
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
  },
  {
    id: "nomic-embed-text:latest",
    name: "Nomic Embed Text",
    description: "High-quality text embeddings",
    size: "274MB",
    category: "embedding",
    isDownloaded: false,
    isDownloading: false,
  },
  {
    id: "mxbai-embed-large:latest",
    name: "MxBai Embed Large",
    description: "Large embedding model for better accuracy",
    size: "670MB",
    category: "embedding",
    isDownloaded: false,
    isDownloading: false,
  },
];

export const DEFAULT_STORAGE_PATH = "./orch-os-memory";

export const OLLAMA_API_URLS = {
  LIST_MODELS: "http://localhost:11434/api/tags",
  PULL_MODEL: "http://localhost:11434/api/pull",
  DELETE_MODEL: "http://localhost:11434/api/delete",
} as const;
