// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * Test script para validar a persistência dos adapters com nova proteção
 *
 * Execute no console do browser:
 * window.testAdapterPersistence();
 */

declare global {
  interface Window {
    testAdapterPersistence: () => void;
    simulateAdapterDeletion: () => void;
    monitorLocalStorage: () => void;
  }
}

const testAdapterPersistence = () => {
  console.log("🧪 [ADAPTER-PERSISTENCE-TEST] Starting enhanced test...");

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
    sharedAdapterIds: ["test-adapter-1", "test-adapter-2", "llama3.1-custom"],
    isSharing: false,
    roomHistory: [],
  };

  localStorage.setItem("orch-os-p2p-state", JSON.stringify(testState));
  console.log(
    "🔄 [ADAPTER-PERSISTENCE-TEST] Set test state with 3 shared adapters"
  );

  // Monitor localStorage changes
  window.monitorLocalStorage();

  // Instructions for manual testing
  console.log("📋 [ADAPTER-PERSISTENCE-TEST] Enhanced test steps:");
  console.log("1. Check console for detailed useEffect logs");
  console.log("2. Look for 'hasInitiallyLoaded' flag in logs");
  console.log("3. Click WiFi icon → popup → Share settings");
  console.log("4. Verify sharedAdapterIds are preserved");
  console.log("5. Check for 'PREVENTING updateSharedAdapters([])' messages");
  console.log(
    "6. Run window.simulateAdapterDeletion() to test legitimate deletion"
  );
};

const simulateAdapterDeletion = () => {
  console.log(
    "🧪 [ADAPTER-DELETION-TEST] Simulating legitimate adapter deletion..."
  );

  // This simulates what should happen when user manually removes all adapters
  const currentState = JSON.parse(
    localStorage.getItem("orch-os-p2p-state") || "{}"
  );
  currentState.sharedAdapterIds = [];
  localStorage.setItem("orch-os-p2p-state", JSON.stringify(currentState));

  console.log(
    "✅ [ADAPTER-DELETION-TEST] Simulated legitimate deletion - sharedAdapterIds should now be empty"
  );
};

const monitorLocalStorage = () => {
  let lastState = localStorage.getItem("orch-os-p2p-state");

  const checkChanges = () => {
    const currentState = localStorage.getItem("orch-os-p2p-state");
    if (currentState !== lastState) {
      const oldData = lastState ? JSON.parse(lastState) : null;
      const newData = currentState ? JSON.parse(currentState) : null;

      console.log("🔄 [LOCALSTORAGE-MONITOR] localStorage changed:", {
        oldSharedAdapters: oldData?.sharedAdapterIds || [],
        newSharedAdapters: newData?.sharedAdapterIds || [],
        wasDeleted:
          oldData?.sharedAdapterIds?.length > 0 &&
          newData?.sharedAdapterIds?.length === 0,
        timestamp: new Date().toISOString(),
      });

      lastState = currentState;
    }
  };

  // Check every 500ms
  setInterval(checkChanges, 500);
  console.log(
    "🔄 [LOCALSTORAGE-MONITOR] Started monitoring localStorage changes every 500ms"
  );
};

// Make available globally
if (typeof window !== "undefined") {
  window.testAdapterPersistence = testAdapterPersistence;
  window.simulateAdapterDeletion = simulateAdapterDeletion;
  window.monitorLocalStorage = monitorLocalStorage;
}

export default testAdapterPersistence;
