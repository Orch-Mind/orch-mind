#!/usr/bin/env node

// Simple P2P Peer Emulator for Orch-OS
// Simulates Hyperswarm behavior without complex native dependencies

const net = require("net");
const crypto = require("crypto");
const express = require("express");

// Same adapters as the real Orch-OS would have
const adapters = [
  {
    name: "gemma3-test-adapter",
    topic: "gemma3-test-adapter-topic-hash-12345",
    size: 67108864, // 64MB
    description: "Test adapter for Gemma3 model",
    from: "115f4f24df80", // Simulated peer ID
  },
  {
    name: "llama3-coding-adapter",
    topic: "llama3-coding-adapter-topic-hash-67890",
    size: 33554432, // 32MB
    description: "Coding adapter for Llama3 model",
    from: "115f4f24df80", // Simulated peer ID
  },
];

class SimplePeerEmulator {
  constructor() {
    this.connections = new Map();
    this.peerId = "115f4f24df80"; // Fixed peer ID to match logs
    this.server = null;

    console.log("🚀 Simple Peer Emulator starting...");
    console.log(`📋 Peer ID: ${this.peerId}`);
    console.log(`📦 Available adapters: ${adapters.length}`);
  }

  async start() {
    // Start TCP server to simulate P2P connections
    this.server = net.createServer((socket) => {
      this.handleConnection(socket);
    });

    // Listen on a specific port for P2P connections
    this.server.listen(4001, "0.0.0.0", () => {
      console.log("🌐 P2P server listening on port 4001");
    });

    // Start HTTP server for health checks
    this.startHttpServer();

    // Simulate periodic adapter broadcasts
    this.startAdapterBroadcast();

    console.log("✅ Simple peer emulator ready");
  }

  handleConnection(socket) {
    const connectionId = crypto.randomBytes(6).toString("hex");
    this.connections.set(connectionId, socket);

    console.log(`🤝 New connection: ${connectionId}`);

    // Send adapter list immediately
    this.sendAdapterList(socket, connectionId);

    socket.on("data", (data) => {
      this.handleMessage(socket, data, connectionId);
    });

    socket.on("error", (error) => {
      console.error(`❌ Connection error ${connectionId}:`, error.message);
      this.connections.delete(connectionId);
    });

    socket.on("close", () => {
      console.log(`👋 Connection closed: ${connectionId}`);
      this.connections.delete(connectionId);
    });
  }

  sendAdapterList(socket, connectionId) {
    const message = {
      type: "adapter-list",
      adapters: adapters,
      from: this.peerId,
      timestamp: Date.now(),
    };

    try {
      socket.write(JSON.stringify(message) + "\n");
      console.log(
        `📤 Sent adapter list to ${connectionId}: ${adapters.length} adapters`
      );
    } catch (error) {
      console.error(
        `❌ Failed to send adapter list to ${connectionId}:`,
        error.message
      );
    }
  }

  handleMessage(socket, data, connectionId) {
    try {
      const messages = data
        .toString()
        .split("\n")
        .filter((msg) => msg.trim());

      for (const msgStr of messages) {
        const message = JSON.parse(msgStr);
        console.log(`📨 Message from ${connectionId}: ${message.type}`);

        switch (message.type) {
          case "adapter-request":
            this.handleAdapterRequest(socket, message, connectionId);
            break;

          case "ping":
            socket.write(
              JSON.stringify({
                type: "pong",
                from: this.peerId,
                timestamp: Date.now(),
              }) + "\n"
            );
            break;

          default:
            console.log(
              `⚠️  Unknown message type from ${connectionId}: ${message.type}`
            );
        }
      }
    } catch (error) {
      console.error(
        `❌ Error parsing message from ${connectionId}:`,
        error.message
      );
    }
  }

  handleAdapterRequest(socket, message, connectionId) {
    // Support both topic-based and name-based requests
    const { topic, adapterName } = message.data || message;
    let adapter;

    if (topic) {
      adapter = adapters.find((a) => a.topic === topic);
    } else if (adapterName) {
      adapter = adapters.find((a) => a.name === adapterName);
    }

    if (!adapter) {
      socket.write(
        JSON.stringify({
          type: "adapter-error",
          error: "Adapter not found",
          topic: topic,
          adapterName: adapterName,
          from: this.peerId,
        }) + "\n"
      );
      return;
    }

    console.log(
      `📥 Adapter request from ${connectionId}: ${adapter.name} (topic: ${
        topic || "name-based"
      })`
    );

    // Send adapter in chunks (simulating real file transfer)
    this.sendAdapterInChunks(socket, adapter, connectionId);
  }

  sendAdapterInChunks(socket, adapter, connectionId) {
    console.log(
      `📤 Starting chunked transfer of ${adapter.name} to ${connectionId}`
    );

    // Simulate file data
    const fileData = Buffer.alloc(adapter.size, "A"); // Fill with 'A' characters
    const chunkSize = 64 * 1024; // 64KB chunks
    const totalChunks = Math.ceil(fileData.length / chunkSize);

    let chunkIndex = 0;

    const sendNextChunk = () => {
      if (chunkIndex >= totalChunks) {
        console.log(
          `✅ Completed transfer of ${adapter.name} to ${connectionId}`
        );
        return;
      }

      const start = chunkIndex * chunkSize;
      const end = Math.min(start + chunkSize, fileData.length);
      const chunk = fileData.slice(start, end);

      // Calculate chunk checksum
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
          metadata: chunkIndex === 0 ? adapter : undefined, // Send metadata with first chunk
        },
      };

      try {
        socket.write(JSON.stringify(chunkMessage) + "\n");
        console.log(
          `📦 Sent chunk ${chunkIndex + 1}/${totalChunks} of ${adapter.name}`
        );

        chunkIndex++;

        // Send next chunk after a small delay to avoid overwhelming
        setTimeout(sendNextChunk, 50); // 50ms delay between chunks
      } catch (error) {
        console.error(
          `❌ Error sending chunk ${chunkIndex} to ${connectionId}:`,
          error.message
        );
      }
    };

    // Start sending chunks
    sendNextChunk();
  }

  startAdapterBroadcast() {
    // Broadcast adapter list every 30 seconds to simulate active peer
    setInterval(() => {
      if (this.connections.size > 0) {
        console.log(
          `📡 Broadcasting adapter list to ${this.connections.size} connections`
        );
        this.connections.forEach((socket, connectionId) => {
          this.sendAdapterList(socket, connectionId);
        });
      }
    }, 30000);
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
    console.log("🛑 Stopping simple peer emulator...");
    if (this.server) {
      this.server.close();
    }
    this.connections.clear();
    console.log("✅ Simple peer emulator stopped");
  }
}

// Start the emulator
const emulator = new SimplePeerEmulator();

emulator.start().catch((error) => {
  console.error("❌ Failed to start simple peer emulator:", error);
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
