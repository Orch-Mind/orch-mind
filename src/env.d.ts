// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { NormalizedPineconeMatch } from "../electron/PineconeHelper";
import { DuckDBMatch } from "../electron/DuckDBHelper";

// <reference types="vite/client" />

interface ElectronAPI {
    openExternal: (url: string) => void
    toggleMainWindow: () => Promise<{ success: boolean; error?: string }>
    getPlatform: () => string
    openTranscriptionTooltip: (callback: () => void) => () => void;
    startTranscriptNeural: () => Promise<{ success: boolean; error?: string }>;
    stopTranscriptNeural: () => Promise<{ success: boolean; error?: string }>;
    sendNeuralPrompt: (temporaryContext?: string) => Promise<{ success: boolean; error?: string }>;
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
    sendAudioChunk: (chunk: Uint8Array) => Promise<{ success: boolean; error?: string }>;
    sendAudioTranscription: (text: string) => void;
    toogleNeuralRecording: (callback: () => void) => () => void;
    onForceStyle: (callback: (style: string) => void) => () => void
    onForceImprovisation: (callback: () => void) => () => void
    onRepeatResponse: (callback: () => void) => () => void
    onStopTTS: (callback: () => void) => () => void
    setDeepgramLanguage: (lang: string) => void
    queryPinecone: (
        embedding: number[],
        topK?: number,
        keywords?: string[],
        filters?: Record<string, unknown>
    ) => Promise<{ matches: NormalizedPineconeMatch[] }>;
    saveToPinecone: (
        vectors: Array<{ id: string, values: number[], metadata: Record<string, string | number | boolean> }>
    ) => Promise<{ success: boolean; error?: string }>;
    queryDuckDB: (embedding: number[], topK?: number, keywords?: string[], filters?: Record<string, unknown>) => Promise<{ matches: DuckDBMatch[] }>;
    saveToDuckDB: (vectors: Array<{ id: string, values: number[], metadata: Record<string, unknown> }>) => Promise<{ success: boolean; error?: string }>
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
    importChatHistory: (params: { fileBuffer: Buffer | ArrayBuffer | Uint8Array, mode: string, user: string, applicationMode?: string, onProgress?: (data: { processed: number; total: number; percentage?: number; stage?: string }) => void }) => Promise<{ success: boolean; error?: string; imported?: number; skipped?: number }>
}