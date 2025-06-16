// Main refactored component
export { ConversationalChat } from "./ConversationalChatRefactored";

// Individual components (for potential reuse)
export { ChatControls } from "./components/ChatControls";
export { ChatInputArea } from "./components/ChatInputArea";
export { ChatMessagesContainer } from "./components/ChatMessagesContainer";
export { ContextInput } from "./components/ContextInput";
export { DebugControls } from "./components/DebugControls";
export { MessageInput } from "./components/MessageInput";
export { ScrollToBottomButton } from "./components/ScrollToBottomButton";
export { TranscriptionDisplay } from "./components/TranscriptionDisplay";

// Hooks
export { useChatScroll } from "./hooks/useChatScroll";
export { useChatState } from "./hooks/useChatState";
export { usePersistentMessages } from "./hooks/usePersistentMessages";

// Types
export type * from "./types/ChatTypes";
