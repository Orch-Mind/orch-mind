// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * EventHandler manages event registration and handling for the Deepgram connection.
 */
import { ListenLiveClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import { LiveTranscriptionProcessor } from '../transcription/LiveTranscriptionProcessor';
import { TranscriptionEventCallback } from '../utils/DeepgramTypes';
import { Logger } from '../utils/Logger';
import { ConnectionManager } from './ConnectionManager';

export class EventHandler {
  private logger: Logger;
  private transcriptionProcessor: LiveTranscriptionProcessor;
  private connectionManager: ConnectionManager;
  private transcriptionCallback: TranscriptionEventCallback | null = null;
  
  constructor(
    transcriptionProcessor: LiveTranscriptionProcessor,
    connectionManager: ConnectionManager
  ) {
    this.logger = new Logger('EventHandler');
    this.transcriptionProcessor = transcriptionProcessor;
    this.connectionManager = connectionManager;
  }
  
  /**
   * Register a callback to receive transcription events
   */
  public registerTranscriptionCallback(callback: TranscriptionEventCallback): void {
    this.transcriptionCallback = callback;
    this.transcriptionProcessor.registerTranscriptionCallback(callback);
    this.logger.info("Callback de transcrição registrado");
  }
  
  /**
   * Register event handlers for the connection
   */
  public registerEventHandlers(connection: ListenLiveClient): void {
    // Usar a API correta de eventos do Deepgram
    connection.on(LiveTranscriptionEvents.Open, () => 
      this.connectionManager.handleOpenEvent(connection));
      
    connection.on(LiveTranscriptionEvents.Close, () => 
      this.connectionManager.handleCloseEvent());
      
    connection.on(LiveTranscriptionEvents.Error, (err) => 
      this.connectionManager.handleErrorEvent(err));
    
    // Handler para eventos de transcrição
    connection.on(LiveTranscriptionEvents.Transcript, (data) => {
      try {
        if (data) {
          this.logger.debug("Transcrição recebida");
          this.connectionManager.resetReconnectCounter();
          
          // Processar a transcrição de acordo com o formato
          this.transcriptionProcessor.handleTranscriptionEvent(data);
        } else {
          console.log("❌ [COGNITIVE-DEBUG] Transcription event without data for brain input");
        }
      } catch (error) {
        this.logger.error("Erro ao processar transcrição", error);
        console.log("❌ [COGNITIVE-DEBUG] Exception processing transcription for cognitive memory:", error);
      }
      
      // Tentar enviar keepAlive se necessário através do connection atual
      if (connection && connection.getReadyState() === 1) {
        try {
          connection.keepAlive();
        } catch (err) {
          console.log("⚠️ [COGNITIVE-PROCESS] Error sending KeepAlive for brain connection:", err);
        }
      }
    });
    
    // Handler para metadados
    connection.on(LiveTranscriptionEvents.Metadata, (data) => {
      console.log("🔍 [COGNITIVE-DEBUG] Metadata received for cognitive memory:", JSON.stringify(data, null, 2));
      this.logger.debug("Metadados recebidos", data);
      if (this.transcriptionCallback) {
        this.transcriptionCallback("metadata", data);
      }
    });
  }
}
