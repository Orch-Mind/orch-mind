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
 * Enhanced with robustness features for intermittent connectivity
 */
export class P2PBackendManager extends EventEmitter {
  private swarm: any = null;
  private discovery: any = null;
  private connections: Map<string, any> = new Map();
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();
  private currentTopic: string | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 5000; // 5 seconds
  private healthCheckInterval: NodeJS.Timeout | null = null;

  async initialize(): Promise<void> {
    if (this.swarm) return;

    try {
      this.swarm = new Hyperswarm();

      // Setup connection handlers following Pears pattern
      this.setupSwarmListeners();

      // Start health monitoring
      this.startHealthMonitoring();

      console.log(
        "[P2P-Backend] Hyperswarm initialized with robustness features"
      );
    } catch (error) {
      console.error("[P2P-Backend] Failed to initialize:", error);
      throw error;
    }
  }

  async joinRoom(topicHex: string): Promise<void> {
    if (!this.swarm) {
      throw new Error("P2P not initialized");
    }

    // FIX: A lógica de sair da sala antes de entrar em outra foi removida do backend
    // para evitar race conditions. Essa lógica agora é de responsabilidade exclusiva do frontend (SwarmManager).
    if (this.currentTopic && this.currentTopic !== topicHex) {
      console.warn(
        `[P2P-Backend] Warning: Joining a new room (${topicHex.slice(
          0,
          8
        )}) without leaving the old one (${this.currentTopic.slice(0, 8)}).`
      );
    }

    const topic = b4a.from(topicHex, "hex");
    this.currentTopic = topicHex;

    try {
      // Join swarm with topic
      this.discovery = this.swarm.join(topic, {
        client: true,
        server: true,
      });

      await this.discovery.flushed();
      this.reconnectAttempts = 0; // Reset on successful join
      console.log("[P2P-Backend] Successfully joined room:", topicHex);

      // FIX: Emit the complete room data structure expected by the frontend
      // Detect room type based on known topic patterns
      let roomType: "general" | "local" | "private" = "private";
      let roomCode = topicHex.slice(0, 8);

      // Check for general/community room (hash of "orch-os-general-public-community-room-v1")
      if (topicHex.startsWith("7c2f57bba2bb9f97")) {
        roomType = "general";
        roomCode = "COMMUNITY";
      }
      // Check for local network room (hash starts with known pattern for "orch-os-local-network-")
      // We'll need to compute this hash to identify it properly
      else if (this.isLocalNetworkTopic(topicHex)) {
        roomType = "local";
        roomCode = "LOCAL";
      }
      // Otherwise it's a private room
      else {
        roomType = "private";
        roomCode = topicHex.slice(0, 8);
      }

      const roomData = {
        topic: topicHex,
        code: roomCode,
        type: roomType,
      };

      this.emit("room-joined", roomData);
    } catch (error) {
      console.error("[P2P-Backend] Failed to join room:", error);
      this.attemptRecovery();
      throw error;
    }
  }

  async leaveRoom(): Promise<void> {
    if (!this.discovery) return;

    try {
      // Stop all heartbeats
      this.stopAllHeartbeats();

      // Graceful teardown following Pears pattern
      await this.discovery.destroy();
      this.discovery = null;
      this.currentTopic = null;

      // Close all connections
      this.connections.forEach((peer) => peer.destroy());
      this.connections.clear();

      console.log("[P2P-Backend] Left room gracefully");
      this.emit("room-left");
    } catch (error) {
      console.error("[P2P-Backend] Error leaving room:", error);
      // Force cleanup even if graceful teardown fails
      this.discovery = null;
      this.currentTopic = null;
      this.connections.clear();
      this.stopAllHeartbeats();
    }
  }

  sendMessage(message: any, toPeer?: string): void {
    const data = JSON.stringify(message);

    if (toPeer) {
      const peer = this.connections.get(toPeer);
      if (peer && !peer.destroyed) {
        try {
          peer.write(data);
        } catch (error) {
          console.error(
            `[P2P-Backend] Failed to send message to ${toPeer}:`,
            error
          );
          this.handlePeerDisconnection(toPeer);
        }
      }
    } else {
      // Broadcast to all peers
      this.connections.forEach((peer, peerId) => {
        if (!peer.destroyed) {
          try {
            peer.write(data);
          } catch (error) {
            console.error(
              `[P2P-Backend] Failed to broadcast to ${peerId}:`,
              error
            );
            this.handlePeerDisconnection(peerId);
          }
        }
      });
    }
  }

  async destroy(): Promise<void> {
    console.log("[P2P-Backend] Starting enhanced teardown...");

    // Stop health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

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

    // Step 3: Stop all heartbeats
    this.stopAllHeartbeats();

    // Step 4: Destroy swarm following Pears teardown pattern
    if (this.swarm) {
      console.log("[P2P-Backend] Destroying swarm...");
      await this.swarm.destroy();
      this.swarm = null;
    }

    console.log("[P2P-Backend] Enhanced teardown complete");
  }

  private setupSwarmListeners(): void {
    this.swarm.on("connection", (conn: any, info: any) => {
      const peerId = info.publicKey.toString("hex").slice(0, 12);

      console.log(`[P2P-Backend] New peer connected: ${peerId}`);

      // Enhanced connection configuration for stability
      conn.setKeepAlive(true, 5000); // More frequent keep-alive (5s)
      conn.setTimeout(60000); // 60 second timeout

      // Set TCP_NODELAY for better real-time performance
      if (conn.setNoDelay) {
        conn.setNoDelay(true);
      }

      // Configure socket options for stability
      if (conn.socket) {
        conn.socket.setKeepAlive(true, 5000);
        conn.socket.setTimeout(60000);
      }

      this.connections.set(peerId, conn);
      this.startHeartbeat(peerId, conn);

      conn.on("data", (data: Buffer) => {
        try {
          this.handleMessage(conn, data, peerId);
        } catch (error) {
          console.error(
            `[P2P-Backend] Error handling message from ${peerId}:`,
            error
          );
        }
      });

      conn.on("error", (error: Error) => {
        console.error(
          `[P2P-Backend] Connection error with ${peerId}:`,
          error.message
        );
        this.cleanupConnection(peerId);

        // Don't immediately reconnect on error - let the swarm handle it
        setTimeout(() => {
          console.log(
            `[P2P-Backend] Attempting to re-establish connection with ${peerId}...`
          );
        }, 5000);
      });

      conn.on("close", () => {
        console.log(`[P2P-Backend] Connection closed with ${peerId}`);
        this.cleanupConnection(peerId);
      });

      conn.on("end", () => {
        console.log(`[P2P-Backend] Connection ended with ${peerId}`);
        this.cleanupConnection(peerId);
      });

      this.emitPeersUpdate();
    });

    this.swarm.on("disconnection", (conn: any, info: any) => {
      const peerId = info.publicKey.toString("hex").slice(0, 12);
      console.log(`[P2P-Backend] Peer disconnected: ${peerId}`);
      this.cleanupConnection(peerId);
      this.emitPeersUpdate();
    });

    // Enhanced error handling
    this.swarm.on("error", (error: Error) => {
      console.error("[P2P-Backend] Swarm error:", error.message);
      // Don't crash on swarm errors - just log them
    });
  }

  private handleMessage(conn: any, data: Buffer, peerId: string): void {
    try {
      const message = JSON.parse(data.toString());

      // Handle heartbeat messages
      if (message.type === "heartbeat") {
        this.sendHeartbeatResponse(peerId);
        return;
      }

      if (message.type === "heartbeat-response") {
        // Log successful heartbeat response
        console.log(`[P2P-Backend] Heartbeat response from ${peerId}`);
        return;
      }

      // Forward other messages
      this.emit("peer-message", { peerId, data });
    } catch (error) {
      console.error(
        `[P2P-Backend] Error parsing message from ${peerId}:`,
        error
      );
    }
  }

  private handlePeerDisconnection(peerId: string): void {
    this.connections.delete(peerId);
    this.stopHeartbeat(peerId);
    this.emit("peers-updated", this.connections.size);
  }

  private startHeartbeat(peer: any, peerId: string): void {
    const interval = setInterval(() => {
      if (this.connections.has(peerId) && !peer.destroyed) {
        this.sendHeartbeat(peer, peerId);
      } else {
        this.stopHeartbeat(peerId);
      }
    }, 30000); // Every 30 seconds

    this.heartbeatIntervals.set(peerId, interval);
  }

  private stopHeartbeat(peerId: string): void {
    const interval = this.heartbeatIntervals.get(peerId);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(peerId);
    }
  }

  private stopAllHeartbeats(): void {
    this.heartbeatIntervals.forEach((interval) => clearInterval(interval));
    this.heartbeatIntervals.clear();
  }

  private sendHeartbeat(peer: any, peerId: string): void {
    try {
      const heartbeat = {
        type: "heartbeat",
        from: "orch-os-main",
        timestamp: Date.now(),
      };

      peer.write(JSON.stringify(heartbeat));
      console.log(`[P2P-Backend] Heartbeat sent to ${peerId}`);
    } catch (error) {
      console.error(
        `[P2P-Backend] Failed to send heartbeat to ${peerId}:`,
        error
      );
      this.handlePeerDisconnection(peerId);
    }
  }

  private sendHeartbeatResponse(peerId: string): void {
    const peer = this.connections.get(peerId);
    if (peer && !peer.destroyed) {
      try {
        const response = {
          type: "heartbeat-response",
          from: "orch-os-main",
          timestamp: Date.now(),
        };

        peer.write(JSON.stringify(response));
        console.log(`[P2P-Backend] Heartbeat response sent to ${peerId}`);
      } catch (error) {
        console.error(
          `[P2P-Backend] Failed to send heartbeat response to ${peerId}:`,
          error
        );
      }
    }
  }

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(() => {
      const connectionCount = this.connections.size;
      console.log(
        `[P2P-Backend] Health check: ${connectionCount} active connections`
      );

      // If we have no connections and should be connected, attempt recovery
      if (connectionCount === 0 && this.currentTopic) {
        console.log(
          "[P2P-Backend] No connections detected, checking room status..."
        );
        this.attemptRecovery();
      }
    }, 60000); // Every minute
  }

  private attemptRecovery(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("[P2P-Backend] Max reconnection attempts reached");
      return;
    }

    this.reconnectAttempts++;
    console.log(
      `[P2P-Backend] Attempting recovery (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
    );

    setTimeout(async () => {
      if (this.currentTopic && this.swarm) {
        try {
          console.log(`[P2P-Backend] Rejoining room: ${this.currentTopic}`);
          await this.joinRoom(this.currentTopic);
        } catch (error) {
          console.error("[P2P-Backend] Recovery attempt failed:", error);
        }
      }
    }, this.reconnectDelay * this.reconnectAttempts); // Exponential backoff
  }

  getPeer(peerId: string): any {
    return this.connections.get(peerId);
  }

  getPeersCount(): number {
    return this.connections.size;
  }

  private emitPeersUpdate(): void {
    const connectionCount = this.connections.size;
    console.log(`[P2P-Backend] Swarm update: ${connectionCount} connections`);
    this.emit("peers-updated", connectionCount);
  }

  private cleanupConnection(peerId: string): void {
    this.handlePeerDisconnection(peerId);
  }

  /**
   * Check if a topic hash corresponds to a local network room
   * Local network topics are hashes of "orch-os-local-network-{networkId}"
   */
  private isLocalNetworkTopic(topicHex: string): boolean {
    // For now, we'll use a simple heuristic based on known patterns
    // In the future, we could maintain a registry of local network hashes
    // or compute the expected hash for the current network

    // This is a placeholder - in practice, we'd need to:
    // 1. Get the current network ID
    // 2. Compute hash("orch-os-local-network-" + networkId)
    // 3. Compare with topicHex

    // For now, we'll use a simple pattern detection
    // Local network hashes tend to have specific characteristics
    return false; // TODO: Implement proper local network detection
  }
}
