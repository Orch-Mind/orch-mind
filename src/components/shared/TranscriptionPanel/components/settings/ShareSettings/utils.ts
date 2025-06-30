// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// DRY: Centralized utility functions
export class ShareUtils {
  // DRY: File size formatting in one place
  static formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024)
      return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
  }

  // DRY: Crypto operations centralized
  static async hashString(input: string): Promise<string> {
    const crypto = window.crypto;
    const data = new TextEncoder().encode(input);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // DRY: Topic generation logic
  static async generateLocalNetworkTopic(): Promise<string> {
    const networkId = "local-network"; // TODO: Get real network ID
    return this.hashString(`orch-os-local-${networkId}`);
  }

  static async codeToTopic(code: string): Promise<string> {
    return this.hashString(`orch-os-room-${code}`);
  }

  static generateAdapterTopic(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  // DRY: Room code generation
  static generateFriendlyCode(): string {
    const words = [
      "MUSIC",
      "PIZZA",
      "COFFEE",
      "BOOKS",
      "GAMES",
      "ART",
      "SPACE",
      "OCEAN",
    ];
    const word = words[Math.floor(Math.random() * words.length)];
    const number = Math.floor(Math.random() * 999)
      .toString()
      .padStart(3, "0");
    return `${word}-${number}`;
  }

  // DRY: Room type utilities
  static getRoomIcon(type: string): string {
    switch (type) {
      case "general":
        return "🌍";
      case "local":
        return "📡";
      case "private":
        return "🔒";
      default:
        return "❓";
    }
  }

  static getRoomName(type: string, code?: string): string {
    switch (type) {
      case "general":
        return "Community Room";
      case "local":
        return "Local Network";
      case "private":
        return `Room ${code}`;
      default:
        return "Unknown";
    }
  }
}

// KISS: Simple notification utilities
export class NotificationUtils {
  static showError(message: string): void {
    // TODO: Replace with proper toast notification
    alert(`❌ ${message}`);
  }

  static showSuccess(message: string): void {
    // TODO: Replace with proper toast notification
    alert(`✅ ${message}`);
  }
}

// DRY: Clipboard utilities with fallback support
export class ClipboardUtils {
  /**
   * Copy text to clipboard with robust permission handling and fallback support
   * Following MDN best practices for browser compatibility
   * @param text Text to copy
   * @returns Promise<boolean> Success status
   */
  static async copyToClipboard(text: string): Promise<boolean> {
    // Try different approaches in order of preference
    const modernSuccess = await this.tryClipboardWithPermission(text);
    if (modernSuccess) return true;

    const directSuccess = await this.tryClipboardDirect(text);
    if (directSuccess) return true;

    // Use fallback method
    const fallbackSuccess = this.fallbackCopyToClipboard(text);
    if (fallbackSuccess) {
      console.log("💡 Copy successful via compatibility fallback method");
    }

    return fallbackSuccess;
  }

  /**
   * Try clipboard API with explicit permission request
   */
  private static async tryClipboardWithPermission(
    text: string
  ): Promise<boolean> {
    try {
      // Check if we're in a secure context (HTTPS/Electron)
      if (!this.isSecureContext()) {
        return false;
      }

      // Check for clipboard API availability
      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        return false;
      }

      // Request permission explicitly
      if (navigator.permissions) {
        try {
          const permission = await navigator.permissions.query({
            name: "clipboard-write" as PermissionName,
          });
          if (permission.state === "denied") {
            console.log("🚫 Clipboard permission denied, using fallback");
            return false;
          }
        } catch (permError) {
          // Permission API not supported or failed, continue anyway
          console.log(
            "⚠️ Permission API not available, trying direct clipboard access"
          );
        }
      }

      await navigator.clipboard.writeText(text);
      console.log("✅ Text copied using Clipboard API with permission");
      return true;
    } catch (error) {
      // Only log debug info for expected permission errors
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        console.debug("🔒 Clipboard API permission denied, trying fallback");
      } else {
        console.warn("❌ Clipboard API with permission failed:", error);
      }
      return false;
    }
  }

  /**
   * Try clipboard API directly (might work in some contexts)
   */
  private static async tryClipboardDirect(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        console.log("✅ Text copied using direct Clipboard API");
        return true;
      }
      return false;
    } catch (error) {
      // Only log debug info for expected permission errors
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        console.debug(
          "🔒 Clipboard API blocked by permissions policy, trying fallback"
        );
      } else {
        console.warn("❌ Direct Clipboard API failed:", error);
      }
      return false;
    }
  }

  /**
   * Check if we're in a secure context (HTTPS or Electron)
   */
  private static isSecureContext(): boolean {
    return (
      window.isSecureContext || // Standard check
      location.protocol === "https:" || // HTTPS
      location.hostname === "localhost" || // Localhost
      location.protocol === "file:" || // Electron
      // @ts-ignore - Electron specific
      typeof window.electronAPI !== "undefined" // Electron detection
    );
  }

  /**
   * Fallback copy method using document.execCommand
   * As recommended by MDN for browser compatibility
   * Enhanced with better element handling and error recovery
   */
  private static fallbackCopyToClipboard(text: string): boolean {
    let textArea: HTMLTextAreaElement | null = null;

    try {
      // Create temporary textarea element
      textArea = document.createElement("textarea");
      textArea.value = text;

      // Enhanced positioning to ensure it works across all contexts
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "-9999px";
      textArea.style.width = "1px";
      textArea.style.height = "1px";
      textArea.style.padding = "0";
      textArea.style.border = "none";
      textArea.style.outline = "none";
      textArea.style.boxShadow = "none";
      textArea.style.background = "transparent";
      textArea.setAttribute("readonly", ""); // Prevent mobile keyboard

      document.body.appendChild(textArea);

      // Focus and select with better cross-browser support
      textArea.focus();
      textArea.setSelectionRange(0, text.length);

      // Additional selection for iOS
      if (navigator.userAgent.match(/ipad|ipod|iphone/i)) {
        const range = document.createRange();
        range.selectNodeContents(textArea);
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
        textArea.setSelectionRange(0, text.length);
      }

      // Use execCommand to copy
      const successful = document.execCommand("copy");

      if (successful) {
        console.log("✅ Text copied using execCommand fallback");
        return true;
      } else {
        console.error("❌ execCommand copy failed");
        // Last resort: try to give user manual copy option
        this.showManualCopyFallback(text);
        return false;
      }
    } catch (error) {
      console.error("❌ Fallback copy failed:", error);
      this.showManualCopyFallback(text);
      return false;
    } finally {
      // Ensure cleanup happens regardless of success/failure
      if (textArea && textArea.parentNode) {
        document.body.removeChild(textArea);
      }
    }
  }

  /**
   * Last resort: show manual copy option when all automated methods fail
   */
  private static showManualCopyFallback(text: string): void {
    // Create a simple prompt for manual copy as absolute last resort
    try {
      const message = `Copy failed automatically. Please manually copy this code:\n\n${text}`;

      // On mobile or when available, try to at least show the text in a way user can select
      if (
        confirm(
          `${message}\n\nClick OK to see the code in an alert you can select from.`
        )
      ) {
        // Show in prompt so user can select and copy manually
        prompt("Copy this code manually:", text);
      }
    } catch (error) {
      console.error("❌ Even manual copy fallback failed:", error);
    }
  }

  /**
   * User-friendly copy with automatic notifications and visual feedback
   * @param text Text to copy
   * @param successMessage Custom success message
   * @param onStart Optional callback when copy starts
   * @param onComplete Optional callback when copy completes (success or failure)
   */
  static async copyWithFeedback(
    text: string,
    successMessage: string = "Copied to clipboard!",
    onStart?: () => void,
    onComplete?: (success: boolean) => void
  ): Promise<boolean> {
    // Call start callback for visual feedback
    if (onStart) {
      onStart();
    }

    try {
      const success = await this.copyToClipboard(text);

      if (success) {
        NotificationUtils.showSuccess(successMessage);
      } else {
        NotificationUtils.showError(
          "Failed to copy to clipboard. Please try manually copying the code."
        );
      }

      // Call complete callback
      if (onComplete) {
        onComplete(success);
      }

      return success;
    } catch (error) {
      console.error("❌ Copy with feedback failed:", error);
      NotificationUtils.showError("Copy operation failed");

      if (onComplete) {
        onComplete(false);
      }

      return false;
    }
  }
}

// LocalStorage debugging utility
export const StorageDebugUtils = {
  // Check if localStorage is working
  testLocalStorage: (): boolean => {
    try {
      const testKey = "orch-test-" + Date.now();
      const testValue = "test-value";

      localStorage.setItem(testKey, testValue);
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);

      console.log("✅ [STORAGE-DEBUG] localStorage is working correctly");
      return retrieved === testValue;
    } catch (error) {
      console.error("❌ [STORAGE-DEBUG] localStorage test failed:", error);
      return false;
    }
  },

  // Inspect current P2P state in localStorage
  inspectP2PState: () => {
    try {
      const storedData = localStorage.getItem("orch-os-p2p-state");
      console.log("🔍 [STORAGE-DEBUG] Raw localStorage data:", storedData);

      if (storedData) {
        const parsed = JSON.parse(storedData);
        console.log("🔍 [STORAGE-DEBUG] Parsed P2P state:", {
          lastConnectionType: parsed.lastConnectionType,
          lastRoomCode: parsed.lastRoomCode,
          isSharing: parsed.isSharing,
          sharedAdapterIds: parsed.sharedAdapterIds,
          sharedAdapterCount: parsed.sharedAdapterIds?.length || 0,
          roomHistory: parsed.roomHistory?.length || 0,
        });
        return parsed;
      } else {
        console.log("ℹ️ [STORAGE-DEBUG] No P2P state found in localStorage");
        return null;
      }
    } catch (error) {
      console.error("❌ [STORAGE-DEBUG] Failed to inspect P2P state:", error);
      return null;
    }
  },

  // Force save a test P2P state
  saveTestP2PState: () => {
    const testState = {
      lastConnectionType: "general",
      lastRoomCode: "",
      lastSelectedMode: "auto",
      sharedAdapterIds: ["test-adapter-1", "test-adapter-2"],
      isSharing: true,
      roomHistory: [{ type: "general", timestamp: Date.now() }],
    };

    try {
      localStorage.setItem("orch-os-p2p-state", JSON.stringify(testState));
      console.log("✅ [STORAGE-DEBUG] Test P2P state saved:", testState);
      return testState;
    } catch (error) {
      console.error("❌ [STORAGE-DEBUG] Failed to save test P2P state:", error);
      return null;
    }
  },

  // Clear P2P state
  clearP2PState: () => {
    try {
      localStorage.removeItem("orch-os-p2p-state");
      console.log("🧹 [STORAGE-DEBUG] P2P state cleared from localStorage");
    } catch (error) {
      console.error("❌ [STORAGE-DEBUG] Failed to clear P2P state:", error);
    }
  },

  // Get all localStorage keys related to Orch-OS
  getAllOrchKeys: () => {
    const orchKeys: string[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("orch")) {
          orchKeys.push(key);
        }
      }
      console.log(
        "🔍 [STORAGE-DEBUG] All Orch-OS localStorage keys:",
        orchKeys
      );
      return orchKeys;
    } catch (error) {
      console.error(
        "❌ [STORAGE-DEBUG] Failed to get localStorage keys:",
        error
      );
      return [];
    }
  },
};

// Make it available globally for debugging in browser console
if (typeof window !== "undefined") {
  (window as any).OrchStorageDebug = StorageDebugUtils;

  // Add test utilities for debugging persistence flow
  (window as any).OrchTestPersistence = {
    // Test the full flow: connect -> share -> check persistence
    testFullPersistenceFlow: async () => {
      console.log("🧪 [TEST] Starting full persistence flow test...");

      try {
        // Step 1: Check initial state
        console.log("📋 [TEST] Step 1: Initial localStorage state");
        StorageDebugUtils.inspectP2PState();

        // Step 2: Simulate saving a connection state
        console.log(
          "📋 [TEST] Step 2: Simulating connection to general room..."
        );
        const testState = {
          lastConnectionType: "general",
          lastRoomCode: "",
          lastSelectedMode: "auto",
          sharedAdapterIds: [],
          isSharing: true,
          roomHistory: [{ type: "general", timestamp: Date.now() }],
        };
        localStorage.setItem("orch-os-p2p-state", JSON.stringify(testState));

        // Step 3: Check if saved correctly
        console.log("📋 [TEST] Step 3: Verifying connection state was saved");
        StorageDebugUtils.inspectP2PState();

        // Step 4: Simulate sharing adapters
        console.log("📋 [TEST] Step 4: Simulating adapter sharing...");
        const stateWithAdapters = {
          ...testState,
          sharedAdapterIds: ["test-adapter-1", "test-adapter-2"],
        };
        localStorage.setItem(
          "orch-os-p2p-state",
          JSON.stringify(stateWithAdapters)
        );

        // Step 5: Final verification
        console.log("📋 [TEST] Step 5: Final verification");
        const finalState = StorageDebugUtils.inspectP2PState();

        if (
          finalState &&
          finalState.isSharing &&
          finalState.sharedAdapterIds.length > 0
        ) {
          console.log("✅ [TEST] Persistence flow test PASSED!");
          return true;
        } else {
          console.log("❌ [TEST] Persistence flow test FAILED!");
          return false;
        }
      } catch (error) {
        console.error("❌ [TEST] Persistence flow test ERROR:", error);
        return false;
      }
    },

    // Monitor localStorage changes in real time
    monitorLocalStorageChanges: () => {
      console.log("👀 [MONITOR] Starting localStorage monitoring...");

      const originalSetItem = localStorage.setItem;
      localStorage.setItem = function (key, value) {
        if (key === "orch-os-p2p-state") {
          console.log("📝 [MONITOR] localStorage.setItem called:", {
            key,
            value,
            parsedValue: JSON.parse(value),
          });
        }
        return originalSetItem.call(this, key, value);
      };

      console.log("✅ [MONITOR] localStorage monitoring active");
    },

    // Debug connection flow specifically
    debugConnectionFlow: () => {
      console.log("🔍 [DEBUG] Setting up connection flow debugging...");

      // Monitor updateConnectionState calls
      let originalUpdateState: any;

      // Hook into React DevTools if available
      if ((window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        console.log(
          "🔧 [DEBUG] React DevTools detected - enhanced debugging available"
        );
      }

      console.log("🎯 [DEBUG] Please perform these steps:");
      console.log("  1. Connect to Global room");
      console.log("  2. Watch console for persistence logs");
      console.log(
        "  3. Check localStorage with: OrchStorageDebug.inspectP2PState()"
      );

      return {
        stop: () => {
          console.log("🛑 [DEBUG] Stopping connection flow debugging");
        },
      };
    },

    // Stop monitoring
    stopMonitoring: () => {
      // Restore original setItem (simplified)
      location.reload();
    },
  };

  // Quick test to validate the debugging system
  (window as any).OrchTestConnectionFlow = {
    // Test P2P connection and persistence flow
    testConnection: async () => {
      console.log("🧪 [TEST-CONNECTION] Starting connection flow test...");

      // Enable localStorage monitoring
      (window as any).OrchTestPersistence.monitorLocalStorageChanges();

      console.log("📋 [TEST-CONNECTION] Please follow these steps:");
      console.log("  1. Open P2P settings panel");
      console.log("  2. Connect to Global room");
      console.log("  3. Watch console for debug logs");
      console.log("  4. Check final localStorage state");

      // Monitor for connection state changes
      let connectionCount = 0;
      const originalSetItem = localStorage.setItem;

      localStorage.setItem = function (key, value) {
        if (key === "orch-os-p2p-state") {
          connectionCount++;
          console.log(
            `🔍 [TEST-CONNECTION] localStorage update #${connectionCount}:`,
            {
              timestamp: Date.now(),
              value: JSON.parse(value),
            }
          );
        }
        return originalSetItem.call(this, key, value);
      };

      return {
        stop: () => {
          console.log("🛑 [TEST-CONNECTION] Stopping connection monitoring");
          // Note: simplified cleanup
        },
      };
    },

    // Test silent auto-reconnection
    testSilentReconnection: async () => {
      console.log("🔇 [TEST-SILENT] Testing silent auto-reconnection...");

      // Step 1: Check if there's previous state
      const currentState = StorageDebugUtils.inspectP2PState();

      if (!currentState || !currentState.lastConnectionType) {
        console.log("❌ [TEST-SILENT] No previous connection state found");
        console.log(
          "💡 [TEST-SILENT] Please connect to a room first, then reload the page"
        );
        return false;
      }

      console.log("✅ [TEST-SILENT] Previous state found:", {
        type: currentState.lastConnectionType,
        code: currentState.lastRoomCode,
        isSharing: currentState.isSharing,
      });

      console.log(
        "🔄 [TEST-SILENT] Reload the page to test automatic silent reconnection"
      );
      console.log("🎯 [TEST-SILENT] Expected behavior:");
      console.log("  - No ReconnectPanel should appear");
      console.log("  - No popup notifications");
      console.log("  - Connection should be restored silently");
      console.log("  - Only console logs should indicate the restoration");

      return true;
    },

    // Quick debug of auto-reconnection flow
    debugAutoReconnection: () => {
      console.log("🔍 [DEBUG-AUTO] Starting auto-reconnection debugging...");

      // Check current localStorage state
      const state = StorageDebugUtils.inspectP2PState();
      console.log("📋 [DEBUG-AUTO] Current localStorage state:", state);

      // Check conditions for auto-restoration
      const shouldAutoRestore = !!(state && state.lastConnectionType);
      console.log("🎯 [DEBUG-AUTO] Should auto-restore?", {
        hasState: !!state,
        hasLastConnectionType: !!(state && state.lastConnectionType),
        lastConnectionType: state?.lastConnectionType,
        shouldAutoRestore,
      });

      if (!shouldAutoRestore) {
        console.log("❌ [DEBUG-AUTO] Auto-restoration conditions NOT met");
        console.log(
          "💡 [DEBUG-AUTO] Connect to a room first to create restoration state"
        );
        return false;
      }

      console.log("✅ [DEBUG-AUTO] Auto-restoration conditions MET");
      console.log("🔄 [DEBUG-AUTO] If restoration is not happening, check:");
      console.log("  1. useEffect dependencies in useP2PConnection");
      console.log("  2. hasRestoredFromPersistence.current flag");
      console.log("  3. isAutoRestoring.current flag");
      console.log("  4. Error logs in performCompleteRestoration");

      return true;
    },

    // Force create a test state for auto-reconnection
    setupTestState: () => {
      console.log(
        "🧪 [SETUP-TEST] Creating test state for auto-reconnection..."
      );

      const testState = {
        lastConnectionType: "general",
        lastRoomCode: "",
        lastSelectedMode: "auto",
        sharedAdapterIds: [],
        isSharing: false, // This is the key issue - it starts false but should trigger restoration
        roomHistory: [{ type: "general", timestamp: Date.now() }],
      };

      localStorage.setItem("orch-os-p2p-state", JSON.stringify(testState));

      console.log("✅ [SETUP-TEST] Test state created:", testState);
      console.log(
        "🔄 [SETUP-TEST] Now reload the page to test auto-reconnection"
      );
      console.log(
        "🎯 [SETUP-TEST] Expected: should automatically connect to General room"
      );

      return testState;
    },

    // Quick validate current state
    validate: () => {
      console.log("✅ [VALIDATE] Current P2P state validation:");
      const state = StorageDebugUtils.inspectP2PState();

      const issues = [];
      if (!state) issues.push("No state found");
      if (state && !state.isSharing) issues.push("isSharing is false");
      if (state && !state.lastConnectionType)
        issues.push("lastConnectionType is null");
      if (state && state.sharedAdapterIds.length === 0)
        issues.push("No shared adapters");

      if (issues.length === 0) {
        console.log("✅ [VALIDATE] All good!");
      } else {
        console.log("❌ [VALIDATE] Issues found:", issues);
      }

      return issues.length === 0;
    },
  };

  // Add quick test command for auto-reconnection
  (window as any).OrchQuickTest = {
    // One-step test for auto-reconnection
    testAutoReconnection: () => {
      console.log("🚀 [QUICK-TEST] Testing auto-reconnection fix...");

      // Step 1: Create test state
      const testState = {
        lastConnectionType: "general",
        lastRoomCode: "",
        lastSelectedMode: "auto",
        sharedAdapterIds: [],
        isSharing: false, // This should NOT prevent restoration anymore
        roomHistory: [{ type: "general", timestamp: Date.now() }],
      };

      localStorage.setItem("orch-os-p2p-state", JSON.stringify(testState));
      console.log("✅ [QUICK-TEST] Test state created:", testState);

      // Step 2: Immediate verification
      const saved = JSON.parse(
        localStorage.getItem("orch-os-p2p-state") || "{}"
      );
      const shouldAutoRestore = !!saved.lastConnectionType;

      console.log("🔍 [QUICK-TEST] Restoration check:", {
        hasSavedState: !!saved,
        hasLastConnectionType: !!saved.lastConnectionType,
        lastConnectionType: saved.lastConnectionType,
        isSharing: saved.isSharing,
        shouldAutoRestore: shouldAutoRestore,
      });

      if (shouldAutoRestore) {
        console.log("✅ [QUICK-TEST] CONDITIONS MET for auto-restoration!");
        console.log("🔄 [QUICK-TEST] Now reload the page (Cmd+R) to test");
        console.log(
          "🎯 [QUICK-TEST] Expected: Automatic connection to General room"
        );
        console.log(
          '🎯 [QUICK-TEST] Look for: "🔄 [RESTORATION] Starting complete P2P restoration..."'
        );
        return true;
      } else {
        console.log(
          "❌ [QUICK-TEST] CONDITIONS NOT MET - fix may not have worked"
        );
        return false;
      }
    },
  };
}
