#!/usr/bin/env node

// Simple P2P Peer Simulator for Orch-OS
// Uses HTTP/WebSocket instead of Hyperswarm to avoid native dependencies

const express = require("express");
const WebSocket = require("ws");
const http = require("http");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Simulated adapters
const adapters = [
  {
    name: "gemma3-test-adapter",
    topic: "gemma3-test-adapter-topic-hash-12345",
    size: 67108864, // 64MB
    description: "Test adapter for Gemma3 model",
    from: "simple-peer-simulator",
  },
  {
    name: "llama3-coding-adapter",
    topic: "llama3-coding-adapter-topic-hash-67890",
    size: 33554432, // 32MB
    description: "Coding adapter for Llama3 model",
    from: "simple-peer-simulator",
  },
];

let connectionCount = 0;
const connections = new Set();

// Express middleware
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    connections: connectionCount,
    adapters: adapters.length,
    timestamp: new Date().toISOString(),
    peer_id: "simple-peer-simulator",
  });
});

// Get adapters endpoint
app.get("/adapters", (req, res) => {
  res.json({
    adapters: adapters,
    total: adapters.length,
    peer_id: "simple-peer-simulator",
  });
});

// WebSocket connection handling
wss.on("connection", (ws, req) => {
  connectionCount++;
  connections.add(ws);

  console.log(`🤝 New connection established (${connectionCount} total)`);

  // Send welcome message with adapters
  const welcomeMessage = {
    type: "adapter-list",
    adapters: adapters,
    from: "simple-peer-simulator",
    timestamp: new Date().toISOString(),
  };

  ws.send(JSON.stringify(welcomeMessage));
  console.log(`📤 Sent adapter list: ${adapters.length} adapters`);

  // Handle incoming messages
  ws.on("message", (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log(`📨 Received message: ${message.type}`);

      switch (message.type) {
        case "request-adapters":
          ws.send(JSON.stringify(welcomeMessage));
          break;

        case "ping":
          ws.send(
            JSON.stringify({
              type: "pong",
              timestamp: new Date().toISOString(),
            })
          );
          break;

        default:
          console.log(`⚠️  Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`❌ Error parsing message:`, error.message);
    }
  });

  // Handle connection close
  ws.on("close", () => {
    connectionCount--;
    connections.delete(ws);
    console.log(`👋 Connection closed (${connectionCount} remaining)`);
  });

  // Handle errors
  ws.on("error", (error) => {
    console.error(`❌ WebSocket error:`, error.message);
    connectionCount--;
    connections.delete(ws);
  });
});

// Periodic status updates
setInterval(() => {
  console.log(
    `📊 Status: ${connectionCount} connections, ${adapters.length} adapters available`
  );
}, 30000);

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Simple P2P Peer Simulator started`);
  console.log(`📡 HTTP Server: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket Server: ws://localhost:${PORT}`);
  console.log(`📦 Available adapters: ${adapters.length}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down gracefully...");
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Received SIGTERM, shutting down...");
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
});
