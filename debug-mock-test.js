// Debug script to test mock P2P service
console.log("🧪 Mock P2P Service Test");

// Test mock service detection
function testMockService() {
  console.log("\n=== Mock Service Detection ===");
  console.log("hostname:", window.location.hostname);
  console.log("NODE_ENV:", process?.env?.NODE_ENV);
  console.log("isDevelopment:", window.location.hostname === "localhost");

  // Check if P2P service exists
  if (window.p2pService) {
    console.log("✅ P2P Service found");
  } else {
    console.log("❌ P2P Service not found");
  }
}

// Test P2P connection
async function testP2PConnection() {
  console.log("\n=== P2P Connection Test ===");

  try {
    // Import P2P service
    const { p2pService } = await import("/src/services/p2p/P2PService.ts");

    console.log("📡 Initializing P2P service...");
    await p2pService.initialize();

    console.log("🌍 Joining Community room...");
    await p2pService.joinGeneralRoom();

    // Wait for connection
    console.log("⏳ Waiting for connection...");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Check status
    const status = p2pService.getStatus();
    console.log("📊 Status:", status);

    // Check adapters
    const adapters = p2pService.getAvailableAdapters();
    console.log("📦 Available adapters:", adapters.length);
    adapters.forEach((adapter) => {
      console.log(
        `  - ${adapter.name} (${(adapter.size / 1024 / 1024).toFixed(1)}MB)`
      );
    });

    // Test download if adapters available
    if (adapters.length > 0) {
      const firstAdapter = adapters[0];
      console.log(`📥 Testing download of ${firstAdapter.name}...`);

      try {
        const data = await p2pService.requestAdapter(firstAdapter.topic);
        console.log(`✅ Download successful! Size: ${data.length} bytes`);
      } catch (error) {
        console.error("❌ Download failed:", error.message);
      }
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run tests
testMockService();
setTimeout(testP2PConnection, 1000);
