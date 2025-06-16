// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { DuckDBMatch } from "../../electron/vector-database/interfaces/IVectorDatabase";
import type { VllmStatus } from "../../electron/preload/interfaces/IElectronAPI";

export interface ElectronAPI {
  // Core window methods

  toggleMainWindow: () => Promise<{ success: boolean; error?: string }>;
  getPlatform: () => string;
  minimizeWindow: () => void;
  closeWindow: () => void;

  // 🔥 Functions for neural transcription
  startTranscriptNeural: () => Promise<{ success: boolean; error?: string }>;
  stopTranscriptNeural: () => Promise<{ success: boolean; error?: string }>;
  sendNeuralPrompt: (
    temporaryContext?: string
  ) => Promise<{ success: boolean; error?: string }>;
  clearNeuralTranscription: () => Promise<{ success: boolean; error?: string }>;

  // 📝 Events for neural transcription
  onRealtimeTranscription: (callback: (data: string) => void) => () => void;
  onNeuralStarted: (callback: () => void) => () => void;
  onNeuralStopped: (callback: () => void) => () => void;
  onNeuralError: (callback: (error: string) => void) => () => void;
  onPromptSend: (callback: () => void) => () => void;
  onPromptSending: (callback: () => void) => () => void;
  onPromptPartialResponse: (callback: (data: string) => void) => () => void;
  onPromptSuccess: (callback: (data: string) => void) => () => void;
  onPromptError: (callback: (error: string) => void) => () => void;
  onClearTranscription: (callback: () => void) => () => void;
  onSendChunk: (callback: (chunk: ArrayBuffer) => void) => () => void;

  // 📝 Method to get environment variables
  getEnv: (key: string) => Promise<string | null>;
  getPath: (
    name: "userData" | "temp" | "desktop" | "documents"
  ) => Promise<string>;
  requestMicrophonePermission: () => Promise<{
    success: boolean;
    status: string;
    error?: string;
  }>;
  sendAudioChunk: (
    chunk: Uint8Array
  ) => Promise<{ success: boolean; error?: string }>;
  sendAudioTranscription: (text: string) => void;
  toogleNeuralRecording: (callback: () => void) => () => void;

  setDeepgramLanguage: (lang: string) => void;

  // 📝 Method to send prompt updates directly
  sendPromptUpdate: (
    type: "partial" | "complete" | "error",
    content: string
  ) => void;

  // Pinecone IPC methods
  queryPinecone: (
    embedding: number[],
    topK?: number,
    keywords?: string[],
    filters?: Record<string, unknown>
  ) => Promise<{ matches: Array<{ metadata?: Record<string, unknown> }> }>;
  saveToPinecone: (
    vectors: Array<{
      id: string;
      values: number[];
      metadata: Record<string, unknown>;
    }>
  ) => Promise<void>;
  // DuckDB IPC methods (simplified)
  queryDuckDB: (
    embedding: number[],
    limit?: number,
    keywords?: string[],
    filters?: Record<string, unknown>,
    threshold?: number
  ) => Promise<{ matches: DuckDBMatch[] }>;
  saveToDuckDB: (
    vectors: Array<{
      id: string;
      values: number[];
      metadata: Record<string, unknown>;
    }>
  ) => Promise<{ success: boolean; error?: string }>;

  // Directory selection for DuckDB path
  selectDirectory: () => Promise<{
    success: boolean;
    path?: string;
    canceled?: boolean;
    error?: string;
  }>;

  // Reinitialize DuckDB with new path
  reinitializeDuckDB: (newPath: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
  importChatHistory: (params: {
    fileBuffer: Buffer | ArrayBuffer | Uint8Array;
    mode: string;
    user: string;
    applicationMode?: string;
    onProgress?: (data: {
      processed: number;
      total: number;
      percentage?: number;
      stage?: string;
    }) => void;
  }) => Promise<{
    success: boolean;
    error?: string;
    imported?: number;
    skipped?: number;
  }>;

  // VLLM APIs
  vllm?: {
    modelStatus: () => Promise<{
      success: boolean;
      status?: VllmStatus;
      error?: string;
    }>;
    startModel: (
      modelId: string
    ) => Promise<{ success: boolean; error?: string }>;
    generate: (
      payload: any
    ) => Promise<{ success: boolean; data?: any; error?: string }>;
    stopModel: () => Promise<{ success: boolean; error?: string }>;
    downloadModelOnly: (
      modelId: string
    ) => Promise<{ success: boolean; error?: string }>;
  };

  // Ollama APIs
  ollama?: {
    listModels: () => Promise<
      Array<{ name: string; id: string; size?: string }>
    >;
    pullModel: (
      modelId: string
    ) => Promise<{ success: boolean; error?: string }>;
    deleteModel: (
      modelId: string
    ) => Promise<{ success: boolean; error?: string }>;
    generate: (options: {
      model: string;
      prompt: string;
      stream?: boolean;
      temperature?: number;
      max_tokens?: number;
    }) => Promise<{ success: boolean; response?: string; error?: string }>;
    chat: (options: {
      model: string;
      messages: Array<{ role: string; content: string }>;
      stream?: boolean;
      temperature?: number;
      max_tokens?: number;
    }) => Promise<{ success: boolean; response?: string; error?: string }>;
    embeddings: (options: {
      model: string;
      prompt: string;
    }) => Promise<{ success: boolean; embedding?: number[]; error?: string }>;
    isRunning: () => Promise<{
      success: boolean;
      running?: boolean;
      error?: string;
    }>;
  };

  // Legacy VLLM methods (deprecated, use vllm.* instead)
  vllmModelStatus: () => Promise<{
    success: boolean;
    status?: VllmStatus;
    error?: string;
  }>;
  vllmStartModel: (
    modelId: string
  ) => Promise<{ success: boolean; error?: string }>;
  vllmGenerate: (
    payload: any
  ) => Promise<{ success: boolean; data?: any; error?: string }>;
  vllmStopModel: () => Promise<{ success: boolean; error?: string }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    electron: {
      ipcRenderer: {
        on: (channel: string, func: (...args: unknown[]) => void) => void;
        removeListener: (
          channel: string,
          func: (...args: unknown[]) => void
        ) => void;
      };
    };
    __LANGUAGE__: string;
    signalMonitoringInterval: NodeJS.Timeout;
    audioSignalDetected: boolean;
  }
}
