// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * P2P Initialization Test Utility
 * Helps debug and validate P2P system initialization
 */

export class P2PInitializationTester {
  /**
   * Test environment detection
   */
  static testEnvironment(): {
    isElectron: boolean;
    hasElectronAPI: boolean;
    hasOrchOSMarker: boolean;
    userAgent: string;
    processVersions: any;
  } {
    const result = {
      isElectron: false,
      hasElectronAPI: false,
      hasOrchOSMarker: false,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "N/A",
      processVersions: typeof process !== "undefined" ? process.versions : null,
    };

    if (typeof window !== "undefined") {
      result.hasElectronAPI = !!window.electronAPI;
      result.hasOrchOSMarker = !!window.__ORCH_MIND__;
      result.isElectron = result.hasElectronAPI && result.hasOrchOSMarker;
    }

    return result;
  }

  /**
   * Test P2P API availability
   */
  static testP2PAPI(): {
    available: boolean;
    missingFunctions: string[];
    availableFunctions: string[];
  } {
    const requiredFunctions = [
      "p2pInitialize",
      "p2pCreateRoom",
      "p2pJoinRoom",
      "p2pLeaveRoom",
      "p2pShareAdapter",
      "p2pUnshareAdapter",
      "p2pBroadcastAdapters",
      "onP2PPeersUpdated",
      "onP2PAdaptersAvailable",
    ];

    const missingFunctions: string[] = [];
    const availableFunctions: string[] = [];

    if (typeof window !== "undefined" && window.electronAPI) {
      requiredFunctions.forEach((funcName) => {
        if (typeof (window.electronAPI as any)[funcName] === "function") {
          availableFunctions.push(funcName);
        } else {
          missingFunctions.push(funcName);
        }
      });
    } else {
      missingFunctions.push(...requiredFunctions);
    }

    return {
      available: missingFunctions.length === 0,
      missingFunctions,
      availableFunctions,
    };
  }

  /**
   * Run complete P2P system test
   */
  static async runCompleteTest(): Promise<{
    environment: ReturnType<typeof P2PInitializationTester.testEnvironment>;
    api: ReturnType<typeof P2PInitializationTester.testP2PAPI>;
    initialization?: { success: boolean; error?: string };
  }> {
    console.log("🧪 [P2P-TEST] Running complete P2P system test...");

    const environment = this.testEnvironment();
    const api = this.testP2PAPI();

    console.log("🔍 [P2P-TEST] Environment:", environment);
    console.log("🔍 [P2P-TEST] API:", api);

    let initialization: { success: boolean; error?: string } | undefined;

    if (api.available && environment.isElectron) {
      try {
        console.log("🚀 [P2P-TEST] Testing P2P initialization...");
        initialization = await (window.electronAPI as any).p2pInitialize();
        console.log("✅ [P2P-TEST] Initialization result:", initialization);
      } catch (error) {
        console.error("❌ [P2P-TEST] Initialization failed:", error);
        initialization = {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    return {
      environment,
      api,
      initialization,
    };
  }

  /**
   * Quick diagnostic for debugging
   */
  static quickDiagnostic(): void {
    console.group("🔧 [P2P-DIAGNOSTIC] Quick System Check");

    const env = this.testEnvironment();
    const api = this.testP2PAPI();

    console.log("Environment:", env);
    console.log("API Functions:", api);

    if (!env.isElectron) {
      console.warn("⚠️ Not running in Electron environment");
    }

    if (!api.available) {
      console.error("❌ Missing P2P functions:", api.missingFunctions);
    } else {
      console.log("✅ All P2P functions available");
    }

    console.groupEnd();
  }
}

// Global access for debugging
if (typeof window !== "undefined") {
  (window as any).P2PTest = P2PInitializationTester;
}
