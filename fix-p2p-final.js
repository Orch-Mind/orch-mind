#!/usr/bin/env node

// Script final de correção P2P para Orch-OS
// Baseado em análise de problemas intermitentes Docker + Hyperswarm

console.log("🔧 Orch-OS P2P Final Fix Tool");
console.log("=============================\n");

const { execSync } = require("child_process");
const fs = require("fs");

// 1. Verificar se o problema é específico do macOS Docker
console.log("1. Checking macOS Docker specific issues...");
try {
  const dockerInfo = execSync(
    'docker info --format "{{.OSType}}/{{.Architecture}}"',
    { encoding: "utf8" }
  ).trim();
  console.log(`✅ Docker Platform: ${dockerInfo}`);

  if (dockerInfo.includes("darwin") || dockerInfo.includes("arm64")) {
    console.log(
      "⚠️  Detected macOS Docker - known to have P2P networking issues"
    );
    console.log(
      "   Recommendation: Use host networking or bridge with specific ports"
    );
  }
} catch (error) {
  console.log("❌ Could not get Docker info");
}

// 2. Test current Docker peer status
console.log("\n2. Testing Docker peer status...");
try {
  const containerStatus = execSync(
    'docker ps --filter "name=orch-os-peer-simulator" --format "{{.Status}}"',
    { encoding: "utf8" }
  ).trim();
  console.log(`✅ Container Status: ${containerStatus}`);

  const health = JSON.parse(
    execSync("curl -s http://localhost:3001/health", { encoding: "utf8" })
  );
  console.log(
    `✅ Health: ${health.status}, Connections: ${health.connections}, Adapters: ${health.adapters}`
  );

  // If 0 connections but healthy, it's a P2P networking issue
  if (health.connections === 0 && health.status === "healthy") {
    console.log(
      "🔍 DIAGNOSIS: P2P networking issue - Docker healthy but no connections"
    );
    console.log(
      "   This is typically caused by macOS Docker network isolation"
    );
  }
} catch (error) {
  console.log("❌ Could not check Docker status");
}

// 3. Implement final fix strategy
console.log("\n3. Implementing final fix strategy...");

// Strategy 1: Reset Docker network completely
console.log("Strategy 1: Resetting Docker network...");
try {
  execSync("cd docker && docker-compose down", { stdio: "pipe" });
  execSync("docker network prune -f", { stdio: "pipe" });
  console.log("✅ Docker network reset complete");
} catch (error) {
  console.log("⚠️  Docker network reset failed (might not be critical)");
}

// Strategy 2: Update Docker compose with optimal settings for macOS
console.log("Strategy 2: Updating Docker compose for macOS optimization...");
const dockerComposeContent = `services:
  # Peer Simulator - Optimized for macOS Docker networking
  peer-simulator:
    build:
      context: ./peer-simulator
      dockerfile: Dockerfile
    container_name: orch-os-peer-simulator
    hostname: peer-simulator
    environment:
      - NODE_ENV=production
      - P2P_PEER_ID=docker-peer-simulator
      - P2P_PORT=3001
      - DEBUG=orch-os:*
      # macOS Docker optimization
      - HYPERSWARM_ANNOUNCE_INTERVAL=30000
      - HYPERSWARM_LOOKUP_INTERVAL=30000
    ports:
      - "3001:3001" # HTTP API port
      - "49737:49737/udp" # P2P port UDP for Hyperswarm
      - "49737:49737/tcp" # P2P port TCP for Hyperswarm
    volumes:
      - peer_data:/app/data
      - peer_logs:/app/logs
      - peer_downloads:/app/downloads
    networks:
      - orch_p2p_network
    restart: unless-stopped
    # Optimized healthcheck for macOS
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 10s  # More frequent for faster detection
      timeout: 5s
      retries: 3
      start_period: 10s
    # Optimize for macOS Docker
    platform: linux/amd64
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    labels:
      - "orch-os.component=peer-simulator"
      - "orch-os.test=true"

# Optimized network for macOS Docker
networks:
  orch_p2p_network:
    driver: bridge
    driver_opts:
      com.docker.network.bridge.name: orch-p2p-br
      com.docker.network.bridge.enable_icc: "true"
      com.docker.network.bridge.enable_ip_masquerade: "true"
      com.docker.network.driver.mtu: 1500
    ipam:
      driver: default
      config:
        - subnet: 172.20.0.0/16
          gateway: 172.20.0.1

volumes:
  peer_data:
    driver: local
  peer_logs:
    driver: local
  peer_downloads:
    driver: local
`;

fs.writeFileSync("docker/docker-compose.yml", dockerComposeContent);
console.log("✅ Docker compose updated with macOS optimizations");

// Strategy 3: Start with new configuration
console.log("Strategy 3: Starting with new configuration...");
try {
  execSync("cd docker && docker-compose up -d", { stdio: "inherit" });
  console.log("✅ Docker containers started with new configuration");
} catch (error) {
  console.log("❌ Failed to start containers");
}

// 4. Wait and test final result
console.log("\n4. Testing final result...");
console.log("Waiting 15 seconds for containers to stabilize...");

setTimeout(() => {
  try {
    const health = JSON.parse(
      execSync("curl -s http://localhost:3001/health", { encoding: "utf8" })
    );
    console.log(`\n🎯 FINAL RESULT:`);
    console.log(`   Status: ${health.status}`);
    console.log(`   Connections: ${health.connections}`);
    console.log(`   Adapters: ${health.adapters}`);

    if (health.status === "healthy" && health.adapters === 2) {
      console.log("\n✅ SUCCESS: Docker peer simulator is working correctly!");
      console.log(
        "   Now test the Orch-OS connection using the debug button in the UI."
      );
      console.log(
        "   If connections still show 0, the issue is in the Orch-OS P2P client."
      );
    } else {
      console.log("\n❌ ISSUE: Docker peer simulator not fully operational");
      console.log(
        "   Please check Docker logs: docker logs orch-os-peer-simulator"
      );
    }
  } catch (error) {
    console.log("\n❌ Could not test final result");
  }
}, 15000);

console.log("\n📋 NEXT STEPS:");
console.log("1. Wait for the test above to complete");
console.log("2. Open Orch-OS and go to Share tab");
console.log('3. Click the "🔧 Force Connect to Community" button');
console.log("4. Check if adapters appear in the Available list");
console.log("5. If adapters appear, try downloading one");
console.log(
  "\nIf the issue persists, it's a Hyperswarm compatibility issue with macOS Docker that may require alternative P2P solutions."
);
