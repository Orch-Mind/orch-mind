// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// IDeepgramService.ts
// Interfaces for Deepgram services

import { ListenLiveClient } from "@deepgram/sdk";

// Connection states with Deepgram
export enum ConnectionState {
  CLOSED = "CLOSED",
  CONNECTING = "CONNECTING",
  OPEN = "OPEN",
  ERROR = "ERROR",
  STOPPED = "STOPPED"
}

// Interface for the Deepgram connection service
export interface IDeepgramConnectionService {
  connectToDeepgram: (language?: string) => Promise<void>;
  disconnectFromDeepgram: () => Promise<void>;
  getConnectionStatus: () => any;
  hasActiveConnection: () => boolean;
  waitForConnectionState: (targetState: ConnectionState, timeoutMs?: number) => Promise<boolean>;
  sendAudioChunk: (blob: Blob | Uint8Array) => Promise<boolean>;
  getConnection: () => ListenLiveClient | null;
  cleanup: () => void;
}

// Interface for the Deepgram transcription service
export interface IDeepgramTranscriptionService {
  connect: (language?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  startProcessing: () => Promise<void>;
  stopProcessing: () => Promise<void>;
  setModel: (model: string) => void;
  toggleInterimResults: (enabled: boolean) => void;
  reset: () => void;
  isConnected: () => boolean;
  
  // Transcription prompt processing methods
  sendTranscriptionPrompt: (temporaryContext?: string) => Promise<void>;
  sendTranscriptionPromptWithHuggingFace: (temporaryContext?: string) => Promise<void>;
  
  // Language management methods
  setProcessingLanguage: (language: string) => void;
  getProcessingLanguage: () => string;
  
  // Processing state methods
  isProcessingPromptRequest: () => boolean;
}

// Interface for the Deepgram audio analyzer service
export interface IAudioAnalyzer {
  analyzeAudioBuffer: (buffer: ArrayBufferLike) => AudioAnalysisResult;
  testAudioQuality: () => Promise<AudioQualityResult>;
}

// Interface for audio analysis results
export interface AudioAnalysisResult {
  valid: boolean;
  details: {
    format?: string;
    sampleRate?: number;
    channels?: number;
    reason?: string;
  };
}

export interface AudioQualityResult {
  valid: boolean;
  reason?: string;
  details?: {
    [key: string]: any;
  };
} 