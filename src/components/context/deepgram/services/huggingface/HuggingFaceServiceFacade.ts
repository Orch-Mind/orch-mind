// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// HuggingFaceServiceFacade.ts
// Symbolic: Fachada neural que integra e coordena diferentes serviços neurais especializados do HuggingFace

import { HuggingFaceNeuralSignalService } from "../../../../../infrastructure/neural/huggingface/HuggingFaceNeuralSignalService";
import { NeuralSignalResponse } from "../../interfaces/neural/NeuralSignalTypes";
import { ModelStreamResponse } from "../../interfaces/openai/ICompletionService";
import { IOpenAIService } from "../../interfaces/openai/IOpenAIService";
import { Message } from "../../interfaces/transcription/TranscriptionTypes";
import { LoggingUtils } from "../../utils/LoggingUtils";
import { HuggingFaceCompletionService } from "./HuggingFaceCompletionService";
import { HuggingFaceClientService } from "./neural/HuggingFaceClientService";

/**
 * Fachada que implementa IOpenAIService e coordena os serviços especializados do HuggingFace
 * Symbolic: Córtex de integração neural que combina neurônios especializados locais
 */
export class HuggingFaceServiceFacade implements IOpenAIService {
  private clientService: HuggingFaceClientService;
  private completionService: HuggingFaceCompletionService;
  private neuralSignalService: HuggingFaceNeuralSignalService | null = null;

  constructor() {
    // Inicializar os serviços especializados
    this.clientService = new HuggingFaceClientService();
    this.completionService = new HuggingFaceCompletionService(
      this.clientService
    );
    this.neuralSignalService = new HuggingFaceNeuralSignalService(
      this
    );

    LoggingUtils.logInfo(
      "Initialized HuggingFace Service Facade with specialized neural services"
    );
  }
  
  /**
   * Inicializa o cliente HuggingFace
   * Symbolic: Estabelecimento de conexão neural com modelos locais
   */
  initializeOpenAI(apiKey: string): void {
    this.clientService.initializeClient(apiKey);
  }

  /**
   * Carrega a chave da API do HuggingFace do armazenamento
   * Symbolic: Recuperação de credencial neural
   */
  async loadApiKey(): Promise<void> {
    await this.clientService.loadApiKey();
  }

  /**
   * Garante que o cliente HuggingFace está disponível
   * Symbolic: Verificação de integridade do caminho neural
   */
  async ensureOpenAIClient(): Promise<boolean> {
    return this.clientService.ensureClient();
  }

  /**
   * Envia requisição para HuggingFace e processa o stream de resposta
   * Symbolic: Fluxo neural contínuo de processamento de linguagem
   */
  async streamOpenAIResponse(
    messages: Message[]
  ): Promise<ModelStreamResponse> {
    // Mapear as mensagens para o formato esperado pelo serviço de completion
    const mappedMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    return await this.completionService.streamModelResponse(mappedMessages);
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
   * Verifica se o cliente HuggingFace está inicializado
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
    const neuralSignalService = await this.ensureNeuralSignalService();
    return neuralSignalService.generateNeuralSignal(
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
    const neuralSignalService = await this.ensureNeuralSignalService();
    return neuralSignalService.enrichSemanticQueryForSignal(
      core,
      query,
      intensity,
      context,
      language
    );
  }

  /**
   * Envia uma requisição ao HuggingFace com suporte a function calling
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
            arguments: string;
          };
        }>;
      };
    }>;
  }> {
    return this.completionService.callModelWithFunctions(options);
  }


  /**
   * Generate response using HuggingFace backend
   * Symbolic: Neural text generation through local models
   */
  async generateResponse(messages: Message[]): Promise<{ response: string }> {
    try {
      const streamResponse = await this.streamOpenAIResponse(messages);
      return { response: streamResponse.responseText };
    } catch (error) {
      LoggingUtils.logError("Error generating HuggingFace response", error);
      return {
        response: "Error: Failed to generate response with HuggingFace",
      };
    }
  }

  /**
   * Ensures neural signal service is initialized
   * Symbolic: Lazy initialization of neural signal pathway
   */
  private async ensureNeuralSignalService(): Promise<HuggingFaceNeuralSignalService> {
    if (!this.neuralSignalService) {
      // Ensure client is initialized first
      await this.ensureOpenAIClient();
      const client = this.clientService.getClient();
      this.neuralSignalService = new HuggingFaceNeuralSignalService(this);
    }
    return this.neuralSignalService;
  }
}
