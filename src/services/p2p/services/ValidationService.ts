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
  async calculateChecksum(data: Uint8Array): Promise<string> {
    // Use crypto for Node.js environment (convert Uint8Array to Buffer if needed)
    if (typeof window === "undefined") {
      const buffer = Buffer.from(data);
      return crypto.createHash("sha256").update(buffer).digest("hex");
    }

    // Use Web Crypto API for browser environment
    if (window.crypto?.subtle) {
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }

    // Fallback for environments without crypto support
    throw new Error("No crypto support available");
  }

  /**
   * Validate data against expected checksum
   */
  validateChecksum(data: Uint8Array, expectedChecksum: string): boolean {
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
  private calculateChecksumSync(data: Uint8Array): string {
    if (typeof window === "undefined") {
      const buffer = Buffer.from(data);
      return crypto.createHash("sha256").update(buffer).digest("hex");
    }
    throw new Error("Synchronous checksum not available in browser");
  }

  /**
   * Validate chunk integrity
   */
  validateChunk(chunkData: Uint8Array, expectedChecksum: string): boolean {
    return this.validateChecksum(chunkData, expectedChecksum);
  }

  /**
   * Calculate checksum for file chunks
   */
  async calculateChunkChecksums(
    data: Uint8Array,
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
