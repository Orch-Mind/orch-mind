// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// @ts-ignore - b4a doesn't have official TypeScript types
import b4a from "b4a";
import * as crypto from "crypto";
import { BrowserWindow, ipcMain } from "electron";
import { EventEmitter } from "events";
import * as fs from "fs/promises";
import * as path from "path";

// Interface para mensagens P2P
interface P2PMessage {
  type: "adapter-list" | "adapter-request" | "adapter-data" | "adapter-chunk";
  data: any;
}

interface AdapterInfo {
  name: string;
  size: number;
  checksum: string;
  topic: string;
}

// Classe para gerenciar compartilhamento P2P
class P2PShareManager extends EventEmitter {
  private swarm: any = null;
  private discovery: any = null;
  private sharedAdapters: Map<string, AdapterInfo> = new Map();
  private downloadQueue: Map<string, { chunks: Buffer[]; totalSize: number }> =
    new Map();
  private connections: Set<any> = new Set();

  constructor() {
    super();
  }

  async initialize(): Promise<void> {
    try {
      // Dynamic import to handle cases where hyperswarm might not be installed
      // @ts-ignore - hyperswarm doesn't have official TypeScript types
      const { default: Hyperswarm } = await import("hyperswarm");
      this.swarm = new Hyperswarm();

      // Setup connection handlers
      this.swarm.on("connection", (peer: any) => {
        this.handleNewPeer(peer);
      });

      this.swarm.on("update", () => {
        this.emit("peers-updated", this.connections.size);
      });

      console.log("[P2P] Hyperswarm initialized successfully");
    } catch (error) {
      console.error("[P2P] Failed to initialize Hyperswarm:", error);
      throw new Error(
        "Hyperswarm not available. Please install it with: npm install hyperswarm"
      );
    }
  }

  private handleNewPeer(peer: any): void {
    const peerId = b4a.toString(peer.remotePublicKey, "hex").substring(0, 6);
    console.log(`[P2P] New peer connected: ${peerId}`);

    this.connections.add(peer);

    peer.on("data", (data: Buffer) => {
      this.handlePeerMessage(peer, data);
    });

    peer.on("error", (error: Error) => {
      console.error(`[P2P] Peer error from ${peerId}:`, error);
    });

    peer.on("close", () => {
      console.log(`[P2P] Peer disconnected: ${peerId}`);
      this.connections.delete(peer);
      this.emit("peers-updated", this.connections.size);
    });

    // Send our adapter list to the new peer
    this.sendAdapterList(peer);
  }

  private handlePeerMessage(peer: any, data: Buffer): void {
    try {
      const message: P2PMessage = JSON.parse(data.toString());

      switch (message.type) {
        case "adapter-list":
          this.handleAdapterList(peer, message.data);
          break;
        case "adapter-request":
          this.handleAdapterRequest(peer, message.data);
          break;
        case "adapter-chunk":
          this.handleAdapterChunk(peer, message.data);
          break;
      }
    } catch (error) {
      console.error("[P2P] Error handling peer message:", error);
    }
  }

  private handleAdapterList(peer: any, adapters: AdapterInfo[]): void {
    const peerId = b4a.toString(peer.remotePublicKey, "hex").substring(0, 6);
    this.emit("adapters-available", {
      from: peerId,
      adapters,
    });
  }

  private async handleAdapterRequest(
    peer: any,
    data: { topic: string }
  ): Promise<void> {
    const adapter = this.sharedAdapters.get(data.topic);
    if (!adapter) return;

    try {
      // Get adapter file path from Ollama
      const modelPath = await this.getOllamaModelPath(adapter.name);
      if (!modelPath) {
        console.error(`[P2P] Model path not found for ${adapter.name}`);
        return;
      }

      // Read file and send in chunks
      const fileData = await fs.readFile(modelPath);
      const chunkSize = 64 * 1024; // 64KB chunks
      const totalChunks = Math.ceil(fileData.length / chunkSize);

      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, fileData.length);
        const chunk = fileData.slice(start, end);

        const chunkMessage: P2PMessage = {
          type: "adapter-chunk",
          data: {
            topic: data.topic,
            chunk: chunk.toString("base64"),
            index: i,
            total: totalChunks,
            size: fileData.length,
          },
        };

        peer.write(JSON.stringify(chunkMessage));
      }
    } catch (error) {
      console.error(`[P2P] Error sending adapter ${adapter.name}:`, error);
    }
  }

  private handleAdapterChunk(peer: any, data: any): void {
    const { topic, chunk, index, total, size } = data;

    if (!this.downloadQueue.has(topic)) {
      this.downloadQueue.set(topic, {
        chunks: new Array(total),
        totalSize: size,
      });
    }

    const download = this.downloadQueue.get(topic)!;
    download.chunks[index] = b4a.from(chunk, "base64");

    // Check if all chunks received
    if (download.chunks.every((c) => c !== undefined)) {
      const completeData = Buffer.concat(download.chunks);
      this.emit("adapter-downloaded", {
        topic,
        data: completeData,
      });
      this.downloadQueue.delete(topic);
    }
  }

  private sendAdapterList(peer?: any): void {
    const message: P2PMessage = {
      type: "adapter-list",
      data: Array.from(this.sharedAdapters.values()),
    };

    const data = JSON.stringify(message);

    if (peer) {
      peer.write(data);
    } else {
      // Broadcast to all peers
      this.connections.forEach((p) => p.write(data));
    }
  }

  async createRoom(): Promise<string> {
    const topic = crypto.randomBytes(32);
    const topicHex = b4a.toString(topic, "hex");
    await this.joinRoom(topicHex);
    return topicHex;
  }

  async joinRoom(topicHex: string): Promise<void> {
    if (!this.swarm) {
      throw new Error("P2P not initialized");
    }

    console.log(`[P2P] Joining room with topic: ${topicHex}`);
    const topic = b4a.from(topicHex, "hex");

    // Log network interfaces for debugging
    try {
      const os = await import("os");
      const interfaces = os.networkInterfaces();
      console.log("[P2P] Network interfaces:");
      Object.keys(interfaces).forEach((name) => {
        interfaces[name]?.forEach((iface) => {
          if (!iface.internal) {
            console.log(`[P2P]   ${name}: ${iface.address} (${iface.family})`);
          }
        });
      });
    } catch (e) {
      console.log("[P2P] Could not list network interfaces:", e);
    }

    this.discovery = this.swarm.join(topic, { client: true, server: true });

    // Add discovery event handlers for debugging
    this.discovery.on("peer", (peer: any) => {
      console.log("[P2P] Discovery: Found peer via DHT/mDNS");
    });

    await this.discovery.flushed();
    console.log("[P2P] Room joined, discovery flushed");

    this.emit("room-joined", topicHex);
  }

  async leaveRoom(): Promise<void> {
    if (this.discovery) {
      console.log("[P2P] Destroying discovery to unannounce from DHT...");
      await this.discovery.destroy();
      this.discovery = null;
    }

    this.connections.forEach((peer) => peer.destroy());
    this.connections.clear();
    this.sharedAdapters.clear();
    this.downloadQueue.clear();

    this.emit("room-left");
  }

  async shareAdapter(modelName: string): Promise<AdapterInfo> {
    // Get model info from Ollama
    const modelPath = await this.getOllamaModelPath(modelName);
    if (!modelPath) {
      throw new Error(`Model ${modelName} not found in Ollama`);
    }

    const stats = await fs.stat(modelPath);
    const fileData = await fs.readFile(modelPath);
    const checksum = crypto.createHash("sha256").update(fileData).digest("hex");
    const topic = b4a.toString(crypto.randomBytes(32), "hex");

    const adapterInfo: AdapterInfo = {
      name: modelName,
      size: stats.size,
      checksum,
      topic,
    };

    this.sharedAdapters.set(topic, adapterInfo);
    this.sendAdapterList();

    return adapterInfo;
  }

  async unshareAdapter(topic: string): Promise<void> {
    this.sharedAdapters.delete(topic);
    this.sendAdapterList();
  }

  private async getOllamaModelPath(modelName: string): Promise<string | null> {
    // TODO: Implement actual Ollama model path resolution
    // This is a placeholder - actual implementation would query Ollama
    const ollamaHome =
      process.env.OLLAMA_HOME || path.join(process.env.HOME || "", ".ollama");
    const modelPath = path.join(ollamaHome, "models", "blobs", modelName);

    try {
      await fs.access(modelPath);
      return modelPath;
    } catch {
      return null;
    }
  }

  /**
   * Properly destroy the P2P manager and clean up resources
   * Following Pears best practices to avoid DHT pollution
   */
  async destroy(): Promise<void> {
    console.log("[P2P] Starting graceful teardown...");

    try {
      // First, leave any active rooms
      if (this.discovery) {
        await this.leaveRoom();
      }

      // Destroy the swarm itself
      if (this.swarm) {
        console.log("[P2P] Destroying Hyperswarm instance...");
        await this.swarm.destroy();
        this.swarm = null;
      }

      // Clear all internal state
      this.connections.clear();
      this.sharedAdapters.clear();
      this.downloadQueue.clear();

      console.log("[P2P] Teardown completed successfully");
    } catch (error) {
      console.error("[P2P] Error during teardown:", error);
    }
  }
}

// Singleton instance
let p2pManager: P2PShareManager | null = null;

// Setup IPC handlers
export function setupP2PHandlers(): void {
  // Initialize P2P
  ipcMain.handle("p2p:initialize", async () => {
    try {
      if (!p2pManager) {
        p2pManager = new P2PShareManager();
        await p2pManager.initialize();

        // Setup event forwarding to renderer after initialization
        p2pManager.on("peers-updated", (count: number) => {
          console.log("[P2P] Forwarding peers-updated event:", count);
          // Forward to all renderer windows
          BrowserWindow.getAllWindows().forEach((window: BrowserWindow) => {
            window.webContents.send("p2p:peers-updated", count);
          });
        });

        p2pManager.on("adapters-available", (data: any) => {
          console.log("[P2P] Forwarding adapters-available event:", data);
          BrowserWindow.getAllWindows().forEach((window: BrowserWindow) => {
            window.webContents.send("p2p:adapters-available", data);
          });
        });

        p2pManager.on("room-joined", (topicHex: string) => {
          console.log("[P2P] Forwarding room-joined event:", topicHex);
          BrowserWindow.getAllWindows().forEach((window: BrowserWindow) => {
            window.webContents.send("p2p:room-joined", topicHex);
          });
        });

        p2pManager.on("room-left", () => {
          console.log("[P2P] Forwarding room-left event");
          BrowserWindow.getAllWindows().forEach((window: BrowserWindow) => {
            window.webContents.send("p2p:room-left");
          });
        });
      }
      return { success: true };
    } catch (error) {
      console.error("[P2P] Initialization error:", error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Create room
  ipcMain.handle("p2p:createRoom", async () => {
    try {
      if (!p2pManager) throw new Error("P2P not initialized");
      const topic = await p2pManager.createRoom();
      return { success: true, topic };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Join room
  ipcMain.handle("p2p:joinRoom", async (_event, topic: string) => {
    try {
      if (!p2pManager) throw new Error("P2P not initialized");
      await p2pManager.joinRoom(topic);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Leave room
  ipcMain.handle("p2p:leaveRoom", async () => {
    try {
      if (!p2pManager) throw new Error("P2P not initialized");
      await p2pManager.leaveRoom();
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Share adapter
  ipcMain.handle("p2p:shareAdapter", async (_event, modelName: string) => {
    try {
      if (!p2pManager) throw new Error("P2P not initialized");
      const adapterInfo = await p2pManager.shareAdapter(modelName);
      return { success: true, adapterInfo };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Unshare adapter
  ipcMain.handle("p2p:unshareAdapter", async (_event, topic: string) => {
    try {
      if (!p2pManager) throw new Error("P2P not initialized");
      await p2pManager.unshareAdapter(topic);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Cleanup handler
  ipcMain.handle("p2p:destroy", async () => {
    try {
      if (!p2pManager) throw new Error("P2P not initialized");
      await p2pManager.destroy();
      p2pManager = null;
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });
}

// Export cleanup function for main process
export async function cleanupP2P(): Promise<void> {
  if (p2pManager) {
    console.log("[P2P] Cleaning up P2P connections before app exit...");
    await p2pManager.destroy();
    p2pManager = null;
  }
}

// Export for main process
export default setupP2PHandlers;
