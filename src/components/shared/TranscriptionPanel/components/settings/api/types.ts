// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * Tipos para os componentes de configuração de APIs
 * Seguindo princípio de Interface Segregation do SOLID
 * Interface unificada sem navegação por abas
 */
// Props específicas para Ollama
export interface OllamaSettingsProps {
  ollamaModel: string;
  setOllamaModel: (value: string) => void;
  ollamaEmbeddingModel: string;
  setOllamaEmbeddingModel: (value: string) => void;
  ollamaEnabled: boolean;
  setOllamaEnabled: (value: boolean) => void;
  storagePath?: string;
  setStoragePath?: (path: string) => void;
}

// Props completas para o componente ApiSettings (interface unificada)
export interface ApiSettingsProps {
  // Ollama
  ollamaModel: string;
  setOllamaModel: (value: string) => void;
  ollamaEmbeddingModel: string;
  setOllamaEmbeddingModel: (value: string) => void;
  ollamaEnabled: boolean;
  setOllamaEnabled: (value: boolean) => void;
}

// Tipos legados mantidos para compatibilidade (podem ser removidos gradualmente)
export interface PineconeSettingsProps {
  pineconeApiKey: string;
  setPineconeApiKey: (value: string) => void;
}

export interface ChatGPTSettingsProps {
  chatgptApiKey: string;
  setChatgptApiKey: (value: string) => void;
  chatgptModel: string;
  setChatgptModel: (value: string) => void;
  openaiEmbeddingModel: string;
  setOpenaiEmbeddingModel: (value: string) => void;
}

export interface DeepgramSettingsProps {
  deepgramApiKey: string;
  setDeepgramApiKey: (value: string) => void;
  deepgramModel: string;
  setDeepgramModel: (value: string) => void;
  deepgramLanguage: string;
  setDeepgramLanguage: (value: string) => void;
}
