// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// ipcHandlers.ts

import { dialog, ipcMain } from "electron";
import type { ProgressInfo } from "../src/electron/chatgpt-import";
import { importChatGPTHistoryHandler } from "../src/electron/chatgpt-import";
import { DuckDBHelper } from "./DuckDBHelper";
import { detectHardware } from "./HardwareDetector";
import { IIpcHandlerDeps } from "./main";
import {
  DependencyInstaller,
  DependencyStatus,
  InstallProgress,
} from "./services/DependencyInstaller";
import { OllamaClient } from "./services/OllamaClient";
import i18n from "../src/i18n";

const t = i18n.t.bind(i18n);

export function initializeIpcHandlers(deps: IIpcHandlerDeps): void {
  console.log("Initializing IPC handlers");

  ipcMain.handle(
    "set-window-dimensions",
    (event, width: number, height: number) => {
      deps.setWindowDimensions(width, height);
    }
  );

  // Window management handlers
  ipcMain.handle("toggle-window", () => {
    try {
      deps.toggleMainWindow();
      return { success: true };
    } catch (error) {
      console.error("Error toggling window:", error);
      return { error: "Failed to toggle window" };
    }
  });

  ipcMain.handle("neural-start", async () => {
    try {
      const mainWindow = deps.getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send(deps.PROCESSING_EVENTS.NEURAL_START);
      }
      return { success: true };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error starting neural";
      return { success: false, error: errorMessage };
    }
  });

  // 🛑 Stop neural
  ipcMain.handle("neural-stop", async () => {
    try {
      const mainWindow = deps.getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send(deps.PROCESSING_EVENTS.NEURAL_STOP);
      }
      return { success: true };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error stopping neural";
      return { success: false, error: errorMessage };
    }
  });

  // 🔥 Send prompt
  ipcMain.handle("prompt-send", async (event, temporaryContext?: string) => {
    try {
      const mainWindow = deps.getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send(
          deps.PROCESSING_EVENTS.PROMPT_SEND,
          temporaryContext
        );
      }
      return { success: true };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error sending prompt";
      return { success: false, error: errorMessage };
    }
  });

  ipcMain.handle("send-chunk", async (event, blob: Uint8Array) => {
    try {
      console.log("Sending audio chunk to Deepgram.");
      const mainWindow = deps.getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send(
          deps.PROCESSING_EVENTS.SEND_CHUNK,
          blob.buffer
        );
      }
      return { success: true };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error sending audio chunk";
      return { success: false, error: errorMessage };
    }
  });

  // 🧹 Clear neural transcription
  ipcMain.handle("clear-neural-transcription", () => {
    try {
      const mainWindow = deps.getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send(deps.PROCESSING_EVENTS.CLEAR_TRANSCRIPTION);
      }
      return { success: true };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Error clearing neural transcription";
      return { success: false, error: errorMessage };
    }
  });

  ipcMain.handle("set-deepgram-language", (event, lang: string) => {
    try {
      console.log("Setting Deepgram language to", lang);
      const mainWindow = deps.getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send(
          deps.PROCESSING_EVENTS.SET_DEEPGRAM_LANGUAGE,
          lang
        );
      }
      return { success: true };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Error setting Deepgram language";
      return { success: false, error: errorMessage };
    }
  });

  // Note: Pinecone handlers removed - using DuckDB only

  // DuckDB IPC handlers (updated for new API)
  ipcMain.handle(
    "query-duckdb",
    async (
      event,
      embedding: number[],
      limit?: number,
      keywords: string[] = [],
      filters: Record<string, unknown> = {},
      threshold?: number
    ) => {
      try {
        if (!deps.duckDBHelper) {
          console.error("DuckDB helper not initialized");
          return { matches: [] };
        }

        // Ensure keywords is always an array for robust error handling
        const safeKeywords = Array.isArray(keywords) ? keywords : [];

        console.log(
          `[MEMORY] Querying DuckDB with embedding[${
            embedding.length
          }], limit=${limit || 5}, threshold=${
            threshold || "dynamic"
          }, keywords=[${safeKeywords.join(", ")}]`
        );
        const result = await deps.duckDBHelper.queryDuckDB(
          embedding,
          limit || 5,
          safeKeywords,
          filters,
          threshold
        );
        console.log(
          `[MEMORY] DuckDB query returned ${result.matches.length} matches`
        );
        return { matches: result.matches };
      } catch (error: unknown) {
        console.error("Error querying DuckDB:", error);
        return { matches: [] };
      }
    }
  );

  ipcMain.handle(
    "save-duckdb",
    async (
      event,
      vectors: Array<{
        id: string;
        values: number[];
        metadata: Record<string, unknown>;
      }>
    ) => {
      try {
        if (!deps.duckDBHelper) {
          console.error("DuckDB helper not initialized");
          return { success: false, error: "DuckDB helper not initialized" };
        }

        console.log(`[MEMORY] Saving ${vectors.length} vectors to DuckDB`);

        for (const vector of vectors) {
          if (
            !vector.id ||
            !Array.isArray(vector.values) ||
            vector.values.length === 0
          ) {
            console.warn(`[MEMORY] Skipping invalid vector:`, vector.id);
            continue;
          }
          await deps.duckDBHelper.storeVector(
            vector.id,
            vector.values,
            vector.metadata || {}
          );
        }

        console.log(
          `[MEMORY] Successfully saved ${vectors.length} vectors to DuckDB`
        );
        return { success: true };
      } catch (error: unknown) {
        console.error("Error saving to DuckDB:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return { success: false, error: errorMessage };
      }
    }
  );

  // New DuckDB test and utility handlers
  ipcMain.handle("test-duckdb", async () => {
    try {
      if (!deps.duckDBHelper) {
        return { success: false, error: "DuckDB helper not initialized" };
      }

      console.log("🧪 [TEST] Starting DuckDB functionality test...");

      // Test 1: Initialize
      await deps.duckDBHelper.initialize();
      console.log("✅ [TEST] DuckDB initialized successfully");

      // Test 2: Store a test vector
      const testVector = [0.1, 0.2, 0.3, 0.4, 0.5];
      const testMetadata = {
        type: "test",
        timestamp: new Date().toISOString(),
      };
      await deps.duckDBHelper.storeVector(
        "test-vector-1",
        testVector,
        testMetadata
      );
      console.log("✅ [TEST] Test vector stored successfully");

      // Test 3: Get vector count
      const count = await deps.duckDBHelper.getVectorCount();
      console.log(`✅ [TEST] Vector count: ${count}`);

      // Test 4: Query similar vectors
      const queryVector = [0.15, 0.25, 0.35, 0.45, 0.55]; // Similar to test vector
      const results = await deps.duckDBHelper.findSimilarVectors(
        queryVector,
        5,
        0.5
      );
      console.log(`✅ [TEST] Found ${results.length} similar vectors`);

      // Log results details
      results.forEach((result, index) => {
        console.log(
          `   ${index + 1}. ID: ${result.id}, Score: ${result.score.toFixed(
            4
          )}, Metadata:`,
          result.metadata
        );
      });

      return {
        success: true,
        results: {
          vectorCount: count,
          queryResults: results,
          testCompleted: true,
        },
      };
    } catch (error: unknown) {
      console.error("❌ [TEST] DuckDB test failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: errorMessage };
    }
  });

  ipcMain.handle("get-duckdb-info", async () => {
    try {
      if (!deps.duckDBHelper) {
        return { success: false, error: "DuckDB helper not initialized" };
      }

      await deps.duckDBHelper.initialize();
      const count = await deps.duckDBHelper.getVectorCount();

      console.log(`📊 [INFO] DuckDB status - Vector count: ${count}`);

      return {
        success: true,
        info: {
          vectorCount: count,
          isInitialized: true,
          dbPath: "~/Library/Application Support/orch-mind/orch-mind-vectors.db",
        },
      };
    } catch (error: unknown) {
      console.error("Error getting DuckDB info:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: errorMessage };
    }
  });

  ipcMain.handle("clear-duckdb", async () => {
    try {
      if (!deps.duckDBHelper) {
        return { success: false, error: "DuckDB helper not initialized" };
      }

      await deps.duckDBHelper.clearVectors();
      console.log("🗑️ [CLEAR] All vectors cleared from DuckDB");

      return { success: true };
    } catch (error: unknown) {
      console.error("Error clearing DuckDB:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: errorMessage };
    }
  });

  // DuckDB sandboxed command handler (updated for new API)
  ipcMain.handle(
    "duckdb-command",
    async (event, command: string, data?: any) => {
      try {
        console.log(
          `[MAIN:DuckDB] Executing command: ${command}${
            data ? " with data" : ""
          }`
        );

        switch (command) {
          case "query":
            const { embedding, limit, threshold } = data || {};
            if (!embedding || !Array.isArray(embedding)) {
              return {
                success: false,
                error: "Invalid embedding data for query",
              };
            }
            const queryResult = await deps.duckDBHelper?.findSimilarVectors(
              embedding,
              limit,
              threshold
            );
            console.log(
              `[MAIN:DuckDB] Query completed - found ${
                queryResult?.length || 0
              } matches`
            );
            return { success: true, matches: queryResult || [] };

          case "save":
            const { vectors } = data || {};
            if (!vectors || !Array.isArray(vectors)) {
              return {
                success: false,
                error: "Invalid vectors data for save operation",
              };
            }

            for (const vector of vectors) {
              await deps.duckDBHelper?.storeVector(
                vector.id,
                vector.values,
                vector.metadata || {}
              );
            }
            console.log(
              `[MAIN:DuckDB] Save completed - stored ${vectors.length} vectors`
            );
            return { success: true };

          case "getInfo":
            const count = await deps.duckDBHelper?.getVectorCount();
            return {
              success: true,
              info: {
                vectorCount: count || 0,
                isInitialized: !!deps.duckDBHelper,
              },
            };

          case "clear":
            await deps.duckDBHelper?.clearVectors();
            return { success: true };

          default:
            return { success: false, error: `Unknown command: ${command}` };
        }
      } catch (error: unknown) {
        console.error(`[MAIN:DuckDB] Command ${command} failed:`, error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return { success: false, error: errorMessage };
      }
    }
  );

  // ========================================
  // 🦙 OLLAMA IPC HANDLERS
  // ========================================

  // Create Ollama client instance
  const ollamaClient = new OllamaClient(
    require("path").join(require("os").homedir(), ".ollama"),
    (status) => {
      // Status update callback - could send to renderer if needed
      console.log("🦙 [OllamaClient] Status update:", status);
    }
  );

  // Create Dependency Installer instance
  const dependencyInstaller = new DependencyInstaller();

  // List installed Ollama models
  ipcMain.handle("ollama-list-models", async () => {
    try {
      console.log("🦙 [IPC] Fetching installed Ollama models...");
      const models = await ollamaClient.getInstalledModels();

      // Return models in their original format with numeric size
      const formattedModels = models.map((model) => ({
        name: model.name,
        size: model.size, // ✅ Keep as number (bytes)
        digest: model.digest || "",
        modified_at: model.modified_at || new Date().toISOString(),
        details: model.details, // ✅ Keep original details object
      }));

      console.log(
        `🦙 [IPC] Found ${formattedModels.length} installed models with real sizes`
      );
      return formattedModels;
    } catch (error) {
      console.error("🦙 [IPC] Error listing Ollama models:", error);
      return [];
    }
  });

  // Get available Ollama models
  ipcMain.handle("ollama-get-available-models", async () => {
    try {
      console.log("🦙 [IPC] Fetching available Ollama models...F");
      const models = await ollamaClient.getAvailableModels();

      // Convert to expected format
      const formattedModels = models.map((model) => ({
        id: model.id,
        name: model.label,
        description: `${model.family} model`,
        size: `${model.sizeGB}GB`,
        category: model.id.includes("embed") ? "embedding" : "main",
      }));

      console.log(`🦙 [IPC] Found ${formattedModels.length} available models`);
      return formattedModels;
    } catch (error) {
      console.error("🦙 [IPC] Error getting available Ollama models:", error);
      return [];
    }
  });

  // Download Ollama model
  ipcMain.handle("ollama-download-model", async (event, modelId: string) => {
    try {
      console.log(`🦙 [IPC] Starting download for model: ${modelId}`);

      // Find the model metadata
      const availableModels = await ollamaClient.getAvailableModels();
      let modelMeta = availableModels.find(
        (m) =>
          m.id === modelId ||
          m.repo === modelId ||
          m.id === modelId.split(":")[0] || // Handle case where modelId includes tag
          m.repo.split(":")[0] === modelId.split(":")[0] // Compare base names
      );

      // If not found in the list, create a simple metadata
      if (!modelMeta) {
        modelMeta = {
          id: modelId.split(":")[0],
          repo: modelId,
          label: modelId,
          sizeGB: 5, // Default size estimate
          family: "general",
          isInstalled: false,
        };
      }

      // Create a temporary OllamaClient with progress callback
      const downloadClient = new OllamaClient(
        require("path").join(require("os").homedir(), ".ollama"),
        (status: any) => {
          // Send progress to renderer in the expected format
          if (status.progress !== undefined) {
            // Extract speed and ETA from formatted message
            let speed = "0 MB/s";
            let eta = "Calculating...";

            // Extract from formatted message like "Downloading: 123MB / 456MB (2.5 MB/s, ETA: 3 min)"
            if (status.message) {
              // Extract speed (e.g., "2.5 MB/s")
              const speedMatch = status.message.match(/\(([0-9.]+\s*MB\/s)/i);
              if (speedMatch) {
                speed = speedMatch[1];
              }

              // Extract ETA (e.g., "ETA: 3 min")
              const etaMatch = status.message.match(/ETA:\s*([^)]+)/i);
              if (etaMatch) {
                eta = etaMatch[1].trim();
              }
            }

            // Send formatted progress to renderer
            event.sender.send("ollama-download-progress", {
              modelId: modelId, // ALWAYS include modelId for filtering
              progress: status.progress || 0,
              speed: speed,
              eta: eta,
            });
          }
        }
      );

      // Download the model
      await downloadClient.downloadOllamaModel(modelMeta);

      console.log(`🦙 [IPC] Successfully downloaded model: ${modelId}`);
      return true;
    } catch (error) {
      console.error(`🦙 [IPC] Error downloading model ${modelId}:`, error);

      // Send error to renderer
      event.sender.send("ollama-download-progress", {
        modelId,
        progress: 0,
        message: error instanceof Error ? error.message : "Download failed",
        state: "error",
      });

      return false;
    }
  });

  // Cancel Ollama model download
  ipcMain.handle("ollama-cancel-download", async (event, modelId: string) => {
    try {
      console.log(`🦙 [IPC] Canceling download for model: ${modelId}`);
      // Note: Ollama doesn't have a direct cancel API, so we'll just log it
      console.log(`🦙 [IPC] Download cancellation requested for: ${modelId}`);
      return;
    } catch (error) {
      console.error(`🦙 [IPC] Error canceling download for ${modelId}:`, error);
      throw error;
    }
  });

  // Remove Ollama model
  ipcMain.handle("ollama-remove-model", async (event, modelId: string) => {
    try {
      console.log(`🦙 [IPC] Removing model: ${modelId}`);
      await ollamaClient.removeModel(modelId);
      console.log(`🦙 [IPC] Successfully removed model: ${modelId}`);
      return;
    } catch (error) {
      console.error(`🦙 [IPC] Error removing model ${modelId}:`, error);
      throw error;
    }
  });

  // Test Ollama connection
  ipcMain.handle("ollama-test-connection", async () => {
    try {
      console.log("🦙 [IPC] Testing Ollama connection...");
      const isConnected = await ollamaClient.testConnection();

      if (isConnected) {
        console.log("🦙 [IPC] Ollama connection successful");
        return {
          success: true,
          message: "Connected to Ollama successfully",
        };
      } else {
        console.log("🦙 [IPC] Ollama connection failed");
        return {
          success: false,
          error: "Failed to connect to Ollama service",
        };
      }
    } catch (error) {
      console.error("🦙 [IPC] Error testing Ollama connection:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // Start Ollama service
  ipcMain.handle("ollama-start-service", async () => {
    try {
      console.log("🚀 [IPC] Starting Ollama service...");
      
      const { spawn } = require('child_process');
      const os = require('os');
      
      let command: string;
      let args: string[];
      
      // Platform-specific command setup
      if (os.platform() === 'win32') {
        command = 'cmd';
        args = ['/c', 'start', '/b', 'ollama', 'serve'];
      } else {
        command = 'nohup';
        args = ['ollama', 'serve'];
      }
      
      // Start the service in background
      const ollamaProcess = spawn(command, args, {
        detached: true,
        stdio: 'ignore'
      });
      
      // Detach the process so it runs independently
      ollamaProcess.unref();
      
      console.log("🚀 [IPC] Ollama service start command executed");
      
      // Wait a moment and test connection
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const isRunning = await ollamaClient.testConnection();
      
      if (isRunning) {
        console.log("✅ [IPC] Ollama service started successfully!");
        return {
          success: true,
          message: "Ollama service started successfully"
        };
      } else {
        console.log("⚠️ [IPC] Ollama service start command executed but connection test failed");
        return {
          success: false,
          error: "Service start command executed but connection test failed. Please wait a moment and try again."
        };
      }
      
    } catch (error) {
      console.error("❌ [IPC] Error starting Ollama service:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });

  // Handler for the realtime-transcription event sent by DeepgramConnectionService
  ipcMain.on("realtime-transcription", (event, text) => {
    try {
      console.log("🔄 [IPC] Realtime transcription received in main process");
      const mainWindow = deps.getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send(
          deps.PROCESSING_EVENTS.REALTIME_TRANSCRIPTION,
          text
        );
        console.log(
          "🔄 [IPC] Realtime transcription re-sent to all listeners via",
          deps.PROCESSING_EVENTS.REALTIME_TRANSCRIPTION
        );
      }
    } catch (error) {
      console.error("❌ [IPC] Error processing realtime-transcription:", error);
    }
  });

  // Handler for toggle-recording event (from shortcuts)
  ipcMain.on(deps.PROCESSING_EVENTS.TOOGLE_RECORDING, (event) => {
    try {
      console.log("🎤 [IPC] Toggle recording event received in main process");
      const mainWindow = deps.getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send(deps.PROCESSING_EVENTS.TOOGLE_RECORDING);
        console.log("🎤 [IPC] Toggle recording event re-sent to all listeners");
      }
    } catch (error) {
      console.error("❌ [IPC] Error processing toggle-recording:", error);
    }
  });

  // Handler for the prompt-partial-response event sent by DeepgramConnectionService
  ipcMain.on(
    deps.PROCESSING_EVENTS.PROMPT_PARTIAL_RESPONSE,
    (event, content) => {
      try {
        console.log(
          "🔄 [IPC] Prompt partial response received in main process"
        );
        const mainWindow = deps.getMainWindow();
        if (mainWindow) {
          mainWindow.webContents.send(
            deps.PROCESSING_EVENTS.PROMPT_PARTIAL_RESPONSE,
            content
          );
          console.log(
            "🔄 [IPC] Prompt partial response re-sent to all listeners"
          );
        }
      } catch (error) {
        console.error(
          "❌ [IPC] Error processing prompt-partial-response:",
          error
        );
      }
    }
  );

  ipcMain.on(deps.PROCESSING_EVENTS.PROMPT_SUCCESS, (event, content) => {
    try {
      console.log("✅ [IPC] Prompt success received in main process");
      const mainWindow = deps.getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send(
          deps.PROCESSING_EVENTS.PROMPT_SUCCESS,
          content
        );
        console.log("✅ [IPC] Prompt success re-sent to all listeners");
      }
    } catch (error) {
      console.error("❌ [IPC] Error processing prompt-success:", error);
    }
  });

  ipcMain.on(deps.PROCESSING_EVENTS.PROMPT_ERROR, (event, content) => {
    try {
      console.log("❌ [IPC] Prompt error received in main process");
      const mainWindow = deps.getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send(
          deps.PROCESSING_EVENTS.PROMPT_ERROR,
          content
        );
        console.log("❌ [IPC] Prompt error re-sent to all listeners");
      }
    } catch (error) {
      console.error("❌ [IPC] Error processing prompt-error:", error);
    }
  });

  // Directory selection handler for DuckDB path
  ipcMain.handle("select-directory", async () => {
    try {
      const mainWindow = deps.getMainWindow();
      if (!mainWindow) {
        return { success: false, error: "Main window not available" };
      }

      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ["openDirectory"],
        title: "Select Directory for Neural Memory Database",
        message: "Choose where to store your Orch-Mind neural memory database",
        defaultPath: require("os").homedir(),
      });

      if (result.canceled || !result.filePaths.length) {
        return { success: false, canceled: true };
      }

      const selectedPath = result.filePaths[0];
      console.log(`📁 [DIRECTORY] User selected path: ${selectedPath}`);

      return {
        success: true,
        path: selectedPath,
      };
    } catch (error: unknown) {
      console.error("Error selecting directory:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: errorMessage };
    }
  });

  // Handler to reinitialize DuckDB with new path
  ipcMain.handle("reinitialize-duckdb", async (event, newPath: string) => {
    try {
      console.log(
        `🔄 [DUCKDB] Reinitializing DuckDB with new path: ${newPath}`
      );

      // Close existing DuckDB connection
      if (deps.duckDBHelper) {
        await deps.duckDBHelper.close();
      }

      // Create new instance with the new path
      deps.duckDBHelper = new DuckDBHelper(newPath);

      // Initialize the new instance - null check for safety
      if (deps.duckDBHelper) {
        await deps.duckDBHelper.initialize();
      }

      console.log(
        `✅ [DUCKDB] Successfully reinitialized with path: ${newPath}`
      );
      return { success: true };
    } catch (error: unknown) {
      console.error("Error reinitializing DuckDB:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: errorMessage };
    }
  });

  // Import ChatGPT history
  ipcMain.handle(
    "import-chatgpt-history",
    async (event, { fileBuffer, mode, user, applicationMode }) => {
      try {
        console.log("[IPC] Importing ChatGPT history", {
          mode,
          applicationMode,
          fileBufferType:
            fileBuffer && fileBuffer.constructor && fileBuffer.constructor.name,
        });

        // Determine which storage helper to use based on mode
        let isBasicMode = false;
        if (applicationMode) {
          isBasicMode = applicationMode.toLowerCase() === "basic";
        } else {
          // Fallback to checking environment or default
          try {
            const {
              ModeService,
              OrchOSModeEnum,
            } = require("../src/services/ModeService");
            const currentMode = ModeService.getMode();
            isBasicMode = currentMode === OrchOSModeEnum.BASIC;
          } catch (error) {
            console.warn(
              "[IPC] Could not determine mode, defaulting to advanced (DuckDB)"
            );
            isBasicMode = false;
          }
        }

        const storageType = "DuckDB"; // Always use DuckDB for both modes
        console.log(
          `[IPC] Using ${storageType} storage for import (mode: ${
            isBasicMode ? "Basic" : "Advanced"
          })`
        );

        // Create DuckDB vector helper (used for both modes)
        let vectorHelper: any;
        if (!deps.duckDBHelper) {
          throw new Error("DuckDB helper not initialized");
        }
        // Create wrapper that matches the expected interface
        vectorHelper = {
          async deleteAllUserVectors(): Promise<void> {
            if (deps.duckDBHelper?.deleteAllUserVectors) {
              await deps.duckDBHelper.deleteAllUserVectors();
            } else {
              throw new Error(
                "DuckDB deleteAllUserVectors method not available"
              );
            }
          },
          async saveToDuckDB(
            vectors: any[]
          ): Promise<{ success: boolean; error?: string }> {
            if (deps.duckDBHelper?.saveToDuckDB) {
              return await deps.duckDBHelper.saveToDuckDB(vectors);
            } else {
              throw new Error("DuckDB saveToDuckDB method not available");
            }
          },
          async checkExistingIds(
            ids: string[],
            progressCallback?: (processed: number, total: number) => void
          ): Promise<string[]> {
            if (deps.duckDBHelper?.checkExistingIds) {
              return await deps.duckDBHelper.checkExistingIds(
                ids,
                progressCallback
              );
            } else {
              // Fallback: assume no existing IDs in DuckDB for now
              console.warn(
                "[IPC] DuckDB checkExistingIds method not available, returning empty array"
              );
              if (progressCallback) {
                progressCallback(ids.length, ids.length);
              }
              return [];
            }
          },
        };

        if (!fileBuffer) {
          throw new Error("No file uploaded");
        }

        let processedBuffer: Buffer;
        if (fileBuffer instanceof Buffer) {
          processedBuffer = fileBuffer;
        } else if (fileBuffer instanceof ArrayBuffer) {
          processedBuffer = Buffer.from(new Uint8Array(fileBuffer));
        } else if (ArrayBuffer.isView(fileBuffer)) {
          processedBuffer = Buffer.from(new Uint8Array(fileBuffer.buffer));
        } else if (typeof fileBuffer === "object") {
          processedBuffer = Buffer.from(fileBuffer);
        } else {
          throw new Error(
            "Unsupported file type: " +
              (fileBuffer?.constructor?.name || typeof fileBuffer)
          );
        }

        console.log(
          `[IPC] Buffer processed successfully, size: ${processedBuffer.length} bytes`
        );

        const progressCallback = (progressInfo: ProgressInfo) => {
          event.sender.send("import-progress", progressInfo);
        };

        const result = await importChatGPTHistoryHandler({
          fileBuffer: processedBuffer,
          mode,
          applicationMode,
          openAIService: deps.openAIService,
          pineconeHelper: vectorHelper, // DuckDB helper with legacy interface name
          onProgress: progressCallback,
        });

        console.log("[IPC] Import ChatGPT history result:", result);
        return result;
      } catch (error: unknown) {
        console.error("Error importing ChatGPT history:", error);
        const errorMessage = error instanceof Error ? error.message : "Error";
        return { success: false, error: errorMessage || "Error" };
      }
    }
  );

  // ========================================
  // 🔧 DEPENDENCY MANAGEMENT HANDLERS
  // ========================================

  // Check if Ollama is installed
  ipcMain.handle("check-dependencies", async (): Promise<DependencyStatus> => {
    try {
      console.log("🔧 [IPC] Checking dependencies...");
      const status = await dependencyInstaller.checkDependencies();
      console.log("🔧 [IPC] Dependency status:", status);
      return status;
    } catch (error) {
      console.error("🔧 [IPC] Error checking dependencies:", error);
      throw error;
    }
  });

  // Install Ollama
  ipcMain.handle("install-ollama", async (event) => {
    try {
      console.log("🦙 [IPC] Starting Ollama installation...");

      // Show restart dialog before installation on Windows
      if (process.platform === 'win32') {
        const mainWindow = deps.getMainWindow();
        if (mainWindow) {
          const result = await dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: t("api.ollama.installation.confirmTitle"),
            message: t("api.ollama.installation.confirmMessage"),
            detail: t("api.ollama.installation.confirmDetail"),
            buttons: [t("api.ollama.installation.confirmContinue"), t("api.ollama.installation.confirmCancel")],
            defaultId: 0,
            cancelId: 1
          });
          
          if (result.response === 1) {
            // User cancelled
            return;
          }
        }
      }

      // Listen for progress updates
      const progressHandler = (progress: InstallProgress) => {
        event.sender.send("install-progress", progress);
      };

      dependencyInstaller.on("progress", progressHandler);

      try {
        await dependencyInstaller.installOllama();
        console.log("🦙 [IPC] Ollama installation completed");
        

      } finally {
        if (process.platform === 'win32') {
          const mainWindow = deps.getMainWindow();
          if (mainWindow) {
            const result = await dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: t("api.ollama.installation.completedTitle"),
              message: t("api.ollama.installation.completedMessage"),
              detail: t("api.ollama.installation.completedDetail"),
              buttons: [t("api.ollama.installation.completedOk")],
              defaultId: 0
            });
            
            // Force immediate quit without waiting for any other processes
            setImmediate(() => {
              require('electron').app.quit();
            });
          }
        }
      }
    } catch (error) {
      console.error("🦙 [IPC] Error installing Ollama:", error);
      throw error;
    }
  });

  // Install Python handler
  ipcMain.handle("install-python", async (event) => {
    try {
      console.log("🐍 [IPC] Starting Python installation...");

      // Show restart dialog before installation on Windows
      if (process.platform === 'win32') {
        const mainWindow = deps.getMainWindow();
        if (mainWindow) {
          const result = await dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: t("api.python.installation.confirmTitle"),
            message: t("api.python.installation.confirmMessage"),
            detail: t("api.python.installation.confirmDetail"),
            buttons: [t("api.python.installation.confirmContinue"), t("api.python.installation.confirmCancel")],
            defaultId: 0,
            cancelId: 1
          });
          
          if (result.response === 1) {
            // User cancelled
            return;
          }
        }
      }

      // Listen for progress updates
      const progressHandler = (progress: InstallProgress) => {
        event.sender.send("install-progress", progress);
      };

      dependencyInstaller.on("progress", progressHandler);

      try {
        await dependencyInstaller.installPython();
        console.log("🐍 [IPC] Python installation completed");
      } finally {
        if (process.platform === 'win32') {
          const mainWindow = deps.getMainWindow();
          if (mainWindow) {
            const result = await dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: t("api.python.installation.completedTitle"),
              message: t("api.python.installation.completedMessage"),
              detail: t("api.python.installation.completedDetail"),
              buttons: [t("api.python.installation.completedOk")],
              defaultId: 0
            });
            
            // Force immediate quit without waiting for any other processes
            setImmediate(() => {
              require('electron').app.quit();
            });
          }
        }
      }
    } catch (error) {
      console.error("🐍 [IPC] Error installing Python:", error);
      throw error;
    }
  });

  // Get manual installation instructions
  ipcMain.handle(
    "get-install-instructions",
    async (event, dependency: "ollama") => {
      try {
        console.log(
          `📝 [IPC] Getting ${dependency} installation instructions...`
        );
        const instructions =
          dependencyInstaller.getManualInstructions(dependency);
        return instructions;
      } catch (error) {
        console.error(
          `📝 [IPC] Error getting ${dependency} instructions:`,
          error
        );
        throw error;
      }
    }
  );

  // Hardware detection handler
  ipcMain.handle("detect-hardware", async () => {
    try {
      const hardware = await detectHardware();

      // More robust Apple Silicon detection
      const isAppleSilicon = detectAppleSilicon(hardware);

      console.log("🔧 [IPC] Hardware detection:", {
        cpuCores: hardware.cpuCores,
        ramGB: hardware.ramGB,
        gpu: hardware.gpu,
        isAppleSilicon,
      });

      return {
        success: true,
        hardware,
      };
    } catch (error) {
      console.error("Error detecting hardware:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to detect hardware",
      };
    }
  });

  /**
   * Detect if running on Apple Silicon (M1/M2/M3)
   */
  function detectAppleSilicon(hardware: any): boolean {
    // Method 1: Check process.arch
    if (process.arch === "arm64" && process.platform === "darwin") {
      console.log("🍎 [Hardware] Apple Silicon detected via process.arch");
      return true;
    }

    // Method 2: Check GPU vendor for Apple
    if (hardware.gpu?.vendor?.toLowerCase().includes("apple")) {
      console.log("🍎 [Hardware] Apple Silicon detected via GPU vendor");
      return true;
    }

    // Method 3: Check for absence of CUDA on macOS
    if (process.platform === "darwin" && !hardware.gpu?.cuda) {
      console.log(
        "🍎 [Hardware] Apple Silicon detected via macOS without CUDA"
      );
      return true;
    }

    console.log("🖥️ [Hardware] Intel/AMD architecture detected");
    return false;
  }
}
