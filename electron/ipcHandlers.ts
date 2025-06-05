// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// ipcHandlers.ts

import { ipcMain } from "electron";
import type { ProgressInfo } from '../src/electron/chatgpt-import';
import { importChatGPTHistoryHandler } from '../src/electron/chatgpt-import';
import { IIpcHandlerDeps } from "./main";

export function initializeIpcHandlers(deps: IIpcHandlerDeps): void {
  console.log("Initializing IPC handlers")

  ipcMain.handle(
    "set-window-dimensions",
    (event, width: number, height: number) => {
      deps.setWindowDimensions(width, height)
    }
  )

  // Window management handlers
  ipcMain.handle("toggle-window", () => {
    try {
      deps.toggleMainWindow()
      return { success: true }
    } catch (error) {
      console.error("Error toggling window:", error)
      return { error: "Failed to toggle window" }
    }
  })

  ipcMain.handle("neural-start", async () => {
    try {
      const mainWindow = deps.getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send(deps.PROCESSING_EVENTS.NEURAL_START);
      }
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Error starting neural";
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
      const errorMessage = error instanceof Error ? error.message : "Error stopping neural";
      return { success: false, error: errorMessage };
    }
  });

  // 🔥 Send prompt
  ipcMain.handle("prompt-send", async (event, temporaryContext?: string) => {
    try {
      const mainWindow = deps.getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send(deps.PROCESSING_EVENTS.PROMPT_SEND, temporaryContext);
      }
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Error sending prompt";
      return { success: false, error: errorMessage };
    }
  });

  ipcMain.handle("send-chunk", async (event, blob: Uint8Array) => {
    try {
      console.log("Sending audio chunk to Deepgram.");
      const mainWindow = deps.getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send(deps.PROCESSING_EVENTS.SEND_CHUNK, blob.buffer);
      }
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Error sending audio chunk";
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
      const errorMessage = error instanceof Error ? error.message : "Error clearing neural transcription";
      return { success: false, error: errorMessage };
    }
  });

  ipcMain.handle("set-deepgram-language", (event, lang: string) => {
    try {
      console.log("Setting Deepgram language to", lang);
      const mainWindow = deps.getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send(deps.PROCESSING_EVENTS.SET_DEEPGRAM_LANGUAGE, lang);
      }
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Error setting Deepgram language";
      return { success: false, error: errorMessage };
    }
  });

  // Pinecone IPC handlers
  ipcMain.handle("query-pinecone", async (event, embedding: number[], topK?: number, keywords?: string[], filters?: Record<string, unknown>) => {
    try {
      if (!deps.pineconeHelper) {
        console.error("Pinecone helper not initialized");
        return { matches: [] };
      }
      const result = await deps.pineconeHelper.queryPinecone(embedding, topK, keywords, filters);
      return result;
    } catch (error: unknown) {
      console.error("Error querying Pinecone:", error);
      return { matches: [] };
    }
  });

  ipcMain.handle("save-pinecone", async (event, vectors: Array<{ id: string, values: number[], metadata: Record<string, string | number | boolean | string[]> }>) => {
    try {
      if (!deps.pineconeHelper) {
        console.error("Pinecone helper not initialized");
        return { success: false, error: "Pinecone helper not initialized" };
      }
      await deps.pineconeHelper.saveToPinecone(vectors);
      return { success: true };
    } catch (error: unknown) {
      console.error("Error saving to Pinecone:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      return { success: false, error: errorMessage || "Error saving to Pinecone" };
    }
  });

  // DuckDB IPC handlers (updated for new API)
  ipcMain.handle("query-duckdb", async (event, embedding: number[], limit?: number, threshold?: number) => {
    try {
      if (!deps.duckDBHelper) {
        console.error("DuckDB helper not initialized");
        return { matches: [] };
      }
      
      // Use very low threshold by default to show all results for debugging
      const defaultThreshold = -1.0; // Allow all similarities from -1 to 1
      const finalThreshold = threshold !== undefined ? threshold : defaultThreshold;
      
      console.log(`[MEMORY] Querying DuckDB with embedding[${embedding.length}], limit=${limit || 5}, threshold=${finalThreshold}`);
      const result = await deps.duckDBHelper.findSimilarVectors(embedding, limit || 5, finalThreshold);
      console.log(`[MEMORY] DuckDB query returned ${result.length} matches`);
      return { matches: result };
    } catch (error: unknown) {
      console.error("Error querying DuckDB:", error);
      return { matches: [] };
    }
  });

  ipcMain.handle("save-duckdb", async (event, vectors: Array<{ id: string, values: number[], metadata: Record<string, unknown> }>) => {
    try {
      if (!deps.duckDBHelper) {
        console.error("DuckDB helper not initialized");
        return { success: false, error: "DuckDB helper not initialized" };
      }
      
      console.log(`[MEMORY] Saving ${vectors.length} vectors to DuckDB`);
      
      for (const vector of vectors) {
        if (!vector.id || !Array.isArray(vector.values) || vector.values.length === 0) {
          console.warn(`[MEMORY] Skipping invalid vector:`, vector.id);
          continue;
        }
        await deps.duckDBHelper.storeVector(vector.id, vector.values, vector.metadata || {});
      }
      
      console.log(`[MEMORY] Successfully saved ${vectors.length} vectors to DuckDB`);
      return { success: true };
    } catch (error: unknown) {
      console.error("Error saving to DuckDB:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: errorMessage };
    }
  });

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
      const testMetadata = { type: "test", timestamp: new Date().toISOString() };
      await deps.duckDBHelper.storeVector("test-vector-1", testVector, testMetadata);
      console.log("✅ [TEST] Test vector stored successfully");

      // Test 3: Get vector count
      const count = await deps.duckDBHelper.getVectorCount();
      console.log(`✅ [TEST] Vector count: ${count}`);

      // Test 4: Query similar vectors
      const queryVector = [0.15, 0.25, 0.35, 0.45, 0.55]; // Similar to test vector
      const results = await deps.duckDBHelper.findSimilarVectors(queryVector, 5, 0.5);
      console.log(`✅ [TEST] Found ${results.length} similar vectors`);

      // Log results details
      results.forEach((result, index) => {
        console.log(`   ${index + 1}. ID: ${result.id}, Score: ${result.score.toFixed(4)}, Metadata:`, result.metadata);
      });

      return { 
        success: true, 
        results: {
          vectorCount: count,
          queryResults: results,
          testCompleted: true
        }
      };
    } catch (error: unknown) {
      console.error("❌ [TEST] DuckDB test failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
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
          dbPath: "~/Library/Application Support/orch-os/orch-os-vectors.db"
        }
      };
    } catch (error: unknown) {
      console.error("Error getting DuckDB info:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
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
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: errorMessage };
    }
  });

  // DuckDB sandboxed command handler (updated for new API)
  ipcMain.handle("duckdb-command", async (event, command: string, data?: any) => {
    try {
      console.log(`[MAIN:DuckDB] Executing command: ${command}${data ? ' with data' : ''}`);

      switch (command) {
        case 'query':
          const { embedding, limit, threshold } = data || {};
          if (!embedding || !Array.isArray(embedding)) {
            return { success: false, error: "Invalid embedding data for query" };
          }
          const queryResult = await deps.duckDBHelper?.findSimilarVectors(embedding, limit, threshold);
          console.log(`[MAIN:DuckDB] Query completed - found ${queryResult?.length || 0} matches`);
          return { success: true, matches: queryResult || [] };
          
        case 'save':
          const { vectors } = data || {};
          if (!vectors || !Array.isArray(vectors)) {
            return { success: false, error: "Invalid vectors data for save operation" };
          }
          
          for (const vector of vectors) {
            await deps.duckDBHelper?.storeVector(vector.id, vector.values, vector.metadata || {});
          }
          console.log(`[MAIN:DuckDB] Save completed - stored ${vectors.length} vectors`);
          return { success: true };

        case 'getInfo':
          const count = await deps.duckDBHelper?.getVectorCount();
          return { 
            success: true, 
            info: { 
              vectorCount: count || 0,
              isInitialized: !!deps.duckDBHelper 
            } 
          };

        case 'clear':
          await deps.duckDBHelper?.clearVectors();
          return { success: true };

        default:
          return { success: false, error: `Unknown command: ${command}` };
      }
    } catch (error: unknown) {
      console.error(`[MAIN:DuckDB] Command ${command} failed:`, error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: errorMessage };
    }
  });

  // Handler for the realtime-transcription event sent by DeepgramConnectionService
  ipcMain.on("realtime-transcription", (event, text) => {
    try {
      console.log("🔄 [IPC] Realtime transcription received in main process");
      const mainWindow = deps.getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send(deps.PROCESSING_EVENTS.REALTIME_TRANSCRIPTION, text);
        console.log("🔄 [IPC] Realtime transcription re-sent to all listeners via", deps.PROCESSING_EVENTS.REALTIME_TRANSCRIPTION);
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
  ipcMain.on(deps.PROCESSING_EVENTS.PROMPT_PARTIAL_RESPONSE, (event, content) => {
    try {
      console.log("🔄 [IPC] Prompt partial response received in main process");
      const mainWindow = deps.getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send(deps.PROCESSING_EVENTS.PROMPT_PARTIAL_RESPONSE, content);
        console.log("🔄 [IPC] Prompt partial response re-sent to all listeners");
      }
    } catch (error) {
      console.error("❌ [IPC] Error processing prompt-partial-response:", error);
    }
  });
  
  ipcMain.on(deps.PROCESSING_EVENTS.PROMPT_SUCCESS, (event, content) => {
    try {
      console.log("✅ [IPC] Prompt success received in main process");
      const mainWindow = deps.getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send(deps.PROCESSING_EVENTS.PROMPT_SUCCESS, content);
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
        mainWindow.webContents.send(deps.PROCESSING_EVENTS.PROMPT_ERROR, content);
        console.log("❌ [IPC] Prompt error re-sent to all listeners");
      }
    } catch (error) {
      console.error("❌ [IPC] Error processing prompt-error:", error);
    }
  });

  // Import ChatGPT history
  ipcMain.handle("import-chatgpt-history", async (event, { fileBuffer, mode }) => {
    try {
      if (!deps.pineconeHelper) {
        throw new Error("Pinecone helper not initialized");
      }
      if (!fileBuffer) {
        throw new Error("No file uploaded");
      }
      console.log('[IPC] Importing ChatGPT history', {
        mode,
        fileBufferType: fileBuffer && fileBuffer.constructor && fileBuffer.constructor.name
      });
      
      let processedBuffer: Buffer;
      if (fileBuffer instanceof Buffer) {
        processedBuffer = fileBuffer;
      } else if (fileBuffer instanceof ArrayBuffer) {
        processedBuffer = Buffer.from(new Uint8Array(fileBuffer));
      } else if (ArrayBuffer.isView(fileBuffer)) {
        processedBuffer = Buffer.from(new Uint8Array(fileBuffer.buffer));
      } else if (typeof fileBuffer === 'object') {
        processedBuffer = Buffer.from(fileBuffer);
      } else {
        throw new Error('Unsupported file type: ' + (fileBuffer?.constructor?.name || typeof fileBuffer));
      }
      
      console.log(`[IPC] Buffer processed successfully, size: ${processedBuffer.length} bytes`);
      
      const progressCallback = (progressInfo: ProgressInfo) => {
        event.sender.send('import-progress', progressInfo);
      };
      
      const result = await importChatGPTHistoryHandler({
        fileBuffer: processedBuffer,
        mode,
        openAIService: deps.openAIService,
        pineconeHelper: deps.pineconeHelper,
        onProgress: progressCallback
      });
      
      console.log('[IPC] Import ChatGPT history result:', result);
      return result;
    } catch (error: unknown) {
      console.error("Error importing ChatGPT history:", error);
      const errorMessage = error instanceof Error ? error.message : "Error";
      return { success: false, error: errorMessage || "Error" };
    }
  });

}