// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// TranscriptionTypes.ts
// Define types shared for the transcription service

import { OpenAI } from "openai";

// Base types
export type Role = "user" | "assistant" | "system";

export interface Message {
  role: Role;
  content: string;
}

// Interfaces for transcription
export interface SpeakerTranscription {
  text: string;
  timestamp: string;
  speaker: string;
  sent?: boolean; // Track if this transcription has been sent
}

export interface SpeakerSegment {
  speaker: string;
  text: string;
  showSpeaker: boolean;
}

// Interfaces for results and logs
export interface SpeakerMemoryResults {
  userContext: string;
  speakerContexts: Map<string, string>;
  temporaryContext: string;
}

export interface SpeakerTranscriptionLog {
  speaker: string;
  isUser: boolean;
  transcriptions: { text: string; timestamp: string }[];
}

// Interface for service configuration
export interface TranscriptionServiceConfig {
  primaryUserSpeaker: string;
  openai: OpenAI | null;
  apiKey: string;
  model: string;
  interimResultsEnabled: boolean;
  useSimplifiedHistory: boolean;
}

// Constants for consistent labels
export const EXTERNAL_SPEAKER_LABEL = "External Participant";
export const USER_HEADER = "🗣️ User Transcription";
export const EXTERNAL_HEADER = "🎤 External Transcription";
export const INSTRUCTIONS_HEADER = "🧠 Instructions";
export const MEMORY_USER_HEADER = "📦 User Memory";
export const MEMORY_INSTRUCTIONS_HEADER = "📦 Instructions Memory";
export const MEMORY_EXTERNAL_HEADER = "📦 External Memory";

// Interface for IPC events
export interface IPCHandlers {
  getEnv?: (key: string) => Promise<string>;
  onPromptPartialResponse?: (text: string) => void;
  onPromptSuccess?: (text: string) => void;
  onPromptError?: (text: string) => void;
  sendNeuralPrompt?: (context?: string) => void;
  queryPinecone?: (embedding: number[]) => Promise<Record<string, unknown>>;
  saveToPinecone?: (
    entries: Array<{
      id: string;
      values: number[];
      metadata: Record<string, unknown>;
    }>
  ) => Promise<void>;
}

// Interface for UI updates
export type UIUpdater = (
  updater: (prev: Record<string, unknown>) => Record<string, unknown>
) => void;
