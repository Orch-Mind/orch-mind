// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { DuckDBMatch } from "../electron/vector-database/interfaces/IVectorDatabase";

// <reference types="vite/client" />

type VllmStatus =
  import("../electron/preload/interfaces/IElectronAPI").VllmStatus;

interface ElectronAPI {
  openExternal: (url: string) => void;
  toggleMainWindow: () => Promise<{ success: boolean; error?: string }>;
  getPlatform: () => string;
  openTranscriptionTooltip: (callback: () => void) => () => void;
  startTranscriptNeural: () => Promise<{ success: boolean; error?: string }>;
  stopTranscriptNeural: () => Promise<{ success: boolean; error?: string }>;
  sendNeuralPrompt: (
    temporaryContext?: string
  ) => Promise<{ success: boolean; error?: string }>;
  clearNeuralTranscription: () => Promise<{ success: boolean; error?: string }>;
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
  getEnv: (key: string) => Promise<string | null>;
  sendAudioChunk: (
    chunk: Uint8Array
  ) => Promise<{ success: boolean; error?: string }>;
  sendAudioTranscription: (text: string) => void;
  toogleNeuralRecording: (callback: () => void) => () => void;
  onForceStyle: (callback: (style: string) => void) => () => void;
  onForceImprovisation: (callback: () => void) => () => void;
  onRepeatResponse: (callback: () => void) => () => void;
  onStopTTS: (callback: () => void) => () => void;
  setDeepgramLanguage: (lang: string) => void;
  sendPromptUpdate: (
    type:
      | "partial"
      | "complete"
      | "error"
      | "stream-start"
      | "stream-chunk"
      | "stream-end",
    content: string
  ) => void;
  // Pinecone methods removed - using DuckDB only
  queryDuckDB: (
    embedding: number[],
    topK?: number,
    keywords?: string[],
    filters?: Record<string, unknown>
  ) => Promise<{ matches: DuckDBMatch[] }>;
  saveToDuckDB: (
    vectors: Array<{
      id: string;
      values: number[];
      metadata: Record<string, unknown>;
    }>
  ) => Promise<{ success: boolean; error?: string }>;
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
  listModels(): Promise<OllamaModel[]>;
  getAvailableModels(): Promise<OllamaModel[]>;
  downloadModel(
    modelId: string,
    onProgress?: (progress: number, speed: string, eta: string) => void
  ): Promise<boolean>;
  cancelDownload(modelId: string): Promise<void>;
  removeModel(modelId: string): Promise<void>;
  testConnection(): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }>;
  // Dependency Management
  checkDependencies: () => Promise<DependencyStatus>;
  installOllama: () => Promise<void>;
  installDocker: () => Promise<void>;
  getInstallInstructions: (dependency: "ollama" | "docker") => Promise<string>;
  onInstallProgress: (
    callback: (progress: InstallProgress) => void
  ) => () => void;
}
