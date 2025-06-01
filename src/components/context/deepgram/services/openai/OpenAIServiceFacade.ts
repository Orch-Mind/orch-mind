// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// OpenAIServiceFacade.ts
// Symbolic: Fachada neural que integra e coordena diferentes serviços neurais especializados

import { IOpenAIService } from "../../interfaces/openai/IOpenAIService";
import { ModelStreamResponse } from "../../interfaces/openai/ICompletionService";
import { AIResponseMeta, Message } from "../../interfaces/transcription/TranscriptionTypes";
import { NeuralSignalResponse } from "../../interfaces/neural/NeuralSignalTypes";
import { OpenAIClientService } from "./neural/OpenAIClientService";
import { OpenAICompletionService } from "./neural/OpenAICompletionService";
import { OpenAINeuralSignalService } from "../../../../../infrastructure/neural/openai/OpenAINeuralSignalService";
import { LoggingUtils } from "../../utils/LoggingUtils";

/**
 * Fachada que implementa IOpenAIService e coordena os serviços especializados
 * Symbolic: Córtex de integração neural que combina neurônios especializados
 */
export class OpenAIServiceFacade implements IOpenAIService {
  private clientService: OpenAIClientService;
  private completionService: OpenAICompletionService;
  private neuralSignalService: OpenAINeuralSignalService;
  
  constructor() {
    // Inicializar os serviços especializados
    this.clientService = new OpenAIClientService();
    this.completionService = new OpenAICompletionService(this.clientService);
    this.neuralSignalService = new OpenAINeuralSignalService(this.completionService);
    
    LoggingUtils.logInfo("Initialized OpenAI Service Facade with specialized neural services");
  }

  /**
   * Inicializa o cliente OpenAI
   * Symbolic: Estabelecimento de conexão neural com modelo externo
   */
  initializeOpenAI(apiKey: string): void {
    this.clientService.initializeClient(apiKey);
  }
  
  /**
   * Carrega a chave da API do OpenAI do armazenamento
   * Symbolic: Recuperação de credencial neural
   */
  async loadApiKey(): Promise<void> {
    await this.clientService.loadApiKey();
  }
  
  /**
   * Garante que o cliente OpenAI está disponível
   * Symbolic: Verificação de integridade do caminho neural
   */
  async ensureOpenAIClient(): Promise<boolean> {
    return this.clientService.ensureClient();
  }
  
  /**
   * Envia requisição para OpenAI e processa o stream de resposta
   * Symbolic: Fluxo neural contínuo de processamento de linguagem
   */
  async streamOpenAIResponse(messages: Message[]): Promise<AIResponseMeta> {
    // Mapear as mensagens para o formato esperado pelo serviço de completion
    const mappedMessages = messages.map(m => ({
      role: m.role,
      content: m.content
    }));
    
    // Chamar o serviço de completion e adaptar o retorno para o formato AIResponseMeta
    const streamResponse = await this.completionService.streamModelResponse(mappedMessages);
    
    // Adaptar o retorno ModelStreamResponse para AIResponseMeta
    return {
      response: streamResponse.responseText,
      tone: "neutral",     // Valor padrão - poderia ser inferido do texto
      style: "informative", // Valor padrão
      type: "completion",  // Indica que é uma resposta de completion
      improvised: false,   // Não é improviso
      language: "auto",    // Linguagem automática
      confidence: 0.9      // Valor padrão de confiança alta
    };
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
   * Verifica se o cliente OpenAI está inicializado
   * Symbolic: Consulta do estado de conexão neural
   */
  isInitialized(): boolean {
    return this.clientService.isInitialized();
  }
  
  /**
   * Gera sinais neurais simbólicos baseados em um prompt
   * Symbolic: Extração de padrões de ativação neural a partir de estímulo de linguagem
   */
  async generateNeuralSignal(prompt: string, temporaryContext?: string, language?: string): Promise<NeuralSignalResponse> {
    return this.neuralSignalService.generateNeuralSignal(prompt, temporaryContext, language);
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
  ): Promise<{ enrichedQuery: string, keywords: string[] }> {
    return this.neuralSignalService.enrichSemanticQueryForSignal(core, query, intensity, context, language);
  }
  
  /**
   * Envia uma requisição ao OpenAI com suporte a function calling
   * Symbolic: Processamento neural para geração de texto ou execução de função
   */
  async callOpenAIWithFunctions(options: {
    model: string;
    messages: Array<{role: string; content: string}>;
    tools?: Array<{
      type: string;
      function: {
        name: string;
        description: string;
        parameters: Record<string, unknown>;
      }
    }>;
    tool_choice?: {type: string; function: {name: string}};
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
          }
        }>
      }
    }>
  }> {
    return this.completionService.callModelWithFunctions(options);
  }
}
