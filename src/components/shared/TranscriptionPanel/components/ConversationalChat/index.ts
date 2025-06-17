// Export main component
export { ConversationalChat } from "./ConversationalChat";

// Export types
export * from "./types/ChatTypes";

// Export hooks
export { useChatScroll } from "./hooks/useChatScroll";
export { useChatState } from "./hooks/useChatState";
export { usePersistentMessages } from "./hooks/usePersistentMessages";

// Individual components (for potential reuse)
export { ChatInputArea } from "./components/ChatInputArea";
export { ChatMessagesContainer } from "./components/ChatMessagesContainer";
export { ContextInput } from "./components/ContextInput";
export { MessageInput } from "./components/MessageInput";
export { ScrollToBottomButton } from "./components/ScrollToBottomButton";
export { TranscriptionDisplay } from "./components/TranscriptionDisplay";
