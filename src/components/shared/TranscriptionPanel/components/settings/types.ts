// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// Interfaces para props compartilhados entre componentes

export interface SettingsModalProps {
  show: boolean;
  onClose: () => void;
}

export interface SettingsNavigationProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export interface SettingsHeaderProps {
  onClose: () => void;
}

export interface SettingsFooterProps {
  onClose: () => void;
  saveSettings: () => void;
}

export type TabType =
  | "general"
  | "appearance"
  | "conversation"
  | "advanced"
  | "training"
  | "share";

export type OpenSectionType =
  | "pinecone"
  | "chatgpt"
  | "deepgram"
  | "ollama"
  | null;

// Interface para o state completo das configurações
export interface SettingsState {
  // Estado de navegação e seções
  openSection: OpenSectionType;
  setOpenSection: (section: OpenSectionType) => void;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;

  // General
  name: string;
  setName: (name: string) => void;
  enableMatrix: boolean;
  setEnableMatrix: (enable: boolean) => void;
  matrixDensity: number;
  setMatrixDensity: (density: number) => void;
  language: string;
  setLanguage: (language: string) => void;

  // ChatGPT, Deepgram & Pinecone
  chatgptApiKey: string;
  setChatgptApiKey: (key: string) => void;
  chatgptModel: string;
  setChatgptModel: (model: string) => void;
  chatgptTemperature: number;
  setChatgptTemperature: (temp: number) => void;
  chatgptMaxTokens: number;
  setChatgptMaxTokens: (tokens: number) => void;
  openaiEmbeddingModel: string;
  setOpenaiEmbeddingModel: (model: string) => void;

  // Deepgram
  deepgramApiKey: string;
  setDeepgramApiKey: (key: string) => void;
  deepgramModel: string;
  setDeepgramModel: (model: string) => void;
  deepgramLanguage: string;
  setDeepgramLanguage: (language: string) => void;
  deepgramTier: string;
  setDeepgramTier: (tier: string) => void;

  // Ollama
  ollamaModel: string;
  setOllamaModel: (model: string) => void;
  ollamaEmbeddingModel: string;
  setOllamaEmbeddingModel: (model: string) => void;
  ollamaEnabled: boolean;
  setOllamaEnabled: (enabled: boolean) => void;

  // Pinecone
  pineconeApiKey: string;
  setPineconeApiKey: (key: string) => void;
  pineconeEnvironment: string;
  setPineconeEnvironment: (env: string) => void;
  pineconeIndex: string;
  setPineconeIndex: (index: string) => void;

  // Debug
  debugMode: boolean;
  setDebugMode: (enable: boolean) => void;
  logLevel: string;
  setLogLevel: (level: string) => void;

  // Métodos
  saveSettings: () => void;
}

// Props específicos para ApiSettings (mantido para compatibilidade)
export interface ApiSettingsProps {
  pineconeApiKey: string;
  setPineconeApiKey: (key: string) => void;
  chatgptApiKey: string;
  setChatgptApiKey: (key: string) => void;
  chatgptModel: string;
  setChatgptModel: (model: string) => void;
  openaiEmbeddingModel: string;
  setOpenaiEmbeddingModel: (model: string) => void;
  deepgramApiKey: string;
  setDeepgramApiKey: (key: string) => void;
  deepgramModel: string;
  setDeepgramModel: (model: string) => void;
  deepgramLanguage: string;
  setDeepgramLanguage: (language: string) => void;
  // Ollama
  ollamaModel: string;
  setOllamaModel: (model: string) => void;
  ollamaEmbeddingModel: string;
  setOllamaEmbeddingModel: (model: string) => void;
  ollamaEnabled: boolean;
  setOllamaEnabled: (enabled: boolean) => void;
  openSection: OpenSectionType;
  setOpenSection: (section: OpenSectionType) => void;
}
