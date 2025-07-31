// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { cleanThinkTags } from "../../../../../context/deepgram/utils/ThinkTagCleaner";
import { ChatMessage } from "../types/ChatTypes";

/**
 * MessageProcessor - Responsável por processar mensagens e respostas de IA
 * Aplica SRP: Uma única responsabilidade - processar mensagens
 * Aplica DRY: Centraliza lógica de processamento evitando duplicação
 */
export class MessageProcessor {
  private isReceivingResponse: boolean = false;
  private lastProcessedResponse: string = "";
  private processingResponseRef: string = "";
  private responseDebounceTimer: NodeJS.Timeout | null = null;
  private processingTimeout: NodeJS.Timeout | null = null;
  private streamingCompleted: boolean = false;

  constructor(
    private addMessage: (
      message: Omit<ChatMessage, "id" | "timestamp">
    ) => void,
    private onProcessingStateChange: (isProcessing: boolean) => void,
    private onClearAiResponse: () => void
  ) {}

  /**
   * Reset all internal state
   */
  resetState(): void {
    console.log("[MESSAGE_PROCESSOR] Resetting internal state");
    this.isReceivingResponse = false;
    this.lastProcessedResponse = "";
    this.processingResponseRef = "";
    this.streamingCompleted = false;

    if (this.responseDebounceTimer) {
      clearTimeout(this.responseDebounceTimer);
      this.responseDebounceTimer = null;
    }

    if (this.processingTimeout) {
      clearTimeout(this.processingTimeout);
      this.processingTimeout = null;
    }
  }

  /**
   * Processa resposta de IA com debounce
   */
  processAiResponse(
    aiResponseText: string,
    currentMessages: ChatMessage[],
    conversationMessages?: ChatMessage[]
  ): void {
    console.log("🔍 [MESSAGE_PROCESSOR] processAiResponse called:", {
      aiResponseText: aiResponseText
        ? aiResponseText.substring(0, 50)
        : "empty",
      lastProcessedResponse: this.lastProcessedResponse
        ? this.lastProcessedResponse.substring(0, 50)
        : "null",
      processingResponseRef: this.processingResponseRef
        ? this.processingResponseRef.substring(0, 50)
        : "null",
      isReceivingResponse: this.isReceivingResponse,
    });

    // Limpa estado se resposta vazia
    if (!aiResponseText || aiResponseText.trim() === "") {
      this.clearProcessingState();
      return;
    }

    // Verifica se é mensagem de processamento
    if (this.isProcessingMessage(aiResponseText)) {
      this.onProcessingStateChange(true);
      this.isReceivingResponse = true;
      console.log("[MESSAGE_PROCESSOR] Started processing");
      return;
    }

    // Se já processamos essa resposta exata via streaming, ignora
    const cleanedResponse = cleanThinkTags(aiResponseText);
    const normalizedResponse = this.normalizeForComparison(cleanedResponse);
    const normalizedLastProcessed = this.lastProcessedResponse
      ? this.normalizeForComparison(this.lastProcessedResponse)
      : "";

    if (normalizedResponse === normalizedLastProcessed) {
      console.log(
        "⚠️ [MESSAGE_PROCESSOR] Ignoring duplicate aiResponse - already processed via streaming"
      );
      return;
    }

    // Cancela timer de debounce anterior
    if (this.responseDebounceTimer) {
      clearTimeout(this.responseDebounceTimer);
    }

    // Processa com debounce
    this.responseDebounceTimer = setTimeout(() => {
      this.handleAiResponse(
        aiResponseText,
        currentMessages,
        conversationMessages
      );
    }, 300);
  }

  /**
   * Processa uma mensagem do usuário
   */
  processUserMessage(
    content: string,
    context?: string,
    onComplete?: () => void
  ): void {
    if (!content.trim()) return;

    // Reset internal state for new user message
    this.resetState();

    // Adiciona mensagem do usuário
    this.addMessage({
      type: "user",
      content: content,
      hasContext: !!context,
      contextContent: context,
    });

    // Inicia estado de processamento
    this.onProcessingStateChange(true);
    this.startProcessingTimeout();

    // Chama callback de conclusão
    if (onComplete) {
      setTimeout(onComplete, 0);
    }
  }

  /**
   * Processa uma mensagem completa do streaming
   */
  processStreamingComplete(content: string): void {
    if (!content || content.trim() === "") return;

    console.log("📝 [MESSAGE_PROCESSOR] processStreamingComplete called:", {
      content: content.substring(0, 50),
      lastProcessedResponse: this.lastProcessedResponse
        ? this.lastProcessedResponse.substring(0, 50)
        : "null",
      processingResponseRef: this.processingResponseRef
        ? this.processingResponseRef.substring(0, 50)
        : "null",
    });

    // Verifica se já foi processada
    const normalizedContent = this.normalizeForComparison(content);
    const normalizedLast = this.lastProcessedResponse
      ? this.normalizeForComparison(this.lastProcessedResponse)
      : "";

    if (normalizedContent === normalizedLast) {
      console.warn(
        "⚠️ [MESSAGE_PROCESSOR] Duplicate streaming content detected, skipping"
      );
      return;
    }

    // Adiciona mensagem do assistente (não system!)
    this.addMessage({
      type: "assistant",
      content: content,
    });

    // Marca como processada para evitar duplicação
    // Armazena o conteúdo original (não normalizado) para comparação precisa
    this.lastProcessedResponse = content;
    this.processingResponseRef = content;
    this.streamingCompleted = true; // Marca que o streaming foi completado

    console.log("✅ [MESSAGE_PROCESSOR] Streaming complete, message added");

    // Limpa resposta de IA IMEDIATAMENTE para evitar processamento duplicado
    // pelo debounce em processAiResponse
    this.onClearAiResponse();

    // Cancela qualquer timer de debounce pendente
    if (this.responseDebounceTimer) {
      clearTimeout(this.responseDebounceTimer);
      this.responseDebounceTimer = null;
    }

    // Finaliza processamento
    this.clearProcessingState();
  }

  /**
   * Limpa estado de processamento
   */
  clearProcessingState(): void {
    this.processingResponseRef = "";
    this.isReceivingResponse = false;
    this.onProcessingStateChange(false);
    // Nota: NÃO limpa streamingCompleted aqui - apenas no resetState()

    if (this.responseDebounceTimer) {
      clearTimeout(this.responseDebounceTimer);
      this.responseDebounceTimer = null;
    }

    if (this.processingTimeout) {
      clearTimeout(this.processingTimeout);
      this.processingTimeout = null;
    }
  }

  /**
   * Limpa resposta processada quando texto é limpo
   */
  clearProcessingRef(aiResponseText?: string): void {
    if (!aiResponseText || aiResponseText.trim() === "") {
      console.log(
        "[MESSAGE_PROCESSOR] Clearing processing refs due to empty aiResponseText"
      );
      this.processingResponseRef = "";
      this.lastProcessedResponse = "";
      this.isReceivingResponse = false;
      // Também limpa o flag de streaming quando não há resposta
      this.streamingCompleted = false;
    }
  }

  /**
   * Limpa recursos ao desmontar
   */
  dispose(): void {
    this.clearProcessingState();
  }

  // Métodos privados

  private handleAiResponse(
    aiResponseText: string,
    currentMessages: ChatMessage[],
    conversationMessages?: ChatMessage[]
  ): void {
    console.log("🔍 [MESSAGE_PROCESSOR] handleAiResponse called:", {
      aiResponseText: aiResponseText
        ? aiResponseText.substring(0, 50)
        : "empty",
      streamingCompleted: this.streamingCompleted,
      lastProcessedResponse: this.lastProcessedResponse
        ? this.lastProcessedResponse.substring(0, 50)
        : "null",
    });

    // Verifica resposta vazia
    if (!aiResponseText || aiResponseText.trim() === "") {
      this.clearProcessingState();
      return;
    }

    // Se o streaming já foi completado, ignora processamento regular
    if (this.streamingCompleted) {
      console.log(
        "⚠️ [MESSAGE_PROCESSOR] Streaming already completed, skipping regular processing"
      );
      this.clearProcessingState();
      return;
    }

    // Limpa a resposta ANTES de qualquer verificação
    const cleanedResponse = cleanThinkTags(aiResponseText);

    // Filtra mensagens de processamento usando a resposta limpa
    if (this.shouldFilterProcessingMessage(cleanedResponse)) {
      console.log("[MESSAGE_PROCESSOR] Filtering processing message");
      this.clearProcessingState();
      this.onClearAiResponse();
      return;
    }

    // Verifica duplicação usando a resposta limpa
    if (
      this.isDuplicate(cleanedResponse, currentMessages, conversationMessages)
    ) {
      console.log("⚠️ [MESSAGE_PROCESSOR] Duplicate response detected", {
        normalized: this.normalizeForComparison(cleanedResponse),
        lastProcessed: this.lastProcessedResponse
          ? this.normalizeForComparison(this.lastProcessedResponse)
          : null,
      });
      // NÃO atualiza lastProcessedResponse aqui - já foi feito no streaming
      this.processingResponseRef = "";
      this.onClearAiResponse();
      return;
    }

    // Processa resposta final
    if (this.isFinalResponse(cleanedResponse)) {
      this.processFinalResponse(cleanedResponse);
    } else {
      console.log("🔄 [MESSAGE_PROCESSOR] Partial response, waiting...");
      this.isReceivingResponse = true;
    }
  }

  private processFinalResponse(cleanedResponse: string): void {
    console.log("🔍 [MESSAGE_PROCESSOR] processFinalResponse called:", {
      cleanedResponse: cleanedResponse.substring(0, 50),
      lastProcessedResponse: this.lastProcessedResponse
        ? this.lastProcessedResponse.substring(0, 50)
        : "null",
      streamingCompleted: this.streamingCompleted,
    });

    // Se já foi processado via streaming, não adiciona novamente
    if (this.streamingCompleted) {
      console.log(
        "⚠️ [MESSAGE_PROCESSOR] Already processed via streaming, skipping final response"
      );
      this.clearProcessingState();
      this.processingResponseRef = "";
      this.onClearAiResponse();
      return;
    }

    // A resposta já vem limpa, então a verificação de streaming pode usar a mesma
    if (this.wasStreamedAndAdded(cleanedResponse, cleanedResponse)) {
      console.log("✅ [MESSAGE_PROCESSOR] Already added via streaming");
      this.clearProcessingState();
      this.processingResponseRef = "";
      this.onClearAiResponse();
      return;
    }

    // Adiciona resposta do assistente (não system!)
    this.addMessage({
      type: "assistant",
      content: cleanedResponse,
    });

    // Limpa estado
    this.clearProcessingState();

    setTimeout(() => {
      this.processingResponseRef = "";
      this.onClearAiResponse();
    }, 500);
  }

  private isProcessingMessage(text: string): boolean {
    return text === "Processing..." || text === "Processando...";
  }

  private shouldFilterProcessingMessage(text: string): boolean {
    return (
      text.includes("Processando") ||
      text.includes("Generating") ||
      text.includes("...")
    );
  }

  private isFinalResponse(text: string): boolean {
    return !this.shouldFilterProcessingMessage(text) && !text.endsWith("...");
  }

  private isDuplicate(
    text: string,
    currentMessages: ChatMessage[],
    conversationMessages?: ChatMessage[]
  ): boolean {
    // Normaliza texto para comparação (remove diferenças de formatação)
    const normalizedText = this.normalizeForComparison(text);

    // Verifica se já foi processada
    if (
      this.lastProcessedResponse &&
      normalizedText === this.normalizeForComparison(this.lastProcessedResponse)
    ) {
      console.log("🔍 [isDuplicate] Matched with lastProcessedResponse");
      return true;
    }

    // 🚨 DEBUG: Verifica duplicação nas mensagens atuais
    const isDuplicateInCurrent = currentMessages.some(
      (msg) => {
        const isMatch = (msg.type === "system" || msg.type === "assistant") &&
          this.normalizeForComparison(msg.content) === normalizedText;
        
        if (isMatch) {
          console.log("🔍 [isDuplicate] MATCH in currentMessages:", {
            msgType: msg.type,
            msgContent: msg.content.substring(0, 100),
            normalizedMsg: this.normalizeForComparison(msg.content),
            normalizedText: normalizedText
          });
        }
        
        return isMatch;
      }
    );

    if (isDuplicateInCurrent) {
      console.log("🔍 [isDuplicate] Found duplicate in currentMessages");
    }

    // Verifica duplicação nas mensagens da conversa (procura por assistant agora!)
    const isDuplicateInConversation =
      conversationMessages?.some(
        (msg) =>
          (msg.type === "system" || msg.type === "assistant") &&
          this.normalizeForComparison(msg.content) === normalizedText
      ) || false;

    if (isDuplicateInConversation) {
      console.log("🔍 [isDuplicate] Found duplicate in conversationMessages");
    }

    return isDuplicateInCurrent || isDuplicateInConversation;
  }

  private wasStreamedAndAdded(
    response: string,
    cleanedResponse: string
  ): boolean {
    // Usa normalização para comparação mais robusta
    const normalizedCleaned = this.normalizeForComparison(cleanedResponse);

    if (this.lastProcessedResponse) {
      const normalizedLast = this.normalizeForComparison(
        this.lastProcessedResponse
      );
      if (normalizedCleaned === normalizedLast) {
        return true;
      }
    }

    if (this.processingResponseRef) {
      const normalizedRef = this.normalizeForComparison(
        this.processingResponseRef
      );
      const normalizedRefCleaned = this.normalizeForComparison(
        cleanThinkTags(this.processingResponseRef)
      );

      if (
        normalizedCleaned === normalizedRef ||
        normalizedCleaned === normalizedRefCleaned
      ) {
        return true;
      }
    }

    return false;
  }

  private startProcessingTimeout(): void {
    if (this.processingTimeout) {
      clearTimeout(this.processingTimeout);
    }

    // Timeout de 30 segundos para processamento
    this.processingTimeout = setTimeout(() => {
      console.warn("[MESSAGE_PROCESSOR] Processing timeout reached");
      this.clearProcessingState();
    }, 30000);
  }

  /**
 * Normaliza texto para comparação removendo diferenças de formatação
 * Remove espaços extras, quebras de linha múltiplas e normaliza espaços
 * 🚨 CORREÇÃO: Normalização menos agressiva para evitar falsos positivos
 */
private normalizeForComparison(text: string): string {
  // 🎯 CORREÇÃO: Normalização menos agressiva que preserva diferenças essenciais
  return text
    .trim()
    .toLowerCase()
    // Remove apenas espaços extras e quebras de linha, preservando pontuação e caracteres especiais
    .replace(/\s+/g, ' ') // Normaliza espaços múltiplos para um único espaço
    .replace(/\n+/g, ' ') // Converte quebras de linha em espaços
    // Preserva emojis, asteriscos, pontos, vírgulas e outros caracteres importantes
    // que podem diferenciar mensagens do agente
    .replace(/[\r\t]/g, ''); // Remove apenas tabs e carriage returns
}
}
