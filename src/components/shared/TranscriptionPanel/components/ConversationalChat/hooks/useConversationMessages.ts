// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useCallback, useEffect } from "react";
import { ChatConversation } from "../types/ChatHistoryTypes";
import { ChatMessage } from "./usePersistentMessages";

interface AddMessageParams {
  type: "user" | "system" | "error";
  content: string;
  hasContext?: boolean;
  contextContent?: string;
}

interface UseConversationMessagesReturn {
  messages: ChatMessage[];
  addMessage: (params: AddMessageParams) => void;
  clearMessages: () => void;
}

interface UseConversationMessagesProps {
  currentConversation: ChatConversation | null;
  onAddMessage: (conversationId: string, message: ChatMessage) => Promise<void>;
  onClearConversation: (conversationId: string) => void;
}

export const useConversationMessages = ({
  currentConversation,
  onAddMessage,
  onClearConversation,
}: UseConversationMessagesProps): UseConversationMessagesReturn => {
  // Get messages from current conversation
  const messages = currentConversation?.messages || [];

  // Add message to current conversation
  const addMessage = useCallback(
    (params: AddMessageParams) => {
      if (!currentConversation) return;

      const newMessage: ChatMessage = {
        id: `${currentConversation.id}-${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        ...params,
      };

      onAddMessage(currentConversation.id, newMessage);
    },
    [currentConversation, onAddMessage]
  );

  // Clear messages from current conversation
  const clearMessages = useCallback(() => {
    if (!currentConversation) return;

    if (onClearConversation) {
      onClearConversation(currentConversation.id);
    }
  }, [currentConversation, onClearConversation]);

  // Log conversation changes for debugging
  useEffect(() => {
    if (currentConversation) {
      console.log(`[CONVERSATION] Switched to conversation:`, {
        id: currentConversation.id,
        title: currentConversation.title,
        messageCount: messages.length,
      });
    } else {
      console.log(`[CONVERSATION] No current conversation`);
    }
  }, [currentConversation?.id, messages.length]);

  return {
    messages,
    addMessage,
    clearMessages,
  };
};
