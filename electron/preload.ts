// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

console.log("Preload script starting...")
import { contextBridge, ipcRenderer } from "electron"
import { NormalizedPineconeMatch } from "./PineconeHelper"
import { NormalizedDuckDBMatch } from "./DuckDBHelper";

// Types for the exposed Electron API
interface ElectronAPI {
  toggleMainWindow: () => Promise<{ success: boolean; error?: string }>
  getPlatform: () => string
  startTranscriptNeural: () => Promise<{ success: boolean; error?: string }>;
  stopTranscriptNeural: () => Promise<{ success: boolean; error?: string }>;
  sendNeuralPrompt: (temporaryContext?: string) => Promise<{ success: boolean; error?: string }>;
  clearNeuralTranscription: () => Promise<{ success: boolean; error?: string }>;
  onRealtimeTranscription: (callback: (data: string) => void) => () => void;
  onNeuralStarted: (callback: () => void) => () => void;
  onNeuralStopped: (callback: () => void) => () => void;
  onNeuralError: (callback: (error: string) => void) => () => void;
  onPromptSend: (callback: () => void) => () => void;
  onPromptSending: (callback: () => void) => () => void;
  onPromptPartialResponse: (callback: (data: string) => void) => () => void;
  onPromptSuccess: (callback: (data: string) => void) => () => void;
  onPromptError: (callback: (error: string) => void) => () => void;
  onClearTranscription: (callback: () => void) => () => void;
  onSendChunk: (callback: (chunk: ArrayBuffer) => void) => () => void;
  getEnv: (key: string) => Promise<string | null>;
  sendAudioChunk: (chunk: Uint8Array) => Promise<{ success: boolean; error?: string }>;
  sendAudioTranscription: (text: string) => void;
  toogleNeuralRecording: (callback: () => void) => () => void;
  setDeepgramLanguage: (lang: string) => void
  // Pinecone IPC methods
  queryPinecone: (embedding: number[], topK?: number, keywords?: string[], filters?: Record<string, unknown>) => Promise<{ matches: NormalizedPineconeMatch[] }>;
  saveToPinecone: (vectors: Array<{ id: string, values: number[], metadata: Record<string, unknown> }>) => Promise<void>
  // DuckDB IPC methods (for basic mode)
  queryDuckDB: (embedding: number[], topK?: number, keywords?: string[], filters?: Record<string, unknown>) => Promise<{ matches: NormalizedDuckDBMatch[] }>;
  saveToDuckDB: (vectors: Array<{ id: string, values: number[], metadata: Record<string, unknown> }>) => Promise<void>
  sendPromptUpdate: (type: 'partial' | 'complete' | 'error', content: string) => void
  importChatHistory: (params: { fileBuffer: Buffer | ArrayBuffer | Uint8Array, mode: string, user: string, onProgress?: (data: { processed: number; total: number; percentage?: number; stage?: string }) => void }) => Promise<{ success: boolean; error?: string; imported?: number; skipped?: number }>,
  minimizeWindow: () => void;
  closeWindow: () => void;
}


export const PROCESSING_EVENTS = {
  NEURAL_START: "neural-start",
  NEURAL_STOP: "neural-stop",
  NEURAL_STARTED: "neural-started",
  NEURAL_STOPPED: "neural-stopped",
  NEURAL_ERROR: "neural-error",
  PROMPT_SEND: "prompt-send",
  ON_PROMPT_SEND: "on-prompt-send",
  PROMPT_SENDING: "prompt-sending",
  PROMPT_PARTIAL_RESPONSE: "prompt-partial-response",
  PROMPT_SUCCESS: "prompt-success",
  PROMPT_ERROR: "prompt-error",
  REALTIME_TRANSCRIPTION: "realtime-transcription",
  REALTIME_TRANSCRIPTION_INTERIM: "realtime-transcription-interim",
  CLEAR_TRANSCRIPTION: "clear-transcription",
  SEND_CHUNK: "send-chunk",
  TOOGLE_RECORDING: "toggle-recording",
  SET_DEEPGRAM_LANGUAGE: "set-deepgram-language",
} as const

// At the top of the file
console.log("Preload script is running")

const electronAPI: ElectronAPI = {
  toggleMainWindow: async () => {
    console.log("toggleMainWindow called from preload")
    try {
      const result = await ipcRenderer.invoke("toggle-window")
      console.log("toggle-window result:", result)
      return result
    } catch (error) {
      console.error("Error in toggleMainWindow:", error)
      throw error
    }
  },


  getPlatform: () => process.platform,

  startTranscriptNeural: async (): Promise<{ success: boolean; error?: string }> => {
    try {
      await ipcRenderer.invoke(PROCESSING_EVENTS.NEURAL_START);
      return { success: true };
    } catch (error: unknown) {
      if (error instanceof Error) {
        return { success: false, error: error.message };
      }
      return { success: false, error: "Erro desconhecido" };
    }
  },

  // 🛑 Stop transcript
  stopTranscriptNeural: async (): Promise<{ success: boolean; error?: string }> => {
    try {
      await ipcRenderer.invoke(PROCESSING_EVENTS.NEURAL_STOP);
      return { success: true };
    } catch (error: unknown) {
      if (error instanceof Error) {
        return { success: false, error: error.message };
      }
      return { success: false, error: "Erro desconhecido" };
    }
  },

  // 🔥 Send prompt (question for OpenAI)
  sendNeuralPrompt: async (temporaryContext?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await ipcRenderer.invoke(PROCESSING_EVENTS.PROMPT_SEND, temporaryContext);
      return { success: true };
    } catch (error: unknown) {
      if (error instanceof Error) {
        return { success: false, error: error.message };
      }
      return { success: false, error: "Erro desconhecido" };
    }
  },

  // 🧹 Clear transcription
  clearNeuralTranscription: async (): Promise<{ success: boolean; error?: string }> => {
    try {
      await ipcRenderer.invoke(PROCESSING_EVENTS.CLEAR_TRANSCRIPTION);
      return { success: true };
    } catch (error: unknown) {
      if (error instanceof Error) {
        return { success: false, error: error.message };
      }
      return { success: false, error: "Erro desconhecido" };
    }
  },

  // 📝 Realtime transcription
  onRealtimeTranscription: (callback: (data: string) => void) => {
    const subscription = (_: Electron.IpcRendererEvent, data: string) => callback(data);
    ipcRenderer.on(PROCESSING_EVENTS.REALTIME_TRANSCRIPTION, subscription);
    return () => ipcRenderer.removeListener(PROCESSING_EVENTS.REALTIME_TRANSCRIPTION, subscription);
  },

  // 🔄 Neural started
  onNeuralStarted: (callback: () => void) => {
    const subscription = () => callback();
    ipcRenderer.on(PROCESSING_EVENTS.NEURAL_STARTED, subscription);
    return () => ipcRenderer.removeListener(PROCESSING_EVENTS.NEURAL_STARTED, subscription);
  },

  // 🛑 Neural stopped
  onNeuralStopped: (callback: () => void) => {
    const subscription = () => callback();
    ipcRenderer.on(PROCESSING_EVENTS.NEURAL_STOPPED, subscription);
    return () => ipcRenderer.removeListener(PROCESSING_EVENTS.NEURAL_STOPPED, subscription);
  },

  // ❌ Neural error
  onNeuralError: (callback: (error: string) => void) => {
    const subscription = (_: Electron.IpcRendererEvent, error: string) => callback(error);
    ipcRenderer.on(PROCESSING_EVENTS.NEURAL_ERROR, subscription);
    return () => ipcRenderer.removeListener(PROCESSING_EVENTS.NEURAL_ERROR, subscription);
  },
  // 📝 Prompt send
  onPromptSend: (callback: () => void) => {
    const subscription = () => callback();
    ipcRenderer.on(PROCESSING_EVENTS.ON_PROMPT_SEND, subscription);
    return () => ipcRenderer.removeListener(PROCESSING_EVENTS.ON_PROMPT_SEND, subscription);
  },
  // 🔄 Prompt sending
  onPromptSending: (callback: () => void) => {
    const subscription = () => callback();
    ipcRenderer.on(PROCESSING_EVENTS.PROMPT_SENDING, subscription);
    return () => ipcRenderer.removeListener(PROCESSING_EVENTS.PROMPT_SENDING, subscription);
  },

  // ⚡ Prompt partial response
  onPromptPartialResponse: (callback: (data: string) => void) => {
    const subscription = (_: Electron.IpcRendererEvent, data: string) => callback(data);
    ipcRenderer.on(PROCESSING_EVENTS.PROMPT_PARTIAL_RESPONSE, subscription);
    return () => ipcRenderer.removeListener(PROCESSING_EVENTS.PROMPT_PARTIAL_RESPONSE, subscription);
  },

  // ✅ Prompt success
  onPromptSuccess: (callback: (data: string) => void) => {
    const subscription = (_: Electron.IpcRendererEvent, data: string) => callback(data);
    ipcRenderer.on(PROCESSING_EVENTS.PROMPT_SUCCESS, subscription);
    return () => ipcRenderer.removeListener(PROCESSING_EVENTS.PROMPT_SUCCESS, subscription);
  },

  // ❌ Prompt error
  onPromptError: (callback: (error: string) => void) => {
    const subscription = (_: Electron.IpcRendererEvent, error: string) => callback(error);
    ipcRenderer.on(PROCESSING_EVENTS.PROMPT_ERROR, subscription);
    return () => ipcRenderer.removeListener(PROCESSING_EVENTS.PROMPT_ERROR, subscription);
  },

  // 🧹 Clear transcription
  onClearTranscription: (callback: () => void) => {
    const subscription = () => callback();
    ipcRenderer.on(PROCESSING_EVENTS.CLEAR_TRANSCRIPTION, subscription);
    return () => ipcRenderer.removeListener(PROCESSING_EVENTS.CLEAR_TRANSCRIPTION, subscription);
  },
  onSendChunk: (callback: (chunk: ArrayBuffer) => void) => {
    const subscription = (_: Electron.IpcRendererEvent, chunk: ArrayBuffer) => callback(chunk);
    ipcRenderer.on(PROCESSING_EVENTS.SEND_CHUNK, subscription);
    return () => ipcRenderer.removeListener(PROCESSING_EVENTS.SEND_CHUNK, subscription);
  },
  getEnv: async (key: string): Promise<string | null> => {
    return await ipcRenderer.invoke("get-env", key);
  },
  sendAudioChunk: (chunk: Uint8Array) => ipcRenderer.invoke(PROCESSING_EVENTS.SEND_CHUNK, chunk),
  sendAudioTranscription: (text: string) => {
    // Send to the main process, which will then re-emit to all listeners
    ipcRenderer.send(PROCESSING_EVENTS.REALTIME_TRANSCRIPTION, text);
  },
  toogleNeuralRecording: (callback: () => void) => {
    const subscription = () => callback();
    ipcRenderer.on(PROCESSING_EVENTS.TOOGLE_RECORDING, subscription);
    return () => ipcRenderer.removeListener(PROCESSING_EVENTS.TOOGLE_RECORDING, subscription);
  },

  setDeepgramLanguage: (lang: string) => ipcRenderer.invoke(PROCESSING_EVENTS.SET_DEEPGRAM_LANGUAGE, lang),

  // Pinecone IPC methods
  queryPinecone: async (embedding: number[], topK?: number, keywords?: string[], filters?: Record<string, unknown>) => {
    return await ipcRenderer.invoke('query-pinecone', embedding, topK || 5, keywords || [], filters || {});
  },

  saveToPinecone: async (vectors: Array<{ id: string, values: number[], metadata: Record<string, unknown> }>) => {
    return await ipcRenderer.invoke('save-pinecone', vectors);
  },
  
  // DuckDB IPC methods (for basic mode)
  queryDuckDB: async (embedding: number[], topK?: number, keywords?: string[], filters?: Record<string, unknown>) => {
    return await ipcRenderer.invoke('query-duckdb', embedding, topK || 5, keywords || [], filters || {});
  },

  saveToDuckDB: async (vectors: Array<{ id: string, values: number[], metadata: Record<string, unknown> }>) => {
    return await ipcRenderer.invoke('save-duckdb', vectors);
  },

  // Send prompt update directly
  sendPromptUpdate: (type: 'partial' | 'complete' | 'error', content: string) => {
    // Send directly to the specific event based on the type
    switch (type) {
      case 'partial':
        ipcRenderer.send(PROCESSING_EVENTS.PROMPT_PARTIAL_RESPONSE, content);
        break;
      case 'complete':
        ipcRenderer.send(PROCESSING_EVENTS.PROMPT_SUCCESS, content);
        break;
      case 'error':
        ipcRenderer.send(PROCESSING_EVENTS.PROMPT_ERROR, content);
        break;
    }
  },

  importChatHistory: async ({ fileBuffer, mode, user, onProgress }: { fileBuffer: Buffer, mode: string, user: string, onProgress?: (data: { processed: number; total: number; percentage?: number; stage?: string }) => void }) => {
    console.log(`[PRELOAD] Starting ChatGPT import: mode=${mode}, user=${user}, callbackFornecido=${!!onProgress}`);
    
    // Create a simulated progress emitter for debug (every 2 seconds) if requested
    const debugInterval = setInterval(() => {
      // import-progress event is already working correctly
    }, 2000);
    
    if (onProgress) {
      // Define correct type for progress data
      const progressListener = (_event: Electron.IpcRendererEvent, data: { processed: number; total: number; percentage?: number; stage?: string }) => {
        // Update title for visual feedback
        try {
          const percent = data.percentage !== undefined ? data.percentage : Math.floor((data.processed / Math.max(1, data.total)) * 100);
          document.title = `Import: ${percent}%`;
        } catch (e: unknown) {
          // Silently ignore errors
        }
        try {
          onProgress(data);
          document.dispatchEvent(new CustomEvent('import-progress-event', { detail: data }));
        } catch (e: unknown) {
          console.error('[PRELOAD] Error processing progress event:', e);
        }
      };

      // Register listener for progress events
      ipcRenderer.on("import-progress", progressListener);
      
      try {
        console.log(`[PRELOAD] Invoking 'import-chatgpt-history'...`);
        const result = await ipcRenderer.invoke("import-chatgpt-history", { fileBuffer, mode, user });
        console.log(`[PRELOAD] Import completed: ${JSON.stringify(result)}`);
        
        // Clear listener when no longer needed
        ipcRenderer.removeListener("import-progress", progressListener);
        clearInterval(debugInterval);
        return result;
      } catch (err: unknown) {
        console.error(`[PRELOAD] Error importing:`, err);
        ipcRenderer.removeListener("import-progress", progressListener);
        clearInterval(debugInterval);
        throw err;
      }
    } else {
      console.log(`[PRELOAD] Calling 'import-chatgpt-history' without progress callback...`);
      try {
        const result = await ipcRenderer.invoke("import-chatgpt-history", { fileBuffer, mode, user });
        clearInterval(debugInterval);
        return result;
      } catch (err: unknown) {
        console.error(`[PRELOAD] Erro na importação (sem callback):`, err);
        clearInterval(debugInterval);
        throw err;
      }
    }
  },
  minimizeWindow: () => {
    ipcRenderer.send('minimize-window');
  },
  closeWindow: () => {
    ipcRenderer.send('close-window');
  }
} as unknown as ElectronAPI

// Before exposing the API
console.log(
  "About to expose electronAPI with methods:",
  Object.keys(electronAPI)
)

window.addEventListener('error', (event) => {
  console.error('Uncaught Exception in renderer:', event.error);
  event.preventDefault();
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Promise Rejection:', event.reason);
  event.preventDefault();
});

// Expose the API
contextBridge.exposeInMainWorld("electronAPI", electronAPI)

console.log("electronAPI exposed to window")

// Add this focus restoration handler
ipcRenderer.on("restore-focus", () => {
  // Try to focus the active element if it exists
  const activeElement = document.activeElement as HTMLElement
  if (activeElement && typeof activeElement.focus === "function") {
    activeElement.focus()
  }
})

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electron", {
  ipcRenderer: {
    on: (channel: string, func: (...args: unknown[]) => void) => {
      if (channel === "auth-callback") {
        ipcRenderer.on(channel, (_event: Electron.IpcRendererEvent, ...args: unknown[]) => func(...args))
      }
    },
    removeListener: (channel: string, func: (...args: unknown[]) => void) => {
      if (channel === "auth-callback") {
        ipcRenderer.removeListener(channel, (_event: Electron.IpcRendererEvent, ...args: unknown[]) => func(...args))
      }
    }
  }
})
