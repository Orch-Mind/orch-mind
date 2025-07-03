// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import * as crypto from "crypto";
import type { IValidator } from "../core/interfaces";

/**
 * Validation Service - Single Responsibility: Data Integrity
 * Handles checksum calculation and validation for P2P transfers
 */
export class ValidationService implements IValidator {
  /**
   * Calculate SHA-256 checksum of data
   */
  async calculateChecksum(data: Buffer): Promise<string> {
    // Use crypto for Node.js environment
    if (typeof window === "undefined") {
      return crypto.createHash("sha256").update(data).digest("hex");
    }

    // Use Web Crypto API for browser environment
    if (window.crypto?.subtle) {
      // Convert Buffer to Uint8Array for Web Crypto API compatibility
      const uint8Array = new Uint8Array(data);
      const hashBuffer = await window.crypto.subtle.digest(
        "SHA-256",
        uint8Array
      );
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }

    // Fallback for environments without crypto support
    throw new Error("No crypto support available");
  }

  /**
   * Validate data against expected checksum
   */
  validateChecksum(data: Buffer, expectedChecksum: string): boolean {
    try {
      // Synchronous validation for better performance
      const actualChecksum = this.calculateChecksumSync(data);
      return actualChecksum === expectedChecksum.toLowerCase();
    } catch (error) {
      console.error("Checksum validation error:", error);
      return false;
    }
  }

  /**
   * Synchronous checksum calculation for validation
   */
  private calculateChecksumSync(data: Buffer): string {
    if (typeof window === "undefined") {
      return crypto.createHash("sha256").update(data).digest("hex");
    }
    throw new Error("Synchronous checksum not available in browser");
  }

  /**
   * Validate chunk integrity
   */
  validateChunk(chunkData: Buffer, expectedChecksum: string): boolean {
    return this.validateChecksum(chunkData, expectedChecksum);
  }

  /**
   * Calculate checksum for file chunks
   */
  async calculateChunkChecksums(
    data: Buffer,
    chunkSize: number = 64 * 1024
  ): Promise<string[]> {
    const checksums: string[] = [];
    const totalChunks = Math.ceil(data.length / chunkSize);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, data.length);
      const chunk = data.slice(start, end);
      const checksum = await this.calculateChecksum(chunk);
      checksums.push(checksum);
    }

    return checksums;
  }
}
