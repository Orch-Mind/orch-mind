#!/usr/bin/env node

// Script de diagnóstico P2P para Orch-OS
// Baseado em troubleshooting guides de sistemas P2P

console.log("🔍 Orch-OS P2P Diagnostic Tool");
console.log("===============================\n");

// 1. Test Docker Container
console.log("1. Testing Docker Container...");
const { execSync } = require("child_process");

try {
  const containerStatus = execSync(
    'docker ps --filter "name=orch-os-peer-simulator" --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"',
    { encoding: "utf8" }
  );
  console.log("✅ Docker Container Status:");
  console.log(containerStatus);

  // Test HTTP endpoint
  try {
    const healthCheck = execSync("curl -s http://localhost:3001/health", {
      encoding: "utf8",
    });
    const health = JSON.parse(healthCheck);
    console.log("✅ HTTP Endpoint Working:");
    console.log(`   - Status: ${health.status}`);
    console.log(`   - Connections: ${health.connections}`);
    console.log(`   - Adapters: ${health.adapters}`);
    console.log(`   - Uptime: ${Math.floor(health.uptime)}s`);
  } catch (error) {
    console.log("❌ HTTP Endpoint Failed:", error.message);
  }
} catch (error) {
  console.log("❌ Docker Container Issue:", error.message);
}

console.log("\n2. Testing Network Connectivity...");

// 2. Test network ports
const net = require("net");

function testPort(host, port, name) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2000);

    socket.on("connect", () => {
      console.log(`✅ ${name} (${host}:${port}) - Reachable`);
      socket.destroy();
      resolve(true);
    });

    socket.on("timeout", () => {
      console.log(`⚠️  ${name} (${host}:${port}) - Timeout`);
      socket.destroy();
      resolve(false);
    });

    socket.on("error", () => {
      console.log(`❌ ${name} (${host}:${port}) - Unreachable`);
      resolve(false);
    });

    socket.connect(port, host);
  });
}

async function testConnectivity() {
  await testPort("localhost", 3001, "Docker HTTP");
  await testPort("localhost", 49737, "Docker P2P TCP");

  // Test if any process is using the P2P port
  try {
    const lsof = execSync("lsof -i :49737", { encoding: "utf8" });
    console.log("📊 Port 49737 Usage:");
    console.log(lsof);
  } catch (error) {
    console.log("ℹ️  Port 49737 not in use");
  }
}

testConnectivity()
  .then(() => {
    console.log("\n3. Testing Topic Hash Compatibility...");

    // 3. Test hash generation
    const crypto = require("crypto");
    const topic = "orch-os-general-public-community-room-v1";

    // Docker method (corrected)
    const dockerHashHex = crypto
      .createHash("sha256")
      .update(topic)
      .digest("hex");
    const dockerTopic = Buffer.from(dockerHashHex, "hex");

    // Orch-OS method
    const orchosHash = crypto.createHash("sha256").update(topic).digest();
    const orchosHashHex = orchosHash.toString("hex");

    console.log("📋 Hash Compatibility Test:");
    console.log(`   Topic: ${topic}`);
    console.log(`   Docker Hash: ${dockerHashHex}`);
    console.log(`   Orch-OS Hash: ${orchosHashHex}`);
    console.log(`   ✅ Hashes Match: ${dockerHashHex === orchosHashHex}`);

    console.log("\n4. Recommendations:");

    if (dockerHashHex === orchosHashHex) {
      console.log("✅ Hash compatibility is correct");
    } else {
      console.log("❌ Hash mismatch - this would prevent connections");
    }

    console.log("\n📝 Next Steps:");
    console.log("1. Open Orch-OS and go to Share tab");
    console.log("2. Check the P2P Status indicator");
    console.log('3. Try clicking the "🧪 Test" button');
    console.log(
      "4. Monitor Docker logs: docker logs orch-os-peer-simulator --follow"
    );
    console.log("5. Check browser console for P2P logs");

    console.log("\n🔧 If issues persist:");
    console.log("- Restart Docker: docker-compose restart peer-simulator");
    console.log("- Check firewall settings");
    console.log("- Verify no other P2P apps are using port 49737");
  })
  .catch(console.error);

// Debug P2P connection issues
// Run this in the browser console

// Test 1: Check P2P Service Status
console.log("=== P2P Service Status ===");
const status = window.p2pService?.getStatus();
console.log("Status:", status);
console.log("Is Initialized:", window.p2pService?.isInitialized());

// Test 2: Check incoming adapters
console.log("\n=== Incoming Adapters ===");
const incomingAdapters = window.incomingAdaptersDebug || [];
console.log("Count:", incomingAdapters.length);
console.log("Adapters:", incomingAdapters);

// Test 3: Force connection check
async function testConnection() {
  console.log("\n=== Testing Connection ===");
  if (!window.p2pService) {
    console.error("P2P Service not available");
    return;
  }

  const result = await window.p2pService.ensureConnection(5000);
  console.log("Connection stable:", result);
  console.log("Final status:", window.p2pService.getStatus());
}

// Test 4: Debug download logic
function debugDownloadLogic() {
  console.log("\n=== Download Logic Debug ===");
  const status = window.p2pService?.getStatus() || {};
  const hasIncomingAdapters = (window.incomingAdaptersDebug || []).length > 0;

  console.log("Is Connected:", status.isConnected);
  console.log("Peers Count:", status.peersCount);
  console.log("Has Incoming Adapters:", hasIncomingAdapters);

  if (!status.isConnected) {
    console.log("❌ Would fail: Not connected");
  } else if (hasIncomingAdapters) {
    console.log(
      "✅ Would succeed: Has incoming adapters (proof of connectivity)"
    );
  } else if (status.peersCount > 0) {
    console.log("✅ Would succeed: Has peers");
  } else {
    console.log("⏳ Would wait for connection...");
  }
}

// Test 5: Monitor adapter updates
window.monitorAdapters = function () {
  console.log("\n=== Monitoring Adapter Updates ===");

  // Hook into adapter updates
  const originalDispatchEvent = window.dispatchEvent;
  window.dispatchEvent = function (event) {
    if (event.type === "p2p-adapters-available") {
      console.log("📥 Adapters Available Event:", event.detail);
      window.incomingAdaptersDebug = event.detail?.adapters || [];
    }
    return originalDispatchEvent.apply(window, arguments);
  };

  console.log("Monitoring started. Adapter events will be logged.");
};

// Test 6: Debug adapter manager state
window.debugAdapterManager = function () {
  console.log("\n=== Adapter Manager Debug ===");

  // Try to access the adapter manager state through P2P context
  const p2pContext = window.p2pContext || {};

  console.log("Shared Adapters:", p2pContext.sharedAdapters || []);
  console.log("Incoming Adapters:", p2pContext.incomingAdapters || []);

  // Check if we can access the ref values
  if (window.currentIncomingAdaptersRef) {
    console.log(
      "Incoming Adapters (from ref):",
      window.currentIncomingAdaptersRef.current
    );
  }
  
  // Debug adapter manager from P2P context
  if (window.p2pAdapterManager) {
    console.log("P2P Adapter Manager:", window.p2pAdapterManager);
  }
};

// Test 7: Check API availability
window.debugElectronAPI = function() {
  console.log("\n=== Electron API Debug ===");
  
  const api = window.electronAPI;
  if (!api) {
    console.error("❌ electronAPI not available");
    return;
  }
  
  console.log("✅ electronAPI available");
  console.log("p2pRequestAdapter available:", typeof api.p2pRequestAdapter);
  console.log("p2pInitialize available:", typeof api.p2pInitialize);
  console.log("p2pJoinRoom available:", typeof api.p2pJoinRoom);
  console.log("p2pShareAdapter available:", typeof api.p2pShareAdapter);
  
  // Test if we can call p2pRequestAdapter
  if (typeof api.p2pRequestAdapter === 'function') {
    console.log("✅ p2pRequestAdapter is a function");
  } else {
    console.error("❌ p2pRequestAdapter is not a function:", typeof api.p2pRequestAdapter);
  }
};

// Test 8: Test download with proper API
window.testDownload = async function() {
  console.log("\n=== Test Download ===");
  
  const api = window.electronAPI;
  if (!api || typeof api.p2pRequestAdapter !== 'function') {
    console.error("❌ p2pRequestAdapter not available");
    return;
  }
  
  // Get first available adapter
  const p2pContext = window.p2pContext || {};
  const adapters = p2pContext.incomingAdapters || [];
  
  if (adapters.length === 0) {
    console.error("❌ No adapters available for testing");
    return;
  }
  
  const testAdapter = adapters[0];
  console.log("🧪 Testing download for:", testAdapter.name);
  
  try {
    const result = await api.p2pRequestAdapter({
      topic: testAdapter.topic,
      fromPeer: testAdapter.from
    });
    console.log("✅ Download request result:", result);
  } catch (error) {
    console.error("❌ Download request failed:", error);
  }
};

// Test 7: Force update incoming adapters
window.forceAddTestAdapter = function () {
  console.log("\n=== Force Adding Test Adapter ===");

  // Simulate an adapter available event
  const testData = {
    from: "test-peer-123",
    adapters: [
      {
        name: "test-adapter",
        topic: "test-topic-" + Date.now(),
        size: 1024 * 1024 * 10, // 10MB
      },
    ],
  };

  window.dispatchEvent(
    new CustomEvent("p2p-adapters-available", {
      detail: testData,
    })
  );

  console.log("Test adapter event dispatched:", testData);
};

// Run tests
console.log("Running P2P debug tests...\n");
testConnection();
debugDownloadLogic();

console.log("\n📌 To monitor adapter updates, run: window.monitorAdapters()");
console.log("📌 To debug adapter state, run: window.debugAdapterManager()");
console.log("📌 To force add test adapter, run: window.forceAddTestAdapter()");
console.log(
  "📌 To re-run tests, run: testConnection() or debugDownloadLogic()"
);
