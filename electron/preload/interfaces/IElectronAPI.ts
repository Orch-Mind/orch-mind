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

// Base types
export interface NeuralResponse {
  success: boolean;
  error?: string;
}

export interface NormalizedMatch {
  id: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface DuckDBMatch {
  id: string;
  score: number;
  metadata: Record<string, unknown>;
}

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
  
  saveVectors(
    vectors: Array<{ 
      id: string; 
      values: number[]; 
      metadata: Record<string, unknown> 
    }>
  ): Promise<void>;
}

// Environment Interface
export interface IEnvironmentManager {
  getEnv(key: string): Promise<string | null>;
}

// Communication Interface
export interface ICommunicationManager {
  sendPromptUpdate(type: 'partial' | 'complete' | 'error', content: string): void;
}

// Import Interface
export interface IImportManager {
  importChatHistory(params: {
    fileBuffer: Buffer | ArrayBuffer | Uint8Array;
    mode: string;
    user: string;
    applicationMode?: string; // Basic or Advanced mode
    onProgress?: (data: { 
      processed: number; 
      total: number; 
      percentage?: number; 
      stage?: string 
    }) => void;
  }): Promise<{ 
    success: boolean; 
    error?: string; 
    imported?: number; 
    skipped?: number 
  }>;
}

// DuckDB Command Interface
export interface IDuckDBCommander {
  duckdbCommand(command: string, data: any): Promise<any>;
}

// Complete Electron API Interface
export interface IElectronAPI extends 
  IWindowManager,
  INeuralProcessor,
  IEventSubscriber,
  IAudioProcessor,
  IEnvironmentManager,
  ICommunicationManager,
  IImportManager,
  IDuckDBCommander {
  
  // Legacy support for existing vector databases
  queryPinecone(
    embedding: number[], 
    topK?: number, 
    keywords?: string[], 
    filters?: Record<string, unknown>
  ): Promise<{ matches: NormalizedMatch[] }>;
  
  saveToPinecone(
    vectors: Array<{ 
      id: string; 
      values: number[]; 
      metadata: Record<string, unknown> 
    }>
  ): Promise<void>;
  
  queryDuckDB(
    embedding: number[], 
    limit?: number, 
    keywords?: string[], 
    filters?: Record<string, unknown>, 
    threshold?: number  // Optional - will be determined dynamically based on context
  ): Promise<{ matches: DuckDBMatch[] }>;
  
  saveDuckDB(
    vectors: Array<{ 
      id: string; 
      values: number[]; 
      metadata: Record<string, unknown> 
    }>
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
    vectors: Array<{ 
      id: string; 
      values: number[]; 
      metadata: Record<string, unknown> 
    }>
  ): Promise<{ success: boolean; error?: string }>;
} 