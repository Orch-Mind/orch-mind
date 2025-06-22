// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { ConversationSyncService } from "../services/ConversationSyncService";
import { ChatConversation, ChatMessage } from "../types/ChatTypes";

/**
 * ConversationManager - Responsável por gerenciar a sincronização e estado da conversa
 * Aplica SRP: Uma única responsabilidade - gerenciar conversas
 */
export class ConversationManager {
  private syncService: ConversationSyncService | null = null;
  private isInitialized: boolean = false;
  private currentConversationId: string | null = null;

  constructor(
    private onSyncComplete?: (state: any) => void,
    private onSyncError?: (error: Error) => void
  ) {}

  /**
   * Inicializa ou atualiza a conversa atual
   */
  async initialize(conversation: ChatConversation | null): Promise<{
    messages: ChatMessage[];
    isInitialized: boolean;
  }> {
    // Se não há conversa, limpa o estado
    if (!conversation) {
      this.dispose();
      return { messages: [], isInitialized: false };
    }

    // Se mudou de conversa, limpa o serviço anterior
    if (this.currentConversationId !== conversation.id) {
      this.dispose();
      this.currentConversationId = conversation.id;
    }

    // Cria novo serviço de sincronização
    this.syncService = new ConversationSyncService({
      autoSync: true,
      syncInterval: 3000,
      onSyncComplete: this.onSyncComplete,
      onSyncError: this.onSyncError,
    });

    // Inicializa com a conversa atual
    const state = await this.syncService.initialize(conversation);
    this.isInitialized = true;

    return {
      messages: state.messages,
      isInitialized: true,
    };
  }

  /**
   * Atualiza as mensagens da conversa
   */
  updateMessages(messages: ChatMessage[]): void {
    if (this.isInitialized && this.syncService) {
      this.syncService.updateMessages(messages);
    }
  }

  /**
   * Obtém mensagens formatadas para o processador
   */
  getMessagesForProcessor(): Array<{ role: string; content: string }> {
    if (!this.syncService) {
      return [];
    }
    // Converte ChatMessage[] para o formato esperado pelo processador
    const messages = this.syncService.getMessagesForProcessor();
    return messages.map((msg) => ({
      role: msg.type === "user" ? "user" : "system",
      content: msg.content,
    }));
  }

  /**
   * Obtém estatísticas de resumo
   */
  getSummaryStats() {
    return (
      this.syncService?.getSummaryStats() || {
        hasActiveSummary: false,
        totalMessages: 0,
        summaryCount: 0,
        originalMessagesCompressed: 0,
      }
    );
  }

  /**
   * Limpa recursos
   */
  dispose(): void {
    if (this.syncService) {
      this.syncService.dispose();
      this.syncService = null;
    }
    this.isInitialized = false;
    this.currentConversationId = null;
  }
}
