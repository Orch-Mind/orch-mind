// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * Electron API Factory
 *
 * Dependency Inversion: Creates API by composing services that depend on abstractions
 * Factory Pattern: Centralized creation and configuration of the complete API
 * Single Responsibility: Only responsible for API composition and dependency injection
 */

import { ipcRenderer } from "electron";
import { IElectronAPI } from "../interfaces/IElectronAPI";
import { ErrorHandler } from "../utils/ErrorHandler";
import { Logger } from "../utils/Logger";
import { WindowManagerService } from "./WindowManagerService";

// Processing events constants
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
} as const;

export class ElectronAPIFactory {
  private logger: Logger;
  private errorHandler: ErrorHandler;

  constructor(logger: Logger) {
    this.logger = logger.createChild("APIFactory");
    this.errorHandler = new ErrorHandler(logger);
  }

  /**
   * Create the complete Electron API by composing specialized services
   */
  async createAPI(): Promise<IElectronAPI> {
    this.logger.info("Building Neural Electron API...");

    // Create specialized services
    const windowManager = new WindowManagerService(
      this.logger,
      this.errorHandler
    );
    // Create DuckDB service for sandboxed environment
    const { DuckDBServiceSandboxed } = await import("./DuckDBServiceSandboxed");
    const duckdbService = DuckDBServiceSandboxed.getInstance(
      this.logger,
      this.errorHandler
    );

    // Compose the complete API
    const api: IElectronAPI = {
      // Window Management
      toggleMainWindow: windowManager.toggleMainWindow.bind(windowManager),
      minimizeWindow: windowManager.minimizeWindow.bind(windowManager),
      closeWindow: windowManager.closeWindow.bind(windowManager),
      getPlatform: windowManager.getPlatform.bind(windowManager),

      // Neural Processing
      ...this.createNeuralProcessor(),

      // Event Subscriptions
      ...this.createEventSubscriber(),

      // Audio Processing
      ...this.createAudioProcessor(),

      // Environment Management
      ...this.createEnvironmentManager(),

      // Communication Management
      ...this.createCommunicationManager(),

      // Import Management
      ...this.createImportManager(),

      // vLLM Manager
      ...this.createVllmManager(),

      // Ollama Manager
      ...this.createOllamaManager(),

      // DuckDB Commands (sandboxed version via IPC)
      duckdbCommand: duckdbService.duckdbCommand.bind(duckdbService),

      // Legacy Vector Database Support
      ...this.createLegacyVectorDatabaseAPI(),
    };

    this.logger.success("Neural Electron API composition completed");
    return api;
  }

  /**
   * Set up focus restoration for enhanced UX
   */
  setupFocusRestoration(): void {
    const windowManager = new WindowManagerService(
      this.logger,
      this.errorHandler
    );
    windowManager.setupFocusRestoration();
  }

  /**
   * Create Neural Processing service methods
   */
  private createNeuralProcessor() {
    return {
      startTranscriptNeural: async () => {
        return this.errorHandler.wrapAsync(
          async () => {
            await ipcRenderer.invoke(PROCESSING_EVENTS.NEURAL_START);
            return { success: true };
          },
          {
            component: "NeuralProcessor",
            operation: "startTranscript",
            severity: "medium",
          }
        );
      },

      stopTranscriptNeural: async () => {
        return this.errorHandler.wrapAsync(
          async () => {
            await ipcRenderer.invoke(PROCESSING_EVENTS.NEURAL_STOP);
            return { success: true };
          },
          {
            component: "NeuralProcessor",
            operation: "stopTranscript",
            severity: "medium",
          }
        );
      },

      sendNeuralPrompt: async (temporaryContext?: string) => {
        return this.errorHandler.wrapAsync(
          async () => {
            await ipcRenderer.invoke(
              PROCESSING_EVENTS.PROMPT_SEND,
              temporaryContext
            );
            return { success: true };
          },
          {
            component: "NeuralProcessor",
            operation: "sendPrompt",
            severity: "medium",
          }
        );
      },

      clearNeuralTranscription: async () => {
        return this.errorHandler.wrapAsync(
          async () => {
            await ipcRenderer.invoke(PROCESSING_EVENTS.CLEAR_TRANSCRIPTION);
            return { success: true };
          },
          {
            component: "NeuralProcessor",
            operation: "clearTranscription",
            severity: "low",
          }
        );
      },

      setDeepgramLanguage: (lang: string) => {
        this.errorHandler.wrapSync(
          () => {
            ipcRenderer.invoke(PROCESSING_EVENTS.SET_DEEPGRAM_LANGUAGE, lang);
          },
          {
            component: "NeuralProcessor",
            operation: "setLanguage",
            severity: "low",
          }
        );
      },
    };
  }

  /**
   * Create Event Subscription service methods
   */
  private createEventSubscriber() {
    const createEventHandler = (eventName: string) => {
      return (callback: (...args: any[]) => void) => {
        const subscription = (_: Electron.IpcRendererEvent, ...args: any[]) => {
          try {
            callback(...args);
          } catch (error) {
            this.logger.error(`Error in ${eventName} callback`, error);
          }
        };

        ipcRenderer.on(eventName, subscription);

        return () => {
          ipcRenderer.removeListener(eventName, subscription);
        };
      };
    };

    return {
      onRealtimeTranscription: createEventHandler(
        PROCESSING_EVENTS.REALTIME_TRANSCRIPTION
      ),
      onNeuralStarted: createEventHandler(PROCESSING_EVENTS.NEURAL_STARTED),
      onNeuralStopped: createEventHandler(PROCESSING_EVENTS.NEURAL_STOPPED),
      onNeuralError: createEventHandler(PROCESSING_EVENTS.NEURAL_ERROR),
      onPromptSend: createEventHandler(PROCESSING_EVENTS.ON_PROMPT_SEND),
      onPromptSending: createEventHandler(PROCESSING_EVENTS.PROMPT_SENDING),
      onPromptPartialResponse: createEventHandler(
        PROCESSING_EVENTS.PROMPT_PARTIAL_RESPONSE
      ),
      onPromptSuccess: createEventHandler(PROCESSING_EVENTS.PROMPT_SUCCESS),
      onPromptError: createEventHandler(PROCESSING_EVENTS.PROMPT_ERROR),
      onClearTranscription: createEventHandler(
        PROCESSING_EVENTS.CLEAR_TRANSCRIPTION
      ),
      onSendChunk: createEventHandler(PROCESSING_EVENTS.SEND_CHUNK),
      toogleNeuralRecording: createEventHandler(
        PROCESSING_EVENTS.TOOGLE_RECORDING
      ),
    };
  }

  /**
   * Create Audio Processing service methods
   */
  private createAudioProcessor() {
    return {
      sendAudioChunk: async (chunk: Uint8Array) => {
        return this.errorHandler.wrapAsync(
          async () => {
            const result = await ipcRenderer.invoke(
              PROCESSING_EVENTS.SEND_CHUNK,
              chunk
            );
            return result;
          },
          {
            component: "AudioProcessor",
            operation: "sendChunk",
            severity: "low",
          }
        );
      },

      sendAudioTranscription: (text: string) => {
        this.errorHandler.wrapSync(
          () => {
            ipcRenderer.send(PROCESSING_EVENTS.REALTIME_TRANSCRIPTION, text);
          },
          {
            component: "AudioProcessor",
            operation: "sendTranscription",
            severity: "low",
          }
        );
      },
    };
  }

  /**
   * Create Environment Management service methods
   */
  /**
   * Create vLLM Manager service methods
   */
  private createVllmManager() {
    return {
      vllmStartModel: async (modelId: string) => {
        return this.errorHandler.wrapAsync(
          () => ipcRenderer.invoke("vllm-start-model", modelId),
          {
            component: "VllmManager",
            operation: "startModel",
            severity: "medium",
          }
        );
      },
      vllmModelStatus: async () => {
        return this.errorHandler.wrapAsync(
          () => ipcRenderer.invoke("vllm-model-status"),
          {
            component: "VllmManager",
            operation: "modelStatus",
            severity: "low",
          }
        );
      },
      vllmGenerate: async (payload: any) => {
        return this.errorHandler.wrapAsync(
          () => ipcRenderer.invoke("vllm-generate", payload),
          {
            component: "VllmManager",
            operation: "generate",
            severity: "medium",
          }
        );
      },
      vllmHardwareInfo: async () => {
        return this.errorHandler.wrapAsync(
          () => ipcRenderer.invoke("vllm-hardware-info"),
          {
            component: "VllmManager",
            operation: "hardwareInfo",
            severity: "low",
          }
        );
      },
      vllmListLibrary: async () => {
        return this.errorHandler.wrapAsync(
          () => ipcRenderer.invoke("vllm-list-library"),
          {
            component: "VllmManager",
            operation: "listLibrary",
            severity: "low",
          }
        );
      },
      vllmRefreshLibrary: async () => {
        return this.errorHandler.wrapAsync(
          () => ipcRenderer.invoke("vllm-refresh-library"),
          {
            component: "VllmManager",
            operation: "refreshLibrary",
            severity: "low",
          }
        );
      },
      vllmDownloadModel: async (modelId: string) => {
        return this.errorHandler.wrapAsync(
          () => ipcRenderer.invoke("vllm-download-model", modelId),
          {
            component: "VllmManager",
            operation: "downloadModel",
            severity: "medium",
          }
        );
      },
      vllmStopModel: async () => {
        return this.errorHandler.wrapAsync(
          () => ipcRenderer.invoke("vllm-stop-model"),
          { component: "VllmManager", operation: "stopModel", severity: "low" }
        );
      },
      vllmTestConnection: async () => {
        return this.errorHandler.wrapAsync(
          () => ipcRenderer.invoke("vllm-test-connection"),
          {
            component: "VllmManager",
            operation: "testConnection",
            severity: "low",
          }
        );
      },
    };
  }

  /**
   * Create Ollama Manager service methods
   */
  private createOllamaManager() {
    return {
      listModels: async () => {
        return this.errorHandler.wrapAsync(
          () => ipcRenderer.invoke("ollama-list-models"),
          {
            component: "OllamaManager",
            operation: "listModels",
            severity: "low",
          }
        );
      },

      getAvailableModels: async () => {
        return this.errorHandler.wrapAsync(
          () => ipcRenderer.invoke("ollama-get-available-models"),
          {
            component: "OllamaManager",
            operation: "getAvailableModels",
            severity: "low",
          }
        );
      },

      downloadModel: async (
        modelId: string,
        onProgress?: (progress: number, speed: string, eta: string) => void
      ) => {
        return this.errorHandler.wrapAsync(
          async () => {
            if (onProgress) {
              const progressListener = (
                _event: Electron.IpcRendererEvent,
                data: { progress: number; speed: string; eta: string }
              ) => {
                try {
                  onProgress(data.progress, data.speed, data.eta);
                } catch (error) {
                  this.logger.error(
                    "Error processing Ollama download progress",
                    error
                  );
                }
              };

              ipcRenderer.on("ollama-download-progress", progressListener);

              try {
                const result = await ipcRenderer.invoke(
                  "ollama-download-model",
                  modelId
                );
                ipcRenderer.removeListener(
                  "ollama-download-progress",
                  progressListener
                );
                return result;
              } catch (error) {
                ipcRenderer.removeListener(
                  "ollama-download-progress",
                  progressListener
                );
                throw error;
              }
            } else {
              return await ipcRenderer.invoke("ollama-download-model", modelId);
            }
          },
          {
            component: "OllamaManager",
            operation: "downloadModel",
            severity: "medium",
          }
        );
      },

      cancelDownload: async (modelId: string) => {
        return this.errorHandler.wrapAsync(
          () => ipcRenderer.invoke("ollama-cancel-download", modelId),
          {
            component: "OllamaManager",
            operation: "cancelDownload",
            severity: "low",
          }
        );
      },

      removeModel: async (modelId: string) => {
        return this.errorHandler.wrapAsync(
          () => ipcRenderer.invoke("ollama-remove-model", modelId),
          {
            component: "OllamaManager",
            operation: "removeModel",
            severity: "medium",
          }
        );
      },

      testConnection: async () => {
        return this.errorHandler.wrapAsync(
          () => ipcRenderer.invoke("ollama-test-connection"),
          {
            component: "OllamaManager",
            operation: "testConnection",
            severity: "low",
          }
        );
      },
    };
  }

  private createEnvironmentManager() {
    return {
      getEnv: async (key: string) => {
        return this.errorHandler.wrapAsync(
          async () => {
            return await ipcRenderer.invoke("get-env", key);
          },
          {
            component: "EnvironmentManager",
            operation: "getEnv",
            severity: "low",
          }
        );
      },
      getPath: async (name: "userData" | "temp" | "desktop" | "documents") => {
        return this.errorHandler.wrapAsync(
          async () => {
            return await ipcRenderer.invoke("get-path", name);
          },
          {
            component: "EnvironmentManager",
            operation: "getPath",
            severity: "low",
          }
        );
      },
      requestMicrophonePermission: async () => {
        return this.errorHandler.wrapAsync(
          async () => {
            return await ipcRenderer.invoke("request-microphone-permission");
          },
          {
            component: "EnvironmentManager",
            operation: "requestMicrophonePermission",
            severity: "medium",
          }
        );
      },
    };
  }

  /**
   * Create Communication Management service methods
   */
  private createCommunicationManager() {
    return {
      sendPromptUpdate: (
        type: "partial" | "complete" | "error",
        content: string
      ) => {
        this.errorHandler.wrapSync(
          () => {
            switch (type) {
              case "partial":
                ipcRenderer.send(
                  PROCESSING_EVENTS.PROMPT_PARTIAL_RESPONSE,
                  content
                );
                break;
              case "complete":
                ipcRenderer.send(PROCESSING_EVENTS.PROMPT_SUCCESS, content);
                break;
              case "error":
                ipcRenderer.send(PROCESSING_EVENTS.PROMPT_ERROR, content);
                break;
            }
          },
          {
            component: "CommunicationManager",
            operation: "sendPromptUpdate",
            severity: "low",
          }
        );
      },
    };
  }

  /**
   * Create Import Management service methods
   */
  private createImportManager() {
    return {
      importChatHistory: async ({
        fileBuffer,
        mode,
        user,
        applicationMode,
        onProgress,
      }: {
        fileBuffer: Buffer | ArrayBuffer | Uint8Array;
        mode: string;
        user: string;
        applicationMode?: string;
        onProgress?: (data: {
          processed: number;
          total: number;
          percentage?: number;
          stage?: string;
        }) => void;
      }) => {
        return this.errorHandler.wrapAsync(
          async () => {
            this.logger.info(
              `Starting ChatGPT import: mode=${mode}, user=${user}, applicationMode=${applicationMode}`
            );

            if (onProgress) {
              const progressListener = (
                _event: Electron.IpcRendererEvent,
                data: any
              ) => {
                try {
                  const percent =
                    data.percentage ??
                    Math.floor(
                      (data.processed / Math.max(1, data.total)) * 100
                    );
                  document.title = `Import: ${percent}%`;
                  onProgress(data);
                  document.dispatchEvent(
                    new CustomEvent("import-progress-event", { detail: data })
                  );
                } catch (error) {
                  this.logger.error("Error processing progress event", error);
                }
              };

              ipcRenderer.on("import-progress", progressListener);

              try {
                const result = await ipcRenderer.invoke(
                  "import-chatgpt-history",
                  { fileBuffer, mode, user, applicationMode }
                );
                ipcRenderer.removeListener("import-progress", progressListener);
                return result;
              } catch (error) {
                ipcRenderer.removeListener("import-progress", progressListener);
                throw error;
              }
            } else {
              return await ipcRenderer.invoke("import-chatgpt-history", {
                fileBuffer,
                mode,
                user,
                applicationMode,
              });
            }
          },
          {
            component: "ImportManager",
            operation: "importChatHistory",
            severity: "medium",
          }
        );
      },
    };
  }

  /**
   * Create Legacy Vector Database API for backward compatibility
   */
  private createLegacyVectorDatabaseAPI() {
    return {
      // Pinecone Legacy Support - redirected to DuckDB
      queryPinecone: async (
        embedding: number[],
        topK = 5,
        keywords: string[] = [],
        filters = {}
      ) => {
        return this.errorHandler.wrapAsync(
          async () => {
            return await ipcRenderer.invoke(
              "query-duckdb",
              embedding,
              topK,
              keywords,
              filters
            );
          },
          {
            component: "LegacyVectorDB",
            operation: "queryPinecone",
            severity: "medium",
          }
        );
      },

      saveToPinecone: async (
        vectors: Array<{
          id: string;
          values: number[];
          metadata: Record<string, unknown>;
        }>
      ) => {
        return this.errorHandler.wrapAsync(
          async () => {
            this.logger.warn(
              "⚠️ saveToPinecone is deprecated, using DuckDB instead"
            );
            // Redirect to DuckDB instead of calling removed Pinecone handler
            return await ipcRenderer.invoke("save-duckdb", vectors);
          },
          {
            component: "LegacyVectorDB",
            operation: "saveToPinecone",
            severity: "medium",
          }
        );
      },

      // DuckDB Legacy Support (IPC mode)
      queryDuckDB: async (
        embedding: number[],
        limit = 5,
        keywords: string[] = [],
        filters = {},
        threshold?: number
      ) => {
        try {
          return await ipcRenderer.invoke(
            "query-duckdb",
            embedding,
            limit,
            keywords,
            filters,
            threshold
          );
        } catch (error) {
          this.logger.error("DuckDB query failed", {
            error,
            operation: "queryDuckDB",
          });
          return { matches: [] };
        }
      },

      saveDuckDB: async (
        vectors: Array<{
          id: string;
          values: number[];
          metadata: Record<string, unknown>;
        }>
      ) => {
        try {
          return await ipcRenderer.invoke("save-duckdb", vectors);
        } catch (error) {
          this.logger.error("DuckDB save failed", {
            error,
            operation: "saveDuckDB",
          });
          return { success: false, error: String(error) };
        }
      },

      // New DuckDB test functions
      testDuckDB: async () => {
        try {
          this.logger.info("🧪 Running DuckDB test...");
          return await ipcRenderer.invoke("test-duckdb");
        } catch (error) {
          this.logger.error("DuckDB test failed", {
            error,
            operation: "testDuckDB",
          });
          return { success: false, error: String(error) };
        }
      },

      getDuckDBInfo: async () => {
        try {
          return await ipcRenderer.invoke("get-duckdb-info");
        } catch (error) {
          this.logger.error("Get DuckDB info failed", {
            error,
            operation: "getDuckDBInfo",
          });
          return { success: false, error: String(error) };
        }
      },

      clearDuckDB: async () => {
        try {
          this.logger.info("🗑️ Clearing DuckDB...");
          return await ipcRenderer.invoke("clear-duckdb");
        } catch (error) {
          this.logger.error("Clear DuckDB failed", {
            error,
            operation: "clearDuckDB",
          });
          return { success: false, error: String(error) };
        }
      },

      // Directory selection for DuckDB path
      selectDirectory: async () => {
        try {
          this.logger.info("📁 Opening directory selection dialog...");
          return await ipcRenderer.invoke("select-directory");
        } catch (error) {
          this.logger.error("Directory selection failed", {
            error,
            operation: "selectDirectory",
          });
          return { success: false, error: String(error) };
        }
      },

      // Reinitialize DuckDB with new path
      reinitializeDuckDB: async (newPath: string) => {
        try {
          this.logger.info(`🔄 Reinitializing DuckDB with path: ${newPath}`);
          return await ipcRenderer.invoke("reinitialize-duckdb", newPath);
        } catch (error) {
          this.logger.error("DuckDB reinitialization failed", {
            error,
            operation: "reinitializeDuckDB",
          });
          return { success: false, error: String(error) };
        }
      },

      // Legacy alias for backward compatibility
      saveToDuckDB: async (
        vectors: Array<{
          id: string;
          values: number[];
          metadata: Record<string, unknown>;
        }>
      ) => {
        try {
          return await ipcRenderer.invoke("save-duckdb", vectors);
        } catch (error) {
          this.logger.error("DuckDB save failed", {
            error,
            operation: "saveToDuckDB",
          });
          return { success: false, error: String(error) };
        }
      },
    };
  }
}
