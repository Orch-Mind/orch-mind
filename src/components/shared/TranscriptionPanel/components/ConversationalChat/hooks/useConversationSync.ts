// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useEffect, useRef, useState } from "react";
import { ConversationManager } from "../managers/ConversationManager";
import { ChatConversation, ChatMessage } from "../types/ChatTypes";

/**
 * Hook que gerencia sincronização de conversas
 * Aplica SRP: Responsabilidade única - sincronizar conversas
 * Aplica DRY: Reutiliza ConversationManager evitando duplicação
 */
export function useConversationSync(
  currentConversation: ChatConversation | null
) {
  const [syncedMessages, setSyncedMessages] = useState<ChatMessage[]>([]);
  const [isSyncServiceInitialized, setIsSyncServiceInitialized] =
    useState(false);
  const conversationManagerRef = useRef<ConversationManager | null>(null);

  useEffect(() => {
    // Cria o manager se não existir
    if (!conversationManagerRef.current) {
      conversationManagerRef.current = new ConversationManager(
        (state) => {
          console.log("[CHAT_SYNC] Sync completed:", {
            conversationId: state.conversationId,
            messageCount: state.messages.length,
          });
        },
        (error) => {
          console.error("[CHAT_SYNC] Sync error:", error);
        }
      );
    }

    // Inicializa com a conversa atual
    conversationManagerRef.current
      .initialize(currentConversation)
      .then((result) => {
        setSyncedMessages(result.messages);
        setIsSyncServiceInitialized(result.isInitialized);

        // Log de estatísticas
        if (currentConversation) {
          const stats = conversationManagerRef.current!.getSummaryStats();
          if (stats.hasActiveSummary) {
            console.log(
              "[CHAT_SYNC] Loaded conversation with summaries:",
              stats
            );
          }
        }
      });
  }, [currentConversation]);

  // Atualiza mensagens quando mudam
  useEffect(() => {
    if (
      isSyncServiceInitialized &&
      conversationManagerRef.current &&
      currentConversation?.messages
    ) {
      conversationManagerRef.current.updateMessages(
        currentConversation.messages
      );
    }
  }, [currentConversation?.messages, isSyncServiceInitialized]);

  // Cleanup no unmount
  useEffect(() => {
    return () => {
      conversationManagerRef.current?.dispose();
    };
  }, []);

  return {
    syncedMessages,
    isSyncServiceInitialized,
    getMessagesForProcessor: () =>
      conversationManagerRef.current?.getMessagesForProcessor() || [],
    getSummaryStats: () =>
      conversationManagerRef.current?.getSummaryStats() || {
        hasActiveSummary: false,
        totalMessages: 0,
        summaryCount: 0,
        originalMessagesCompressed: 0,
      },
  };
}
