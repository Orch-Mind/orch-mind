// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// Componentes principais para Ollama
export { default as ApiNavigation } from "./ApiNavigation";
export { default as BasicModeSettings } from "./BasicModeSettings";
export { default as OllamaSettings } from "./OllamaSettings";

// Componentes legados mantidos para compatibilidade (podem ser removidos gradualmente)
export { default as ChatGPTSettings } from "./ChatGPTSettings";
export { default as DeepgramSettings } from "./DeepgramSettings";
export { default as HuggingFaceSettings } from "./HuggingFaceSettings";
export { default as PineconeSettings } from "./PineconeSettings";

// Tipos
export * from "./types";
