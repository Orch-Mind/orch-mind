// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { OrchOSMode } from '../../../../../../services/ModeService';

/**
 * Tipos para os componentes de configuração de APIs
 * Seguindo princípio de Interface Segregation do SOLID
 */

// Props base para todos componentes de API settings
export interface BaseApiSettingsProps {
  applicationMode: OrchOSMode;
}

// Props específicas para Pinecone
// Implementa o princípio de Segregação de Interface (ISP) do SOLID
// removendo dependências desnecessárias
export interface PineconeSettingsProps {
  pineconeApiKey: string;
  setPineconeApiKey: (value: string) => void;
}

// Props específicas para ChatGPT/OpenAI
export interface ChatGPTSettingsProps extends BaseApiSettingsProps {
  chatgptApiKey: string;
  setChatgptApiKey: (value: string) => void;
  chatgptModel: string;
  setChatgptModel: (value: string) => void;
  openaiEmbeddingModel: string;
  setOpenaiEmbeddingModel: (value: string) => void;
}

// Props específicas para HuggingFace
export interface HuggingFaceSettingsProps extends BaseApiSettingsProps {
  hfModel: string;
  setHfModel: (value: string) => void;
  hfEmbeddingModel: string;
  setHfEmbeddingModel: (value: string) => void;
  hfModelOptions?: Array<{id: string, label: string}>;
  hfEmbeddingModelOptions?: Array<{id: string, label: string}>;
  setApplicationMode?: (mode: OrchOSMode) => void; // Adicionado para suportar o botão no BasicModeSettings
}

// Props específicas para Deepgram
// Implementa o princípio de Segregação de Interface (ISP) do SOLID
// removendo dependências desnecessárias
export interface DeepgramSettingsProps {
  deepgramApiKey: string;
  setDeepgramApiKey: (value: string) => void;
  deepgramModel: string;
  setDeepgramModel: (value: string) => void;
  deepgramLanguage: string;
  setDeepgramLanguage: (value: string) => void;
}

// Props completas para o componente ApiSettings
export interface ApiSettingsProps {
  applicationMode: OrchOSMode;
  setApplicationMode: (mode: OrchOSMode) => void;
  // Pinecone
  pineconeApiKey: string;
  setPineconeApiKey: (value: string) => void;
  // ChatGPT
  chatgptApiKey: string;
  setChatgptApiKey: (value: string) => void;
  chatgptModel: string;
  setChatgptModel: (value: string) => void;
  openaiEmbeddingModel: string;
  setOpenaiEmbeddingModel: (value: string) => void;
  // HuggingFace
  hfModel: string;
  setHfModel: (value: string) => void;
  hfEmbeddingModel: string;
  setHfEmbeddingModel: (value: string) => void;
  // Deepgram
  deepgramApiKey: string;
  setDeepgramApiKey: (value: string) => void;
  deepgramModel: string;
  setDeepgramModel: (value: string) => void;
  deepgramLanguage: string;
  setDeepgramLanguage: (value: string) => void;
  // Navegação
  openSection: 'pinecone' | 'chatgpt' | 'deepgram' | null;
  setOpenSection: (section: 'pinecone' | 'chatgpt' | 'deepgram' | null) => void;
}
