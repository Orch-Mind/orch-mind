#!/usr/bin/env node

// Teste de Conectividade Pears/Hyperswarm para Orch-OS
// Baseado no hyperdht-doctor para diagnosticar problemas de hole punching

const Hyperswarm = require("hyperswarm");
const crypto = require("crypto");

console.log("🔍 Pears/Hyperswarm Connectivity Test for Orch-OS");
console.log(
  "Based on hyperdht-doctor patterns for hole punching diagnostics\n"
);

class PearsConnectivityTest {
  constructor() {
    this.swarm = null;
    this.testResults = {
      swarmInit: false,
      dhtBootstrap: false,
      topicJoin: false,
      peerDiscovery: false,
      holepunch: false,
      connections: 0,
    };
    this.testTimeout = 30000; // 30 seconds
  }

  async runFullTest() {
    console.log("🚀 Starting Pears connectivity diagnostics...\n");

    try {
      await this.testSwarmInitialization();
      await this.testDHTBootstrap();
      await this.testTopicJoin();
      await this.testPeerDiscovery();
      await this.testHolePunching();

      this.printResults();
    } catch (error) {
      console.error("❌ Test failed:", error.message);
      this.printResults();
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }

  async testSwarmInitialization() {
    console.log("1️⃣ Testing Hyperswarm initialization...");

    try {
      this.swarm = new Hyperswarm({
        // Configurações para melhor conectividade
        maxPeers: 24,
        maxClientConnections: 10,
        maxServerConnections: 10,
      });

      this.testResults.swarmInit = true;
      console.log("   ✅ Hyperswarm initialized successfully");

      // Log swarm events for diagnostics
      this.swarm.on("connection", (conn, info) => {
        this.testResults.connections++;
        const peerId = info.publicKey.toString("hex").slice(0, 12);
        console.log(`   🤝 Connection established with peer: ${peerId}`);
        console.log(`   📊 Total connections: ${this.testResults.connections}`);

        if (this.testResults.connections > 0) {
          this.testResults.holepunch = true;
        }
      });

      this.swarm.on("disconnection", (conn, info) => {
        this.testResults.connections--;
        const peerId = info.publicKey.toString("hex").slice(0, 12);
        console.log(`   👋 Peer disconnected: ${peerId}`);
        console.log(`   📊 Total connections: ${this.testResults.connections}`);
      });
    } catch (error) {
      console.log("   ❌ Hyperswarm initialization failed:", error.message);
      throw error;
    }
  }

  async testDHTBootstrap() {
    console.log("\n2️⃣ Testing DHT bootstrap...");

    try {
      // Wait for DHT to bootstrap
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("DHT bootstrap timeout"));
        }, 10000);

        // Check if swarm.dht is ready
        const checkBootstrap = () => {
          if (this.swarm.dht && this.swarm.dht.bootstrapped) {
            clearTimeout(timeout);
            resolve();
          } else {
            setTimeout(checkBootstrap, 100);
          }
        };

        checkBootstrap();
      });

      this.testResults.dhtBootstrap = true;
      console.log("   ✅ DHT bootstrap successful");
      console.log(`   📡 DHT nodes: ${this.swarm.dht.nodes.size || "unknown"}`);
    } catch (error) {
      console.log("   ❌ DHT bootstrap failed:", error.message);
      // Continue test even if bootstrap fails
    }
  }

  async testTopicJoin() {
    console.log("\n3️⃣ Testing topic join (Community room)...");

    try {
      // Use the same Community room topic as Orch-OS
      const topic = "orch-os-general-public-community-room-v1";
      const topicHash = crypto.createHash("sha256").update(topic).digest();

      console.log(`   🔑 Topic: ${topic}`);
      console.log(`   📋 Hash: ${topicHash.toString("hex").slice(0, 16)}...`);

      const discovery = this.swarm.join(topicHash, {
        server: true,
        client: true,
      });

      await discovery.flushed();

      this.testResults.topicJoin = true;
      console.log("   ✅ Successfully joined Community room");
    } catch (error) {
      console.log("   ❌ Topic join failed:", error.message);
      throw error;
    }
  }

  async testPeerDiscovery() {
    console.log("\n4️⃣ Testing peer discovery...");

    try {
      // Wait for peer discovery
      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve(); // Don't fail if no peers found
        }, 15000);

        const checkPeers = () => {
          if (this.testResults.connections > 0) {
            clearTimeout(timeout);
            this.testResults.peerDiscovery = true;
            resolve();
          } else {
            setTimeout(checkPeers, 1000);
          }
        };

        checkPeers();
      });

      if (this.testResults.peerDiscovery) {
        console.log(`   ✅ Discovered ${this.testResults.connections} peer(s)`);
      } else {
        console.log(
          "   ⚠️  No peers discovered (this is normal if no other peers are online)"
        );
      }
    } catch (error) {
      console.log("   ❌ Peer discovery failed:", error.message);
    }
  }

  async testHolePunching() {
    console.log("\n5️⃣ Testing hole punching capabilities...");

    try {
      // Test if we can establish connections through NAT
      if (this.testResults.connections > 0) {
        console.log("   ✅ Hole punching successful - connections established");
        this.testResults.holepunch = true;
      } else {
        console.log("   ⚠️  No connections to test hole punching");
        console.log("   💡 This could mean:");
        console.log("      - No other peers are online in Community room");
        console.log("      - Firewall is blocking connections");
        console.log("      - NAT traversal is not working");
      }
    } catch (error) {
      console.log("   ❌ Hole punching test failed:", error.message);
    }
  }

  printResults() {
    console.log("\n📊 Test Results Summary:");
    console.log("========================");

    const results = [
      ["Hyperswarm Init", this.testResults.swarmInit],
      ["DHT Bootstrap", this.testResults.dhtBootstrap],
      ["Topic Join", this.testResults.topicJoin],
      ["Peer Discovery", this.testResults.peerDiscovery],
      ["Hole Punching", this.testResults.holepunch],
      ["Active Connections", this.testResults.connections],
    ];

    results.forEach(([test, result]) => {
      const status =
        typeof result === "boolean"
          ? result
            ? "✅ PASS"
            : "❌ FAIL"
          : `📊 ${result}`;
      console.log(`   ${test.padEnd(20)}: ${status}`);
    });

    console.log("\n🔧 Recommendations:");

    if (!this.testResults.swarmInit) {
      console.log(
        "   - Check if Hyperswarm dependencies are properly installed"
      );
      console.log("   - Verify sodium-native compilation");
    }

    if (!this.testResults.dhtBootstrap) {
      console.log("   - Check internet connectivity");
      console.log("   - Verify DNS resolution");
      console.log("   - Check if port 49737 (UDP) is accessible");
    }

    if (!this.testResults.topicJoin) {
      console.log("   - Verify topic hash generation");
      console.log("   - Check swarm join parameters");
    }

    if (!this.testResults.peerDiscovery) {
      console.log("   - Start another peer in Community room for testing");
      console.log("   - Check if Orch-OS is running and connected");
    }

    if (!this.testResults.holepunch) {
      console.log("   - Check firewall settings");
      console.log("   - Verify UPnP is enabled on router");
      console.log("   - Test with different network configurations");
    }

    console.log("\n💡 Next Steps:");
    console.log("   1. Start Orch-OS and connect to Community room");
    console.log("   2. Run this test again to verify peer discovery");
    console.log("   3. Check Orch-OS logs for P2P connection status");
  }

  async cleanup() {
    console.log("\n🧹 Cleaning up...");

    if (this.swarm) {
      await this.swarm.destroy();
      console.log("   ✅ Hyperswarm destroyed");
    }
  }
}

// Run the test
const test = new PearsConnectivityTest();

test.runFullTest().catch((error) => {
  console.error("💥 Test suite crashed:", error);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Test interrupted by user");
  await test.cleanup();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Test terminated");
  await test.cleanup();
  process.exit(0);
});
