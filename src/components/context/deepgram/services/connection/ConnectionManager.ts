// SPDX-License-Identifier: MIT OR Apache-2.0
import { getOption } from '../../../../../services/StorageService';
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * ConnectionManager handles establishing, maintaining, and closing 
 * connections to the Deepgram service.
 */
import { createClient, DeepgramClient, ListenLiveClient } from "@deepgram/sdk";
import { ConnectionState } from '../../interfaces/deepgram/IDeepgramService';
import { ConnectionCallback, ConnectionStateCallback } from '../utils/DeepgramTypes';
import { Logger } from '../utils/Logger';

export class ConnectionManager {
  private logger: Logger;
  private connection: ListenLiveClient | null = null;
  private connectionState: ConnectionState = ConnectionState.CLOSED;
  private deepgramClient: DeepgramClient | null = null;
  private apiKey: string = "";
  private language: string = "pt-BR";
  private autoReconnect: boolean = true;
  private keepAliveInterval?: ReturnType<typeof setInterval>;
  private lastConnectionId: number = 0;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 3000;
  
  // Callbacks
  private setConnectionState: ConnectionStateCallback;
  private setConnection: ConnectionCallback;
  
  constructor(
    setConnectionState: ConnectionStateCallback,
    setConnection: ConnectionCallback
  ) {
    this.logger = new Logger('ConnectionManager');
    this.setConnectionState = setConnectionState;
    this.setConnection = setConnection;
    this.loadApiKey();
  }
  
  /**
   * Get the current connection
   */
  public getConnection(): ListenLiveClient | null {
    return this.connection;
  }
  
  /**
   * Get the current connection state
   */
  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }
  
  /**
   * Check if there is an active connection
   */
  public isActiveConnection(): boolean {
    return !!(
      this.connection && 
      this.connection.getReadyState() === 1 && 
      this.connectionState === ConnectionState.OPEN
    );
  }
  
  /**
   * Get detailed connection status information
   */
  public getConnectionStatus() {
    return {
      state: this.connectionState,
      stateRef: this.connectionState,
      hasConnectionObject: !!this.connection,
      readyState: this.connection?.getReadyState() ?? null,
      active: this.isActiveConnection()
    };
  }
  
  /**
   * Set the language for transcription
   */
  public setLanguage(language: string): void {
    this.language = language;
    this.logger.info(`Idioma definido para: ${language}`);
  }
  
  /**
   * Check if an active or pending connection exists
   */
  public isConnectionActive(): boolean {
    if ([ConnectionState.CONNECTING, ConnectionState.OPEN].includes(this.connectionState)) {
      this.logger.warning(`Já ${this.connectionState === ConnectionState.CONNECTING ? 'conectando' : 'conectado'}`);
      return true;
    }
    return false;
  }
  
  /**
   * Update the connection state
   */
  public updateState(state: ConnectionState): void {
    this.connectionState = state;
    this.setConnectionState(state);
  }
  
  /**
   * Generate a unique connection ID
   */
  public generateConnectionId(): number {
    const connectionId = Date.now();
    this.lastConnectionId = connectionId;
    return connectionId;
  }
  
  /**
   * Check if a connection attempt is still valid
   */
  public isValidConnectionAttempt(connectionId: number): boolean {
    if (connectionId !== this.lastConnectionId) {
      this.logger.warning("Connection attempt overridden by more recent request — maintaining brain connection integrity");
      return false;
    }
    return true;
  }
  
  /**
   * Reset the connection and update state
   */
  public resetConnection(state: ConnectionState): void {
    this.connection = null;
    this.setConnection(null);
    this.updateState(state);
  }
  
  /**
   * Clean up existing connection
   */
  public async cleanupExistingConnection(): Promise<void> {
    if (!this.connection) return;
    
    try {
      this.logger.info("Cleaning up existing connection");
      this.connection.removeAllListeners();
      this.connection.requestClose();
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (err) {
      this.logger.warning("Error cleaning up existing connection", err);
    }
    
    this.setConnection(null);
    this.connection = null;
  }
  
  /**
   * Set the active connection
   */
  public setActiveConnection(connection: ListenLiveClient): void {
    this.connection = connection;
    this.setConnection(connection);
  }
  
  /**
   * Create a new connection to Deepgram
   */
  public async createConnection(): Promise<ListenLiveClient | null> {
    if (!this.deepgramClient) {
      if (!this.apiKey) return null;
      this.deepgramClient = createClient(this.apiKey);
      this.logger.info("New Deepgram client instance created");
    }
    
    this.ensureValidLanguage();
    this.logger.info(`Connecting with language: ${this.language}`);
    
    try {
      console.log("📊 [COGNITIVE-CONFIG] Using minimal configuration and automatic format detection for brain audio input");
      
      const connection = this.deepgramClient.listen.live({
        model: getOption('deepgramModel') || 'nova-2-general',
        language: this.language,
        smart_format: true,
        multichannel: true,
      });
      
      console.log("📊 [COGNITIVE-CONFIG] Connection parameters for cognitive audio stream:", {
        idioma: this.language,
        modelo: "nova-2",
        smart_format: true,
        multicanal: true
      });
      
      this.logger.info("Using automatic audio format detection");
      return connection;
    } catch (error) {
      this.logger.error("Failed to create Deepgram connection", error);
      return null;
    }
  }
  
  /**
   * Ensure the language setting is valid
   */
  public ensureValidLanguage(): void {
    if (!this.language || this.language === 'auto') {
      this.language = 'pt-BR';
    }
  }
  
  /**
   * Add a timeout for establishing connection
   */
  public addConnectionTimeout(connectionId: number): void {
    const TIMEOUT_MS = 15000; // 15 seconds
    
    setTimeout(() => {
      // Check if we are still trying to connect to the same connection
      if (this.lastConnectionId !== connectionId) return;
      
      // If we are still in the CONNECTING state after the timeout
      if (this.connectionState === ConnectionState.CONNECTING) {
        this.logger.warning(`Connection timeout after ${TIMEOUT_MS}ms. Resetting connection.`);
        this.resetConnection(ConnectionState.ERROR);
        
        // Try to reconnect after reset
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          const delay = this.reconnectDelay * Math.min(Math.pow(1.5, this.reconnectAttempts), 10);
          this.reconnectAttempts++;
          
          this.logger.info(`Scheduling reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
          
          setTimeout(() => {
            this.forceReconnect();
          }, delay);
        } else {
          this.logger.error(`Maximum reconnection attempts reached (${this.maxReconnectAttempts}). Giving up.`);
        }
      }
    }, TIMEOUT_MS);
  }
  
  /**
   * Set up keep alive ping mechanism for the WebSocket connection
   */
  public setupKeepAlive(connection: ListenLiveClient): void {
    this.clearKeepAlive();
    
    // Interval of 8 seconds for keepAlive 
    // (documentation recommends sending keep-alive every 8 seconds, as Deepgram
    // closes the connection after approximately 12 seconds of inactivity)
    this.keepAliveInterval = setInterval(() => {
      try {
        if (connection && connection.getReadyState() === 1) {
          connection.keepAlive();
          // Reduce log frequency to avoid spam
          if (Math.random() < 0.1) { // Log only ~10% of the time
            console.log("💓 [COGNITIVE-CONNECTION] KeepAlive sent to maintain active brain WebSocket connection");
          }
        } else if (connection && connection.getReadyState() !== 1) {
          this.logger.warning(`Unable to send keepAlive: state ${connection.getReadyState()}`);
          
          // Verify if the internal state is inconsistent
          if (this.connectionState === ConnectionState.OPEN) {
            this.logger.warning("Inconsistent state detected: OPEN but WebSocket is not open");
            this.forceReconnect();
          }
        }
      } catch (err) {
        this.logger.warning("Error sending keepalive", err);
      }
    }, 8000); // 8 seconds (Deepgram closes after ~12 seconds of inactivity)
  }
  
  /**
   * Clear keep alive interval
   */
  public clearKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = undefined;
    }
  }
  
  /**
   * Set up separate audio keep alive system
   */
  public setupKeepAliveAudio(): void {
    // Disable sending silent audio, since Deepgram's keep-alive is sufficient
    // to maintain the connection active.
    console.log("📢 [COGNITIVE-CONNECTION] Using only Deepgram API default keep-alive to maintain brain connection");
  }
  
  /**
   * Handle the WebSocket open event
   */
  public handleOpenEvent(connection: ListenLiveClient): void {
    this.logger.info("Connection opened successfully");
    this.updateState(ConnectionState.OPEN);
    this.reconnectAttempts = 0; // Reset reconnect attempts counter
    this.setupKeepAlive(connection);
  }
  
  /**
   * Handle the WebSocket close event
   */
  public handleCloseEvent(): void {
    this.logger.info("Connection closed");
    this.clearKeepAlive();
    
    // Check if we are already trying to reconnect
    if (this.connectionState === ConnectionState.CONNECTING) {
      this.logger.info("Already have a reconnection attempt in progress");
      return;
    }
    
    this.resetConnection(ConnectionState.CLOSED);
    
    // Try to reconnect if there is audio in the queue or auto-reconnect is enabled
    if (this.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts);
      this.reconnectAttempts++;
      
      this.logger.info(`Trying reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
      this.updateState(ConnectionState.CONNECTING);
      
      setTimeout(() => {
        if (this.connectionState === ConnectionState.CONNECTING) {
          this.connectToDeepgram();
        }
      }, delay);
    } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error(`[COGNITIVE-CONNECTION] Maximum number of reconnections (${this.maxReconnectAttempts}) reached. Giving up on brain connection.`);
      this.updateState(ConnectionState.ERROR);
    }
  }
  
  /**
   * Handle error events from the WebSocket connection
   */
  public handleErrorEvent(error: unknown): void {
    let errorMessage: string;
    if (typeof error === "object" && error !== null && "message" in error) {
      errorMessage = String((error as { message?: string }).message);
    } else {
      errorMessage = String(error);
    }
    this.logger.error("[COGNITIVE-CONNECTION] Error in Deepgram connection", error);
    
    // Check error type for specific actions
    if (errorMessage.includes("NET-0001") || errorMessage.includes("1011")) {
      this.logger.warning("[COGNITIVE-CONNECTION] NET-0001 detected: Deepgram did not receive audio before timeout");
      
      // Try to send keepAlive if the connection is still open
      if (this.connection && this.connection.getReadyState() === 1) {
        try {
          this.connection.keepAlive();
          this.logger.info("[COGNITIVE-CONNECTION] KeepAlive sent after NET-0001 detected");
          return; // Do not reset the connection if keepAlive succeeds
        } catch (e) {
          this.logger.error("[COGNITIVE-CONNECTION] Failed to send keepAlive after error", e);
        }
      }
    } else if (errorMessage.includes("DATA-0000") || errorMessage.includes("1008")) {
      this.logger.warning("[COGNITIVE-CONNECTION] DATA-0000 detected: Deepgram cannot decode audio");
      // This error indicates problems with audio format - check encoding and sample_rate
    }
    
    // Check if we should try to reconnect
    if (this.connectionState === ConnectionState.OPEN || 
        this.connectionState === ConnectionState.CONNECTING) {
      this.resetConnection(ConnectionState.ERROR);
      
      if (this.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
        const delay = this.reconnectDelay * Math.min(Math.pow(1.5, this.reconnectAttempts), 10);
        this.reconnectAttempts++;
        
        this.logger.info(`Trying reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
        
        setTimeout(() => {
          this.forceReconnect();
        }, delay);
      } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.logger.error(`[COGNITIVE-CONNECTION] Maximum number of reconnections (${this.maxReconnectAttempts}) reached. Giving up on brain connection.`);
      }
    }
  }
  
  /**
   * Wait until a specific connection state is reached
   */
  public async waitForConnectionState(targetState: ConnectionState, timeoutMs = 15000): Promise<boolean> {
    if (this.connectionState === targetState) return true;
    
    return new Promise<boolean>((resolve) => {
      const timeoutId = setTimeout(() => {
        this.logger.warning(`[COGNITIVE-CONNECTION] Timeout waiting for state ${targetState}, current: ${this.connectionState}`);
        resolve(false);
      }, timeoutMs);
      
      const checkState = () => {
        if (this.connectionState === targetState) {
          clearTimeout(timeoutId);
          resolve(true);
          return;
        }
        setTimeout(checkState, 100);
      };
      
      checkState();
    });
  }
  
  /**
   * Force a reconnection to the Deepgram service
   */
  public async forceReconnect(): Promise<void> {
    // Clear existing connection first
    this.logger.info("Starting forced reconnection");
    await this.disconnectFromDeepgram();
    
    // Wait for a short period before reconnecting
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Ensure we are in a state appropriate for reconnection
    if (this.connectionState !== ConnectionState.CLOSED && 
        this.connectionState !== ConnectionState.ERROR) {
      this.resetConnection(ConnectionState.CLOSED);
    }
    
    // Check if we should try to reconnect
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error(`Maximum reconnection attempts reached (${this.maxReconnectAttempts}). Giving up.`);
      return;
    }
    
    // Activate automatic reconnection and start connection
    this.autoReconnect = true;
    this.updateState(ConnectionState.CONNECTING);
    
    try {
      await this.connectToDeepgram();
    } catch (error) {
      this.logger.error("Failed forced reconnection", error);
      
      // Try again, if still within the limit
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts);
        this.reconnectAttempts++;
        
        this.logger.info(`Scheduling new attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
        
        setTimeout(() => {
          this.forceReconnect();
        }, delay);
      }
    }
  }
  
  /**
   * Reset the reconnection counter
   */
  public resetReconnectCounter(): void {
    this.reconnectAttempts = 0;
  }
  
  /**
   * Loads the API key from environment variables
   */
  private async loadApiKey(): Promise<void> {
    if (typeof window === 'undefined' || !window.electronAPI) return;
    try {
      let key = await window.electronAPI.getEnv('DEEPGRAM_API_KEY');
      if (!key) {
        // Fallback: buscar via StorageService
        key = getOption('deepgramApiKey') ?? null;
        if (key) {
          this.logger.info('[FALLBACK] Deepgram API key loaded from StorageService');
        }
      }
      if (key) {
        this.apiKey = key;
        this.deepgramClient = createClient(key);
        this.logger.info("API key loaded and client initialized");
      } else {
        this.logger.error("API key not found (env nor StorageService)");
      }
    } catch (error) {
      this.logger.handleError("Failed to load API key", error);
    }
  }
  
  /**
   * Ensure the API key is available
   */
  public async ensureApiKey(): Promise<boolean> {
    if (this.apiKey) return true;
    
    this.logger.error("API key not found");
    this.updateState(ConnectionState.ERROR);
    
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const key = await window.electronAPI.getEnv('DEEPGRAM_API_KEY');
        if (key) {
          this.apiKey = key;
          this.deepgramClient = createClient(key);
          this.logger.info("API key loaded successfully");
          return true;
        }
        this.logger.error("Failed to load API key");
      } catch (error) {
        this.logger.handleError("Failed to load API key", error);
      }
    }
    
    // Reset reconnect counter after API key failure
    this.reconnectAttempts = this.maxReconnectAttempts;
    return false;
  }
  
  /**
   * Connect to the Deepgram service
   */
  public async connectToDeepgram(language?: string): Promise<void> {
    this.logger.info("Starting new connection with Deepgram");
    
    // Prevent multiple connections at the same time
    if (this.connectionState === ConnectionState.CONNECTING) {
      this.logger.warning("Already connecting - connection in progress");
      return;
    }
    
    // If already connected, disconnect first to ensure a clean connection
    if (this.connectionState === ConnectionState.OPEN || this.connection) {
      this.logger.info("Previous connection detected, disconnecting to ensure clean session");
      await this.disconnectFromDeepgram();
      
      // Small pause to ensure disconnection is completed
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Initialize new connection attempt
    const connectionId = this.generateConnectionId();
    this.updateState(ConnectionState.CONNECTING);
    
    // Configure language if provided
    if (language) {
      this.setLanguage(language);
    } else {
      this.ensureValidLanguage(); // Ensure a default language if none is provided
    }
    
    if (!await this.ensureApiKey()) {
      this.logger.error("Failed to obtain API key. Aborting connection.");
      this.updateState(ConnectionState.ERROR);
      return;
    }
    
    // Check if this connection attempt is still valid
    if (!this.isValidConnectionAttempt(connectionId)) {
      this.logger.warning("Connection attempt exceeded by newer request");
      return;
    }
    
    try {
      // Clean up any residual connection state
      await this.cleanupExistingConnection();
      
      // Create new connection with Deepgram
      this.logger.info(`Creating connection with language: ${this.language}`);
      const newConnection = await this.createConnection();
      
      if (!newConnection) {
        this.logger.error("Failed to create connection with Deepgram");
        this.resetConnection(ConnectionState.ERROR);
        return;
      }
      
      // Configure active connection
      this.setActiveConnection(newConnection);
      this.logger.info("Connection initialized and waiting for opening");
      
      // Add connection timeout
      this.addConnectionTimeout(connectionId);
      
      // Configure audio keep-alive after successful connection
      this.setupKeepAliveAudio();
      
      // Reset error counters
      this.reconnectAttempts = 0;
      
      return;
    } catch (error) {
      this.logger.handleError("Failed to connect to Deepgram", error);
      this.resetConnection(ConnectionState.ERROR);
      return;
    }
  }
  
  /**
   * Disconnect from the Deepgram service
   */
  public async disconnectFromDeepgram(): Promise<void> {
    this.logger.info("Starting disconnection from Deepgram");
    
    // Disable automatic reconnection temporarily to avoid reconnections during disconnection
    this.autoReconnect = false;
    
    // Clear keepAlive to prevent ping attempts on a closed connection
    this.clearKeepAlive();
    
    // Check if there is an active connection to close
    if (!this.connection) {
      this.logger.info("No active connection to close");
      this.updateState(ConnectionState.CLOSED);
      return;
    }
    
    // Save the current connection state for diagnostics
    const readyState = this.connection.getReadyState();
    this.logger.info(`Closing connection (current state: ${readyState})`);
    
    try {
      // Remove all listeners to avoid callbacks after disconnection
      this.connection.removeAllListeners();
      
      // Request controlled WebSocket connection closure only if it is open
      if (readyState === 1) {
        this.logger.info("Requesting controlled WebSocket connection closure");
        try {
          this.connection.requestClose();
        } catch (closeError) {
          this.logger.warning("Error requesting controlled WebSocket connection closure:", closeError);
          // Continue the cleanup process even with error
        }
      } else {
        this.logger.info(`WebSocket connection is not open (state: ${readyState})`);
      }
      
      // Ensure a timeout to close the connection in case of pending operations
      const closeTimeoutMs = 3000;
      await Promise.race([
        // Wait until the connection is really closed (close event)
        new Promise<void>((resolve) => {
          const checkClosed = () => {
            const newState = this.connection?.getReadyState();
            if (newState === 3 || newState === undefined || newState === null) {
              this.logger.info("Connection closed successfully");
              resolve();
            } else {
              setTimeout(checkClosed, 300);
            }
          };
          checkClosed();
        }),
        // Or timeout after maximum time
        new Promise<void>((resolve) => {
          setTimeout(() => {
            this.logger.warning(`Timeout (${closeTimeoutMs}ms) waiting for connection closure, forcing cleanup`);
            resolve();
          }, closeTimeoutMs);
        })
      ]);
      
      // Reset connection and state independently of the result
      this.connection = null;
      this.setConnection(null);
      this.updateState(ConnectionState.CLOSED);
      
      // Reset reconnect attempts
      this.reconnectAttempts = 0;
      
      this.logger.info("Disconnection completed and resources released");
      return;
    } catch (error) {
      this.logger.handleError("Error closing connection", error);
      // Even with error, ensure we clean up the state
      this.resetConnection(ConnectionState.CLOSED);
      this.reconnectAttempts = 0;
      return;
    } finally {
      // Reactivate automatic reconnection after delay, only if not forced disconnection
      // This allows future recording sessions without needing to restart the application
      setTimeout(() => this.autoReconnect = true, 5000);
    }
  }
}
