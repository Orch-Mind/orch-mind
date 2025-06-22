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

  constructor(
    private addMessage: (
      message: Omit<ChatMessage, "id" | "timestamp">
    ) => void,
    private onProcessingStateChange: (isProcessing: boolean) => void,
    private onClearAiResponse: () => void,
    private scrollToBottom: (force?: boolean) => void
  ) {}

  /**
   * Processa resposta de IA com debounce
   */
  processAiResponse(
    aiResponseText: string,
    currentMessages: ChatMessage[],
    conversationMessages?: ChatMessage[]
  ): void {
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

    // Adiciona mensagem do usuário
    this.addMessage({
      type: "user",
      content: content,
      hasContext: !!context,
      contextContent: context,
    });

    // Limpa estado para permitir novas respostas
    this.lastProcessedResponse = "";
    this.processingResponseRef = "";

    // Inicia estado de processamento
    this.onProcessingStateChange(true);
    this.startProcessingTimeout();

    // Força scroll para o fim
    setTimeout(() => this.scrollToBottom(true), 50);

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

    // Adiciona mensagem do sistema
    this.addMessage({
      type: "system",
      content: content,
    });

    // Marca como processada para evitar duplicação
    this.lastProcessedResponse = content;
    this.processingResponseRef = content;

    // Limpa resposta de IA
    this.onClearAiResponse();

    // Finaliza processamento
    this.clearProcessingState();

    // Força scroll
    setTimeout(() => this.scrollToBottom(true), 100);
  }

  /**
   * Limpa estado de processamento
   */
  clearProcessingState(): void {
    this.processingResponseRef = "";
    this.isReceivingResponse = false;
    this.onProcessingStateChange(false);

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
      this.processingResponseRef = "";
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
    // Verifica resposta vazia
    if (!aiResponseText || aiResponseText.trim() === "") {
      this.clearProcessingState();
      return;
    }

    // Filtra mensagens de processamento
    if (this.shouldFilterProcessingMessage(aiResponseText)) {
      console.log("[MESSAGE_PROCESSOR] Filtering processing message");
      this.clearProcessingState();
      this.onClearAiResponse();
      return;
    }

    // Verifica duplicação
    if (
      this.isDuplicate(aiResponseText, currentMessages, conversationMessages)
    ) {
      console.log("⚠️ [MESSAGE_PROCESSOR] Duplicate response detected");
      this.lastProcessedResponse = aiResponseText;
      this.processingResponseRef = "";
      this.onClearAiResponse();
      return;
    }

    // Processa resposta final
    if (this.isFinalResponse(aiResponseText)) {
      this.processFinalResponse(aiResponseText);
    } else {
      console.log("🔄 [MESSAGE_PROCESSOR] Partial response, waiting...");
      this.isReceivingResponse = true;
    }
  }

  private processFinalResponse(aiResponseText: string): void {
    const cleanedResponse = cleanThinkTags(aiResponseText);

    // Verifica se já foi processada via streaming
    if (this.wasStreamedAndAdded(aiResponseText, cleanedResponse)) {
      console.log("✅ [MESSAGE_PROCESSOR] Already added via streaming");
      this.clearProcessingState();
      this.processingResponseRef = "";
      this.onClearAiResponse();
      return;
    }

    // Marca como processada
    this.processingResponseRef = aiResponseText;
    this.lastProcessedResponse = cleanedResponse;

    console.log(
      "✅ [MESSAGE_PROCESSOR] Adding final response:",
      cleanedResponse.substring(0, 50)
    );

    // Adiciona resposta
    this.addMessage({
      type: "system",
      content: cleanedResponse,
    });

    // Limpa estado
    this.clearProcessingState();

    // Scroll e limpa resposta
    setTimeout(() => this.scrollToBottom(true), 150);
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
    // Verifica se já foi processada
    if (text === this.lastProcessedResponse) {
      return true;
    }

    // Verifica duplicação nas mensagens atuais
    const isDuplicateInCurrent = currentMessages.some(
      (msg) => msg.type === "system" && msg.content === text
    );

    // Verifica duplicação nas mensagens da conversa
    const isDuplicateInConversation =
      conversationMessages?.some(
        (msg) => msg.type === "system" && msg.content === text
      ) || false;

    return isDuplicateInCurrent || isDuplicateInConversation;
  }

  private wasStreamedAndAdded(
    response: string,
    cleanedResponse: string
  ): boolean {
    return !!(
      (this.lastProcessedResponse &&
        cleanedResponse.trim() === this.lastProcessedResponse.trim()) ||
      (this.processingResponseRef &&
        (response.trim() === this.processingResponseRef.trim() ||
          cleanedResponse.trim() ===
            cleanThinkTags(this.processingResponseRef).trim()))
    );
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
}
