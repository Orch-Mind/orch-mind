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
   * Share an adapter
   */
  async shareAdapter(modelName: string): Promise<IAdapterInfo> {
    // Find model path
    const modelPath = await this.adapterRegistry.findModelPath(modelName);
    if (!modelPath) {
      throw new Error(`Model ${modelName} not found in Ollama`);
    }

    // Calculate file info
    const fileInfo = await this.fileTransfer.calculateFileInfo(modelPath);

    // Create adapter info
    const topic = crypto.randomBytes(32).toString("hex");
    const adapterInfo: IAdapterInfo = {
      name: modelName,
      size: fileInfo.size,
      checksum: fileInfo.checksum,
      topic,
      timestamp: Date.now(),
    };

    // Register adapter
    this.adapterRegistry.registerAdapter(adapterInfo);

    // Broadcast adapter list
    this.broadcastAdapterList();

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

    this.fileTransfer.on("transfer-complete", (topic) => {
      this.forwardToRenderers("p2p:transfer-complete", topic);
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
          this.handleAdapterList(peerId, message.data);
          break;

        case "adapter-request":
          this.handleAdapterRequest(peerId, message.data);
          break;

        case "adapter-chunk":
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
  private handleAdapterList(peerId: string, adapters: IAdapterInfo[]): void {
    this.forwardToRenderers("p2p:adapters-available", {
      from: peerId,
      adapters,
    });
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
   * Forward events to renderer windows
   */
  private forwardToRenderers(channel: string, data?: any): void {
    BrowserWindow.getAllWindows().forEach((window: BrowserWindow) => {
      window.webContents.send(channel, data);
    });
  }
}
