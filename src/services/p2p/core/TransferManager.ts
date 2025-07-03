// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { ValidationService } from "../services/ValidationService";
import { p2pEventBus } from "./EventBus";
import type { IAdapterInfo, IFileTransfer } from "./interfaces";

/**
 * TransferManager - Single Responsibility: File Transfer Management
 * Handles chunked file transfers with integrity validation
 */
export class TransferManager implements IFileTransfer {
  private validationService: ValidationService;
  private transfers: Map<string, TransferState> = new Map();
  private progressCallbacks: Map<string, (progress: number) => void> =
    new Map();
  private readonly CHUNK_SIZE = 64 * 1024; // 64KB chunks

  constructor() {
    this.validationService = new ValidationService();
    this.setupEventListeners();
  }

  /**
   * Send file to a peer in chunks
   */
  async sendFile(
    peerId: string,
    filePath: string,
    metadata: IAdapterInfo
  ): Promise<void> {
    // This will be handled by Electron main process
    if (typeof window !== "undefined" && window.electronAPI) {
      const result = await (window.electronAPI as any).p2pSendFile({
        peerId,
        filePath,
        metadata,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to send file");
      }
    }
  }

  /**
   * Receive file from topic
   */
  async receiveFile(topic: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const transfer: TransferState = {
        topic,
        chunks: [],
        totalChunks: 0,
        receivedChunks: 0,
        metadata: null,
      };

      this.transfers.set(topic, transfer);

      // Set timeout for transfer
      const timeout = setTimeout(() => {
        this.transfers.delete(topic);
        reject(new Error("Transfer timeout"));
      }, 60000); // 60 seconds timeout

      // Wait for transfer completion
      const checkComplete = () => {
        if (
          transfer.receivedChunks === transfer.totalChunks &&
          transfer.totalChunks > 0
        ) {
          clearTimeout(timeout);

          try {
            const completeData = this.assembleChunks(transfer);

            // Validate complete file checksum
            if (
              transfer.metadata &&
              !this.validationService.validateChecksum(
                completeData,
                transfer.metadata.checksum
              )
            ) {
              throw new Error("File checksum validation failed");
            }

            this.transfers.delete(topic);
            resolve(completeData);
          } catch (error) {
            this.transfers.delete(topic);
            reject(error);
          }
        }
      };

      // Check periodically
      const interval = setInterval(checkComplete, 100);

      // Cleanup on completion
      transfer.cleanup = () => {
        clearTimeout(timeout);
        clearInterval(interval);
      };
    });
  }

  /**
   * Set progress callback for a transfer
   */
  onProgress(callback: (progress: number) => void): void {
    // Store callback for next transfer
    this.progressCallbacks.set("default", callback);
  }

  /**
   * Handle incoming chunk
   */
  private handleChunk(data: any): void {
    const { topic, chunk, index, total, checksum, metadata } = data;

    const transfer = this.transfers.get(topic);
    if (!transfer) return;

    // Update metadata on first chunk
    if (!transfer.metadata && metadata) {
      transfer.metadata = metadata;
      transfer.totalChunks = total;
      transfer.chunks = new Array(total);
    }

    // Validate chunk - Convert base64 to Buffer using browser APIs
    const chunkBuffer = this.base64ToBuffer(chunk);
    if (!this.validationService.validateChunk(chunkBuffer, checksum)) {
      p2pEventBus.emit(
        "transfer:error",
        topic,
        new Error("Chunk validation failed")
      );
      return;
    }

    // Store chunk
    transfer.chunks[index] = chunkBuffer;
    transfer.receivedChunks++;

    // Calculate and emit progress
    const progress = (transfer.receivedChunks / transfer.totalChunks) * 100;
    p2pEventBus.emit("transfer:progress", topic, progress);

    // Call progress callback if set
    const callback =
      this.progressCallbacks.get(topic) ||
      this.progressCallbacks.get("default");
    if (callback) {
      callback(progress);
    }

    // Check if transfer is complete
    if (transfer.receivedChunks === transfer.totalChunks) {
      const completeData = this.assembleChunks(transfer);
      p2pEventBus.emit("transfer:complete", topic, completeData);
    }
  }

  /**
   * Convert base64 string to Buffer using browser APIs
   */
  private base64ToBuffer(base64: string): Buffer {
    // Use browser's atob for base64 decoding
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return Buffer.from(bytes);
  }

  /**
   * Assemble chunks into complete buffer
   */
  private assembleChunks(transfer: TransferState): Buffer {
    const chunks = transfer.chunks.filter((chunk) => chunk !== undefined);
    if (chunks.length !== transfer.totalChunks) {
      throw new Error("Missing chunks in transfer");
    }
    return Buffer.concat(chunks);
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    if (typeof window !== "undefined" && window.electronAPI) {
      (window.electronAPI as any).onP2PChunkReceived?.((data: any) => {
        this.handleChunk(data);
      });
    }
  }

  /**
   * Cleanup transfers
   */
  cleanup(): void {
    this.transfers.forEach((transfer) => {
      if (transfer.cleanup) {
        transfer.cleanup();
      }
    });
    this.transfers.clear();
    this.progressCallbacks.clear();
  }
}

// Internal transfer state
interface TransferState {
  topic: string;
  chunks: Buffer[];
  totalChunks: number;
  receivedChunks: number;
  metadata: IAdapterInfo | null;
  cleanup?: () => void;
}
