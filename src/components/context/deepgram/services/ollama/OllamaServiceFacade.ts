// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// OllamaServiceFacade.ts
// Symbolic: Fachada neural que integra e coordena diferentes serviços neurais especializados

import { OllamaNeuralSignalService } from "../../infrastructure/neural/ollama/OllamaNeuralSignalService";
import { NeuralSignalResponse } from "../../interfaces/neural/NeuralSignalTypes";
import {
  ModelStreamResponse,
  StreamingCallback,
} from "../../interfaces/openai/ICompletionService";
import { IOpenAIService } from "../../interfaces/openai/IOpenAIService";
import { Message } from "../../interfaces/transcription/TranscriptionTypes";
import { LoggingUtils } from "../../utils/LoggingUtils";
import { OllamaClientService } from "./neural/OllamaClientService";
import { OllamaCompletionService } from "./neural/OllamaCompletionService";

/**
 * Fachada que implementa IOpenAIService e coordena os serviços especializados
 * Symbolic: Córtex de integração neural que combina neurônios especializados
 */
export class OllamaServiceFacade implements IOpenAIService {
  private clientService: OllamaClientService;
  private completionService: OllamaCompletionService;
  private neuralSignalService: OllamaNeuralSignalService;

  constructor() {
    // Inicializar os serviços especializados
    this.clientService = new OllamaClientService();
    this.completionService = new OllamaCompletionService(this.clientService);
    this.neuralSignalService = new OllamaNeuralSignalService(
      this.completionService
    );

    LoggingUtils.logInfo(
      "Initialized Ollama Service Facade with specialized neural services"
    );
  }

  /**
   * Inicializa o cliente Ollama
   * Symbolic: Estabelecimento de conexão neural com modelo local
   */
  initializeOpenAI(config?: string): void {
    this.clientService.initializeClient(config);
  }

  /**
   * Carrega a configuração do Ollama do armazenamento
   * Symbolic: Recuperação de credencial neural
   */
  async loadApiKey(): Promise<void> {
    await this.clientService.loadApiKey();
  }

  /**
   * Garante que o cliente Ollama está disponível
   * Symbolic: Verificação de integridade do caminho neural
   */
  async ensureOpenAIClient(): Promise<boolean> {
    return this.clientService.ensureClient();
  }

  /**
   * Envia requisição para Ollama e processa o stream de resposta
   * Symbolic: Fluxo neural contínuo de processamento de linguagem
   */
  public async streamOpenAIResponse(
    messages: Message[],
    temperature?: number,
    onChunk?: StreamingCallback
  ): Promise<ModelStreamResponse> {
    const mappedMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    return await this.completionService.streamModelResponse(
      mappedMessages,
      temperature,
      onChunk
    );
  }

  /**
   * Cria embeddings para o texto fornecido
   * Symbolic: Transformação de texto em representação neural vetorial
   */
  async createEmbedding(text: string): Promise<number[]> {
    return this.clientService.createEmbedding(text);
  }

  /**
   * Cria embeddings para um lote de textos (processamento em batch)
   * Symbolic: Transformação em massa de textos em vetores neurais
   */
  async createEmbeddings(texts: string[]): Promise<number[][]> {
    return this.clientService.createEmbeddings(texts);
  }

  /**
   * Verifica se o cliente Ollama está inicializado
   * Symbolic: Consulta do estado de conexão neural
   */
  isInitialized(): boolean {
    return this.clientService.isInitialized();
  }

  /**
   * Gera sinais neurais simbólicos baseados em um prompt
   * Symbolic: Extração de padrões de ativação neural a partir de estímulo de linguagem
   */
  async generateNeuralSignal(
    prompt: string,
    temporaryContext?: string,
    language?: string
  ): Promise<NeuralSignalResponse> {
    return this.neuralSignalService.generateNeuralSignal(
      prompt,
      temporaryContext,
      language
    );
  }

  /**
   * Expande semanticamente a query de um núcleo cerebral
   * Symbolic: Expansão de campo semântico para ativação cortical específica
   */
  async enrichSemanticQueryForSignal(
    core: string,
    query: string,
    intensity: number,
    context?: string,
    language?: string
  ): Promise<{ enrichedQuery: string; keywords: string[] }> {
    return this.neuralSignalService.enrichSemanticQueryForSignal(
      core,
      query,
      intensity,
      context,
      language
    );
  }

  /**
   * Envia uma requisição ao Ollama com suporte a function calling
   * Symbolic: Processamento neural para geração de texto ou execução de função
   */
  async callOpenAIWithFunctions(options: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    tools?: Array<{
      type: string;
      function: {
        name: string;
        description: string;
        parameters: Record<string, unknown>;
      };
    }>;
    tool_choice?: { type: string; function: { name: string } };
    temperature?: number;
    max_tokens?: number;
  }): Promise<{
    choices: Array<{
      message: {
        content?: string;
        tool_calls?: Array<{
          function: {
            name: string;
            arguments: string | Record<string, any>;
          };
        }>;
      };
    }>;
  }> {
    return this.completionService.callModelWithFunctions(options);
  }
}
