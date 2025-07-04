#!/usr/bin/env node

// Real Hyperswarm Peer Emulator for Orch-OS
// Emulates the exact P2P behavior of Orch-OS using real Hyperswarm

const Hyperswarm = require("hyperswarm");
const crypto = require("crypto");
const express = require("express");

// Same adapters as the real Orch-OS would have
const adapters = [
  {
    name: "gemma3-test-adapter",
    topic: "gemma3-test-adapter-topic-hash-12345",
    size: 67108864, // 64MB
    description: "Test adapter for Gemma3 model",
    from: "hyperswarm-peer-emulator",
  },
  {
    name: "llama3-coding-adapter",
    topic: "llama3-coding-adapter-topic-hash-67890",
    size: 33554432, // 32MB
    description: "Coding adapter for Llama3 model",
    from: "hyperswarm-peer-emulator",
  },
];

class OrchOSPeerEmulator {
  constructor() {
    this.swarm = new Hyperswarm();
    this.connections = new Map();
    this.peerId = "hyperswarm-peer-emulator";

    // Use the same Community room topic as Orch-OS
    this.communityTopic = this.generateTopicHash(
      "orch-os-general-public-community-room-v1"
    );

    console.log("🚀 Orch-OS Peer Emulator starting...");
    console.log(`📋 Peer ID: ${this.peerId}`);
    console.log(
      `🔑 Community topic: ${this.communityTopic
        .toString("hex")
        .slice(0, 16)}...`
    );
    console.log(`📦 Available adapters: ${adapters.length}`);
  }

  // Generate topic hash exactly like Orch-OS does
  generateTopicHash(topic) {
    // Orch-OS: crypto.createHash("sha256").update(topic).digest() -> Buffer
    // Then converts to hex for storage, but uses Buffer for Hyperswarm
    const hash = crypto.createHash('sha256').update(topic).digest();
    return hash; // Return Buffer directly for Hyperswarm
  }

  async start() {
    this.setupSwarmListeners();

    // Join the same Community room as Orch-OS
    console.log("🌍 Joining Community room...");
    this.swarm.join(this.communityTopic, { server: true, client: true });

    // Start HTTP server for health checks
    this.startHttpServer();

    console.log("✅ Peer emulator ready and listening for connections");
  }

  setupSwarmListeners() {
    this.swarm.on("connection", (conn, info) => {
      const peerId = info.publicKey.toString("hex").slice(0, 12);
      this.connections.set(peerId, conn);

      console.log(
        `🤝 New peer connected: ${peerId} (${this.connections.size} total)`
      );

      // Send adapter list immediately (like Orch-OS does)
      this.sendAdapterList(conn, peerId);

      conn.on("data", (data) => {
        this.handleMessage(conn, data, peerId);
      });

      conn.on("error", (error) => {
        console.error(`❌ Connection error with ${peerId}:`, error.message);
        this.connections.delete(peerId);
      });

      conn.on("close", () => {
        console.log(
          `👋 Peer disconnected: ${peerId} (${
            this.connections.size - 1
          } remaining)`
        );
        this.connections.delete(peerId);
      });
    });

    this.swarm.on("update", () => {
      console.log(`📊 Swarm update: ${this.connections.size} connections`);
    });
  }

  sendAdapterList(conn, peerId) {
    const message = {
      type: "adapter-list",
      adapters: adapters,
      from: this.peerId,
      timestamp: Date.now(),
    };

    try {
      conn.write(JSON.stringify(message));
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

  handleMessage(conn, data, peerId) {
    try {
      const message = JSON.parse(data.toString());
      console.log(`📨 Message from ${peerId}: ${message.type}`);

      switch (message.type) {
        case "request-adapters":
          this.sendAdapterList(conn, peerId);
          break;

        case "ping":
          conn.write(
            JSON.stringify({
              type: "pong",
              from: this.peerId,
              timestamp: Date.now(),
            })
          );
          break;

        case "adapter-request":
          this.handleAdapterRequest(conn, message, peerId);
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

  handleAdapterRequest(conn, message, peerId) {
    // Support both topic-based and name-based requests
    const { topic, adapterName } = message.data || message;
    let adapter;
    
    if (topic) {
      adapter = adapters.find((a) => a.topic === topic);
    } else if (adapterName) {
      adapter = adapters.find((a) => a.name === adapterName);
    }

    if (!adapter) {
      conn.write(
        JSON.stringify({
          type: "adapter-error",
          error: "Adapter not found",
          topic: topic,
          adapterName: adapterName,
          from: this.peerId,
        })
      );
      return;
    }

    console.log(`📥 Adapter request from ${peerId}: ${adapter.name} (topic: ${topic || 'name-based'})`);

    // Send adapter in chunks (simulating real file transfer)
    this.sendAdapterInChunks(conn, adapter, peerId);
  }

  sendAdapterInChunks(conn, adapter, peerId) {
    console.log(`📤 Starting chunked transfer of ${adapter.name} to ${peerId}`);
    
    // Simulate file data
    const fileData = Buffer.alloc(adapter.size, 'A'); // Fill with 'A' characters
    const chunkSize = 64 * 1024; // 64KB chunks
    const totalChunks = Math.ceil(fileData.length / chunkSize);
    
    let chunkIndex = 0;
    
    const sendNextChunk = () => {
      if (chunkIndex >= totalChunks) {
        console.log(`✅ Completed transfer of ${adapter.name} to ${peerId}`);
        return;
      }
      
      const start = chunkIndex * chunkSize;
      const end = Math.min(start + chunkSize, fileData.length);
      const chunk = fileData.slice(start, end);
      
      // Calculate chunk checksum
      const chunkChecksum = crypto.createHash('sha256').update(chunk).digest('hex');
      
      const chunkMessage = {
        type: "adapter-chunk",
        data: {
          topic: adapter.topic,
          chunk: chunk.toString('base64'),
          index: chunkIndex,
          total: totalChunks,
          checksum: chunkChecksum,
          metadata: chunkIndex === 0 ? adapter : undefined // Send metadata with first chunk
        }
      };
      
      try {
        conn.write(JSON.stringify(chunkMessage));
        console.log(`📦 Sent chunk ${chunkIndex + 1}/${totalChunks} of ${adapter.name}`);
        
        chunkIndex++;
        
        // Send next chunk after a small delay to avoid overwhelming
        setTimeout(sendNextChunk, 10);
      } catch (error) {
        console.error(`❌ Error sending chunk ${chunkIndex} to ${peerId}:`, error.message);
      }
    };
    
    // Start sending chunks
    sendNextChunk();
  }

  startHttpServer() {
    const app = express();
    app.use(express.json());

    app.get("/health", (req, res) => {
      res.json({
        status: "healthy",
        peer_id: this.peerId,
        connections: this.connections.size,
        adapters: adapters.length,
        community_topic: this.communityTopic.toString("hex"),
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

    const PORT = process.env.PORT || 3001;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🌐 HTTP server listening on port ${PORT}`);
    });
  }

  async stop() {
    console.log("🛑 Stopping peer emulator...");
    await this.swarm.destroy();
    console.log("✅ Peer emulator stopped");
  }
}

// Start the emulator
const emulator = new OrchOSPeerEmulator();

emulator.start().catch((error) => {
  console.error("❌ Failed to start peer emulator:", error);
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
