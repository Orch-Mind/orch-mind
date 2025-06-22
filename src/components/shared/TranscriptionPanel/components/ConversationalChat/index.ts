// Export main component
export { ConversationalChat } from "./ConversationalChat";

// Export types
export * from "./types/ChatTypes";

// Export hooks
export { useChatScroll } from "./hooks/useChatScroll";
export { useChatState } from "./hooks/useChatState";
export { useConversationMessages } from "./hooks/useConversationMessages";
export { useConversationSync } from "./hooks/useConversationSync";
export { usePersistentMessages } from "./hooks/usePersistentMessages";
export { useProcessingStatus } from "./hooks/useProcessingStatus";
export { useStreamingHandlers } from "./hooks/useStreamingHandlers";

// Export managers
export { ConversationManager } from "./managers/ConversationManager";
export { MessageProcessor } from "./managers/MessageProcessor";
export { StreamingManager } from "./managers/StreamingManager";
export type { StreamingState } from "./managers/StreamingManager";

// Individual components (for potential reuse)
export { ChatInputArea } from "./components/ChatInputArea";
export { ChatMessagesContainer } from "./components/ChatMessagesContainer";
export { ContextInput } from "./components/ContextInput";
export { MessageInput } from "./components/MessageInput";
export { ScrollToBottomButton } from "./components/ScrollToBottomButton";
export { TranscriptionDisplay } from "./components/TranscriptionDisplay";
