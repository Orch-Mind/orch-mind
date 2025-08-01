// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * Segregated Interfaces for Electron API
 *
 * Following Interface Segregation Principle:
 * - Each interface focuses on a specific domain
 * - Clients depend only on interfaces they actually use
 * - Easier to test and maintain
 */

// Import interfaces from our modular vector database architecture
import {
  DuckDBMatch,
  VectorData,
} from "../../vector-database/interfaces/IVectorDatabase";

// Base types
export interface NeuralResponse {
  success: boolean;
  error?: string;
}

// Legacy compatibility type alias
export interface NormalizedMatch extends DuckDBMatch {}

// Window Management Interface
export interface IWindowManager {
  toggleMainWindow(): Promise<NeuralResponse>;
  minimizeWindow(): void;
  closeWindow(): void;
  getPlatform(): string;
}

// Neural Processing Interface
export interface INeuralProcessor {
  startTranscriptNeural(): Promise<NeuralResponse>;
  stopTranscriptNeural(): Promise<NeuralResponse>;
  sendNeuralPrompt(temporaryContext?: string): Promise<NeuralResponse>;
  clearNeuralTranscription(): Promise<NeuralResponse>;
  setDeepgramLanguage(lang: string): void;
}

// Event Subscription Interface
export interface IEventSubscriber {
  onRealtimeTranscription(callback: (data: string) => void): () => void;
  onNeuralStarted(callback: () => void): () => void;
  onNeuralStopped(callback: () => void): () => void;
  onNeuralError(callback: (error: string) => void): () => void;
  onPromptSend(callback: () => void): () => void;
  onPromptSending(callback: () => void): () => void;
  onPromptPartialResponse(callback: (data: string) => void): () => void;
  onPromptSuccess(callback: (data: string) => void): () => void;
  onPromptError(callback: (error: string) => void): () => void;
  onClearTranscription(callback: () => void): () => void;
  onSendChunk(callback: (chunk: ArrayBuffer) => void): () => void;
  toogleNeuralRecording(callback: () => void): () => void;
}

// Audio Processing Interface
export interface IAudioProcessor {
  sendAudioChunk(chunk: Uint8Array): Promise<NeuralResponse>;
  sendAudioTranscription(text: string): void;
}

// Vector Database Interface
export interface IVectorDatabase {
  queryVectors(
    embedding: number[],
    topK?: number,
    keywords?: string[],
    filters?: Record<string, unknown>
  ): Promise<{ matches: NormalizedMatch[] }>;

  saveVectors(vectors: VectorData[]): Promise<void>;
}

// Environment Interface
export interface IEnvironmentManager {
  getEnv(key: string): Promise<string | null>;
  getPath(name: "userData" | "temp" | "desktop" | "documents"): Promise<string>;
  requestMicrophonePermission(): Promise<{
    success: boolean;
    status: string;
    error?: string;
  }>;
}

// Communication Interface
export interface ICommunicationManager {
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
}

// Import Interface
export interface IImportManager {
  importChatHistory(params: {
    fileBuffer: Buffer | ArrayBuffer | Uint8Array;
    mode: string;
    user: string;
    onProgress?: (data: {
      processed: number;
      total: number;
      percentage?: number;
      stage?: string;
    }) => void;
  }): Promise<{
    success: boolean;
    error?: string;
    imported?: number;
    skipped?: number;
  }>;
}

// DuckDB Command Interface
export interface IDuckDBCommander {
  duckdbCommand(command: string, data: any): Promise<any>;
}

// Hardware detection interface (without vLLM)
export interface HardwareInfo {
  cpuCores: number;
  ramGB: number;
  gpu?: {
    vendor: string;
    model: string;
    vramGB: number;
    cuda: boolean;
  };
}

// Ollama Support Types & Interface
export interface OllamaModel {
  id: string;
  name: string;
  description?: string;
  size?: string;
  category?: "main" | "embedding";
}

export interface IOllamaManager {
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
  startService(): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }>;
}

// Dependency Management Types
export interface DependencyStatus {
  ollama: {
    installed: boolean;
    version?: string;
    path?: string;
  };
  python: {
    installed: boolean;
    version?: string;
    path?: string;
  };
}

export interface InstallProgress {
  dependency: "ollama" | "python";
  status: "checking" | "downloading" | "installing" | "completed" | "error";
  progress?: number;
  message: string;
  error?: string;
}

export interface HardwareDetectionResult {
  success: boolean;
  hardware?: HardwareInfo;
  error?: string;
}

// P2P Share Types & Interface
export interface P2PAdapterInfo {
  name: string;
  topic: string;
  size: string;
  from?: string;
}

export interface IP2PShareManager {
  p2pInitialize(): Promise<{ success: boolean; error?: string }>;
  p2pCreateRoom(): Promise<{
    success: boolean;
    topic?: string;
    error?: string;
  }>;
  p2pJoinRoom(topic: string): Promise<{ success: boolean; error?: string }>;
  p2pLeaveRoom(): Promise<{ success: boolean; error?: string }>;
  p2pShareAdapter(modelName: string): Promise<{
    success: boolean;
    adapterInfo?: P2PAdapterInfo;
    error?: string;
  }>;
  p2pUnshareAdapter(
    topic: string
  ): Promise<{ success: boolean; error?: string }>;
  p2pBroadcastAdapters(
    adapters: P2PAdapterInfo[]
  ): Promise<{ success: boolean; error?: string }>;
  onP2PPeersUpdated(callback: (count: number) => void): () => void;
  onP2PAdaptersAvailable(
    callback: (data: { from: string; adapters: P2PAdapterInfo[] }) => void
  ): () => void;
}

// LoRA Training Types & Interface (existing)
export interface TrainingParams {
  conversations: Array<{
    id: string;
    messages: Array<{
      role: "user" | "assistant" | "system";
      content: string;
    }>;
  }>;
  baseModel: string;
  outputName: string;
}

export interface TrainingResult {
  success: boolean;
  adapterPath?: string;
  error?: string;
  details?: {
    trainingExamples: number;
    modelName: string;
    trainingDuration?: number;
  };
}

// LoRA Adapter Merging Types & Interface (new)
export interface AdapterMergeMetadata {
  sourceAdapters: Array<{
    id: string;
    name: string;
    baseModel: string;
    checksum: string;
    timestamp: string;
    author?: string;
    peers?: number;
  }>;
  mergeStrategy: "arithmetic_mean" | "weighted_average" | "svd_merge";
  mergeTimestamp: string;
  mergedBy: string;
  targetBaseModel: string;
  mergedAdapterPath: string;
  mergedChecksum: string;
}

export interface MergeRequest {
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
}

export interface MergeResult {
  success: boolean;
  mergedAdapterPath?: string;
  metadata?: AdapterMergeMetadata;
  error?: string;
}

export interface MergedAdapterInfo {
  name: string;
  path: string;
  metadata: AdapterMergeMetadata;
}

export interface ILoRAMergeManager {
  mergeLoRAAdapters(request: MergeRequest): Promise<MergeResult>;
  listMergedAdapters(): Promise<{
    success: boolean;
    adapters: MergedAdapterInfo[];
    error?: string;
  }>;
  removeMergedAdapter(adapterName: string): Promise<{
    success: boolean;
    error?: string;
  }>;
  shareMergedAdapter(adapterName: string): Promise<{
    success: boolean;
    adapterInfo?: {
      name: string;
      topic: string;
      size: string;
      metadata: AdapterMergeMetadata;
    };
    mergedAdapterPath?: string;
    error?: string;
  }>;
}

// Web Search Types & Interface
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

export interface IWebSearchManager {
  webSearch(
    queries: string[],
    options?: WebSearchOptions
  ): Promise<WebSearchResult[]>;
}

// Complete Electron API Interface
export interface IElectronAPI
  extends IWindowManager,
    INeuralProcessor,
    IEventSubscriber,
    IAudioProcessor,
    IEnvironmentManager,
    IImportManager,
    IDuckDBCommander,
    IP2PShareManager,
    ILoRAMergeManager,
    IWebSearchManager {
  
  // Ollama Manager as nested object
  ollama: IOllamaManager;
  // Legacy support for existing vector databases
  queryPinecone(
    embedding: number[],
    topK?: number,
    keywords?: string[],
    filters?: Record<string, unknown>
  ): Promise<{ matches: NormalizedMatch[] }>;

  saveToPinecone(vectors: VectorData[]): Promise<void>;

  queryDuckDB(
    embedding: number[],
    limit?: number,
    keywords?: string[],
    filters?: Record<string, unknown>,
    threshold?: number // Optional - will be determined dynamically based on context
  ): Promise<{ matches: DuckDBMatch[] }>;

  saveDuckDB(
    vectors: VectorData[]
  ): Promise<{ success: boolean; error?: string }>;

  // New DuckDB test and utility functions
  testDuckDB(): Promise<{
    success: boolean;
    results?: {
      vectorCount: number;
      queryResults: Array<{
        id: string;
        score: number;
        metadata: Record<string, unknown>;
      }>;
      testCompleted: boolean;
    };
    error?: string;
  }>;

  getDuckDBInfo(): Promise<{
    success: boolean;
    info?: {
      vectorCount: number;
      isInitialized: boolean;
      dbPath: string;
    };
    error?: string;
  }>;

  clearDuckDB(): Promise<{ success: boolean; error?: string }>;

  // Directory selection for DuckDB path
  selectDirectory(): Promise<{
    success: boolean;
    path?: string;
    canceled?: boolean;
    error?: string;
  }>;

  // Reinitialize DuckDB with new path
  reinitializeDuckDB(newPath: string): Promise<{
    success: boolean;
    error?: string;
  }>;

  // Legacy alias for backward compatibility
  saveToDuckDB(
    vectors: VectorData[]
  ): Promise<{ success: boolean; error?: string }>;

  // Dependency Management
  checkDependencies: () => Promise<DependencyStatus>;
  installOllama: () => Promise<void>;
  installPython: () => Promise<void>;
  getInstallInstructions: (dependency: "ollama" | "python") => Promise<string>;
  onInstallProgress: (
    callback: (progress: InstallProgress) => void
  ) => () => void;
  detectHardware: () => Promise<HardwareDetectionResult>;

  // Delete adapter files from filesystem
  deleteAdapterFiles(adapterName: string): Promise<{
    success: boolean;
    error?: string;
    message?: string;
    deletedFiles?: number;
    deletedDirs?: number;
  }>;
}
