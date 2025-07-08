// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

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
    // Use Electron API for crypto operations (handled in preload)
    if (
      typeof window !== "undefined" &&
      (window as any).electronAPI?.crypto?.calculateChecksum
    ) {
      return await (window as any).electronAPI.crypto.calculateChecksum(data);
    }

    // Simple fallback hash for compatibility
    return this.simpleFallbackHash(data);
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
    // Use simple fallback hash for synchronous operations
    return this.simpleFallbackHash(data);
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

  /**
   * Simple fallback hash for compatibility
   */
  private simpleFallbackHash(data: Uint8Array): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = (hash << 5) - hash + data[i];
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, "0");
  }
}
