// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// DeepgramConnectionService.ts
// Deepgram connection service optimized for robustness and clarity

import { ListenLiveClient } from "@deepgram/sdk";
import { ConnectionState, IAudioAnalyzer, IDeepgramConnectionService } from "./interfaces/deepgram/IDeepgramService";
import { AudioProcessor } from "./services/audio/AudioProcessor";
import { AudioQueue } from "./services/audio/AudioQueue";
import { AudioSender } from "./services/audio/AudioSender";
import { ChunkReceiver } from "./services/audio/ChunkReceiver";
import { ConnectionManager } from "./services/connection/ConnectionManager";
import { EventHandler } from "./services/connection/EventHandler";
import { LiveTranscriptionProcessor } from "./services/transcription/LiveTranscriptionProcessor";
import { TranscriptionEventCallback } from "./services/utils/DeepgramTypes";
import { ITranscriptionStorageService } from './interfaces/transcription/ITranscriptionStorageService';
import { getOption } from '../../../services/StorageService';

export class DeepgramConnectionService implements IDeepgramConnectionService {
  // Core service components
  private connectionManager: ConnectionManager;
  private eventHandler: EventHandler;
  private audioProcessor: AudioProcessor;
  private audioQueue: AudioQueue;
  private audioSender: AudioSender;
  private transcriptionProcessor: LiveTranscriptionProcessor;
  private chunkReceiver: ChunkReceiver;
  
  constructor(
    setConnectionState: (state: ConnectionState) => void,
    setConnection: (connection: ListenLiveClient | null) => void,
    analyzer: IAudioAnalyzer,
    storageService?: ITranscriptionStorageService // Use the interface to avoid direct dependencies
  ) {
    // Initialize all service components
    this.audioProcessor = new AudioProcessor(analyzer);
    this.audioQueue = new AudioQueue();
    this.connectionManager = new ConnectionManager(setConnectionState, setConnection);
    
    // Create transcription processor
    this.transcriptionProcessor = new LiveTranscriptionProcessor();
    
    // Bind TranscriptionStorageService if available
    if (storageService) {
      console.log(`🔄 [COGNITIVE-CORE] Integrating LiveTranscriptionProcessor with ITranscriptionStorageService for brain memory persistence`);
      this.transcriptionProcessor.setTranscriptionStorageService(storageService);
    } else {
      console.log(`⚠️ [COGNITIVE-CORE] Storage service not provided, some memory orchestration features may not function`);
    }
    
    this.eventHandler = new EventHandler(this.transcriptionProcessor, this.connectionManager);
    this.audioSender = new AudioSender(this.audioProcessor, this.audioQueue, this.connectionManager);
    
    // Set up chunk receiver with audio handler
    this.chunkReceiver = new ChunkReceiver(this.handleIncomingAudioChunk.bind(this));
    this.chunkReceiver.setupChunkReceiver();
  }
  
  // PUBLIC API
  
  /**
   * Get the current connection
   */
  getConnection(): ListenLiveClient | null {
    return this.connectionManager.getConnection();
  }
  
  /**
   * Start a connection with Deepgram
   */
  async connectToDeepgram(language?: string): Promise<void> {
    // Sempre obtém o idioma mais atualizado do storage
    const storedLanguage = getOption('deepgramLanguage');
    
    // Prioriza o idioma do storage, e só usa o parâmetro se não houver valor no storage
    const languageToUse = storedLanguage || language || 'pt-BR';
    
    console.log('🌐 DeepgramConnectionService: Conectando com idioma:', languageToUse);
    
    // Start connection process with the correct language
    await this.connectionManager.connectToDeepgram(languageToUse);
    
    // Register event handlers if connection was established
    const connection = this.connectionManager.getConnection();
    if (connection) {
      this.eventHandler.registerEventHandlers(connection);
    }
  }
  
  /**
   * Disconnect from Deepgram
   */
  async disconnectFromDeepgram(): Promise<void> {
    // Clear audio queue before disconnecting
    this.audioQueue.clearQueue();
    
    // Disconnect from Deepgram
    await this.connectionManager.disconnectFromDeepgram();
  }
  
  /**
   * Clean up event listeners and disconnect from Deepgram
   */
  public cleanup(): void {
    // Clean up chunk receiver
    this.chunkReceiver.cleanup();
    
    // Disconnect from Deepgram
    this.disconnectFromDeepgram();
  }
  
  /**
   * Wait until the connection reaches a specific state
   */
  async waitForConnectionState(targetState: ConnectionState, timeoutMs = 15000): Promise<boolean> {
    return this.connectionManager.waitForConnectionState(targetState, timeoutMs);
  }
  
  /**
   * Get the current connection status
   */
  getConnectionStatus() {
    return this.connectionManager.getConnectionStatus();
  }
  
  /**
   * Check if there is an active and ready connection
   */
  hasActiveConnection(): boolean {
    return this.connectionManager.isActiveConnection();
  }
  
  /**
   * Send audio data to Deepgram
   */
  async sendAudioChunk(blob: Blob | Uint8Array): Promise<boolean> {
    const result = await this.audioSender.sendAudioChunk(blob);
    
    // If connection is active and we have queued audio, start processing it
    if (this.connectionManager.isActiveConnection() && this.audioQueue.hasItems() && !this.audioQueue.isProcessing()) {
      setTimeout(() => this.audioSender.processQueuedChunks(), 100);
    }
    
    return result;
  }
  
  /**
   * Register a callback to receive transcription events
   */
  public registerTranscriptionCallback(callback: TranscriptionEventCallback): void {
    this.eventHandler.registerTranscriptionCallback(callback);
  }
  
  /**
   * Process incoming audio chunks via IPC
   */
  private async handleIncomingAudioChunk(arrayBuffer: ArrayBuffer): Promise<void> {
    try {
      // Convert ArrayBuffer to Uint8Array for compatibility
      const audioData = new Uint8Array(arrayBuffer);
      
      if (audioData.byteLength > 0) {
        // Use the existing method to process and send the audio
        await this.sendAudioChunk(audioData);
      }
    } catch (error) {
      console.error(`❌ [Deepgram] Error processing IPC audio chunk:`, error);
    }
  }
  
  /**
   * Force a reconnection to the server
   */
  private async forceReconnect(): Promise<void> {
    await this.connectionManager.forceReconnect();
    
    // Register event handlers if connection was established
    const connection = this.connectionManager.getConnection();
    if (connection) {
      this.eventHandler.registerEventHandlers(connection);
    }
  }
}
