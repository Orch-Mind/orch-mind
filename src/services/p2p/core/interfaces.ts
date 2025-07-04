// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * Core P2P Interfaces following Interface Segregation Principle
 * Each interface has a single responsibility
 */

// Connection Management
export interface IP2PConnection {
  connect(topic: string): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getPeersCount(): number;
}

// Room Management
export interface IP2PRoom {
  type: "general" | "local" | "private";
  code?: string;
  topic: string;
  peersCount: number;
}

// Adapter Information
export interface IAdapterInfo {
  name: string;
  size: number;
  checksum: string;
  topic: string;
  timestamp?: number;
  metadata?: {
    adapter_id?: string;
    base_model?: string;
    hf_model?: string;
    created_at?: string;
    training_method?: string;
    status?: string;
    file_type: 'safetensors' | 'pytorch';
    file_path?: string;
  };
}

// File Transfer
export interface IFileTransfer {
  sendFile(
    peerId: string,
    filePath: string,
    metadata: IAdapterInfo
  ): Promise<void>;
  receiveFile(topic: string): Promise<Buffer>;
  onProgress(callback: (progress: number) => void): void;
}

// Chunk Management
export interface IChunk {
  index: number;
  total: number;
  data: Buffer;
  checksum: string;
}

// Validation
export interface IValidator {
  validateChecksum(data: Buffer, expectedChecksum: string): boolean;
  calculateChecksum(data: Buffer): Promise<string>;
}

// Event Types
export interface IP2PEvents {
  "peer:connected": (peerId: string) => void;
  "peer:disconnected": (peerId: string) => void;
  "peers:updated": (count: number) => void;
  "room:joined": (room: IP2PRoom) => void;
  "room:left": () => void;
  "adapters:available": (data: {
    from: string;
    adapters: IAdapterInfo[];
  }) => void;
  "transfer:progress": (topic: string, progress: number) => void;
  "transfer:complete": (topic: string, data: Buffer) => void;
  "transfer:error": (topic: string, error: Error) => void;
  "download:progress": (data: {
    adapterName: string;
    progress: number;
    downloadedBytes: number;
    totalBytes: number;
  }) => void;
}
