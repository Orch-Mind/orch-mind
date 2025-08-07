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
  private adapterSyncInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.backendManager = new P2PBackendManager();
    this.fileTransfer = new FileTransferHandler();
    this.adapterRegistry = new AdapterRegistry();

    this.setupEventHandlers();
  }

  /**
   * Get this peer's ID
   */
  private get peerId(): string {
    return this.backendManager.getOwnPeerId();
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

    // Check if adapter is already shared by this peer
    const existingAdapters = this.adapterRegistry.getAllAdapters();
    const existingAdapter = existingAdapters.find(
      adapter => adapter.name === adapterName && adapter.topic === this.peerId
    );
    
    if (existingAdapter) {
      console.log(`[P2PCoordinator] Adapter ${adapterName} already shared by this peer with topic: ${existingAdapter.topic}`);
      return existingAdapter;
    }

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
    console.log(`[P2PCoordinator] Unsharing adapter with topic: ${topic}`);
    
    const adapter = this.adapterRegistry.getAdapter(topic);
    if (adapter) {
      console.log(`[P2PCoordinator] Found adapter to unshare: ${adapter.name}`);
    } else {
      console.warn(`[P2PCoordinator] Adapter with topic ${topic} not found in registry`);
    }
    
    this.adapterRegistry.unregisterAdapter(topic);
    console.log(`[P2PCoordinator] Adapter unregistered from local registry`);
    
    // Get remaining adapters after unregistration
    const remainingAdapters = this.adapterRegistry.getAllAdapters();
    console.log(`[P2PCoordinator] Remaining adapters after unshare: ${remainingAdapters.length}`);
    
    this.broadcastAdapterList();
    console.log(`[P2PCoordinator] Broadcasted updated adapter list to peers`);
  }

  /**
   * Check if an adapter exists in the filesystem
   */
  async checkAdapterExists(adapterName: string): Promise<string | null> {
    console.log(
      `[P2PCoordinator] Checking existence of adapter: ${adapterName}`
    );
    return await this.adapterRegistry.findModelPath(adapterName);
  }

  /**
   * Request adapter download
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
    // Stop adapter synchronization before destroying
    this.stopAdapterSync();
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
      
      // CRITICAL FIX: Broadcast adapter list when new peers connect
      // This ensures that when a peer joins, they immediately see available adapters
      // without needing to wait for manual sharing actions
      if (count > 0) {
        console.log(`[P2PCoordinator] New peer(s) detected (${count} total), broadcasting adapter list`);
        // Small delay to ensure peer connection is fully established
        setTimeout(() => {
          // Broadcast our adapters to new peers
          this.broadcastAdapterList();
          
          // Also request adapter lists from all connected peers
          // This ensures bidirectional synchronization
          this.requestAdapterListsFromPeers();
        }, 1000);
      }
    });

    this.backendManager.on("room-joined", (data: unknown) => {
      this.forwardToRenderers("p2p:room-joined", data);
      
      // ENHANCEMENT: Broadcast adapter list when joining a room
      // This ensures that our adapters are immediately available to peers in the room
      console.log("[P2PCoordinator] Joined room, broadcasting adapter list");
      setTimeout(() => {
        this.broadcastAdapterList();
        this.requestAdapterListsFromPeers();
      }, 2000); // Longer delay for room joining to ensure full connection
      
      // Start periodic adapter synchronization
      this.startAdapterSync();
    });

    this.backendManager.on("room-left", () => {
      this.forwardToRenderers("p2p:room-left");
      
      // Stop periodic adapter synchronization when leaving room
      this.stopAdapterSync();
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
          let adaptersArray: IAdapterInfo[] = [];
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

        case "request-adapter-list":
          // ENHANCEMENT: Handle requests for adapter list from peers
          console.log(`[P2PCoordinator] Peer ${peerId} requested adapter list`);
          this.broadcastAdapterList();
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
    console.log(`[P2PCoordinator] Broadcasting adapter list: ${adapters.length} adapters`);
    console.log(`[P2PCoordinator] Adapter names being broadcast:`, adapters.map(a => a.name));
    
    const message = {
      type: "adapter-list",
      data: adapters,
    };

    this.backendManager.sendMessage(message);
    console.log(`[P2PCoordinator] Adapter list message sent to all peers`);
  }

  /**
   * Request adapter lists from all connected peers
   * This ensures we get the latest adapter information when new connections are made
   */
  private requestAdapterListsFromPeers(): void {
    try {
      const message = {
        type: "request-adapter-list",
        timestamp: Date.now(),
      };

      this.backendManager.sendMessage(message);
      console.log("[P2PCoordinator] Requested adapter lists from all connected peers");
    } catch (error) {
      console.error("[P2PCoordinator] Error requesting adapter lists:", error);
    }
  }

  /**
   * Start periodic adapter synchronization
   * This ensures adapter lists stay synchronized even if messages are lost
   */
  private startAdapterSync(): void {
    // Clear any existing interval
    this.stopAdapterSync();
    
    // Sync every 30 seconds
    this.adapterSyncInterval = setInterval(() => {
      console.log("[P2PCoordinator] Periodic adapter sync");
      this.broadcastAdapterList();
    }, 30000);
    
    console.log("[P2PCoordinator] Started periodic adapter synchronization");
  }

  /**
   * Stop periodic adapter synchronization
   */
  private stopAdapterSync(): void {
    if (this.adapterSyncInterval) {
      clearInterval(this.adapterSyncInterval);
      this.adapterSyncInterval = null;
      console.log("[P2PCoordinator] Stopped periodic adapter synchronization");
    }
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

    // Use the same project root resolution logic as AdapterRegistry
    const projectRoot = this.getProjectRoot();

    // Create adapter directories
    const weightsDir = path.join(projectRoot, "lora_adapters", "weights");
    const registryDir = path.join(projectRoot, "lora_adapters", "registry");

    await fs.mkdir(weightsDir, { recursive: true });
    await fs.mkdir(registryDir, { recursive: true });

    // Create adapter directory
    const adapterDir = path.join(weightsDir, metadata.name);
    await fs.mkdir(adapterDir, { recursive: true });

    // Determine file extension based on metadata
    const fileExtension =
      metadata.metadata?.file_type === "safetensors" ? ".safetensors" : ".bin";
    const fileName = `adapter_model${fileExtension}`;
    const adapterFilePath = path.join(adapterDir, fileName);

    // Save adapter file
    await fs.writeFile(adapterFilePath, buffer);
    console.log(`[P2PCoordinator] Saved adapter file: ${adapterFilePath}`);

    // Create adapter_config.json (required for deploy/share)
    const adapterConfig = {
      base_model_name_or_path: metadata.metadata?.base_model || "unknown",
      bias: "none",
      fan_in_fan_out: false,
      inference_mode: true,
      init_lora_weights: true,
      layers_pattern: null,
      layers_to_transform: null,
      loftq_config: {},
      lora_alpha: (metadata.metadata && typeof metadata.metadata === 'object' && 'lora_alpha' in metadata.metadata) ? (metadata.metadata as { lora_alpha: number }).lora_alpha : 16,
      lora_dropout: (metadata.metadata && typeof metadata.metadata === 'object' && 'lora_dropout' in metadata.metadata) ? (metadata.metadata as { lora_dropout: number }).lora_dropout : 0.05,
      megatron_config: null,
      megatron_core: "megatron.core",
      modules_to_save: null,
      peft_type: "LORA",
      r: (metadata.metadata && typeof metadata.metadata === 'object' && 'lora_rank' in metadata.metadata) ? (metadata.metadata as { lora_rank: number }).lora_rank : 8,
      rank_pattern: {},
      revision: null,
      target_modules: (metadata.metadata && typeof metadata.metadata === 'object' && 'target_modules' in metadata.metadata) ? (metadata.metadata as { target_modules: string[] }).target_modules : ["q_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
      task_type: "CAUSAL_LM",
      use_dora: false,
      use_rslora: false
    };
    
    const adapterConfigPath = path.join(adapterDir, "adapter_config.json");
    await fs.writeFile(
      adapterConfigPath,
      JSON.stringify(adapterConfig, null, 2)
    );
    console.log(`[P2PCoordinator] Created adapter config: ${adapterConfigPath}`);

    // Create registry metadata
    const registryMetadata = {
      adapter_id: metadata.metadata?.adapter_id || metadata.name,
      adapter_name: metadata.name,
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
      `${metadata.name}.json`
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
   * Get project root directory using the same logic as AdapterRegistry
   */
  private getProjectRoot(): string {
    const { app } = require("electron");
    const path = require("path");
    const fs = require("fs");
    const os = require("os");

    console.log(`[P2PCoordinator] 🔍 DEBUG Project Root Resolution:`);
    console.log(`[P2PCoordinator]   - app.isPackaged: ${app.isPackaged}`);
    console.log(`[P2PCoordinator]   - process.cwd(): ${process.cwd()}`);
    console.log(`[P2PCoordinator]   - __dirname: ${__dirname}`);
    console.log(`[P2PCoordinator]   - __filename: ${__filename}`);

    // Platform-specific paths
    let userDataDir: string;
    if (process.platform === "win32") {
      userDataDir = path.join(os.homedir(), "AppData", "Local", "Programs");
    } else if (process.platform === "darwin") {
      userDataDir = path.join(os.homedir(), "Library", "Application Support", "Orch-Mind");
    } else {
      userDataDir = path.join(os.homedir(), ".local", "share", "orch-mind");
    }

    const potentialPaths = [
      process.cwd(), // Current working directory (prioritize for development)
      userDataDir, // Platform-specific user data directory
      path.resolve(__dirname, "../../../.."), // Relative to this file
      app.getAppPath(), // Electron app path
      path.dirname(process.resourcesPath || ""), // Parent of resources path
    ];

    console.log(`[P2PCoordinator]   - userDataDir: ${userDataDir}`);
    console.log(`[P2PCoordinator]   - potentialPaths:`, potentialPaths);

    // Find the first path that contains lora_adapters directory
    for (const potentialPath of potentialPaths) {
      if (!potentialPath) continue;

      try {
        const loraAdaptersPath = path.join(potentialPath, "lora_adapters");
        console.log(`[P2PCoordinator]   - Checking: ${loraAdaptersPath}`);

        if (fs.existsSync(loraAdaptersPath)) {
          console.log(`[P2PCoordinator] ✅ Found project root: ${potentialPath}`);
          return potentialPath;
        }
      } catch (error) {
        console.log(`[P2PCoordinator]   - Error checking ${potentialPath}:`, error);
        continue;
      }
    }

    // If no existing lora_adapters found, use userDataDir and create structure
    console.log(`[P2PCoordinator] ⚠️ No existing lora_adapters found, using userDataDir: ${userDataDir}`);
    
    try {
      const loraAdaptersPath = path.join(userDataDir, "lora_adapters");
      const weightsPath = path.join(loraAdaptersPath, "weights");
      const registryPath = path.join(loraAdaptersPath, "registry");
      
      fs.mkdirSync(weightsPath, { recursive: true });
      fs.mkdirSync(registryPath, { recursive: true });
      
      console.log(`[P2PCoordinator] ✅ Created lora_adapters structure in: ${userDataDir}`);
    } catch (error) {
      console.warn(`[P2PCoordinator] Failed to create lora_adapters structure:`, error);
    }
    
    return userDataDir;
  }

  /**
   * Forward events to renderer windows
   */
  private forwardToRenderers(channel: string, data?: unknown): void {
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
