#!/usr/bin/env node

// Mock Hyperswarm Peer for Orch-OS
// Simulates Hyperswarm behavior without native dependencies

const net = require("net");
const crypto = require("crypto");
const express = require("express");
const EventEmitter = require("events");

// Mock Hyperswarm implementation
class MockHyperswarm extends EventEmitter {
  constructor() {
    super();
    this.connections = new Map();
    this.topics = new Map();
    this.server = null;
    this.destroyed = false;
  }

  join(topic, options = {}) {
    const topicHex = Buffer.isBuffer(topic) ? topic.toString("hex") : topic;
    console.log(`🔗 Joining topic: ${topicHex.slice(0, 16)}...`);

    this.topics.set(topicHex, options);

    // Start server if not already running
    if (!this.server && options.server !== false) {
      this.startServer();
    }

    // Return a mock discovery object
    return {
      flushed: () => Promise.resolve(),
      destroy: () => {
        this.topics.delete(topicHex);
        console.log(`📤 Left topic: ${topicHex.slice(0, 16)}...`);
      },
    };
  }

  startServer() {
    this.server = net.createServer((socket) => {
      this.handleConnection(socket);
    });

    this.server.listen(0, () => {
      const port = this.server.address().port;
      console.log(`🌐 Mock Hyperswarm server listening on port ${port}`);
    });
  }

  handleConnection(socket) {
    const connectionId = crypto.randomBytes(16);
    const peerId = connectionId.toString("hex").slice(0, 12);

    console.log(`🤝 Mock connection from: ${peerId}`);

    // Mock connection info
    const info = {
      publicKey: connectionId,
      type: "tcp",
    };

    this.connections.set(peerId, socket);

    // Emit connection event like real Hyperswarm
    this.emit("connection", socket, info);

    socket.on("close", () => {
      console.log(`👋 Mock disconnection: ${peerId}`);
      this.connections.delete(peerId);
      this.emit("disconnection", socket, info);
    });

    socket.on("error", (error) => {
      console.error(`❌ Mock connection error ${peerId}:`, error.message);
      this.connections.delete(peerId);
    });
  }

  async destroy() {
    this.destroyed = true;
    if (this.server) {
      this.server.close();
      this.server = null;
    }
    this.connections.clear();
    this.topics.clear();
    console.log("🛑 Mock Hyperswarm destroyed");
  }
}

// Same adapters as before
const adapters = [
  {
    name: "gemma3-test-adapter",
    topic: "gemma3-test-adapter-topic-hash-12345",
    size: 67108864, // 64MB
    description: "Test adapter for Gemma3 model",
    from: "115f4f24df80",
  },
  {
    name: "llama3-coding-adapter",
    topic: "llama3-coding-adapter-topic-hash-67890",
    size: 33554432, // 32MB
    description: "Coding adapter for Llama3 model",
    from: "115f4f24df80",
  },
];

class MockHyperswarmPeer {
  constructor() {
    this.swarm = new MockHyperswarm();
    this.connections = new Map();
    this.peerId = "115f4f24df80";

    // Use the same Community room topic as Orch-OS
    this.communityTopic = this.generateTopicHash(
      "orch-os-general-public-community-room-v1"
    );

    console.log("🚀 Mock Hyperswarm Peer starting...");
    console.log(`📋 Peer ID: ${this.peerId}`);
    console.log(`🔑 Community topic: ${this.communityTopic.slice(0, 16)}...`);
    console.log(`📦 Available adapters: ${adapters.length}`);
  }

  generateTopicHash(topic) {
    return crypto.createHash("sha256").update(topic).digest("hex");
  }

  async start() {
    this.setupSwarmListeners();

    // Join the Community room
    console.log("🌍 Joining Community room...");
    const topicBuffer = Buffer.from(this.communityTopic, "hex");
    this.swarm.join(topicBuffer, { server: true, client: true });

    // Start HTTP server
    this.startHttpServer();

    console.log("✅ Mock Hyperswarm peer ready");
  }

  setupSwarmListeners() {
    this.swarm.on("connection", (conn, info) => {
      const peerId = info.publicKey.toString("hex").slice(0, 12);
      this.connections.set(peerId, conn);

      console.log(`🤝 Real connection from Orch-OS: ${peerId}`);

      // Send adapter list immediately
      this.sendAdapterList(conn, peerId);

      conn.on("data", (data) => {
        this.handleMessage(conn, data, peerId);
      });

      conn.on("error", (error) => {
        console.error(`❌ Connection error with ${peerId}:`, error.message);
        this.connections.delete(peerId);
      });

      conn.on("close", () => {
        console.log(`👋 Connection closed with ${peerId}`);
        this.connections.delete(peerId);
      });
    });

    this.swarm.on("disconnection", (conn, info) => {
      const peerId = info.publicKey.toString("hex").slice(0, 12);
      console.log(`📤 Disconnection from ${peerId}`);
      this.connections.delete(peerId);
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
        case "adapter-request":
          this.handleAdapterRequest(conn, message, peerId);
          break;

        case "heartbeat":
          conn.write(
            JSON.stringify({
              type: "heartbeat-response",
              from: this.peerId,
              timestamp: Date.now(),
            })
          );
          break;

        default:
          console.log(`⚠️  Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`❌ Error parsing message from ${peerId}:`, error.message);
    }
  }

  handleAdapterRequest(conn, message, peerId) {
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

    console.log(`📥 Adapter request from ${peerId}: ${adapter.name}`);
    this.sendAdapterInChunks(conn, adapter, peerId);
  }

  sendAdapterInChunks(conn, adapter, peerId) {
    console.log(`📤 Starting chunked transfer of ${adapter.name} to ${peerId}`);

    const fileData = Buffer.alloc(adapter.size, "A");
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

      const chunkChecksum = crypto
        .createHash("sha256")
        .update(chunk)
        .digest("hex");

      const chunkMessage = {
        type: "adapter-chunk",
        data: {
          topic: adapter.topic,
          chunk: chunk.toString("base64"),
          index: chunkIndex,
          total: totalChunks,
          checksum: chunkChecksum,
          metadata: chunkIndex === 0 ? adapter : undefined,
        },
      };

      try {
        conn.write(JSON.stringify(chunkMessage));
        console.log(
          `📦 Sent chunk ${chunkIndex + 1}/${totalChunks} of ${adapter.name}`
        );

        chunkIndex++;
        setTimeout(sendNextChunk, 100); // 100ms delay
      } catch (error) {
        console.error(`❌ Error sending chunk ${chunkIndex}:`, error.message);
      }
    };

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
        timestamp: new Date().toISOString(),
        type: "mock-hyperswarm",
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
    console.log("🛑 Stopping mock Hyperswarm peer...");
    await this.swarm.destroy();
    this.connections.clear();
    console.log("✅ Mock Hyperswarm peer stopped");
  }
}

// Start the peer
const peer = new MockHyperswarmPeer();

peer.start().catch((error) => {
  console.error("❌ Failed to start mock Hyperswarm peer:", error);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Received SIGINT, shutting down...");
  await peer.stop();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Received SIGTERM, shutting down...");
  await peer.stop();
  process.exit(0);
});
