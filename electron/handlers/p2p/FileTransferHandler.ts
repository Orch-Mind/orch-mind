// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import * as crypto from "crypto";
import { EventEmitter } from "events";
import { createReadStream } from "fs";
import * as fs from "fs/promises";
import type { IAdapterInfo } from "../../../src/services/p2p/core/interfaces";

/**
 * FileTransferHandler - Handles chunked file transfers on backend
 * Following SRP - only responsible for file transfer operations
 */
export class FileTransferHandler extends EventEmitter {
  private readonly CHUNK_SIZE = 64 * 1024; // 64KB chunks

  /**
   * Send file to peer in chunks using streams for large files
   */
  async sendFile(
    peer: any,
    filePath: string,
    metadata: IAdapterInfo
  ): Promise<void> {
    try {
      const stats = await fs.stat(filePath);
      const totalChunks = Math.ceil(stats.size / this.CHUNK_SIZE);

      console.log(
        `[FileTransfer] Sending ${
          metadata.name
        }: ${totalChunks} chunks (${this.formatFileSize(stats.size)})`
      );

      // Use stream to read file in chunks
      const stream = createReadStream(filePath, {
        highWaterMark: this.CHUNK_SIZE,
      });
      let chunkIndex = 0;

      return new Promise((resolve, reject) => {
        stream.on("data", async (chunk: Buffer) => {
          try {
            // Calculate chunk checksum
            const chunkChecksum = this.calculateChecksum(chunk);

            const message = {
              type: "adapter-chunk",
              data: {
                topic: metadata.topic,
                chunk: chunk.toString("base64"),
                index: chunkIndex,
                total: totalChunks,
                checksum: chunkChecksum,
                metadata: chunkIndex === 0 ? metadata : undefined, // Send metadata with first chunk
              },
            };

            peer.write(JSON.stringify(message));

            // Emit progress
            const progress = ((chunkIndex + 1) / totalChunks) * 100;
            this.emit("transfer-progress", {
              topic: metadata.topic,
              progress,
              sent: chunkIndex + 1,
              total: totalChunks,
            });

            chunkIndex++;

            // Small delay to avoid overwhelming the peer
            await this.delay(10);
          } catch (error) {
            stream.destroy();
            reject(error);
          }
        });

        stream.on("end", () => {
          console.log(`[FileTransfer] Completed sending ${metadata.name}`);
          this.emit("transfer-complete", metadata.topic);
          resolve();
        });

        stream.on("error", (error) => {
          console.error(`[FileTransfer] Error reading file:`, error);
          this.emit("transfer-error", {
            topic: metadata.topic,
            error: error instanceof Error ? error.message : "Unknown error",
          });
          reject(error);
        });
      });
    } catch (error) {
      console.error(`[FileTransfer] Error sending file:`, error);
      this.emit("transfer-error", {
        topic: metadata.topic,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Calculate file info including checksum using streams for large files
   */
  async calculateFileInfo(filePath: string): Promise<{
    size: number;
    checksum: string;
  }> {
    const stats = await fs.stat(filePath);

    // For large files, use streams to calculate checksum
    const checksum = await this.calculateChecksumFromStream(filePath);

    console.log(
      `[FileTransfer] Calculated info for ${filePath}: size=${
        stats.size
      }, checksum=${checksum.substring(0, 16)}...`
    );

    return {
      size: stats.size,
      checksum,
    };
  }

  /**
   * Calculate SHA-256 checksum from file stream (memory efficient for large files)
   */
  private calculateChecksumFromStream(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash("sha256");
      const stream = createReadStream(filePath);

      stream.on("data", (chunk) => {
        hash.update(chunk);
      });

      stream.on("end", () => {
        resolve(hash.digest("hex"));
      });

      stream.on("error", (error) => {
        reject(error);
      });
    });
  }

  /**
   * Calculate SHA-256 checksum for small data
   */
  private calculateChecksum(data: Buffer): string {
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private formatFileSize(size: number): string {
    if (size < 1024) {
      return size + " bytes";
    } else if (size < 1024 * 1024) {
      return (size / 1024).toFixed(2) + " KB";
    } else if (size < 1024 * 1024 * 1024) {
      return (size / (1024 * 1024)).toFixed(2) + " MB";
    } else {
      return (size / (1024 * 1024 * 1024)).toFixed(2) + " GB";
    }
  }
}
