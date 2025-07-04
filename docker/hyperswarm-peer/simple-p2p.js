#!/usr/bin/env node

// Simple P2P Emulator for Orch-OS
// Uses WebSocket + HTTP instead of Hyperswarm to avoid sodium-native issues

const crypto = require("crypto");
const express = require("express");
const WebSocket = require("ws");
const { EventEmitter } = require("events");

// Same adapters as the real Orch-OS would have
const adapters = [
  {
    name: "gemma3-test-adapter",
    topic: "gemma3-test-adapter-topic-hash-12345",
    size: 67108864, // 64MB
    description: "Test adapter for Gemma3 model",
    from: "simple-p2p-emulator",
  },
  {
    name: "llama3-coding-adapter",
    topic: "llama3-coding-adapter-topic-hash-67890",
    size: 33554432, // 32MB
    description: "Coding adapter for Llama3 model",
    from: "simple-p2p-emulator",
  },
];

class SimpleP2PEmulator extends EventEmitter {
  constructor() {
    super();
    this.connections = new Map();
    this.peerId = "simple-p2p-emulator";

    // Use the same Community room topic as Orch-OS
    this.communityTopic = this.generateTopicHash(
      "orch-os-general-public-community-room-v1"
    );

    console.log("🚀 Simple P2P Emulator starting...");
    console.log(`📋 Peer ID: ${this.peerId}`);
    console.log(`🔑 Community topic: ${this.communityTopic.slice(0, 16)}...`);
    console.log(`📦 Available adapters: ${adapters.length}`);
  }

  // Generate topic hash exactly like Orch-OS does
  generateTopicHash(topic) {
    const hash = crypto.createHash("sha256").update(topic).digest("hex");
    return hash;
  }

  async start() {
    this.startHttpServer();
    this.startWebSocketServer();

    console.log("✅ Simple P2P emulator ready and listening for connections");

    // Announce presence periodically (simulates DHT announcement)
    this.announcePresence();
    setInterval(() => this.announcePresence(), 30000); // Every 30 seconds
  }

  startHttpServer() {
    const app = express();
    app.use(express.json());

    // CORS headers for browser connections
    app.use((req, res, next) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.header("Access-Control-Allow-Headers", "Content-Type");
      next();
    });

    app.get("/health", (req, res) => {
      res.json({
        status: "healthy",
        peer_id: this.peerId,
        connections: this.connections.size,
        adapters: adapters.length,
        community_topic: this.communityTopic,
        timestamp: new Date().toISOString(),
      });
    });

    app.get("/adapters", (req, res) => {
      res.json({
        adapters: adapters,
        total: adapters.length,
        peer_id: this.peerId,
      });
    });

    // P2P discovery endpoint (simulates DHT lookup)
    app.get("/discover/:topic", (req, res) => {
      const { topic } = req.params;

      if (topic === this.communityTopic) {
        res.json({
          peers: [
            {
              id: this.peerId,
              adapters: adapters.length,
              websocket_port: 3002,
              last_seen: Date.now(),
            },
          ],
          topic: topic,
        });
      } else {
        res.json({ peers: [], topic: topic });
      }
    });

    const PORT = process.env.PORT || 3001;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🌐 HTTP server listening on port ${PORT}`);
    });
  }

  startWebSocketServer() {
    const wss = new WebSocket.Server({ port: 3002, host: "0.0.0.0" });

    wss.on("connection", (ws, req) => {
      const peerId = `peer-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      this.connections.set(peerId, ws);

      console.log(
        `🤝 New peer connected: ${peerId} (${this.connections.size} total)`
      );

      // Send adapter list immediately (like Orch-OS does)
      this.sendAdapterList(ws, peerId);

      ws.on("message", (data) => {
        this.handleMessage(ws, data, peerId);
      });

      ws.on("error", (error) => {
        console.error(`❌ Connection error with ${peerId}:`, error.message);
        this.connections.delete(peerId);
      });

      ws.on("close", () => {
        console.log(
          `👋 Peer disconnected: ${peerId} (${
            this.connections.size - 1
          } remaining)`
        );
        this.connections.delete(peerId);
      });
    });

    console.log(`🔗 WebSocket server listening on port 3002`);
  }

  sendAdapterList(ws, peerId) {
    const message = {
      type: "adapter-list",
      adapters: adapters,
      from: this.peerId,
      timestamp: Date.now(),
    };

    try {
      ws.send(JSON.stringify(message));
      console.log(
        `📤 Sent adapter list to ${peerId}: ${adapters.length} adapters`
      );
    } catch (error) {
      console.error(
        `❌ Failed to send adapter list to ${peerId}:`,
        error.message
      );
    }
  }

  handleMessage(ws, data, peerId) {
    try {
      const message = JSON.parse(data.toString());
      console.log(`📨 Message from ${peerId}: ${message.type}`);

      switch (message.type) {
        case "request-adapters":
          this.sendAdapterList(ws, peerId);
          break;

        case "ping":
          ws.send(
            JSON.stringify({
              type: "pong",
              from: this.peerId,
              timestamp: Date.now(),
            })
          );
          break;

        case "request-adapter":
          this.handleAdapterRequest(ws, message, peerId);
          break;

        default:
          console.log(
            `⚠️  Unknown message type from ${peerId}: ${message.type}`
          );
      }
    } catch (error) {
      console.error(`❌ Error parsing message from ${peerId}:`, error.message);
    }
  }

  handleAdapterRequest(ws, message, peerId) {
    const { adapterName } = message;
    const adapter = adapters.find((a) => a.name === adapterName);

    if (!adapter) {
      ws.send(
        JSON.stringify({
          type: "adapter-error",
          error: "Adapter not found",
          adapterName,
          from: this.peerId,
        })
      );
      return;
    }

    console.log(`📥 Adapter request from ${peerId}: ${adapterName}`);

    // Simulate adapter transfer
    ws.send(
      JSON.stringify({
        type: "adapter-response",
        adapter: adapter,
        data: `simulated-adapter-data-for-${adapterName}`,
        from: this.peerId,
      })
    );

    console.log(`📤 Sent adapter ${adapterName} to ${peerId}`);
  }

  announcePresence() {
    console.log(
      `📡 Announcing presence in Community room (${this.connections.size} connections)`
    );

    // Broadcast to all connected peers
    this.connections.forEach((ws, peerId) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "presence-announcement",
            from: this.peerId,
            adapters_count: adapters.length,
            timestamp: Date.now(),
          })
        );
      }
    });
  }

  async stop() {
    console.log("🛑 Stopping Simple P2P emulator...");
    this.connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });
    console.log("✅ Simple P2P emulator stopped");
  }
}

// Start the emulator
const emulator = new SimpleP2PEmulator();

emulator.start().catch((error) => {
  console.error("❌ Failed to start Simple P2P emulator:", error);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Received SIGINT, shutting down...");
  await emulator.stop();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Received SIGTERM, shutting down...");
  await emulator.stop();
  process.exit(0);
});
