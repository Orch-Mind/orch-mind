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

  // DuckDB IPC handlers (for basic mode)
  ipcMain.handle("query-duckdb", async (event, embedding: number[], topK?: number, keywords?: string[], filters?: Record<string, unknown>) => {
    try {
      if (!deps.duckDBHelper) {
        console.error("DuckDB helper not initialized");
        return { matches: [] };
      }
      const result = await deps.duckDBHelper.queryDuckDB(embedding, topK, keywords, filters);
      console.log(`[MEMORY] DuckDB query returned ${result.matches.length} matches`);
      return result;
    } catch (error: unknown) {
      console.error("Error querying DuckDB:", error);
      return { matches: [] };
    }
  });

  ipcMain.handle("save-duckdb", async (event, vectors: Array<{ id: string, values: number[], metadata: Record<string, string | number | boolean | string[]> }>) => {
    try {
      if (!deps.duckDBHelper) {
        console.error("DuckDB helper not initialized");
        return { success: false, error: "DuckDB helper not initialized" };
      }
      await deps.duckDBHelper.saveToDuckDB(vectors);
      console.log(`[MEMORY] Saved ${vectors.length} vectors to DuckDB`);
      return { success: true };
    } catch (error: unknown) {
      console.error("Error saving to DuckDB:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      return { success: false, error: errorMessage || "Error saving to DuckDB" };
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