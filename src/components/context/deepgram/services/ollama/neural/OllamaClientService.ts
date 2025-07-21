// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// OllamaClientService.ts
// Symbolic: Gerencia a conexão com a API do Ollama, atuando como ponte neural entre o sistema e o modelo local

import {
  getOption,
  STORAGE_KEYS,
} from "../../../../../../services/StorageService";
import { IClientManagementService } from "../../../interfaces/openai/IClientManagementService";
import { LoggingUtils } from "../../../utils/LoggingUtils";

/**
 * Serviço responsável por gerenciar a conexão com a API do Ollama
 * Symbolic: Neurônio especializado em inicialização e manutenção de caminhos neurais locais
 */
export class OllamaClientService implements IClientManagementService {
  private ollamaClient: any | null = null;
  private baseUrl: string = "http://localhost:11434";

  /**
   * Inicializa o cliente Ollama com configuração fornecida
   * Symbolic: Estabelecimento de conexão neural com modelo local
   */
  initializeClient(config?: string): void {
    if (config) {
      this.baseUrl = config;
    }

    this.ollamaClient = {
      baseUrl: this.baseUrl,
      // Mock OpenAI-like interface for compatibility
      chat: {
        completions: {
          create: this.createCompletion.bind(this),
        },
      },
    };

    LoggingUtils.logInfo("Ollama client initialized successfully");
  }

  /**
   * Carrega a configuração do Ollama do ambiente (.env) ou armazenamento local
   * Symbolic: Recuperação de credencial neural seguindo hierarquia de prioridade
   */
  async loadApiKey(): Promise<string> {
    // Prioridade 1: Variável de ambiente (.env) via Electron API
    try {
      const envUrl = await window.electronAPI.getEnv("OLLAMA_URL");
      if (envUrl?.trim()) {
        this.baseUrl = envUrl.trim();
        LoggingUtils.logInfo("Ollama URL loaded from environment variables");
        return this.baseUrl;
      }
    } catch (error) {
      LoggingUtils.logInfo(
        "Could not load Ollama URL from environment, using default"
      );
    }

    // Prioridade 2: Usar URL padrão (Ollama não precisa de configuração especial)
    LoggingUtils.logInfo("Using default Ollama configuration");

    LoggingUtils.logInfo("Using default Ollama URL: http://localhost:11434");
    return this.baseUrl;
  }

  /**
   * Garante que o cliente Ollama está inicializado, carregando a configuração se necessário
   * Symbolic: Verificação e reparação de caminho neural para modelo local
   */
  async ensureClient(): Promise<boolean> {
    if (this.isInitialized()) return true;

    // If no client, try to load from environment/storage
    if (!this.ollamaClient) {
      const baseUrl = await this.loadApiKey();
      if (!baseUrl) {
        LoggingUtils.logError("Failed to load Ollama configuration");
        return false;
      }
    }

    // Initialize the client
    this.initializeClient(this.baseUrl);

    // Test connection
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(
          `Failed to connect to Ollama service: ${response.statusText}`
        );
      }
      return true;
    } catch (error) {
      LoggingUtils.logError(
        `Failed to connect to Ollama: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return false;
    }
  }

  /**
   * Verifica se o cliente Ollama está inicializado
   * Symbolic: Inspeção do estado de conexão neural
   */
  isInitialized(): boolean {
    return !!this.ollamaClient && !!this.baseUrl;
  }

  /**
   * Retorna o cliente Ollama se inicializado, ou lança erro
   * Symbolic: Acesso ao canal neural estabelecido ou falha explícita
   */
  getClient(): any {
    if (!this.ollamaClient) {
      throw new Error("Ollama client not initialized");
    }
    return this.ollamaClient;
  }

  /**
   * Cria embeddings para o texto fornecido
   * Symbolic: Transformação de texto em representação vetorial neural
   */
  async createEmbedding(text: string): Promise<number[]> {
    await this.ensureClient();

    try {
      const embeddingModel =
        getOption(STORAGE_KEYS.OLLAMA_EMBEDDING_MODEL) || "bge-m3:latest";

      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: embeddingModel,
          prompt: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama embedding failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.embedding || [];
    } catch (error) {
      LoggingUtils.logError(
        `Error creating embedding: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return [];
    }
  }

  /**
   * Cria embeddings para um lote de textos (processamento em batch)
   * Symbolic: Transformação em massa de textos em vetores neurais
   */
  async createEmbeddings(texts: string[]): Promise<number[][]> {
    await this.ensureClient();

    try {
      const embeddings: number[][] = [];

      // Process texts one by one (Ollama doesn't support batch embeddings)
      for (const text of texts) {
        const embedding = await this.createEmbedding(text);
        embeddings.push(embedding);
      }

      return embeddings;
    } catch (error) {
      LoggingUtils.logError(
        `Error creating embeddings batch: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return [];
    }
  }

  /**
   * Método privado para criar completions (compatibilidade com interface OpenAI)
   */
  private async createCompletion(options: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    stream?: boolean;
    temperature?: number;
    max_tokens?: number;
    tools?: any[];
    tool_choice?: any;
  }): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: options.model,
          messages: options.messages,
          stream: options.stream || false,
          options: {
            temperature: options.temperature,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      LoggingUtils.logError(
        `Error in Ollama completion: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }
}
