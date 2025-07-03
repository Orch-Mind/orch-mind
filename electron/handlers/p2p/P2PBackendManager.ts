// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// @ts-ignore - b4a doesn't have official TypeScript types
import * as b4a from "b4a";
import { EventEmitter } from "events";
// @ts-ignore - hyperswarm doesn't have official TypeScript types
import Hyperswarm from "hyperswarm";
/**
 * P2PBackendManager - Backend P2P implementation using Hyperswarm
 * Following Pears documentation patterns and SRP
 */
export class P2PBackendManager extends EventEmitter {
  private swarm: any = null;
  private discovery: any = null;
  private connections: Map<string, any> = new Map();
  private currentTopic: string | null = null;

  async initialize(): Promise<void> {
    if (this.swarm) return;

    try {
      this.swarm = new Hyperswarm();

      // Setup connection handlers following Pears pattern
      this.swarm.on("connection", (peer: any) => {
        this.handlePeerConnection(peer);
      });

      this.swarm.on("update", () => {
        this.emit("peers-updated", this.connections.size);
      });

      console.log("[P2P-Backend] Hyperswarm initialized");
    } catch (error) {
      console.error("[P2P-Backend] Failed to initialize:", error);
      throw error;
    }
  }

  async joinRoom(topicHex: string): Promise<void> {
    if (!this.swarm) {
      throw new Error("P2P not initialized");
    }

    // Leave current room if any
    if (this.discovery) {
      await this.leaveRoom();
    }

    const topic = b4a.from(topicHex, "hex");
    this.currentTopic = topicHex;

    // Join swarm with topic
    this.discovery = this.swarm.join(topic, {
      client: true,
      server: true,
    });

    await this.discovery.flushed();
    console.log("[P2P-Backend] Joined room:", topicHex);

    this.emit("room-joined", { topic: topicHex });
  }

  async leaveRoom(): Promise<void> {
    if (!this.discovery) return;

    // Graceful teardown following Pears pattern
    await this.discovery.destroy();
    this.discovery = null;
    this.currentTopic = null;

    // Close all connections
    this.connections.forEach((peer) => peer.destroy());
    this.connections.clear();

    console.log("[P2P-Backend] Left room");
    this.emit("room-left");
  }

  sendMessage(message: any, toPeer?: string): void {
    const data = JSON.stringify(message);

    if (toPeer) {
      const peer = this.connections.get(toPeer);
      if (peer) {
        peer.write(data);
      }
    } else {
      // Broadcast to all peers
      this.connections.forEach((peer) => peer.write(data));
    }
  }

  async destroy(): Promise<void> {
    console.log("[P2P-Backend] Starting teardown following Pears patterns...");

    // Step 1: Leave current room gracefully
    if (this.discovery) {
      console.log("[P2P-Backend] Leaving current room...");
      await this.leaveRoom();
    }

    // Step 2: Close all peer connections
    console.log("[P2P-Backend] Closing peer connections...");
    this.connections.forEach((peer, peerId) => {
      console.log(`[P2P-Backend] Closing connection to ${peerId}`);
      peer.destroy();
    });
    this.connections.clear();

    // Step 3: Destroy swarm following Pears teardown pattern
    // This helps avoid DHT pollution as recommended in Pears docs
    if (this.swarm) {
      console.log(
        "[P2P-Backend] Destroying swarm (following Pears teardown)..."
      );
      await this.swarm.destroy();
      this.swarm = null;
    }

    console.log("[P2P-Backend] Teardown complete - DHT cleaned up properly");
  }

  private handlePeerConnection(peer: any): void {
    const peerId = b4a.toString(peer.remotePublicKey, "hex").substring(0, 6);
    console.log(`[P2P-Backend] New peer connected: ${peerId}`);

    this.connections.set(peerId, peer);

    peer.on("data", (data: Buffer) => {
      this.emit("peer-message", { peerId, data });
    });

    peer.on("error", (error: Error) => {
      console.error(`[P2P-Backend] Peer error from ${peerId}:`, error);
    });

    peer.on("close", () => {
      console.log(`[P2P-Backend] Peer disconnected: ${peerId}`);
      this.connections.delete(peerId);
      this.emit("peers-updated", this.connections.size);
    });

    this.emit("peer-connected", peerId);
    this.emit("peers-updated", this.connections.size);
  }

  getPeer(peerId: string): any {
    return this.connections.get(peerId);
  }

  getPeersCount(): number {
    return this.connections.size;
  }
}
