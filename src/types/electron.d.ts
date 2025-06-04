// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

export interface ElectronAPI {
  // Core window methods

  toggleMainWindow: () => Promise<{ success: boolean; error?: string }>
  getPlatform: () => string
  minimizeWindow: () => void;
  closeWindow: () => void;

  // 🔥 Functions for neural transcription
  startTranscriptNeural: () => Promise<{ success: boolean; error?: string }>;
  stopTranscriptNeural: () => Promise<{ success: boolean; error?: string }>;
  sendNeuralPrompt: (temporaryContext?: string) => Promise<{ success: boolean; error?: string }>;
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
  sendAudioChunk: (chunk: Uint8Array) => Promise<{ success: boolean; error?: string }>;
  sendAudioTranscription: (text: string) => void;
  toogleNeuralRecording: (callback: () => void) => () => void;

  setDeepgramLanguage: (lang: string) => void
  
  // Pinecone IPC methods
  queryPinecone: (embedding: number[], topK?: number, keywords?: string[], filters?: Record<string, unknown>) => Promise<{ matches: Array<{ metadata?: Record<string, unknown> }> }>;
  saveToPinecone: (vectors: Array<{ id: string, values: number[], metadata: Record<string, unknown> }>) => Promise<void>;
  // DuckDB IPC methods (for basic mode)
  queryDuckDB: (embedding: number[], topK?: number, keywords?: string[], filters?: Record<string, unknown>) => Promise<{ matches: NormalizedDuckDBMatch[] }>;
  saveToDuckDB: (vectors: Array<{ id: string, values: number[], metadata: Record<string, unknown> }>) => Promise<void>
  // 📝 Method to send prompt updates directly
  sendPromptUpdate: (type: 'partial' | 'complete' | 'error', content: string) => void;

  importChatHistory: (params: { fileBuffer: Buffer | ArrayBuffer | Uint8Array, mode: string, user: string, onProgress?: (data: { processed: number; total: number; percentage?: number; stage?: string }) => void }) => Promise<{ success: boolean; error?: string; imported?: number; skipped?: number }>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
    electron: {
      ipcRenderer: {
        on: (channel: string, func: (...args: unknown[]) => void) => void
        removeListener: (
          channel: string,
          func: (...args: unknown[]) => void
        ) => void
      }
    }
    __LANGUAGE__: string
    signalMonitoringInterval: NodeJS.Timeout
    audioSignalDetected: boolean
  }
}

export { ElectronAPI };
