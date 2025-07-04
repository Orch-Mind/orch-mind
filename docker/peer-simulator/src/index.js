#!/usr/bin/env node

const Hyperswarm = require("hyperswarm");
const crypto = require("crypto");
const fs = require("fs-extra");
const path = require("path");
const express = require("express");
const { nanoid } = require("nanoid");
const chalk = require("chalk");
const debug = require("debug")("orch-os:peer-simulator");

class OrchOSPeerSimulator {
  constructor() {
    this.swarm = new Hyperswarm();
    this.peerId = process.env.P2P_PEER_ID || `peer-${nanoid(8)}`;
    this.port = process.env.P2P_PORT || 3001;
    this.adapters = new Map();
    this.connections = new Map();
    this.activeRooms = new Set();
    this.updateCounter = 0;

    // Well-known room topics (same as main Orch-OS)
    this.GENERAL_ROOM = "orch-os-general-public-community-room-v1";
    this.LOCAL_PREFIX = "orch-os-local-network-";

    this.setupExpress();
    this.loadAdapters();
    this.setupSwarmListeners();
  }

  setupExpress() {
    this.app = express();
    this.app.use(express.json());

    // Health check endpoint
    this.app.get("/health", (req, res) => {
      res.json({
        status: "healthy",
        peerId: this.peerId,
        connections: this.connections.size,
        adapters: this.adapters.size,
        activeRooms: Array.from(this.activeRooms),
        uptime: process.uptime(),
      });
    });

    // API endpoints for testing
    this.app.get("/api/adapters", (req, res) => {
      const adapterList = Array.from(this.adapters.values()).map((adapter) => ({
        name: adapter.name,
        size: adapter.size,
        checksum: adapter.checksum,
        topic: adapter.topic,
        metadata: adapter.metadata,
      }));
      res.json(adapterList);
    });

    this.app.post("/api/join-room/:roomCode", (req, res) => {
      const { roomCode } = req.params;
      this.joinRoom(roomCode);
      res.json({ success: true, room: roomCode });
    });

    // API endpoint to leave test rooms and stay only in Community
    this.app.post("/api/cleanup-test-rooms", (req, res) => {
      const testRooms = Array.from(this.activeRooms).filter(
        (room) =>
          room.startsWith("test-room-") || room.startsWith(this.LOCAL_PREFIX)
      );

      testRooms.forEach((room) => {
        if (room !== this.GENERAL_ROOM) {
          this.activeRooms.delete(room);
          console.log(chalk.yellow(`🧹 Left test room: ${room}`));
        }
      });

      res.json({
        success: true,
        removedRooms: testRooms,
        activeRooms: Array.from(this.activeRooms),
      });
    });

    this.app.listen(this.port, () => {
      console.log(
        chalk.green(`🚀 Orch-OS Peer Simulator running on port ${this.port}`)
      );
      console.log(chalk.blue(`📋 Peer ID: ${this.peerId}`));
      console.log(
        chalk.yellow(`🔗 Health check: http://localhost:${this.port}/health`)
      );
    });
  }

  async loadAdapters() {
    const adaptersDir = path.join(__dirname, "..", "adapters");

    try {
      const adapterDirs = await fs.readdir(adaptersDir);

      for (const adapterDir of adapterDirs) {
        const adapterPath = path.join(adaptersDir, adapterDir);
        const configPath = path.join(adapterPath, "adapter_config.json");
        const modelPath = path.join(adapterPath, "adapter_model.safetensors");

        if (
          (await fs.pathExists(configPath)) &&
          (await fs.pathExists(modelPath))
        ) {
          const config = await fs.readJSON(configPath);
          const stats = await fs.stat(modelPath);

          // Calculate real checksum
          const fileBuffer = await fs.readFile(modelPath);
          const checksum = crypto
            .createHash("sha256")
            .update(fileBuffer)
            .digest("hex");

          const adapter = {
            name: config.name,
            size: stats.size,
            checksum: checksum,
            topic: crypto.randomBytes(32).toString("hex"),
            timestamp: Date.now(),
            metadata: {
              adapter_id: config.adapter_id,
              base_model: config.base_model,
              hf_model: config.hf_model,
              created_at: config.created_at,
              training_method: config.training_method,
              status: config.status,
              file_type: "safetensors",
              file_path: modelPath,
              ...config.metadata,
            },
            filePath: modelPath,
          };

          this.adapters.set(adapter.topic, adapter);
          console.log(
            chalk.cyan(
              `📦 Loaded adapter: ${adapter.name} (${(
                adapter.size /
                1024 /
                1024
              ).toFixed(1)}MB)`
            )
          );
        }
      }

      console.log(chalk.green(`✅ Loaded ${this.adapters.size} test adapters`));
    } catch (error) {
      console.error(chalk.red(`❌ Error loading adapters: ${error.message}`));
    }
  }

  setupSwarmListeners() {
    this.swarm.on("connection", (conn, info) => {
      const peerId = info.publicKey.toString("hex").slice(0, 12);
      this.connections.set(peerId, conn);

      console.log(chalk.magenta(`🤝 New peer connected: ${peerId}`));

      // Configure connection for better stability and resilience
      conn.setKeepAlive(true, 15000); // Keep alive every 15 seconds (more frequent)
      conn.setTimeout(0); // No timeout - let heartbeat handle it

      // Set TCP_NODELAY for better real-time performance
      if (conn.setNoDelay) {
        conn.setNoDelay(true);
      }

      // Send adapter list immediately
      this.sendAdapterList(conn);

      // Send adapter list periodically with heartbeat to ensure visibility
      const heartbeatInterval = setInterval(() => {
        if (this.connections.has(peerId)) {
          try {
            // Send heartbeat first
            this.sendHeartbeat(conn, peerId);
            // Then send adapter list
            this.sendAdapterList(conn);
          } catch (error) {
            console.error(
              chalk.red(`❌ Heartbeat failed for ${peerId}: ${error.message}`)
            );
            this.cleanupConnection(peerId, heartbeatInterval);
          }
        } else {
          clearInterval(heartbeatInterval);
        }
      }, 30000); // Every 30 seconds

      conn.on("data", (data) => {
        this.handleMessage(conn, data, peerId);
      });

      conn.on("close", () => {
        this.cleanupConnection(peerId, heartbeatInterval);
        console.log(chalk.yellow(`👋 Peer disconnected: ${peerId}`));
      });

      conn.on("error", (err) => {
        console.error(
          chalk.red(`❌ Connection error with ${peerId}: ${err.message}`)
        );
        this.cleanupConnection(peerId, heartbeatInterval);
      });

      conn.on("timeout", () => {
        console.log(
          chalk.yellow(
            `⏰ Connection timeout with ${peerId}, attempting recovery...`
          )
        );
        // Don't close immediately on timeout, try to recover
        try {
          this.sendHeartbeat(conn, peerId);
        } catch (error) {
          console.error(
            chalk.red(`❌ Recovery failed for ${peerId}: ${error.message}`)
          );
          this.cleanupConnection(peerId, heartbeatInterval);
        }
      });
    });

    this.swarm.on("update", () => {
      debug(`Swarm update: ${this.swarm.connections.size} connections`);

      // Log connection health every 10 updates
      if (this.updateCounter % 10 === 0) {
        console.log(
          chalk.cyan(
            `📊 P2P Health: ${this.swarm.connections.size} active connections, ${this.connections.size} tracked peers`
          )
        );
      }
      this.updateCounter = (this.updateCounter || 0) + 1;
    });

    // Handle swarm errors
    this.swarm.on("error", (err) => {
      console.error(chalk.red(`❌ Swarm error: ${err.message}`));
      // Attempt to recover from swarm errors
      setTimeout(() => {
        this.attemptSwarmRecovery();
      }, 5000);
    });
  }

  handleMessage(conn, data, peerId) {
    try {
      const message = JSON.parse(data.toString());
      debug(`📨 Message from ${peerId}: ${message.type}`);

      switch (message.type) {
        case "request-adapters":
          this.sendAdapterList(conn);
          break;

        case "request-adapter":
          this.handleAdapterRequest(conn, message, peerId);
          break;

        case "adapter-chunk":
          this.handleAdapterChunk(conn, message, peerId);
          break;

        case "heartbeat":
          // Respond to heartbeat to confirm connection is alive
          this.sendHeartbeatResponse(conn, peerId);
          debug(`💓 Heartbeat received from ${peerId}`);
          break;

        case "heartbeat-response":
          // Log heartbeat response for connection health monitoring
          debug(`💗 Heartbeat response from ${peerId}`);
          break;

        default:
          debug(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error(
        chalk.red(`❌ Error handling message from ${peerId}: ${error.message}`)
      );
    }
  }

  sendAdapterList(conn) {
    const adapterList = Array.from(this.adapters.values()).map((adapter) => ({
      name: adapter.name,
      size: adapter.size,
      checksum: adapter.checksum,
      topic: adapter.topic,
      timestamp: adapter.timestamp,
      metadata: adapter.metadata,
    }));

    const message = {
      type: "adapter-list",
      adapters: adapterList,
      from: this.peerId,
      timestamp: Date.now(),
    };

    conn.write(JSON.stringify(message));
    debug(`📤 Sent adapter list: ${adapterList.length} adapters`);
  }

  async handleAdapterRequest(conn, message, peerId) {
    const { topic } = message;
    const adapter = this.adapters.get(topic);

    if (!adapter) {
      conn.write(
        JSON.stringify({
          type: "adapter-error",
          topic,
          error: "Adapter not found",
        })
      );
      return;
    }

    console.log(chalk.blue(`📤 Sending adapter ${adapter.name} to ${peerId}`));

    try {
      // Send adapter in 64KB chunks (same as Orch-OS)
      const fileBuffer = await fs.readFile(adapter.filePath);
      const chunkSize = 64 * 1024; // 64KB
      const totalChunks = Math.ceil(fileBuffer.length / chunkSize);

      // Send start message
      conn.write(
        JSON.stringify({
          type: "adapter-start",
          topic,
          totalSize: fileBuffer.length,
          totalChunks,
          checksum: adapter.checksum,
          metadata: adapter.metadata,
        })
      );

      // Send chunks
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, fileBuffer.length);
        const chunk = fileBuffer.slice(start, end);
        const chunkChecksum = crypto
          .createHash("sha256")
          .update(chunk)
          .digest("hex");

        const chunkMessage = {
          type: "adapter-chunk",
          topic,
          chunkIndex: i,
          totalChunks,
          data: chunk.toString("base64"),
          checksum: chunkChecksum,
        };

        conn.write(JSON.stringify(chunkMessage));

        // Small delay to prevent overwhelming
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // Send completion message
      conn.write(
        JSON.stringify({
          type: "adapter-complete",
          topic,
          checksum: adapter.checksum,
        })
      );

      console.log(
        chalk.green(`✅ Successfully sent ${adapter.name} to ${peerId}`)
      );
    } catch (error) {
      console.error(chalk.red(`❌ Error sending adapter: ${error.message}`));
      conn.write(
        JSON.stringify({
          type: "adapter-error",
          topic,
          error: error.message,
        })
      );
    }
  }

  joinRoom(roomCode) {
    // Use the same hash format as Orch-OS: convert to hex string first, then to Buffer
    const hashHex = crypto.createHash("sha256").update(roomCode).digest("hex");
    const topic = Buffer.from(hashHex, "hex");

    if (this.activeRooms.has(roomCode)) {
      console.log(chalk.yellow(`⚠️  Already in room: ${roomCode}`));
      return;
    }

    this.swarm.join(topic, { server: true, client: true });
    this.activeRooms.add(roomCode);

    console.log(chalk.green(`🚪 Joined room: ${roomCode}`));
    console.log(chalk.gray(`   Hash (hex): ${hashHex}`));
    console.log(
      chalk.gray(`   Topic: ${topic.toString("hex").slice(0, 16)}...`)
    );
  }

  async start() {
    console.log(chalk.bold.blue("🌟 Starting Orch-OS Peer Simulator"));
    console.log(
      chalk.gray("   Simulating P2P peer for testing adapter sharing")
    );

    // Join ONLY the general community room for global visibility
    this.joinRoom(this.GENERAL_ROOM);
    console.log(
      chalk.cyan(`🌍 Peer available in Community room for Orch-OS testing`)
    );

    // Keep process alive
    process.on("SIGINT", () => {
      console.log(chalk.yellow("\n🛑 Shutting down peer simulator..."));
      this.swarm.destroy();
      process.exit(0);
    });
  }

  /**
   * Send heartbeat to maintain connection
   */
  sendHeartbeat(conn, peerId) {
    try {
      const heartbeat = {
        type: "heartbeat",
        from: this.peerId,
        timestamp: Date.now(),
      };

      conn.write(JSON.stringify(heartbeat));
      debug(`💓 Heartbeat sent to ${peerId}`);
    } catch (error) {
      throw new Error(`Heartbeat failed: ${error.message}`);
    }
  }

  /**
   * Clean up connection and associated resources
   */
  cleanupConnection(peerId, interval) {
    this.connections.delete(peerId);
    if (interval) {
      clearInterval(interval);
    }
  }

  /**
   * Attempt to recover from swarm errors
   */
  attemptSwarmRecovery() {
    console.log(chalk.yellow("🔄 Attempting swarm recovery..."));

    try {
      // Rejoin the general room if we're not connected
      if (this.swarm.connections.size === 0) {
        console.log(chalk.blue("🔄 Rejoining general room for recovery..."));
        this.joinRoom(this.GENERAL_ROOM);
      }
    } catch (error) {
      console.error(chalk.red(`❌ Swarm recovery failed: ${error.message}`));
    }
  }

  /**
   * Send heartbeat response
   */
  sendHeartbeatResponse(conn, peerId) {
    try {
      const heartbeatResponse = {
        type: "heartbeat-response",
        from: this.peerId,
        timestamp: Date.now(),
      };

      conn.write(JSON.stringify(heartbeatResponse));
      debug(`💗 Heartbeat response sent to ${peerId}`);
    } catch (error) {
      console.error(
        chalk.red(
          `❌ Failed to send heartbeat response to ${peerId}: ${error.message}`
        )
      );
    }
  }
}

// Start the simulator
const simulator = new OrchOSPeerSimulator();
simulator.start().catch(console.error);
