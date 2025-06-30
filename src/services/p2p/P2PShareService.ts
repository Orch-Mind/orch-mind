// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { EventEmitter } from "events";

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

interface SwarmPeer {
  publicKey: string;
  write: (data: Buffer | string) => void;
  on: (event: string, handler: (...args: any[]) => void) => void;
  remotePublicKey: Buffer;
}

export class P2PShareService extends EventEmitter {
  private swarm: any = null;
  private discovery: any = null;
  private sharedAdapters: Map<string, AdapterInfo> = new Map();
  private downloadQueue: Map<string, { chunks: Buffer[]; totalSize: number }> =
    new Map();
  private isElectron: boolean = false;

  // Constants for well-known rooms
  private static readonly GENERAL_ROOM_TOPIC =
    "orch-os-general-public-community-room-v1";

  constructor() {
    super();
    this.isElectron =
      typeof window !== "undefined" && window.electronAPI !== undefined;
  }

  /**
   * Inicializa o serviço P2P
   * No Electron, usará o Hyperswarm nativo
   * No browser, usará uma implementação alternativa ou WebRTC
   */
  async initialize(): Promise<void> {
    if (this.isElectron && (window.electronAPI as any)?.p2pInitialize) {
      try {
        const result = await (window.electronAPI as any).p2pInitialize();
        if (!result.success) {
          throw new Error(result.error || "Failed to initialize P2P");
        }
        console.log("P2P Service initialized in Electron mode");

        // Setup event listeners
        (window.electronAPI as any).onP2PPeersUpdated?.((count: number) => {
          this.emit("peers-updated", count);
        });

        (window.electronAPI as any).onP2PAdaptersAvailable?.((data: any) => {
          this.emit("adapters-available", data);
        });
      } catch (error) {
        console.error("Failed to initialize Hyperswarm:", error);
        throw error;
      }
    } else {
      // No browser, precisamos de uma abordagem diferente
      console.log(
        "P2P Service initialized in browser mode (limited functionality)"
      );
    }
  }

  /**
   * Cria uma sala de compartilhamento
   */
  async createRoom(): Promise<string> {
    if (this.isElectron && (window.electronAPI as any)?.p2pCreateRoom) {
      const result = await (window.electronAPI as any).p2pCreateRoom();
      if (!result.success) {
        throw new Error(result.error || "Failed to create room");
      }
      return result.topic;
    } else {
      const topic = this.generateTopic();
      await this.joinRoom(topic);
      return topic;
    }
  }

  /**
   * Junta-se a uma sala existente
   */
  async joinRoom(topic: string): Promise<void> {
    if (!this.isValidTopic(topic)) {
      throw new Error("Invalid topic format");
    }

    if (this.isElectron && (window.electronAPI as any)?.p2pJoinRoom) {
      const result = await (window.electronAPI as any).p2pJoinRoom(topic);
      if (!result.success) {
        throw new Error(result.error || "Failed to join room");
      }
    } else {
      // Implementação alternativa para browser
      this.emit("room-joined", topic);
      this.emit("peers-updated", 0);
    }
  }

  /**
   * Sai da sala atual
   */
  async leaveRoom(): Promise<void> {
    if (this.isElectron && (window.electronAPI as any)?.p2pLeaveRoom) {
      const result = await (window.electronAPI as any).p2pLeaveRoom();
      if (!result.success) {
        throw new Error(result.error || "Failed to leave room");
      }
    } else {
      if (this.discovery) {
        await this.discovery.destroy();
        this.discovery = null;
      }

      if (this.swarm) {
        await this.swarm.destroy();
        this.swarm = null;
      }

      this.sharedAdapters.clear();
      this.downloadQueue.clear();
      this.emit("room-left");
    }
  }

  /**
   * Compartilha um adapter LoRA
   */
  async shareAdapter(
    adapterPath: string,
    adapterInfo: AdapterInfo
  ): Promise<void> {
    this.sharedAdapters.set(adapterInfo.topic, adapterInfo);
    this.broadcastAdapterList();
  }

  /**
   * Para de compartilhar um adapter
   */
  async unshareAdapter(topic: string): Promise<void> {
    this.sharedAdapters.delete(topic);
    this.broadcastAdapterList();
  }

  /**
   * Solicita download de um adapter
   */
  async requestAdapter(topic: string, fromPeer?: string): Promise<void> {
    const message: P2PMessage = {
      type: "adapter-request",
      data: { topic },
    };

    this.broadcastMessage(message, fromPeer);
  }

  /**
   * Processa mensagens recebidas de peers
   */
  private handlePeerMessage(peer: SwarmPeer, data: Buffer): void {
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
      console.error("Error handling peer message:", error);
    }
  }

  /**
   * Manipula lista de adapters recebida
   */
  private handleAdapterList(peer: SwarmPeer, adapters: AdapterInfo[]): void {
    const peerId = this.getPeerId(peer);
    this.emit("adapters-available", {
      from: peerId,
      adapters,
    });
  }

  /**
   * Manipula solicitação de adapter
   */
  private async handleAdapterRequest(
    peer: SwarmPeer,
    data: { topic: string }
  ): Promise<void> {
    const adapter = this.sharedAdapters.get(data.topic);
    if (!adapter) return;

    // Aqui seria implementado o envio do arquivo em chunks
    // Por enquanto, apenas simula
    console.log(`Sending adapter ${adapter.name} to peer`);
  }

  /**
   * Manipula chunk de adapter recebido
   */
  private handleAdapterChunk(peer: SwarmPeer, data: any): void {
    const { topic, chunk, index, total } = data;

    if (!this.downloadQueue.has(topic)) {
      this.downloadQueue.set(topic, {
        chunks: new Array(total),
        totalSize: 0,
      });
    }

    const download = this.downloadQueue.get(topic)!;
    download.chunks[index] = Buffer.from(chunk, "base64");

    // Verifica se todos os chunks foram recebidos
    if (download.chunks.every((c) => c !== undefined)) {
      const completeData = Buffer.concat(download.chunks);
      this.emit("adapter-downloaded", {
        topic,
        data: completeData,
      });
      this.downloadQueue.delete(topic);
    }
  }

  /**
   * Broadcast mensagem para todos os peers ou um específico
   */
  private broadcastMessage(message: P2PMessage, toPeer?: string): void {
    const data = JSON.stringify(message);

    if (this.swarm && this.swarm.connections) {
      const peers = [...this.swarm.connections];

      if (toPeer) {
        const peer = peers.find((p) => this.getPeerId(p) === toPeer);
        if (peer) peer.write(data);
      } else {
        peers.forEach((peer) => peer.write(data));
      }
    }
  }

  /**
   * Broadcast lista de adapters compartilhados
   */
  private broadcastAdapterList(): void {
    const message: P2PMessage = {
      type: "adapter-list",
      data: Array.from(this.sharedAdapters.values()),
    };

    this.broadcastMessage(message);
  }

  /**
   * Gera um topic aleatório
   */
  private generateTopic(): string {
    const bytes = new Uint8Array(32);
    if (typeof window !== "undefined" && window.crypto) {
      window.crypto.getRandomValues(bytes);
    } else {
      // Fallback para Node.js
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  /**
   * Valida formato do topic
   */
  private isValidTopic(topic: string): boolean {
    return /^[0-9a-f]{64}$/i.test(topic);
  }

  /**
   * Obtém ID único do peer
   */
  private getPeerId(peer: SwarmPeer): string {
    return peer.remotePublicKey.toString("hex").substring(0, 6);
  }

  /**
   * Calcula checksum de um arquivo
   */
  private async calculateChecksum(data: Buffer): Promise<string> {
    if (
      typeof window !== "undefined" &&
      window.crypto &&
      window.crypto.subtle
    ) {
      // Convert Buffer to Uint8Array for Web Crypto API
      const uint8Array = new Uint8Array(data);
      const hashBuffer = await window.crypto.subtle.digest(
        "SHA-256",
        uint8Array
      );
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    } else {
      // Fallback simples
      return "checksum-not-available";
    }
  }

  // Connect to the global general room
  async joinGeneralRoom(): Promise<void> {
    try {
      const topic = await this.hashTopic(P2PShareService.GENERAL_ROOM_TOPIC);
      await this.joinRoom(topic);
      this.emit("room-joined", { type: "general" });
    } catch (error) {
      console.error("Error joining general room:", error);
      throw error;
    }
  }

  // Helper method to hash topics consistently
  private async hashTopic(input: string): Promise<string> {
    if (
      typeof window !== "undefined" &&
      window.crypto &&
      window.crypto.subtle
    ) {
      const data = new TextEncoder().encode(input);
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    } else {
      // Fallback for Node.js environment
      return input; // In production, use crypto.createHash
    }
  }
}

// Singleton
export const p2pShareService = new P2PShareService();
