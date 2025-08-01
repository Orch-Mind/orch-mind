// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { DuckDBMatch } from "../../electron/vector-database/interfaces/IVectorDatabase";

// Import training types
interface TrainingConversation {
  id: string;
  messages: Array<{
    role: string;
    content: string;
  }>;
}

// Web search interfaces
export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  source?: string;
}

export interface WebSearchOptions {
  maxResults?: number;
  safeSearch?: boolean;
  timeRange?: "any" | "day" | "week" | "month" | "year";
}

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
    type:
      | "partial"
      | "complete"
      | "error"
      | "stream-start"
      | "stream-chunk"
      | "stream-end",
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

  // LoRA Training
  trainLoRAAdapter?: (params: {
    conversations: TrainingConversation[];
    baseModel: string;
    outputName: string;
    action?: "deploy_adapter";
    adapterId?: string;
  }) => Promise<{
    success: boolean;
    error?: string;
    adapterPath?: string;
    details?: {
      trainingExamples: number;
      modelName: string;
      trainingDuration: number;
      adapterId?: string;
      activeModel?: string;
      validationStatus?: "passed" | "failed" | "unknown";
      hasRealWeights?: boolean;
    };
  }>;

  // LoRA Adapter Deployment (Unsloth-compatible)
  deployLoRAAdapter?: (params: {
    adapterId: string;
    adapterName: string;
    baseModel: string;
    outputModelName: string;
    deploymentType: "unsloth_gguf" | "ollama_adapter" | "merged_model";
    adapterPath: string;
  }) => Promise<{
    success: boolean;
    error?: string;
    modelName?: string;
    deploymentDetails?: {
      adapterPath: string;
      ggufPath?: string;
      modelfilePath?: string;
      deploymentType: string;
      baseModel: string;
    };
  }>;

  deleteOllamaModel?: (modelName: string) => Promise<{
    success: boolean;
    error?: string;
  }>;

  // LoRA Adapter Merging
  mergeLoRAAdapters?: (request: {
    adapters: Array<{
      name: string;
      path: string;
      baseModel: string;
      checksum: string;
      weight?: number;
    }>;
    strategy: "arithmetic_mean" | "weighted_average" | "svd_merge";
    outputName: string;
    targetBaseModel: string;
  }) => Promise<{
    success: boolean;
    mergedAdapterPath?: string;
    metadata?: any;
    error?: string;
  }>;

  listMergedAdapters?: () => Promise<{
    success: boolean;
    adapters: Array<{
      name: string;
      path: string;
      metadata: any;
    }>;
    error?: string;
  }>;

  removeMergedAdapter?: (adapterName: string) => Promise<{
    success: boolean;
    error?: string;
  }>;

  // Delete adapter files from filesystem
  deleteAdapterFiles?: (adapterName: string) => Promise<{
    success: boolean;
    error?: string;
    message?: string;
    deletedFiles?: number;
    deletedDirs?: number;
  }>;

  shareMergedAdapter?: (adapterName: string) => Promise<{
    success: boolean;
    adapterInfo?: any;
    mergedAdapterPath?: string;
    error?: string;
  }>;

  importChatHistory: (params: {
    fileBuffer: Buffer | ArrayBuffer | Uint8Array;
    mode: string;
    user: string;
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
    startService: () => Promise<{
      success: boolean;
      message?: string;
      error?: string;
    }>;
  };

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
  // Dependency Management (Ollama only)
  checkDependencies: () => Promise<DependencyStatus>;
  installOllama: () => Promise<void>;
  getInstallInstructions: (dependency: "ollama") => Promise<string>;
  onInstallProgress: (
    callback: (progress: InstallProgress) => void
  ) => () => void;
  detectHardware: () => Promise<HardwareDetectionResult>;

  // P2P Methods
  p2pInitialize: () => Promise<{ success: boolean; error?: string }>;
  p2pJoinRoom: (topic: string) => Promise<{ success: boolean; error?: string }>;
  p2pLeaveRoom: () => Promise<{ success: boolean; error?: string }>;
  p2pShareAdapter: (modelName: string) => Promise<{
    success: boolean;
    adapterInfo?: any;
    error?: string;
  }>;
  p2pUnshareAdapter: (
    topic: string
  ) => Promise<{ success: boolean; error?: string }>;
  p2pRequestAdapter: (data: {
    topic: string;
    fromPeer?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  p2pDestroy: () => Promise<{ success: boolean; error?: string }>;
  p2pSendFile: (data: {
    peerId: string;
    filePath: string;
    metadata: any;
  }) => Promise<{ success: boolean; error?: string }>;
  p2pBroadcastAdapters: (adapters: any[]) => void;

  // P2P Event Listeners
  onP2PPeersUpdated: (callback: (count: number) => void) => () => void;
  onP2PRoomJoined: (callback: (data: any) => void) => () => void;
  onP2PRoomLeft: (callback: () => void) => () => void;
  onP2PAdaptersAvailable: (callback: (data: any) => void) => () => void;
  onP2PChunkReceived: (callback: (data: any) => void) => () => void;
  onP2PAdapterSavedToFilesystem: (callback: (data: any) => void) => () => void;

  // Training Progress Event Listener
  onTrainingProgress: (
    callback: (data: { progress: number; message: string }) => void
  ) => () => void;

  // Web Search Methods
  webSearch: (
    queries: string[],
    options?: WebSearchOptions
  ) => Promise<WebSearchResult[]>;
}

export interface DependencyStatus {
  ollama: {
    installed: boolean;
    version?: string;
    path?: string;
  };
}

export interface InstallProgress {
  dependency: "ollama";
  status: "checking" | "downloading" | "installing" | "completed" | "error";
  progress?: number;
  message: string;
  error?: string;
}

export interface HardwareDetectionResult {
  success: boolean;
  hardware?: {
    cpuCores: number;
    ramGB: number;
    gpu?: {
      vendor: string;
      model: string;
      vramGB: number;
      cuda: boolean;
    };
  };
  error?: string;
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
