// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import * as crypto from "crypto";
import { BrowserWindow } from "electron";
import type { IAdapterInfo } from "../../../src/services/p2p/core/interfaces";
import { AdapterRegistry } from "./AdapterRegistry";
import { FileTransferHandler } from "./FileTransferHandler";
import { P2PBackendManager } from "./P2PBackendManager";

/**
 * P2PCoordinator - Main coordinator for P2P operations
 * Facade pattern - provides simple API for complex backend operations
 */
export class P2PCoordinator {
  private backendManager: P2PBackendManager;
  private fileTransfer: FileTransferHandler;
  private adapterRegistry: AdapterRegistry;
  private initialized: boolean = false;

  constructor() {
    this.backendManager = new P2PBackendManager();
    this.fileTransfer = new FileTransferHandler();
    this.adapterRegistry = new AdapterRegistry();

    this.setupEventHandlers();
  }

  /**
   * Initialize P2P system
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.backendManager.initialize();
    this.initialized = true;

    console.log("[P2PCoordinator] Initialized");
  }

  /**
   * Join a room by topic
   */
  async joinRoom(topicHex: string): Promise<void> {
    await this.backendManager.joinRoom(topicHex);
  }

  /**
   * Leave current room
   */
  async leaveRoom(): Promise<void> {
    await this.backendManager.leaveRoom();
  }

  /**
   * Share an adapter with metadata
   */
  async shareAdapter(adapterName: string): Promise<IAdapterInfo> {
    console.log(`[P2PCoordinator] Attempting to share adapter: ${adapterName}`);

    // Find adapter safetensors file in project directory
    const adapterPath = await this.adapterRegistry.findModelPath(adapterName);
    console.log(
      `[P2PCoordinator] AdapterRegistry.findModelPath result: ${adapterPath}`
    );

    if (!adapterPath) {
      console.error(`[P2PCoordinator] Adapter not found: ${adapterName}`);
      throw new Error(
        `LoRA adapter ${adapterName} not found in project directory`
      );
    }

    // Get adapter metadata from registry
    const metadata = await this.adapterRegistry.getAdapterMetadata(adapterName);

    // Calculate file info
    const fileInfo = await this.fileTransfer.calculateFileInfo(adapterPath);

    // Create adapter info with metadata
    const topic = crypto.randomBytes(32).toString("hex");
    const adapterInfo: IAdapterInfo = {
      name: adapterName,
      size: fileInfo.size,
      checksum: fileInfo.checksum,
      topic,
      timestamp: Date.now(),
      // Include metadata for P2P sharing
      metadata: metadata
        ? {
            adapter_id: metadata.adapter_id,
            base_model: metadata.base_model,
            hf_model: metadata.hf_model,
            created_at: metadata.created_at,
            training_method: metadata.training_method,
            status: metadata.status,
            // Include file type info
            file_type: adapterPath.endsWith(".safetensors")
              ? "safetensors"
              : "pytorch",
            file_path: adapterPath,
          }
        : {
            file_type: adapterPath.endsWith(".safetensors")
              ? "safetensors"
              : "pytorch",
            file_path: adapterPath,
          },
    };

    // Register adapter
    this.adapterRegistry.registerAdapter(adapterInfo);

    // Broadcast adapter list
    this.broadcastAdapterList();

    console.log(`[P2PCoordinator] LoRA adapter ready for sharing:`, {
      name: adapterInfo.name,
      size: adapterInfo.size,
      type: adapterInfo.metadata?.file_type,
      hasMetadata: !!metadata,
    });

    return adapterInfo;
  }

  /**
   * Unshare an adapter
   */
  async unshareAdapter(topic: string): Promise<void> {
    this.adapterRegistry.unregisterAdapter(topic);
    this.broadcastAdapterList();
  }

  /**
   * Request an adapter from a peer
   */
  async requestAdapter(data: {
    topic: string;
    fromPeer?: string;
  }): Promise<void> {
    const message = {
      type: "adapter-request",
      data: { topic: data.topic },
    };

    this.backendManager.sendMessage(message, data.fromPeer);
  }

  /**
   * Destroy P2P system
   */
  async destroy(): Promise<void> {
    await this.backendManager.destroy();
    this.adapterRegistry.clear();
    this.initialized = false;

    console.log("[P2PCoordinator] Destroyed");
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Backend manager events
    this.backendManager.on("peers-updated", (count: number) => {
      this.forwardToRenderers("p2p:peers-updated", count);
    });

    this.backendManager.on("room-joined", (data: any) => {
      this.forwardToRenderers("p2p:room-joined", data);
    });

    this.backendManager.on("room-left", () => {
      this.forwardToRenderers("p2p:room-left");
    });

    this.backendManager.on("peer-message", ({ peerId, data }) => {
      this.handlePeerMessage(peerId, data);
    });

    // File transfer events
    this.fileTransfer.on("transfer-progress", (data) => {
      this.forwardToRenderers("p2p:transfer-progress", data);
    });

    this.fileTransfer.on("transfer-complete", (data) => {
      this.handleAdapterDownloadComplete(data);
    });
  }

  /**
   * Handle incoming peer messages
   */
  private handlePeerMessage(peerId: string, data: Buffer): void {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case "adapter-list":
          // Extract adapters from message and pass to handleAdapterList
          let adaptersArray: any[] = [];
          if (Array.isArray(message.adapters)) {
            adaptersArray = message.adapters;
          } else if (Array.isArray(message.data)) {
            adaptersArray = message.data;
          } else if (Array.isArray(message)) {
            adaptersArray = message;
          }
          this.handleAdapterList(peerId, adaptersArray);
          break;

        case "adapter-request":
          this.handleAdapterRequest(peerId, message.data);
          break;

        case "adapter-chunk":
          this.fileTransfer.handleReceivedChunk(message.data);
          this.forwardToRenderers("p2p:chunk-received", message.data);
          break;
      }
    } catch (error) {
      console.error("[P2PCoordinator] Error handling peer message:", error);
    }
  }

  /**
   * Handle adapter list from peer
   */
  private handleAdapterList(peerId: string, adapters: any[]): void {
    // Validate peerId
    if (!peerId || peerId.trim() === "") {
      console.warn(`[P2PCoordinator] Invalid peerId received: "${peerId}"`);
      return;
    }

    // Ensure we have a valid array
    const adapterArray = Array.isArray(adapters) ? adapters : [];

    console.log(
      `[P2PCoordinator] Received adapter list from ${peerId}: ${adapterArray.length} adapters`
    );

    // Log detailed adapter information for debugging
    console.log(
      `[P2PCoordinator] Adapter details:`,
      adapterArray.map((adapter) => ({
        name: adapter?.name || "MISSING_NAME",
        topic: adapter?.topic
          ? adapter.topic.slice(0, 8) + "..."
          : "MISSING_TOPIC",
        size: adapter?.size || "MISSING_SIZE",
        hasValidStructure: !!(adapter?.name && adapter?.topic),
      }))
    );

    // Filter out invalid adapters
    const validAdapters = adapterArray.filter((adapter) => {
      if (!adapter || !adapter.name || !adapter.topic) {
        console.warn(
          `[P2PCoordinator] Filtering out invalid adapter:`,
          adapter
        );
        return false;
      }
      return true;
    });

    if (validAdapters.length !== adapterArray.length) {
      console.warn(
        `[P2PCoordinator] Filtered out ${
          adapterArray.length - validAdapters.length
        } invalid adapters`
      );
    }

    // Always send in the expected format: {from: string, adapters: array}
    const messageData = {
      from: peerId,
      adapters: validAdapters,
    };

    console.log(`[P2PCoordinator] Forwarding to renderers:`, {
      from: peerId,
      adapterCount: validAdapters.length,
      adapterNames: validAdapters.map((a) => a.name),
    });

    this.forwardToRenderers("p2p:adapters-available", messageData);
  }

  /**
   * Handle adapter request from peer
   */
  private async handleAdapterRequest(
    peerId: string,
    data: { topic: string }
  ): Promise<void> {
    const adapter = this.adapterRegistry.getAdapter(data.topic);
    if (!adapter) return;

    const modelPath = await this.adapterRegistry.findModelPath(adapter.name);
    if (!modelPath) return;

    const peer = this.backendManager.getPeer(peerId);
    if (!peer) return;

    // Send file in chunks
    await this.fileTransfer.sendFile(peer, modelPath, adapter);
  }

  /**
   * Broadcast adapter list to all peers
   */
  private broadcastAdapterList(): void {
    const adapters = this.adapterRegistry.getAllAdapters();
    const message = {
      type: "adapter-list",
      data: adapters,
    };

    this.backendManager.sendMessage(message);
  }

  /**
   * Handle adapter download completion and save to filesystem
   */
  private async handleAdapterDownloadComplete(data: {
    topic: string;
    buffer: Buffer;
    metadata: IAdapterInfo;
  }): Promise<void> {
    try {
      await this.saveDownloadedAdapter(data.buffer, data.metadata);
      this.forwardToRenderers("p2p:transfer-complete", data.topic);
    } catch (error) {
      console.error("[P2PCoordinator] Error saving downloaded adapter:", error);
      this.forwardToRenderers("p2p:transfer-error", {
        topic: data.topic,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Save downloaded adapter to project filesystem
   */
  private async saveDownloadedAdapter(
    buffer: Buffer,
    metadata: IAdapterInfo
  ): Promise<void> {
    const fs = await import("fs/promises");
    const path = await import("path");

    // Get project root directory (4 levels up from this file)
    const currentDir = path.dirname(__filename);
    const projectRoot = path.resolve(currentDir, "../../../..");

    // Create adapter directories
    const weightsDir = path.join(projectRoot, "lora_adapters", "weights");
    const registryDir = path.join(projectRoot, "lora_adapters", "registry");

    await fs.mkdir(weightsDir, { recursive: true });
    await fs.mkdir(registryDir, { recursive: true });

    // Create adapter directory
    const adapterDir = path.join(weightsDir, `${metadata.name}_adapter`);
    await fs.mkdir(adapterDir, { recursive: true });

    // Determine file extension based on metadata
    const fileExtension =
      metadata.metadata?.file_type === "safetensors" ? ".safetensors" : ".bin";
    const fileName = `adapter_model${fileExtension}`;
    const adapterFilePath = path.join(adapterDir, fileName);

    // Save adapter file
    await fs.writeFile(adapterFilePath, buffer);
    console.log(`[P2PCoordinator] Saved adapter file: ${adapterFilePath}`);

    // Create registry metadata
    const registryMetadata = {
      adapter_id: metadata.metadata?.adapter_id || metadata.name,
      adapter_name: `${metadata.name}_adapter`,
      base_model: metadata.metadata?.base_model || "unknown",
      hf_model: metadata.metadata?.hf_model || "unknown",
      adapter_path: adapterDir,
      created_at: metadata.metadata?.created_at || new Date().toISOString(),
      downloaded_at: new Date().toISOString(),
      enabled: false,
      training_method: metadata.metadata?.training_method || "downloaded_p2p",
      status: "downloaded",
      source: "p2p",
      file_type: metadata.metadata?.file_type || "unknown",
      original_size: metadata.size,
      checksum: metadata.checksum,
    };

    // Save registry file
    const registryFilePath = path.join(
      registryDir,
      `${metadata.name}_adapter.json`
    );
    await fs.writeFile(
      registryFilePath,
      JSON.stringify(registryMetadata, null, 2)
    );
    console.log(
      `[P2PCoordinator] Saved registry metadata: ${registryFilePath}`
    );

    console.log(
      `[P2PCoordinator] Successfully saved downloaded adapter: ${metadata.name}`
    );

    // Notify renderer to add adapter to training tab localStorage
    this.forwardToRenderers("p2p:adapter-saved-to-filesystem", {
      adapterName: metadata.name,
      metadata: registryMetadata,
      filesystem: {
        adapterPath: adapterDir,
        registryPath: registryFilePath,
      },
    });
  }

  /**
   * Forward events to renderer windows
   */
  private forwardToRenderers(channel: string, data?: any): void {
    // Debug logging for adapters-available events
    if (channel === "p2p:adapters-available") {
      console.log(
        `[P2PCoordinator] Forwarding ${channel}:`,
        JSON.stringify(data, null, 2)
      );
    }

    BrowserWindow.getAllWindows().forEach((window: BrowserWindow) => {
      window.webContents.send(channel, data);
    });
  }
}
