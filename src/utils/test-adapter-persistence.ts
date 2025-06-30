// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * Test script para validar a persistência dos adapters
 *
 * Execute no console do browser:
 * window.testAdapterPersistence();
 */

declare global {
  interface Window {
    testAdapterPersistence: () => void;
  }
}

const testAdapterPersistence = () => {
  console.log("🧪 [ADAPTER-PERSISTENCE-TEST] Starting test...");

  // Check current localStorage state
  const p2pState = localStorage.getItem("orch-os-p2p-state");
  if (p2pState) {
    const state = JSON.parse(p2pState);
    console.log("✅ [ADAPTER-PERSISTENCE-TEST] Current P2P state:", {
      sharedAdapterIds: state.sharedAdapterIds,
      count: state.sharedAdapterIds?.length || 0,
    });
  } else {
    console.log("❌ [ADAPTER-PERSISTENCE-TEST] No P2P state found");
  }

  // Set a test adapter for testing
  const testState = {
    lastConnectionType: null,
    lastRoomCode: "",
    lastSelectedMode: "auto",
    sharedAdapterIds: ["test-adapter-1", "test-adapter-2"],
    isSharing: false,
    roomHistory: [],
  };

  localStorage.setItem("orch-os-p2p-state", JSON.stringify(testState));
  console.log(
    "🔄 [ADAPTER-PERSISTENCE-TEST] Set test state with 2 shared adapters"
  );

  // Instructions for manual testing
  console.log("📋 [ADAPTER-PERSISTENCE-TEST] Manual test steps:");
  console.log("1. Click on WiFi icon to open popup");
  console.log("2. Click on popup to open Share settings");
  console.log("3. Check console logs for preserved shared state");
  console.log(
    "4. Verify that sharedAdapterIds are not deleted from localStorage"
  );
};

// Make available globally
if (typeof window !== "undefined") {
  window.testAdapterPersistence = testAdapterPersistence;
}

export default testAdapterPersistence;
