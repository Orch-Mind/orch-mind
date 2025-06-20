// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { IOpenAIService } from "../../../components/context/deepgram/interfaces/openai/IOpenAIService";
import { ProgressStage } from '../utils/progressReporter';

// ChatGPT data interfaces for artificial brain memory import
export interface ChatGPTMessageContent {
  content_type: string;
  parts: string[];
}

export interface ChatGPTMessageAuthor {
  role: "user" | "assistant" | "developer" | string;
  name?: string;
}

export interface ChatGPTMessage {
  id: string;
  author: ChatGPTMessageAuthor;
  create_time: number;
  content: ChatGPTMessageContent;
  parent?: string;
  children?: string[];
}

export interface ChatGPTMessageItem {
  message: ChatGPTMessage;
  parent?: string;
}

export interface ChatGPTSession {
  title: string;
  create_time: number;
  update_time: number;
  mapping: Record<string, ChatGPTMessageItem>;
}

// Interface for processed messages used in cognitive memory orchestration
export interface ProcessedMessage {
  role: string;
  content: string;
  timestamp: number | null;
  id: string | null;
  parent: string | null;
  session_title: string | null;
  session_create_time: number | null;
  session_update_time: number | null;
}

// Type for message chunks used in memory segmentation
export interface MessageChunk {
  original: ProcessedMessage;
  content: string;
  part?: number;
  totalParts?: number;
}

// Interface para vetores Pinecone
export interface PineconeVector {
  id: string;
  values: number[];
  metadata: Record<string, string | number | boolean | string[]>;
}

// Interface for progress information
export interface ProgressInfo {
  processed: number;
  total: number;
  percentage: number;
  stage: ProgressStage;
}

// Interface for import parameters (using DuckDB helper with legacy name for compatibility)
export interface ImportChatGPTParams {
  fileBuffer: Buffer;
  mode: "increment" | "overwrite";
  applicationMode?: "basic" | "advanced"; // Mode passed from renderer process
  openAIService?: IOpenAIService | null;
  pineconeHelper: any; // DuckDB helper with legacy interface name for compatibility
  onProgress?: (info: ProgressInfo) => void;
}

// Interface for import result
export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  totalMessagesInFile: number;
  mode: "increment" | "overwrite";
  error?: string;
}
