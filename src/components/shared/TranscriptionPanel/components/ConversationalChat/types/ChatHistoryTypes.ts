import { ChatMessage } from "../hooks/usePersistentMessages";

export interface ChatConversation {
  id: string;
  title: string;
  lastMessage: string;
  lastMessageTime: Date;
  createdAt: Date;
  messages: ChatMessage[];
  isActive: boolean;
}

export interface ChatHistoryState {
  conversations: ChatConversation[];
  currentConversationId: string | null;
}

export interface UseChatHistoryReturn {
  conversations: ChatConversation[];
  currentConversation: ChatConversation | null;
  currentConversationId: string | null;
  createNewConversation: () => string;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  updateConversationTitle: (id: string, title: string) => void;
  addMessageToConversation: (
    conversationId: string,
    message: ChatMessage
  ) => Promise<void>;
  searchConversations: (query: string) => ChatConversation[];
  clearConversationMessages: (conversationId: string) => void;
  isSummarizing: boolean;
  tokenStats: {
    currentTokens: number;
    maxTokens: number;
    percentageUsed: number;
    tokensUntilSummarization: number;
  } | null;
  getTokenStats: () => {
    currentTokens: number;
    maxTokens: number;
    percentageUsed: number;
    tokensUntilSummarization: number;
  } | null;
}
