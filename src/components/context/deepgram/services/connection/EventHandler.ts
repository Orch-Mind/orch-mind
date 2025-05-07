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
          // Logs detalhados para debug
          console.log("🔍 [COGNITIVE-DEBUG] Transcription data received for brain processing:", JSON.stringify(data, null, 2));
          
          // Verificar campos específicos
          if (data.channel) {
            console.log("🔍 [COGNITIVE-DEBUG] Transcription via 'channel' for memory input");
            console.log("🔍 [COGNITIVE-DEBUG] channel_index:", data.channel_index);
            console.log("🔍 [COGNITIVE-DEBUG] is_final:", data.is_final);
            
            const alt = data.channel.alternatives && data.channel.alternatives[0];
            if (alt) {
              console.log("🔍 [COGNITIVE-DEBUG] alternatives[0].transcript:", alt.transcript);
              console.log("🔍 [COGNITIVE-DEBUG] alternatives[0].confidence:", alt.confidence);
              
              if (alt.words && alt.words.length > 0) {
                console.log("🔍 [COGNITIVE-DEBUG] Words count:", alt.words.length);
                console.log("🔍 [COGNITIVE-DEBUG] First word:", alt.words[0]);
                console.log("🔍 [COGNITIVE-DEBUG] Last word:", alt.words[alt.words.length - 1]);
              } else {
                console.log("⚠️ [COGNITIVE-DEBUG] No words found in transcription for memory input");
              }
            } else {
              console.log("⚠️ [COGNITIVE-DEBUG] No alternatives available in channel for cognitive processing");
            }
          } else if (data.channels) {
            console.log("🔍 [COGNITIVE-DEBUG] Transcription via 'channels' for multi-stream memory input");
            console.log("🔍 [COGNITIVE-DEBUG] Number of channels:", data.channels.length);
            
            data.channels.forEach((channel: any, index: number) => {
              const alt = channel.alternatives && channel.alternatives[0];
              if (alt) {
                console.log(`🔍 [COGNITIVE-DEBUG] Channel ${index} transcript:`, alt.transcript);
              } else {
                console.log(`⚠️ [COGNITIVE-DEBUG] Channel ${index} has no alternatives for memory input`);
              }
            });
          } else {
            console.log("❌ [COGNITIVE-DEBUG] Unknown data format received in brain input:", Object.keys(data));
          }
          
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
          console.log("💓 [COGNITIVE-PROCESS] KeepAlive sent to maintain brain connection");
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
