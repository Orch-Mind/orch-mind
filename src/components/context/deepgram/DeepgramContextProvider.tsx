// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// DeepgramContextProvider.tsx
// Component that manages the Deepgram context

import React, { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState } from 'react';
import { getOption, STORAGE_KEYS } from '../../../services/StorageService';
import { useAudioAnalyzer } from '../audioAnalyzer/AudioAnalyzerProvider';
import { AudioContextService } from '../microphone/AudioContextService';
import { useSettings } from '../settings/SettingsProvider';
import { DeepgramConnectionService } from './DeepgramConnectionService';
import { DeepgramState, IDeepgramContext } from './interfaces/deepgram/IDeepgramContext';
import { ConnectionState, IDeepgramConnectionService } from './interfaces/deepgram/IDeepgramService';
import { DeepgramTranscriptionService } from './services/DeepgramTranscriptionService';

// Initial state - obter idioma do storage
const initialState = {
  deepgramState: DeepgramState.NotConnected,
  isConnected: false,
  isProcessing: false,
  language: getOption(STORAGE_KEYS.DEEPGRAM_LANGUAGE) || 'pt-BR',
  model: getOption(STORAGE_KEYS.DEEPGRAM_MODEL) || 'nova-2'
};

// Reducer actions
type DeepgramAction = 
  | { type: 'SET_STATE', payload: DeepgramState }
  | { type: 'SET_CONNECTED', payload: boolean }
  | { type: 'SET_PROCESSING', payload: boolean }
  | { type: 'SET_LANGUAGE', payload: string }
  | { type: 'SET_MODEL', payload: string }
  | { type: 'RESET_STATE' };

// Reducer to manage Deepgram state
function deepgramReducer(state: typeof initialState, action: DeepgramAction): typeof initialState {
  switch (action.type) {
    case 'SET_STATE':
      return { ...state, deepgramState: action.payload };
    case 'SET_CONNECTED':
      return { ...state, isConnected: action.payload };
    case 'SET_PROCESSING':
      return { ...state, isProcessing: action.payload };
    case 'SET_LANGUAGE':
      return { ...state, language: action.payload };
    case 'SET_MODEL':
      return { ...state, model: action.payload };
    case 'RESET_STATE':
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
    throw new Error('useDeepgram must be used within DeepgramProvider');
  }
  return context;
};

// Context provider
export const DeepgramProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State
  const [state, dispatch] = useReducer(deepgramReducer, initialState);
  
  // States to manage connection and data
  const [deepgramConnection, setDeepgramConnection] = useState<IDeepgramConnectionService | null>(null);
  const [connection, setConnection] = useState<any | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.CLOSED);
  const [transcriptionData, setTranscriptionData] = useState<any>([]);
  const [interimResults, setInterimResults] = useState<any>({});
  const [diarizationData, setDiarizationData] = useState<any>({});
  const { settings } = useSettings();
  
  // Services
  const analyzer = useAudioAnalyzer();
  const deepgramConnectionRef = useRef<IDeepgramConnectionService | null>(null);
  const deepgramTranscriptionRef = useRef<any>(null);
  
  // References to services
  // Important: We create a dedicated AudioContextService for Deepgram
  // that is completely independent of the one used in MicrophoneContextProvider
  const services = useRef({
    audioContext: new AudioContextService(), // AudioContext dedicated for Deepgram
    deepgramConnection: null as DeepgramConnectionService | null
  });
  
  // Initialize services
  useEffect(() => {
    // Initialize dedicated AudioContext for Deepgram
    services.current.audioContext.setupAudioContext();
    
    // Initialize Deepgram connection service
    const transcriptionService = new DeepgramTranscriptionService(
      (updater: any) => {
        // This callback will be used by the service to update the state in the UI
        if (updater.transcription !== undefined) {
          handleTranscriptionData(updater.transcription);
        }
        if (updater.interim !== undefined) {
          handleInterimUpdate(updater.interim);
        }
      }
    );
    
    // Get explicitly the storage service for injection into the connection service
    const storageService = transcriptionService.getStorageServiceForIntegration();
    console.log("💾 Storage service obtained:", storageService ? "OK" : "NULL");
    
    // Initialize Deepgram connection service, passing the storage
    services.current.deepgramConnection = new DeepgramConnectionService(
      setConnectionState,
      setConnection,
      analyzer,
      storageService // CRITICAL: Passing the TranscriptionStorageService for integration with LiveTranscriptionProcessor
    );
    
    // Store reference to transcription service for global access
    deepgramTranscriptionRef.current = transcriptionService;
    
    // Register callback for transcription events
    services.current.deepgramConnection?.registerTranscriptionCallback((event: string, data: any) => {
      if (event === 'transcript') {
        handleTranscriptionData(data);
        
        // Add transcription directly to the service as well
        if (data && data.text && deepgramTranscriptionRef.current) {
          deepgramTranscriptionRef.current.addTranscription(data.text);
          console.log(`📝 Transcription directly "${data.text}" sent to DeepgramTranscriptionService`);
        }
      } else if (event === 'metadata') {
        // Process metadata if necessary
        console.log("Metadados recebidos:", data);
      }
    });
    
    // Configure initial preferences
    if (settings.deepgramModel) {
      transcriptionService.setModel(settings.deepgramModel);
    }
    
    transcriptionService.toggleInterimResults(settings.showInterimResults);
    
    // Store services in refs for access in callbacks
    deepgramConnectionRef.current = services.current.deepgramConnection;
    deepgramTranscriptionRef.current = transcriptionService;
    
    // Export connection service to context
    setDeepgramConnection(services.current.deepgramConnection);
    
    // Cleanup on unmount
    return () => {
      if (services.current.deepgramConnection) {
        services.current.deepgramConnection.cleanup();
      }
      
      if (deepgramTranscriptionRef.current) {
        deepgramTranscriptionRef.current.reset();
      }
      
      // Close dedicated AudioContext
      services.current.audioContext.closeAudioContext();
    };
  }, [analyzer, settings.deepgramModel, settings.showInterimResults]);
  
  // Configure IPC event receiver for language
  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      // We don't need to process audio chunks here, since the DeepgramConnectionService
      // is already configured to receive these events directly
      const removeListener = window.electronAPI.onSendChunk(() => {
        // Intentionally left empty - the log is causing confusion
        // console.log("IPC chunk received in context, passing to DeepgramConnectionService");
      });
      
      return () => {
        removeListener();
      };
    }
  }, []);
  
  // Update preferences when settings change
  useEffect(() => {
    if (deepgramTranscriptionRef.current) {
      if (settings.deepgramModel) {
        deepgramTranscriptionRef.current.setModel(settings.deepgramModel);
      }
      
      deepgramTranscriptionRef.current.toggleInterimResults(settings.showInterimResults);
    }
  }, [settings.deepgramModel, settings.showInterimResults]);
  
  // Process transcription data
  const handleTranscriptionData = useCallback((data: any) => {
    // Verify if we received a formatted object from our connection service
    if (data && typeof data === 'object' && data.text) {
      // Already have a formatted object with speaker identification
      const processedData = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        text: data.text,
        speaker: data.speaker,
        isFinal: data.isFinal,
        channel: data.channel
      };
      
      // Store final transcription
      if (data.isFinal) {
        // Save to local context
        setTranscriptionData((prev: any) => [...prev, processedData]);
        
        // Important: add the transcription to the DeepgramTranscriptionService
        // so it's available when we send a prompt
        if (deepgramTranscriptionRef.current) {
          deepgramTranscriptionRef.current.addTranscription(data.text);
          console.log(`📝 Transcription "${data.text}" sent to DeepgramTranscriptionService`);
        }
      } else {
        // Interim transcription
        setInterimResults((prev: any) => {
          const key = `${data.channel}-${data.speaker}-${data.text.substring(0, 20)}`;
          return {
            ...prev,
            [key]: processedData
          };
        });
      }
      return;
    }
    
    // Default Deepgram format (previous processing)
    if (!data || !data.channel || !data.channel.alternatives) return;
    
    // Add timestamp and unique id for each transcription
    const processedData = {
      ...data,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };
    
    // Extract diarization information (who is speaking)  
    if (data.channel.alternatives[0].words && data.channel.alternatives[0].words.length > 0) {
      const words = data.channel.alternatives[0].words;
      const speakerMap: Record<string, string> = {};
      
      words.forEach((word: any) => {
        if (word.speaker && word.speaker !== null) {
          speakerMap[word.speaker] = word.speaker;
        }
      });
      
      if (Object.keys(speakerMap).length > 0) {
        setDiarizationData((prev: { speakers: any; }) => ({
          ...prev,
          speakers: { ...prev.speakers, ...speakerMap }
        }));
      }
    }
    
    // Extract transcription text for saving to service
    let transcriptionText = '';
    if (data.channel && data.channel.alternatives && data.channel.alternatives[0]) {
      transcriptionText = data.channel.alternatives[0].transcript || '';
      
      // Important: add the transcription to the DeepgramTranscriptionService
      if (transcriptionText && deepgramTranscriptionRef.current) {
        deepgramTranscriptionRef.current.addTranscription(transcriptionText);
        console.log(`📝 Transcription in Deepgram format "${transcriptionText}" sent to DeepgramTranscriptionService`);
      }
    }
    
    // Store final transcription
    setTranscriptionData((prev: any) => [...prev, processedData]);
    
    // Clear corresponding interim results
    if (processedData.channel && processedData.channel.alternatives) {
      const transcriptKey = processedData.channel.alternatives[0].transcript.trim();
      setInterimResults((prev: any) => {
        const newInterim = { ...prev };
        delete newInterim[transcriptKey];
        return newInterim;
      });
    }
  }, []);
  
  // Update interim results (real-time transcription)
  const handleInterimUpdate = useCallback((interim: any) => {
    if (!interim || !interim.channel || !interim.channel.alternatives) return;
    
    const alt = interim.channel.alternatives[0];
    if (!alt) return;
    
    const transcriptKey = alt.transcript.trim();
    if (!transcriptKey) return;
    
    setInterimResults((prev: any) => ({
      ...prev,
      [transcriptKey]: {
        ...interim,
        id: `interim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString()
      }
    }));
  }, []);
  
  /**
   * Inicia o processamento de transcrição
   * Implementa proteção contra processamentos simultâneos para evitar corrupção nos logs
   */
  const startTranscription = useCallback(async (temporaryContext?: string) => {
    // Verifica se já existe um processamento em andamento
    if (state.isProcessing) {
      console.warn("⚠️ Bloqueando novo prompt: um processamento já está em andamento");
      // Retorna uma promessa rejeitada com mensagem explicativa
      return Promise.reject(new Error("PROCESSING_IN_PROGRESS"));
    }

    try {
      // Verify if the transcription service is available
      if (!deepgramTranscriptionRef.current) {
        console.error("❌ Transcription service not available");
        return;
      }
      
      // Start processing - bloqueia novos processamentos
      dispatch({ type: 'SET_PROCESSING', payload: true });
      
      // Feedback visual/auditivo pode ser adicionado aqui
      console.log("🔄 Iniciando processamento de prompt...");
      
      // Send to the transcription service that implements the complete logic
      await deepgramTranscriptionRef.current.sendTranscriptionPrompt(temporaryContext);
      
      // Update state after successful processing
      dispatch({ type: 'SET_PROCESSING', payload: false });
      console.log("✅ Processamento de prompt concluído");
    } catch (error) {
      console.error("❌ Error processing prompt:", error);
      
      // Ensure state is updated even in case of error
      dispatch({ type: 'SET_PROCESSING', payload: false });
      
      // Propagate the error for handling in the component that called it
      throw error;
    }
  }, [state.isProcessing]); // Adicionamos state.isProcessing como dependência
  
  // Stop transcription
  const stopTranscription = useCallback(async () => {
    if (deepgramTranscriptionRef.current) {
      await deepgramTranscriptionRef.current.stopProcessing();
      await deepgramTranscriptionRef.current.disconnect();
    }
  }, []);
  
  // Clear transcription data
  const clearTranscriptionData = useCallback(() => {
    setTranscriptionData([]);
    setInterimResults({});
  }, []);
  
  // Check if the connection is active
  const isConnected = useCallback(() => {
    return deepgramTranscriptionRef.current?.isConnected() || false;
  }, []);
  
  // Send audio chunk manually (raramente usado, normalmente via IPC)
  const sendAudioChunk = useCallback(async (chunk: Blob | Uint8Array) => {
    if (services.current.deepgramConnection) {
      return services.current.deepgramConnection.sendAudioChunk(chunk);
    }
    return false;
  }, []);
  
  // Connect to Deepgram
  const connectToDeepgram = useCallback(async () => {
    try {
      // Prevent connection attempts if already connected or connecting
      if (state.deepgramState === DeepgramState.Connected || 
          state.deepgramState === DeepgramState.Connecting) {
        console.log("🔍 Conexão já ativa ou em andamento, ignorando nova tentativa");
        return state.isConnected;
      }

      const { deepgramConnection } = services.current;
      if (!deepgramConnection) return false;
      
      // Update state
      dispatch({ type: 'SET_STATE', payload: DeepgramState.Connecting });
      
      // Connect using current settings
      await deepgramConnection.connectToDeepgram(state.language);
      
      // Check if the connection was established
      const connected = await deepgramConnection.hasActiveConnection();
      
      // Update state based on the result
      if (connected) {
        dispatch({ type: 'SET_STATE', payload: DeepgramState.Connected });
        dispatch({ type: 'SET_CONNECTED', payload: true });
      } else {
        dispatch({ type: 'SET_STATE', payload: DeepgramState.Error });
        dispatch({ type: 'SET_CONNECTED', payload: false });
      }
      
      return connected;
    } catch (error) {
      console.error("❌ Erro ao conectar ao Deepgram:", error);
      dispatch({ type: 'SET_STATE', payload: DeepgramState.Error });
      dispatch({ type: 'SET_CONNECTED', payload: false });
      return false;
    }
  }, [state.deepgramState, state.isConnected, state.language]);
  
  // Disconnect from Deepgram
  const disconnectFromDeepgram = useCallback(async () => {
    try {
      // Prevent disconnection attempts if already disconnected or disconnecting
      if (state.deepgramState === DeepgramState.NotConnected || 
          state.deepgramState === DeepgramState.Disconnecting) {
        console.log("🔍 Conexão já inativa ou em desconexão, ignorando nova tentativa");
        return;
      }

      const { deepgramConnection } = services.current;
      if (!deepgramConnection) return;
      
      // Update state
      dispatch({ type: 'SET_STATE', payload: DeepgramState.Disconnecting });
      
      // Disconnect
      await deepgramConnection.disconnectFromDeepgram();
      
      // Update state
      dispatch({ type: 'SET_STATE', payload: DeepgramState.NotConnected });
      dispatch({ type: 'SET_CONNECTED', payload: false });
    } catch (error) {
      console.error("❌ Error disconnecting from Deepgram:", error);
    }
  }, [state.deepgramState]);
  
  // Stop processing
  const stopProcessing = () => {
    try {
      // Update state
      dispatch({ type: 'SET_PROCESSING', payload: false });
    } catch (error) {
      console.error("❌ Error stopping processing:", error);
    }
  };
  
  // Set language
  const setLanguage = (language: string) => {
    dispatch({ type: 'SET_LANGUAGE', payload: language });
  };
  
  // Set model
  const setModel = (model: string) => {
    dispatch({ type: 'SET_MODEL', payload: model });
  };
  
  // Reset state
  const resetState = () => {
    dispatch({ type: 'RESET_STATE' });
  };
  
  // Debug database function
  const debugDatabase = useCallback(async (action: 'count' | 'inspect' | 'debug' | 'diagnose' = 'count', options?: any) => {
    try {
      console.log(`🔍 [DEBUG] Executando ação de debug: ${action}`);
      
      const electronAPI = window.electronAPI as any;
      if (electronAPI?.duckdbCommand) {
        const result = await electronAPI.duckdbCommand(action, options || {});
        console.log(`✅ [DEBUG] Resultado do ${action}:`, result);
        return result;
      } else {
        console.warn("⚠️ [DEBUG] duckdbCommand não disponível no electronAPI");
        return null;
      }
    } catch (error) {
      console.error(`❌ [DEBUG] Erro ao executar ${action}:`, error);
      return null;
    }
  }, []);
  
    // Export real service instances for UI/integration
  let transcriptionServiceInstance: any = undefined;
  let memoryServiceInstance: any = undefined;
  if (deepgramTranscriptionRef.current instanceof DeepgramTranscriptionService) {
    // The storageService is of type TranscriptionStorageService
    transcriptionServiceInstance = (deepgramTranscriptionRef.current as DeepgramTranscriptionService)["storageService"];
    // The memoryService is of type MemoryService, but we want to expose the PineconeMemoryService internal
    const memoryService = (deepgramTranscriptionRef.current as DeepgramTranscriptionService)["memoryService"];
    if (memoryService && typeof memoryService === "object" && "persistenceService" in memoryService) {
      // The persistenceService is the PineconeMemoryService
      memoryServiceInstance = memoryService["persistenceService"];
    }
  }

  // Additional debugging functions for development
  const testDatabaseDiagnosis = useCallback(async () => {
    console.log("🔍 Executando diagnóstico completo do banco de dados...");
    try {
      const diagnosis = await debugDatabase('diagnose');
      if (diagnosis) {
        console.log("📊 DIAGNÓSTICO COMPLETO:", diagnosis);
        console.log("📈 Estatísticas por namespace:", diagnosis.embedding_analysis?.by_namespace);
        console.log("🔧 Info do sistema:", diagnosis.system_info);
        
        // Check for potential issues
        if (diagnosis.system_info?.db_type === 'mock') {
          console.warn("⚠️ ALERTA: Usando banco MOCK - dados não persistem!");
        }
        
        if (diagnosis.embedding_analysis?.by_namespace?.length === 0) {
          console.warn("⚠️ ALERTA: Nenhum embedding encontrado em qualquer namespace!");
        }
        
        return diagnosis;
      }
    } catch (error) {
      console.error("❌ Erro durante diagnóstico:", error);
    }
    return null;
  }, [debugDatabase]);
  
  const testEmbeddingModel = useCallback(async () => {
    console.log("🧪 Testando modelo de embeddings...");
    try {
      // Create a simple test embedding
      const testText = "This is a test sentence for embedding generation.";
      console.log("📝 Texto de teste:", testText);
      
      // You would need to add an embedding generation test here
      // For now, just check if we can save/retrieve a dummy embedding
      const electronAPI = window.electronAPI as any;
      if (electronAPI?.duckdbCommand) {
        const testVector = {
          id: 'test-embedding-' + Date.now(),
          values: Array.from({length: 384}, () => Math.random()),
          metadata: { content: testText, test: true }
        };
        
        console.log("💾 Salvando embedding de teste...");
        const saveResult = await electronAPI.duckdbCommand('save', {
          vectors: [testVector],
          namespace: 'test'
        });
        
        console.log("✅ Resultado do save:", saveResult);
        
        // Now try to retrieve it
        console.log("🔍 Buscando embedding salvo...");
        const queryResult = await electronAPI.duckdbCommand('query', {
          embedding: testVector.values,
          topK: 1,
          namespace: 'test'
        });
        
        console.log("✅ Resultado da busca:", queryResult);
        
        return { saveResult, queryResult };
      }
    } catch (error) {
      console.error("❌ Erro durante teste de embedding:", error);
    }
    return null;
  }, []);

  // Context value
  const contextValue: IDeepgramContext = {
    connection,
    connectionState,
    transcriptionList: transcriptionData,
    sendTranscriptionPrompt: startTranscription,
    isConnected: state.isConnected,
    isProcessing: state.isProcessing,
    waitForConnectionState: (targetState, timeoutMs) => 
      deepgramConnectionRef.current?.waitForConnectionState(targetState, timeoutMs) || Promise.resolve(false),
    getConnectionStatus: () => 
      deepgramConnectionRef.current?.getConnectionStatus() || { state: ConnectionState.CLOSED, active: false },
    hasActiveConnection: () => 
      deepgramConnectionRef.current?.hasActiveConnection() || false,
    deepgramState: state.deepgramState,
    language: state.language,
    model: state.model,
    connectToDeepgram,
    disconnectFromDeepgram,
    sendAudioChunk,
    stopProcessing,
    setLanguage,
    setModel,
    resetState,
    setAutoQuestionDetection: (enabled: boolean) => {
      if (deepgramTranscriptionRef.current) {
        deepgramTranscriptionRef.current.setAutoQuestionDetection(enabled);
      }
    },
    transcriptionService: transcriptionServiceInstance,
    memoryService: memoryServiceInstance,
    debugDatabase,
    testDatabaseDiagnosis,
    testEmbeddingModel
  };
  
  return (
    <DeepgramContext.Provider value={contextValue}>
      {children}
    </DeepgramContext.Provider>
  );
};

export default DeepgramProvider; 