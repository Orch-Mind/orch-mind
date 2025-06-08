// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// IClientManagementService.ts
// Symbolic: Neural interface for LLM client management and initialization

import OpenAI from "openai";
import { HuggingFaceLocalService } from "../../../../../services/huggingface/HuggingFaceLocalService";

/**
 * Interface para o serviço de gerenciamento do cliente do modelo de linguagem
 * Symbolic: Representa o córtex de inicialização e gestão da conexão neural
 */
export interface IClientManagementService {
  /**
   * Inicializa o cliente do modelo de linguagem
   * Symbolic: Estabelece o caminho neural para comunicação com o modelo
   */
  initializeClient(apiKey: string): void;
  
  /**
   * Carrega a chave da API do armazenamento
   * Symbolic: Acessa as credenciais neurais armazenadas
   */
  loadApiKey(): Promise<string>;
  
  /**
   * Garante que o cliente está disponível, inicializando se necessário
   * Symbolic: Verifica e assegura a integridade do caminho neural
   */
  ensureClient(): Promise<boolean>;
  
  /**
   * Verifica se o cliente está inicializado
   * Symbolic: Consulta o estado de conexão neural
   */
  isInitialized(): boolean;
  
  /**
   * Retorna o cliente do modelo de linguagem se inicializado
   * Symbolic: Acesso ao canal neural estabelecido
   * @returns Cliente inicializado do modelo de linguagem
   * @throws Erro se o cliente não estiver inicializado
   */
  getClient(): OpenAI | HuggingFaceLocalService;

  /**
   * Cria embeddings para o texto fornecido
   * Symbolic: Transformação de texto em representação neural vetorial
   */
  createEmbedding(text: string): Promise<number[]>;
  
  /**
   * Cria embeddings para um lote de textos (processamento em batch)
   * Symbolic: Transformação em massa de textos em vetores neurais
   * @param texts Array de textos para gerar embeddings
   * @returns Array de arrays de numbers representando os embeddings
   */
  createEmbeddings(texts: string[]): Promise<number[][]>;
}
