// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// DeepgramContextProvider.tsx
// Component that manages the Deepgram context

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { ModeService, OrchOSModeEnum } from "../../../services/ModeService";
import { getOption, STORAGE_KEYS } from "../../../services/StorageService";
import { useAudioAnalyzer } from "../audioAnalyzer/AudioAnalyzerProvider";
import { AudioContextService } from "../microphone/AudioContextService";
import { useSettings } from "../settings/SettingsProvider";
import { DeepgramConnectionService } from "./DeepgramConnectionService";
import {
  DeepgramState,
  IDeepgramContext,
} from "./interfaces/deepgram/IDeepgramContext";
import {
  ConnectionState,
  IDeepgramConnectionService,
} from "./interfaces/deepgram/IDeepgramService";
import { IOpenAIService } from "./interfaces/openai/IOpenAIService";
import { DeepgramTranscriptionService } from "./services/DeepgramTranscriptionService";
import { HuggingFaceCompletionService } from "./services/huggingface/HuggingFaceCompletionService";
import { HuggingFaceServiceFacade } from "./services/huggingface/HuggingFaceServiceFacade";
import { HuggingFaceClientService } from "./services/huggingface/neural/HuggingFaceClientService";
import { OllamaServiceFacade } from "./services/ollama/OllamaServiceFacade";
// Import all custom hooks from index
import {
  useDeepgramDebug,
  useTranscriptionData,
  useTranscriptionProcessor,
} from "./hooks";

// Initial state
const initialState = {
  deepgramState: DeepgramState.NotConnected,
  isConnected: false,
  isProcessing: false,
  language: getOption(STORAGE_KEYS.DEEPGRAM_LANGUAGE) || "pt-BR",
  model: getOption(STORAGE_KEYS.DEEPGRAM_MODEL) || "nova-2",
};

// Reducer actions
type DeepgramAction =
  | { type: "SET_STATE"; payload: DeepgramState }
  | { type: "SET_CONNECTED"; payload: boolean }
  | { type: "SET_PROCESSING"; payload: boolean }
  | { type: "SET_LANGUAGE"; payload: string }
  | { type: "SET_MODEL"; payload: string }
  | { type: "RESET_STATE" };

// Reducer to manage Deepgram state
function deepgramReducer(
  state: typeof initialState,
  action: DeepgramAction
): typeof initialState {
  switch (action.type) {
    case "SET_STATE":
      return { ...state, deepgramState: action.payload };
    case "SET_CONNECTED":
      return { ...state, isConnected: action.payload };
    case "SET_PROCESSING":
      return { ...state, isProcessing: action.payload };
    case "SET_LANGUAGE":
      return { ...state, language: action.payload };
    case "SET_MODEL":
      return { ...state, model: action.payload };
    case "RESET_STATE":
      return { ...initialState };
    default:
      return state;
  }
}

// Context creation
export const DeepgramContext = createContext<IDeepgramContext | null>(null);

// Custom hook for context usage
export const useDeepgram = () => {
  const context = useContext(DeepgramContext);
  if (!context) {
    throw new Error("useDeepgram must be used within DeepgramProvider");
  }
  return context;
};

/**
 * Creates the appropriate AI service based on application mode
 * Following KISS principle - Keep It Simple
 */
function createAIService(): IOpenAIService {
  const mode = ModeService.getMode();

  if (mode === OrchOSModeEnum.BASIC) {
    console.log("🧠 Using HuggingFaceServiceFacade (Basic mode)");
    const clientService = new HuggingFaceClientService();
    const completionService = new HuggingFaceCompletionService(clientService);
    return new HuggingFaceServiceFacade(completionService);
  } else {
    console.log("🦙 Using OllamaServiceFacade (Advanced mode)");
    return new OllamaServiceFacade();
  }
}

// Context provider
export const DeepgramProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // State management
  const [state, dispatch] = useReducer(deepgramReducer, initialState);
  const [connection, setConnection] = useState<any | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.CLOSED
  );

  // Services and settings
  const { settings } = useSettings();
  const analyzer = useAudioAnalyzer();
  const deepgramConnectionRef = useRef<IDeepgramConnectionService | null>(null);
  const deepgramTranscriptionRef = useRef<DeepgramTranscriptionService | null>(
    null
  );

  // Global processing ref for synchronous blocking
  const isProcessingRef = useRef<boolean>(false);

  // Use custom hooks - Following SOLID principles
  const { debugDatabase, testDatabaseDiagnosis, testEmbeddingModel } =
    useDeepgramDebug();

  const {
    transcriptionData,
    interimResults,
    diarizationData,
    handleTranscriptionData,
    handleInterimUpdate,
    clearTranscriptionData,
  } = useTranscriptionData(deepgramTranscriptionRef);

  const {
    sendTranscriptionPrompt,
    sendDirectMessage,
    flushTranscriptionsToUI,
    setAutoQuestionDetection,
  } = useTranscriptionProcessor(
    deepgramTranscriptionRef.current,
    state.isProcessing,
    dispatch,
    isProcessingRef // Pass the global ref
  );

  // Service references
  const services = useRef({
    audioContext: new AudioContextService(),
    deepgramConnection: null as DeepgramConnectionService | null,
  });

  // Initialize services - Following DRY principle
  useEffect(() => {
    const initializeServices = async () => {
      // Setup audio context
      services.current.audioContext.setupAudioContext();

      // Create AI service based on mode
      const aiService = createAIService();

      // Create transcription service with UI updater callback
      const transcriptionService = new DeepgramTranscriptionService(
        (updater: any) => {
          if (updater.transcription !== undefined) {
            handleTranscriptionData(updater.transcription);
          }
          if (updater.interim !== undefined) {
            handleInterimUpdate(updater.interim);
          }
        },
        aiService
      );

      // Get storage service for integration
      const storageService =
        transcriptionService.getStorageServiceForIntegration();
      console.log(
        "💾 Storage service obtained:",
        storageService ? "OK" : "NULL"
      );

      // Initialize connection service
      services.current.deepgramConnection = new DeepgramConnectionService(
        setConnectionState,
        setConnection,
        analyzer,
        storageService
      );

      // Store references
      deepgramTranscriptionRef.current = transcriptionService;
      deepgramConnectionRef.current = services.current.deepgramConnection;

      // Register transcription callback
      services.current.deepgramConnection.registerTranscriptionCallback(
        (event: string, data: any) => {
          if (event === "transcript") {
            handleTranscriptionData(data);
            if (data?.text && deepgramTranscriptionRef.current) {
              deepgramTranscriptionRef.current.addTranscription(data.text);
              console.log(`📝 Transcription sent to service: "${data.text}"`);
            }
          } else if (event === "metadata") {
            console.log("Metadata received:", data);
          }
        }
      );

      // Configure initial preferences
      if (settings.deepgramModel) {
        transcriptionService.setModel(settings.deepgramModel);
      }
      transcriptionService.toggleInterimResults(settings.showInterimResults);
    };

    initializeServices();

    // Cleanup on unmount
    return () => {
      if (services.current.deepgramConnection) {
        services.current.deepgramConnection.cleanup();
      }
      if (deepgramTranscriptionRef.current) {
        deepgramTranscriptionRef.current.reset();
      }
      services.current.audioContext.closeAudioContext();
    };
  }, [
    analyzer,
    settings.deepgramModel,
    settings.showInterimResults,
    handleTranscriptionData,
    handleInterimUpdate,
  ]);

  // Configure IPC event receiver
  useEffect(() => {
    if (typeof window !== "undefined" && window.electronAPI) {
      const removeListener = window.electronAPI.onSendChunk(() => {
        // Intentionally empty - DeepgramConnectionService handles this directly
      });
      return () => removeListener();
    }
  }, []);

  // Update preferences when settings change
  useEffect(() => {
    if (deepgramTranscriptionRef.current) {
      if (settings.deepgramModel) {
        deepgramTranscriptionRef.current.setModel(settings.deepgramModel);
      }
      deepgramTranscriptionRef.current.toggleInterimResults(
        settings.showInterimResults
      );
    }
  }, [settings.deepgramModel, settings.showInterimResults]);

  // Connection management functions
  const connectToDeepgram = useCallback(async () => {
    try {
      if (
        state.deepgramState === DeepgramState.Connected ||
        state.deepgramState === DeepgramState.Connecting
      ) {
        console.log("🔍 Connection already active or in progress");
        return state.isConnected;
      }

      const { deepgramConnection } = services.current;
      if (!deepgramConnection) return false;

      dispatch({ type: "SET_STATE", payload: DeepgramState.Connecting });
      await deepgramConnection.connectToDeepgram(state.language);

      const connected = await deepgramConnection.hasActiveConnection();

      if (connected) {
        dispatch({ type: "SET_STATE", payload: DeepgramState.Connected });
        dispatch({ type: "SET_CONNECTED", payload: true });
      } else {
        dispatch({ type: "SET_STATE", payload: DeepgramState.Error });
        dispatch({ type: "SET_CONNECTED", payload: false });
      }

      return connected;
    } catch (error) {
      console.error("❌ Error connecting to Deepgram:", error);
      dispatch({ type: "SET_STATE", payload: DeepgramState.Error });
      dispatch({ type: "SET_CONNECTED", payload: false });
      return false;
    }
  }, [state.deepgramState, state.isConnected, state.language]);

  const disconnectFromDeepgram = useCallback(async () => {
    try {
      if (
        state.deepgramState === DeepgramState.NotConnected ||
        state.deepgramState === DeepgramState.Disconnecting
      ) {
        console.log("🔍 Connection already inactive or disconnecting");
        return;
      }

      const { deepgramConnection } = services.current;
      if (!deepgramConnection) return;

      dispatch({ type: "SET_STATE", payload: DeepgramState.Disconnecting });
      await deepgramConnection.disconnectFromDeepgram();

      dispatch({ type: "SET_STATE", payload: DeepgramState.NotConnected });
      dispatch({ type: "SET_CONNECTED", payload: false });
    } catch (error) {
      console.error("❌ Error disconnecting from Deepgram:", error);
    }
  }, [state.deepgramState]);

  // Utility functions
  const sendAudioChunk = useCallback(async (chunk: Blob | Uint8Array) => {
    return services.current.deepgramConnection?.sendAudioChunk(chunk) || false;
  }, []);

  const stopProcessing = useCallback(() => {
    dispatch({ type: "SET_PROCESSING", payload: false });
  }, []);

  const setLanguage = useCallback((language: string) => {
    dispatch({ type: "SET_LANGUAGE", payload: language });
  }, []);

  const setModel = useCallback((model: string) => {
    dispatch({ type: "SET_MODEL", payload: model });
  }, []);

  const resetState = useCallback(() => {
    dispatch({ type: "RESET_STATE" });
  }, []);

  // Export service instances for UI/integration
  const getServiceInstances = () => {
    let transcriptionServiceInstance: any = undefined;
    let memoryServiceInstance: any = undefined;

    if (
      deepgramTranscriptionRef.current instanceof DeepgramTranscriptionService
    ) {
      transcriptionServiceInstance = (deepgramTranscriptionRef.current as any)[
        "storageService"
      ];
      const memoryService = (deepgramTranscriptionRef.current as any)[
        "memoryService"
      ];
      if (memoryService?.persistenceService) {
        memoryServiceInstance = memoryService["persistenceService"];
      }
    }

    return { transcriptionServiceInstance, memoryServiceInstance };
  };

  const { transcriptionServiceInstance, memoryServiceInstance } =
    getServiceInstances();

  // Context value - Following Interface Segregation Principle
  const contextValue: IDeepgramContext = {
    // Connection state
    connection,
    connectionState,
    isConnected: state.isConnected,
    deepgramState: state.deepgramState,

    // Transcription data
    transcriptionList: transcriptionData,

    // Processing state
    isProcessing: state.isProcessing,

    // Language and model
    language: state.language,
    model: state.model,

    // Connection management
    connectToDeepgram,
    disconnectFromDeepgram,
    sendAudioChunk,
    hasActiveConnection: () =>
      deepgramConnectionRef.current?.hasActiveConnection() || false,
    getConnectionStatus: () =>
      deepgramConnectionRef.current?.getConnectionStatus() || {
        state: ConnectionState.CLOSED,
        active: false,
      },
    waitForConnectionState: (targetState, timeoutMs) =>
      deepgramConnectionRef.current?.waitForConnectionState(
        targetState,
        timeoutMs
      ) || Promise.resolve(false),

    // Transcription processing
    sendTranscriptionPrompt,
    sendDirectMessage,
    flushTranscriptionsToUI,
    setAutoQuestionDetection,
    clearTranscriptionData,

    // Get all transcriptions with status
    getAllTranscriptionsWithStatus: () => {
      if (transcriptionServiceInstance?.getAllTranscriptionsWithStatus) {
        return transcriptionServiceInstance.getAllTranscriptionsWithStatus();
      }
      return [];
    },

    // State management
    stopProcessing,
    setLanguage,
    setModel,
    resetState,

    // Service instances
    transcriptionService: transcriptionServiceInstance,
    memoryService: memoryServiceInstance,

    // Debug functions (only in development)
    debugDatabase,
    testDatabaseDiagnosis,
    testEmbeddingModel,
  };

  return (
    <DeepgramContext.Provider value={contextValue}>
      {children}
    </DeepgramContext.Provider>
  );
};

export default DeepgramProvider;
