// Simple test for mock service in browser console
console.log("🧪 Testing Mock P2P Service");

// Test if we're in development mode
console.log("Environment check:");
console.log("- hostname:", window.location.hostname);
console.log("- isDevelopment:", window.location.hostname === "localhost");

// Test direct import
(async () => {
  try {
    console.log("\n📦 Importing P2P service...");
    const { p2pService } = await import("/src/services/p2p/P2PService.ts");

    console.log("✅ P2P service imported successfully");

    // Initialize
    console.log("🚀 Initializing...");
    await p2pService.initialize();

    // Check status
    setTimeout(() => {
      const status = p2pService.getStatus();
      console.log("📊 Status:", status);

      const adapters = p2pService.getAvailableAdapters();
      console.log("📦 Available adapters:", adapters.length);

      if (adapters.length > 0) {
        console.log("🎯 Mock service is working!");
        console.log(
          "Adapters:",
          adapters.map((a) => a.name)
        );
      } else {
        console.log("⚠️ No adapters found - mock may not be active");
      }
    }, 3000);
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
})();
