// Debug P2P connection issues
// Run this in the browser console

console.log("🔧 P2P Debug Tools Loaded! Available commands:");
console.log("• debugDownloadLogic() - Test download validation logic");
console.log("• testConnection() - Test P2P connection");
console.log("• checkAdapters() - Show available adapters");
console.log("• monitorAdapters() - Monitor adapter events");
console.log("• debugConnectionFlow() - Debug connection flow");
console.log("• debugAdapterManager() - Debug adapter manager state");
console.log("• debugElectronAPI() - Check API availability");
console.log("• testDownload() - Test download with proper API");
console.log("");
console.log("🎉 Docker peer is now running! Try downloading an adapter!");

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
window.debugElectronAPI = function () {
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
  if (typeof api.p2pRequestAdapter === "function") {
    console.log("✅ p2pRequestAdapter is a function");
  } else {
    console.error(
      "❌ p2pRequestAdapter is not a function:",
      typeof api.p2pRequestAdapter
    );
  }
};

// Test 8: Test download with proper API
window.testDownload = async function () {
  console.log("\n=== Test Download ===");

  const api = window.electronAPI;
  if (!api || typeof api.p2pRequestAdapter !== "function") {
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
      fromPeer: testAdapter.from,
    });
    console.log("✅ Download request result:", result);
  } catch (error) {
    console.error("❌ Download request failed:", error);
  }
};

// Test 9: Force update incoming adapters
window.forceAddTestAdapter = function () {
  console.log("\n=== Force Adding Test Adapter ===");

  // Simulate an adapter available event
  const testData = {
    from: "115f4f24df80", // Match Docker peer ID
    adapters: [
      {
        name: "test-adapter",
        topic: "test-topic-" + Date.now(),
        size: 1024 * 1024 * 10, // 10MB
        from: "115f4f24df80",
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

// Test 10: Check Docker peer status
window.checkDockerPeer = async function () {
  console.log("\n=== Docker Peer Status ===");

  try {
    const response = await fetch("http://localhost:3001/health");
    const health = await response.json();

    console.log("✅ Docker peer is healthy:");
    console.log("  - Status:", health.status);
    console.log("  - Peer ID:", health.peer_id);
    console.log("  - Connections:", health.connections);
    console.log("  - Adapters:", health.adapters);
    console.log("  - Timestamp:", health.timestamp);

    // Check adapters endpoint
    const adaptResponse = await fetch("http://localhost:3001/adapters");
    const adapters = await adaptResponse.json();

    console.log("\n📦 Available adapters from Docker peer:");
    adapters.adapters.forEach((adapter, i) => {
      console.log(`  ${i + 1}. ${adapter.name} (${adapter.size} bytes)`);
      console.log(`     Topic: ${adapter.topic}`);
      console.log(`     From: ${adapter.from}`);
    });
  } catch (error) {
    console.error("❌ Docker peer not reachable:", error.message);
    console.log("💡 Make sure Docker peer is running: docker-compose up -d");
  }
};

// Run initial tests
console.log("\n🚀 Running initial P2P debug tests...\n");
testConnection();
debugDownloadLogic();

console.log("\n📌 Available commands:");
console.log("• testConnection() - Test P2P connection");
console.log("• debugDownloadLogic() - Test download validation");
console.log("• debugElectronAPI() - Check Electron API");
console.log("• testDownload() - Test actual download");
console.log("• checkDockerPeer() - Check Docker peer status");
console.log("• monitorAdapters() - Monitor adapter events");
console.log("• debugAdapterManager() - Debug adapter state");
console.log("• forceAddTestAdapter() - Add test adapter");

console.log("\n🎯 Quick test sequence:");
console.log("1. checkDockerPeer() - Verify Docker peer");
console.log("2. debugElectronAPI() - Verify APIs");
console.log("3. testDownload() - Try downloading");
