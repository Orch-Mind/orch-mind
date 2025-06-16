// SPDX-License-Identifier: MIT OR Apache-2.0
// VllmModelTester - Integration test component for vLLM + Ollama system
// This component properly integrates with the improved VllmManager

import React, { useCallback, useEffect, useState } from "react";
import type {
  HardwareInfo,
  IElectronAPI,
  VllmStatus,
} from "../../../electron/preload/interfaces/IElectronAPI";

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
  timestamp: string;
  duration?: number;
}

interface ConnectionTest {
  success: boolean;
  message: string;
  latency?: number;
}

interface GenerationResult {
  success: boolean;
  response?: any;
  error?: string;
  duration: number;
}

export const VllmModelTester: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [status, setStatus] = useState<VllmStatus>({ state: "idle" });
  const [hardware, setHardware] = useState<HardwareInfo | null>(null);
  const [models, setModels] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionTest | null>(null);

  // Fetch hardware info and models on mount
  useEffect(() => {
    initializeData();
  }, []);

  // Poll status when not idle
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (status.state !== "idle") {
      interval = setInterval(async () => {
        await refreshStatus();
      }, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status.state]);

  const addResult = useCallback((result: Omit<TestResult, "timestamp">) => {
    const newResult: TestResult = {
      ...result,
      timestamp: new Date().toLocaleTimeString(),
    };
    setResults((prev) => [newResult, ...prev]);
    console.log(
      `[VllmTester] ${result.success ? "✅" : "❌"} ${result.message}`,
      result.details
    );
  }, []);

  const initializeData = async () => {
    try {
      // Get hardware info
      const hwRes = await window.electronAPI.vllmHardwareInfo();
      if (hwRes?.success && hwRes.info) {
        setHardware(hwRes.info);
        addResult({
          success: true,
          message: `Hardware detected: ${hwRes.info.gpu?.name || "CPU only"} (${
            hwRes.info.ramGB
          }GB RAM)`,
          details: hwRes.info,
        });
      }

      // Get model library
      const libRes = await window.electronAPI.vllmListLibrary();
      if (libRes?.success && libRes.models) {
        setModels(libRes.models);
        setSelectedModel(
          libRes.models.find((m: any) => m.isRecommended)?.name ||
            libRes.models[0]?.name ||
            ""
        );

        addResult({
          success: true,
          message: `Loaded ${libRes.models.length} models from library`,
          details: {
            total: libRes.models.length,
            installed: libRes.models.filter((m: any) => m.isInstalled).length,
            compatible: libRes.models.filter((m: any) => m.isCompatible).length,
          },
        });
      }

      // Initial status
      await refreshStatus();
    } catch (error) {
      addResult({
        success: false,
        message: "Failed to initialize data",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const refreshStatus = async () => {
    try {
      const res = await window.electronAPI.vllmModelStatus();
      if (res?.success && res.status) {
        setStatus(res.status as VllmStatus);
      }
    } catch (error) {
      console.error("Status refresh error:", error);
    }
  };

  const testEnvironment = async () => {
    const startTime = Date.now();

    try {
      addResult({
        success: true,
        message: "🔧 Testing vLLM environment setup...",
      });

      // Test 1: Check if Electron APIs are available
      if (!window.electronAPI) {
        throw new Error("Electron APIs not available");
      }

      addResult({
        success: true,
        message: "✅ Electron APIs available",
      });

      // Test 2: Test hardware detection
      const hwRes = await window.electronAPI.vllmHardwareInfo();
      if (!hwRes?.success) {
        throw new Error("Hardware detection failed");
      }

      addResult({
        success: true,
        message: "✅ Hardware detection working",
        details: hwRes.info,
      });

      // Test 3: Test model library access
      const libRes = await window.electronAPI.vllmListLibrary();
      if (!libRes?.success) {
        throw new Error("Model library access failed");
      }

      addResult({
        success: true,
        message: "✅ Model library accessible",
        details: { modelCount: libRes.models?.length || 0 },
      });

      addResult({
        success: true,
        message: "🎉 Environment test completed successfully!",
        duration: Date.now() - startTime,
      });
    } catch (error) {
      addResult({
        success: false,
        message: "❌ Environment test failed",
        details: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      });
    }
  };

  const testModelDownload = async () => {
    if (!selectedModel) {
      addResult({
        success: false,
        message: "No model selected for download test",
      });
      return;
    }

    const startTime = Date.now();

    try {
      addResult({
        success: true,
        message: `🚀 Testing model download/validation: ${selectedModel}`,
      });

      // Find model ID from registry
      const modelMeta = models.find((m) => m.name === selectedModel);
      if (!modelMeta) {
        throw new Error(`Model not found in registry: ${selectedModel}`);
      }

      addResult({
        success: true,
        message: `📦 Processing model: ${modelMeta.label || selectedModel}`,
        details: `Watch the progress indicator above for real-time updates...`,
      });

      // Start download/validation process
      const downloadRes = await window.electronAPI.vllmDownloadModel(
        selectedModel
      );
      if (!downloadRes?.success) {
        throw new Error(downloadRes?.error || "Download/validation failed");
      }

      addResult({
        success: true,
        message: `✅ Model ready: ${selectedModel}`,
        details: `Process completed successfully! The system may have mapped to an alternative working model.`,
        duration: Date.now() - startTime,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Provide user-friendly error messages with actionable suggestions
      let userFriendlyMessage = "❌ Model process failed";
      let suggestions: string[] = [];

      if (
        errorMessage.includes("not found") ||
        errorMessage.includes("manifest")
      ) {
        userFriendlyMessage = `❌ Model '${selectedModel}' not found in Ollama registry`;
        suggestions = [
          "• Check if the model name is correct",
          "• Try a different model from the available list",
          "• Verify Ollama service is running",
          "• The system will try to map to working alternatives",
        ];
      } else if (
        errorMessage.includes("Cannot connect") ||
        errorMessage.includes("ECONNREFUSED")
      ) {
        userFriendlyMessage = "❌ Cannot connect to Ollama service";
        suggestions = [
          "• Start Ollama: run 'ollama serve' in terminal",
          "• Check if Ollama is installed",
          "• Verify port 11434 is available",
        ];
      } else if (errorMessage.includes("timeout")) {
        userFriendlyMessage = "❌ Process timed out";
        suggestions = [
          "• Check your internet connection",
          "• Try a smaller model",
          "• Retry the process",
        ];
      }

      addResult({
        success: false,
        message: userFriendlyMessage,
        details: {
          originalError: errorMessage,
          suggestions,
          troubleshooting: "Check the browser console for detailed logs",
        },
        duration: Date.now() - startTime,
      });
    }
  };

  const testModelStart = async () => {
    if (!selectedModel) {
      addResult({
        success: false,
        message: "No model selected for start test",
      });
      return;
    }

    const startTime = Date.now();

    try {
      addResult({
        success: true,
        message: `🚀 Testing model start: ${selectedModel}`,
      });

      // Start model
      const startRes = await window.electronAPI.vllmStartModel(selectedModel);
      if (!startRes?.success) {
        throw new Error(startRes?.error || "Model start failed");
      }

      // Wait for ready state
      let attempts = 0;
      const maxAttempts = 30; // 60 seconds max

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await refreshStatus();

        if (status.state === "ready") break;
        if (status.state === "error") {
          throw new Error(status.message || "Model failed to start");
        }

        attempts++;
        addResult({
          success: true,
          message: `⏳ Waiting for model... (${attempts}/${maxAttempts}) - ${status.state}`,
        });
      }

      if (status.state !== "ready") {
        throw new Error("Model did not reach ready state within timeout");
      }

      addResult({
        success: true,
        message: `✅ Model started successfully: ${selectedModel}`,
        duration: Date.now() - startTime,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Provide user-friendly error messages for start failures
      let userFriendlyMessage = "❌ Model start failed";
      let suggestions: string[] = [];

      if (
        errorMessage.includes("not found") ||
        errorMessage.includes("manifest")
      ) {
        userFriendlyMessage = `❌ Model '${selectedModel}' not available for starting`;
        suggestions = [
          "• Download the model first",
          "• Verify the model was downloaded successfully",
          "• Check Ollama model list with: ollama list",
        ];
      } else if (
        errorMessage.includes("Cannot connect") ||
        errorMessage.includes("ECONNREFUSED")
      ) {
        userFriendlyMessage = "❌ Cannot connect to services";
        suggestions = [
          "• Ensure Ollama is running: ollama serve",
          "• For vLLM: check Docker is installed and running",
          "• Verify network ports are available",
        ];
      } else if (
        errorMessage.includes("timeout") ||
        errorMessage.includes("did not reach ready state")
      ) {
        userFriendlyMessage = "❌ Model start timed out";
        suggestions = [
          "• Model may be too large for available RAM",
          "• Try a smaller model variant",
          "• Check system resources and close other applications",
        ];
      } else if (
        errorMessage.includes("Apple Silicon") ||
        errorMessage.includes("CUDA")
      ) {
        userFriendlyMessage = "❌ Hardware compatibility issue";
        suggestions = [
          "• Apple Silicon detected - ensure using Ollama-only mode",
          "• For CUDA systems: verify Docker and GPU drivers",
          "• Check hardware requirements for selected model",
        ];
      }

      addResult({
        success: false,
        message: userFriendlyMessage,
        details: {
          originalError: errorMessage,
          suggestions,
          currentState: status.state,
          troubleshooting: "Check logs for detailed error information",
        },
        duration: Date.now() - startTime,
      });
    }
  };

  const testGeneration = async () => {
    if (status.state !== "ready") {
      addResult({
        success: false,
        message: `Cannot test generation - model not ready (state: ${status.state})`,
      });
      return;
    }

    const startTime = Date.now();

    try {
      addResult({
        success: true,
        message: "🧪 Testing text generation...",
      });

      const testPayload = {
        model: selectedModel,
        messages: [
          {
            role: "user",
            content:
              "Hello! Please respond with exactly 'Test successful' if you can understand this message.",
          },
        ],
        temperature: 0.1,
        max_tokens: 50,
      };

      const genRes = await window.electronAPI.vllmGenerate(testPayload);
      if (!genRes?.success) {
        throw new Error(genRes?.error || "Generation failed");
      }

      const response = genRes.data;
      const generatedText =
        response?.choices?.[0]?.message?.content || "No response";

      addResult({
        success: true,
        message: `✅ Generation successful!`,
        details: {
          response: generatedText,
          tokens: response?.usage?.total_tokens || 0,
          model: response?.model || selectedModel,
        },
        duration: Date.now() - startTime,
      });
    } catch (error) {
      addResult({
        success: false,
        message: "❌ Generation test failed",
        details: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      });
    }
  };

  const testConnection = async () => {
    try {
      addResult({
        success: true,
        message: "🌐 Testing connection to vLLM server...",
      });

      const connectionRes = await window.electronAPI.vllmTestConnection();

      if (connectionRes?.success) {
        setConnectionStatus({
          success: true,
          message: connectionRes.message,
          latency: connectionRes.latency,
        });

        addResult({
          success: true,
          message: `✅ Connection test passed (${connectionRes.latency}ms)`,
          details: connectionRes,
        });
      } else {
        setConnectionStatus({
          success: false,
          message: connectionRes?.message || "Connection failed",
        });

        addResult({
          success: false,
          message: "❌ Connection test failed",
          details: connectionRes?.message,
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setConnectionStatus({
        success: false,
        message: errorMsg,
      });

      addResult({
        success: false,
        message: "❌ Connection test error",
        details: errorMsg,
      });
    }
  };

  const runFullTest = async () => {
    setIsLoading(true);
    setResults([]);

    try {
      addResult({
        success: true,
        message: "🚀 Starting comprehensive vLLM test suite...",
      });

      // Test 1: Environment
      await testEnvironment();
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Test 2: Model Download (if not installed)
      const modelMeta = models.find((m) => m.name === selectedModel);
      if (modelMeta && !modelMeta.isInstalled) {
        await testModelDownload();
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      // Test 3: Model Start
      await testModelStart();
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Test 4: Connection
      await testConnection();
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Test 5: Generation
      await testGeneration();

      addResult({
        success: true,
        message: "🎉 Full test suite completed!",
      });
    } catch (error) {
      addResult({
        success: false,
        message: "❌ Test suite failed",
        details: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const stopModel = async () => {
    try {
      await window.electronAPI.vllmStopModel();
      await refreshStatus();
      addResult({
        success: true,
        message: "🛑 Model stopped successfully",
      });
    } catch (error) {
      addResult({
        success: false,
        message: "❌ Failed to stop model",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-white">
        🤖 vLLM + Ollama Integration Tester
      </h2>

      {/* Status Panel */}
      <div className="bg-gray-800 rounded-lg p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h3 className="font-semibold text-white mb-2">Model Status</h3>
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  status.state === "ready"
                    ? "bg-green-500"
                    : status.state === "error"
                    ? "bg-red-500"
                    : status.state === "idle"
                    ? "bg-gray-500"
                    : "bg-yellow-500"
                }`}
              ></span>
              <span className="text-sm text-gray-300">{status.state}</span>
            </div>
            {status.message && (
              <p className="text-xs text-gray-400 mt-1">{status.message}</p>
            )}
            {status.progress !== undefined && status.progress < 100 && (
              <div className="w-full bg-gray-700 h-2 rounded mt-2">
                <div
                  className="bg-blue-500 h-2 rounded"
                  style={{ width: `${status.progress}%` }}
                />
              </div>
            )}
          </div>

          <div>
            <h3 className="font-semibold text-white mb-2">Hardware</h3>
            {hardware ? (
              <div className="text-sm text-gray-300">
                <p>{hardware.gpu?.name || "CPU Only"}</p>
                <p>{hardware.ramGB}GB RAM</p>
                {hardware.gpu?.vramGB && <p>{hardware.gpu.vramGB}GB VRAM</p>}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Loading...</p>
            )}
          </div>

          <div>
            <h3 className="font-semibold text-white mb-2">Connection</h3>
            {connectionStatus ? (
              <div className="text-sm">
                <div
                  className={`flex items-center gap-2 ${
                    connectionStatus.success ? "text-green-400" : "text-red-400"
                  }`}
                >
                  <span>{connectionStatus.success ? "✅" : "❌"}</span>
                  <span>
                    {connectionStatus.success ? "Connected" : "Disconnected"}
                  </span>
                </div>
                {connectionStatus.latency && (
                  <p className="text-gray-400">
                    Latency: {connectionStatus.latency}ms
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Not tested</p>
            )}
          </div>
        </div>
      </div>

      {/* Model Selection */}
      <div className="bg-gray-800 rounded-lg p-4 mb-4">
        <h3 className="font-semibold text-white mb-2">Model Selection</h3>
        <div className="flex gap-2 items-center">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
            disabled={status.state !== "idle"}
            title="Select a model to test"
            aria-label="Select a model to test"
          >
            <option value="">Select a model...</option>
            {models.map((model) => (
              <option
                key={model.name}
                value={model.name}
                disabled={!model.isCompatible}
              >
                {model.label || model.name}
                {model.isInstalled ? " ✅" : " ⬇️"}
                {!model.isCompatible ? " ❌" : ""}({model.size})
              </option>
            ))}
          </select>

          {selectedModel && (
            <div className="text-sm text-gray-400">
              {models.find((m) => m.name === selectedModel)?.isInstalled
                ? "Installed"
                : "Needs download"}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={runFullTest}
          disabled={isLoading || !selectedModel}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "⏳ Running Tests..." : "🚀 Run Full Test Suite"}
        </button>

        <button
          onClick={testEnvironment}
          disabled={isLoading}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          🔧 Test Environment
        </button>

        <button
          onClick={testModelStart}
          disabled={isLoading || !selectedModel || status.state === "ready"}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
        >
          🚀 Start Model
        </button>

        <button
          onClick={testGeneration}
          disabled={isLoading || status.state !== "ready"}
          className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
        >
          🧪 Test Generation
        </button>

        <button
          onClick={testConnection}
          disabled={isLoading}
          className="px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700 disabled:opacity-50"
        >
          🌐 Test Connection
        </button>

        <button
          onClick={stopModel}
          disabled={status.state === "idle"}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
        >
          🛑 Stop Model
        </button>

        <button
          onClick={clearResults}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          🗑️ Clear Results
        </button>
      </div>

      {/* Results Panel */}
      <div className="bg-gray-900 rounded-lg p-4 h-96 overflow-y-auto">
        <h3 className="text-lg font-semibold mb-2 text-white">
          Test Results ({results.length}):
        </h3>

        {results.length === 0 ? (
          <p className="text-gray-400">
            No tests executed yet. Select a model and click a test button to
            start.
          </p>
        ) : (
          <div className="space-y-2">
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded border-l-4 ${
                  result.success
                    ? "bg-green-900/30 border-green-500 text-green-100"
                    : "bg-red-900/30 border-red-500 text-red-100"
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-medium">
                    {result.success ? "✅" : "❌"} {result.message}
                  </span>
                  <div className="text-xs opacity-70 text-right">
                    <div>{result.timestamp}</div>
                    {result.duration && <div>{result.duration}ms</div>}
                  </div>
                </div>

                {result.details && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm opacity-80 hover:opacity-100">
                      Details
                    </summary>
                    <pre className="mt-1 text-xs bg-black/30 p-2 rounded overflow-x-auto">
                      {typeof result.details === "string"
                        ? result.details
                        : JSON.stringify(result.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Panel */}
      <div className="mt-4 text-sm text-gray-400 space-y-2">
        <p>
          💡 <strong>About:</strong> This tester validates the complete vLLM +
          Ollama integration pipeline: environment setup, model downloads,
          Docker containers, and text generation.
        </p>
        <p>
          🔧 <strong>Requirements:</strong> Docker installed, Ollama service
          running, and sufficient hardware resources.
        </p>
        <p>
          🧪 <strong>Test Flow:</strong> Environment → Download → Start →
          Connect → Generate
        </p>
        <p>
          📊 <strong>Compatible Models:</strong> Models marked with ✅ are
          installed, ⬇️ need download, ❌ incompatible with your hardware.
        </p>
      </div>
    </div>
  );
};

export default VllmModelTester;
