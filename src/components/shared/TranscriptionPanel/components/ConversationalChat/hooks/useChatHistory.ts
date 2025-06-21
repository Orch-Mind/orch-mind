import { nanoid } from "nanoid";
import { useCallback, useEffect, useState } from "react";
import { ChatSummarizationService } from "../services/ChatSummarizationService";
import {
  ChatConversation,
  UseChatHistoryReturn,
} from "../types/ChatHistoryTypes";
import { migrateOldChatMessages } from "../utils/chatHistoryMigration";
import { ChatMessage } from "./usePersistentMessages";

const STORAGE_KEY = "orch-chat-history";
const MAX_TITLE_LENGTH = 50;

// Helper to generate a title from the first message
const generateTitleFromMessage = (message: string): string => {
  const cleaned = message.trim();
  if (cleaned.length <= MAX_TITLE_LENGTH) return cleaned;
  return cleaned.substring(0, MAX_TITLE_LENGTH) + "...";
};

// Helper to safely load from localStorage
const loadFromStorage = (): {
  conversations: ChatConversation[];
  currentId: string | null;
} => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      // Convert date strings back to Date objects
      const conversations = parsed.conversations.map((conv: any) => ({
        ...conv,
        lastMessageTime: new Date(conv.lastMessageTime),
        createdAt: new Date(conv.createdAt),
        messages: conv.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })),
      }));
      return { conversations, currentId: parsed.currentId };
    }
  } catch (error) {
    console.error("Error loading chat history:", error);
  }
  return { conversations: [], currentId: null };
};

// Helper to save to localStorage
const saveToStorage = (
  conversations: ChatConversation[],
  currentId: string | null
) => {
  try {
    console.log("[CHAT_HISTORY] Saving to storage:", {
      conversationCount: conversations.length,
      currentId,
      firstConvId: conversations[0]?.id,
    });
    const data = JSON.stringify({ conversations, currentId });
    localStorage.setItem(STORAGE_KEY, data);
  } catch (error) {
    console.error("Error saving chat history:", error);
  }
};

export const useChatHistory = (): UseChatHistoryReturn => {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);
  const [summarizationService] = useState(() => new ChatSummarizationService());
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [tokenStats, setTokenStats] = useState<any | null>(null);

  // Helper to create a new conversation object - moved up before useEffect
  const createNewConversationObject = (): ChatConversation => {
    const now = new Date();
    return {
      id: nanoid(),
      title: "New Chat",
      lastMessage: "",
      lastMessageTime: now,
      createdAt: now,
      messages: [],
      isActive: true,
    };
  };

  // Load from storage on mount
  useEffect(() => {
    // Try to migrate old messages first
    const migrationPerformed = migrateOldChatMessages();
    if (migrationPerformed) {
      console.log("[CHAT_HISTORY] Migration completed, reloading data...");
    }

    const { conversations: loadedConvs, currentId } = loadFromStorage();
    if (loadedConvs.length > 0) {
      setConversations(loadedConvs);
      setCurrentConversationId(currentId || loadedConvs[0].id);
    } else {
      // Create initial conversation if none exist
      const initialConv = createNewConversationObject();
      setConversations([initialConv]);
      setCurrentConversationId(initialConv.id);
    }
  }, []);

  // Save to storage whenever conversations or currentId changes
  useEffect(() => {
    if (conversations.length > 0) {
      saveToStorage(conversations, currentConversationId);
    }
  }, [conversations, currentConversationId]);

  // Create a new conversation
  const createNewConversation = useCallback((): string => {
    const newConv = createNewConversationObject();
    console.log("[CHAT_HISTORY] Creating new conversation:", newConv.id);
    setConversations((prev) => {
      // Mark all previous conversations as inactive
      const updatedPrev = prev.map((conv) => ({
        ...conv,
        isActive: false,
      }));
      return [newConv, ...updatedPrev];
    });
    setCurrentConversationId(newConv.id);
    return newConv.id;
  }, []);

  // Select a conversation
  const selectConversation = useCallback((id: string) => {
    console.log("[CHAT_HISTORY] Selecting conversation:", id);
    // Update isActive status for all conversations
    setConversations((prev) =>
      prev.map((conv) => ({
        ...conv,
        isActive: conv.id === id,
      }))
    );
    setCurrentConversationId(id);
  }, []);

  // Delete a conversation
  const deleteConversation = useCallback(
    (id: string) => {
      console.log("[CHAT_HISTORY] Deleting conversation:", id);
      setConversations((prev) => {
        const filtered = prev.filter((conv) => conv.id !== id);

        // If we're deleting the current conversation, switch to another
        if (currentConversationId === id && filtered.length > 0) {
          console.log(
            "[CHAT_HISTORY] Switching to conversation:",
            filtered[0].id
          );
          setCurrentConversationId(filtered[0].id);
        } else if (filtered.length === 0) {
          // If no conversations left, create a new one
          const newConv = createNewConversationObject();
          console.log(
            "[CHAT_HISTORY] No conversations left, creating new:",
            newConv.id
          );
          setCurrentConversationId(newConv.id);
          return [newConv];
        }

        return filtered;
      });
    },
    [currentConversationId]
  );

  // Update conversation title
  const updateConversationTitle = useCallback((id: string, title: string) => {
    setConversations((prev) =>
      prev.map((conv) => (conv.id === id ? { ...conv, title } : conv))
    );
  }, []);

  // Add message to a conversation
  const addMessageToConversation = useCallback(
    async (conversationId: string, message: ChatMessage) => {
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id === conversationId) {
            const updatedMessages = [...conv.messages, message];
            const isFirstUserMessage =
              message.type === "user" &&
              conv.title === "New Chat" &&
              updatedMessages.filter((m) => m.type === "user").length === 1;

            return {
              ...conv,
              messages: updatedMessages,
              lastMessage: message.content,
              lastMessageTime: message.timestamp,
              // Auto-generate title from first user message
              title: isFirstUserMessage
                ? generateTitleFromMessage(message.content)
                : conv.title,
            };
          }
          return conv;
        })
      );

      // Check if summarization is needed after adding the message
      const conversation = conversations.find(
        (conv) => conv.id === conversationId
      );
      if (conversation) {
        const updatedMessages = [...conversation.messages, message];

        // Check if we need to summarize
        if (summarizationService.needsSummarization(updatedMessages)) {
          console.log("[CHAT_HISTORY] Triggering automatic summarization");

          // Get token stats before summarization
          const tokenStats =
            summarizationService.getTokenStats(updatedMessages);

          // Set summarizing state with token info
          setIsSummarizing(true);
          setTokenStats(tokenStats);

          try {
            // Apply summarization asynchronously
            const summarizedMessages =
              await summarizationService.applySummarization(updatedMessages);

            // Update the conversation with summarized messages
            setConversations((prev) =>
              prev.map((conv) => {
                if (conv.id === conversationId) {
                  return {
                    ...conv,
                    messages: summarizedMessages,
                    lastMessage:
                      summarizedMessages[summarizedMessages.length - 1]
                        ?.content || conv.lastMessage,
                    lastMessageTime:
                      summarizedMessages[summarizedMessages.length - 1]
                        ?.timestamp || conv.lastMessageTime,
                  };
                }
                return conv;
              })
            );

            // Get new token stats after summarization
            const newTokenStats =
              summarizationService.getTokenStats(summarizedMessages);

            console.log(
              `[CHAT_HISTORY] Summarization complete. Tokens reduced from ${tokenStats.currentTokens} to ${newTokenStats.currentTokens}`
            );
          } catch (error) {
            console.error("[CHAT_HISTORY] Summarization failed:", error);
          } finally {
            // Clear summarizing state
            setIsSummarizing(false);
            setTokenStats(null);
          }
        }
      }
    },
    [conversations, summarizationService]
  );

  // Get token statistics for current conversation
  const getTokenStats = useCallback(() => {
    const conv = conversations.find((c) => c.id === currentConversationId);
    if (!conv) return null;
    return summarizationService.getTokenStats(conv.messages);
  }, [conversations, currentConversationId, summarizationService]);

  // Search conversations
  const searchConversations = useCallback(
    (query: string): ChatConversation[] => {
      const lowerQuery = query.toLowerCase();
      return conversations.filter(
        (conv) =>
          conv.title.toLowerCase().includes(lowerQuery) ||
          conv.messages.some((msg) =>
            msg.content.toLowerCase().includes(lowerQuery)
          )
      );
    },
    [conversations]
  );

  // Clear messages from a conversation
  const clearConversationMessages = useCallback((conversationId: string) => {
    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id === conversationId) {
          return {
            ...conv,
            messages: [],
            lastMessage: "",
            lastMessageTime: new Date(),
          };
        }
        return conv;
      })
    );
  }, []);

  // Get current conversation
  const currentConversation =
    conversations.find((conv) => conv.id === currentConversationId) || null;

  return {
    conversations,
    currentConversation,
    currentConversationId,
    createNewConversation,
    selectConversation,
    deleteConversation,
    updateConversationTitle,
    addMessageToConversation,
    searchConversations,
    clearConversationMessages,
    isSummarizing,
    tokenStats,
    getTokenStats,
  };
};
