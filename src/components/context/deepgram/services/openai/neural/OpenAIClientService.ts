// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// OpenAIClientService.ts
// Symbolic: Gerencia a conexão com a API do OpenAI, atuando como ponte neural entre o sistema e o modelo externo

import OpenAI from "openai";
import { IClientManagementService } from "../../../interfaces/openai/IClientManagementService";
import { STORAGE_KEYS } from "../../../../../../services/StorageService";
import { getOption } from "../../../../../../services/StorageService";
import { LoggingUtils } from "../../../utils/LoggingUtils";

/**
 * Serviço responsável por gerenciar a conexão com a API do OpenAI
 * Symbolic: Neurônio especializado em inicialização e manutenção de caminhos neurais externos
 */
export class OpenAIClientService implements IClientManagementService {
  private openai: OpenAI | null = null;
  private apiKey: string = "";

  /**
   * Inicializa o cliente OpenAI com a chave da API fornecida
   * Symbolic: Estabelecimento de conexão neural com modelo externo
   */
  initializeClient(apiKey: string): void {
    if (!apiKey) {
      LoggingUtils.logError("Failed to initialize OpenAI: API key is empty");
      return;
    }
    
    this.apiKey = apiKey;
    this.openai = new OpenAI({
      apiKey: this.apiKey,
      dangerouslyAllowBrowser: true
    });
    
    LoggingUtils.logInfo("OpenAI client initialized successfully");
  }

  /**
   * Carrega a chave da API do armazenamento local
   * Symbolic: Recuperação de credencial neural do armazenamento local
   */
  async loadApiKey(): Promise<string> {
    const storedKey = getOption(STORAGE_KEYS.OPENAI_API_KEY);
    if (storedKey) {
      this.apiKey = storedKey;
      return storedKey;
    }
    return "";
  }

  /**
   * Garante que o cliente OpenAI está inicializado, carregando a chave se necessário
   * Symbolic: Verificação e reparação de caminho neural para modelo externo
   */
  async ensureClient(): Promise<boolean> {
    if (this.isInitialized()) return true;
    
    // If no API key, try to load from storage
    if (!this.apiKey) {
      const apiKey = await this.loadApiKey();
      if (!apiKey) {
        LoggingUtils.logError("Failed to load OpenAI API key");
        return false;
      }
    }
    
    // Initialize the client
    this.initializeClient(this.apiKey);
    return this.isInitialized();
  }

  /**
   * Verifica se o cliente OpenAI está inicializado
   * Symbolic: Inspeção do estado de conexão neural
   */
  isInitialized(): boolean {
    return !!this.openai && !!this.apiKey;
  }

  /**
   * Retorna o cliente OpenAI se inicializado, ou lança erro
   * Symbolic: Acesso ao canal neural estabelecido ou falha explícita
   */
  getClient(): OpenAI {
    if (!this.openai) {
      throw new Error("OpenAI client not initialized");
    }
    return this.openai;
  }

  /**
   * Cria embeddings para o texto fornecido
   * Symbolic: Transformação de texto em representação vetorial neural
   */
  async createEmbedding(text: string): Promise<number[]> {
    await this.ensureClient();
    
    try {
      const response = await this.getClient().embeddings.create({
        model: "text-embedding-3-small",
        input: text,
      });
      
      return response.data[0].embedding;
    } catch (error) {
      LoggingUtils.logError(`Error creating embedding: ${error instanceof Error ? error.message : String(error)}`);
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
      const response = await this.getClient().embeddings.create({
        model: "text-embedding-3-small",
        input: texts,
      });
      
      return response.data.map((item) => item.embedding);
    } catch (error) {
      LoggingUtils.logError(`Error creating embeddings batch: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
}
