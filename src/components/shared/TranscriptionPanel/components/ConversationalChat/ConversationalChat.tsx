import React, { useCallback, useEffect, useRef } from "react";
import { ChatInputArea } from "./components/ChatInputArea";
import { ChatMessagesContainer } from "./components/ChatMessagesContainer";
import "./ConversationalChat.css";
import { useChatScroll } from "./hooks/useChatScroll";
import { useChatState } from "./hooks/useChatState";
import { usePersistentMessages } from "./hooks/usePersistentMessages";
import { ConversationalChatProps } from "./types/ChatTypes";

/**
 * Refactored Conversational Chat Component
 *
 * Applies SOLID, DRY, KISS, and YAGNI principles:
 *
 * SOLID:
 * - Single Responsibility: Each component has one clear purpose
 * - Open/Closed: Components are open for extension, closed for modification
 * - Liskov Substitution: Components can be replaced with compatible implementations
 * - Interface Segregation: Components only depend on interfaces they use
 * - Dependency Inversion: Depends on abstractions (hooks) not concrete implementations
 *
 * DRY: Shared logic in hooks, reusable components, no code duplication
 * KISS: Simple, focused components that are easy to understand
 * YAGNI: Debug functionality separated and only included in development
 */
const ConversationalChatRefactored: React.FC<ConversationalChatProps> = ({
  transcriptionText,
  onTranscriptionChange,
  onClearTranscription,
  aiResponseText,
  onAiResponseChange,
  onClearAiResponse,
  temporaryContext,
  onTemporaryContextChange,
  microphoneState,
  onToggleRecording,
  onSendPrompt,
}) => {
  // Component lifecycle tracking
  const componentId = useRef(
    `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  );
  const mountTime = useRef(Date.now());

  // Custom hooks for state management (Dependency Inversion Principle)
  const {
    messages: chatMessages,
    addMessage,
    clearMessages,
    recovery,
  } = usePersistentMessages();

  const chatState = useChatState();
  const scrollState = useChatScroll(chatMessages.length);

  // Log component lifecycle (only in development)
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.log("🔄 [CHAT_LIFECYCLE] Component MOUNTED:", {
        componentId: componentId.current,
        mountTime: new Date(mountTime.current).toISOString(),
      });

      return () => {
        console.log("🔄 [CHAT_LIFECYCLE] Component UNMOUNTING:", {
          componentId: componentId.current,
          lifespan: Date.now() - mountTime.current,
        });
      };
    }
  }, []);

  // Auto-restore from backup on mount
  useEffect(() => {
    if (recovery.hasBackup) {
      console.log("🔄 [CHAT_LIFECYCLE] Backup detected, auto-restoring...");
      recovery.restoreFromBackup();
    }
  }, [recovery]);

  // Handle AI response processing (simplified logic)
  useEffect(() => {
    if (
      !aiResponseText ||
      aiResponseText.trim() === "" ||
      aiResponseText === "Processing..." ||
      aiResponseText === "Processando..."
    ) {
      if (
        aiResponseText === "Processing..." ||
        aiResponseText === "Processando..."
      ) {
        chatState.setIsProcessing(true);
      }
      return;
    }

    // Check for duplicates
    const isDuplicate = chatMessages.some(
      (msg) => msg.type === "system" && msg.content === aiResponseText
    );

    if (isDuplicate) {
      console.log("⚠️ [CHAT] Duplicate AI response, skipping");
      return;
    }

    // Add AI response
    addMessage({
      type: "system",
      content: aiResponseText,
    });

    // Clear processing state
    chatState.setIsProcessing(false);
    if (chatState.processingTimeoutRef.current) {
      clearTimeout(chatState.processingTimeoutRef.current);
      chatState.processingTimeoutRef.current = null;
    }

    // Clear AI response
    onClearAiResponse();
  }, [aiResponseText, chatMessages, addMessage, onClearAiResponse, chatState]);

  // Handle send message (KISS principle - simple and clear)
  const handleSendMessage = useCallback(() => {
    const messageContent = chatState.inputMessage.trim();

    if (!messageContent && !transcriptionText.trim()) {
      return;
    }

    const finalContent = messageContent || transcriptionText.trim();
    const finalContext = chatState.currentContext
      ? `${finalContent}\n\nContext: ${chatState.currentContext}`
      : finalContent;

    // Add user message
    addMessage({
      type: "user",
      content: finalContent,
      hasContext: !!chatState.currentContext,
      contextContent: chatState.currentContext || undefined,
    });

    // Clear inputs
    chatState.setInputMessage("");
    chatState.setCurrentContext("");
    chatState.setShowContextField(false);
    onTemporaryContextChange("");

    // Set processing state with timeout
    chatState.setIsProcessing(true);
    if (chatState.processingTimeoutRef.current) {
      clearTimeout(chatState.processingTimeoutRef.current);
    }

    chatState.processingTimeoutRef.current = setTimeout(() => {
      chatState.setIsProcessing(false);
      addMessage({
        type: "system",
        content:
          "⚠️ Timeout: A resposta da IA demorou muito para chegar. Tente novamente.",
      });
    }, 30000);

    // Send prompt
    setTimeout(() => {
      onSendPrompt(finalContext);
    }, 0);
  }, [
    chatState,
    transcriptionText,
    addMessage,
    onTemporaryContextChange,
    onSendPrompt,
  ]);

  // Handle key press (Enter to send, Shift+Enter for new line)
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  // Handle context toggle
  const handleToggleContext = useCallback(() => {
    if (chatState.showContextField) {
      chatState.setCurrentContext("");
      chatState.setShowContextField(false);
    } else {
      chatState.setShowContextField(true);
    }
  }, [chatState]);

  // Debug functions (YAGNI principle - only in development)
  const debugFunctions = React.useMemo(() => {
    if (process.env.NODE_ENV === "production") {
      return {};
    }

    return {
      addTestMessage: () => {
        addMessage({
          type: "user",
          content: "Test message",
        });
      },
      addTestAIResponse: () => {
        addMessage({
          type: "system",
          content:
            "This is a test AI response to verify the chat is working correctly.",
        });
      },
      resetChatState: () => {
        chatState.setIsProcessing(false);
        if (chatState.processingTimeoutRef.current) {
          clearTimeout(chatState.processingTimeoutRef.current);
          chatState.processingTimeoutRef.current = null;
        }
      },
    };
  }, [addMessage, chatState]);

  return (
    <div className="conversational-chat">
      {/* Chat Messages Container */}
      <ChatMessagesContainer
        messages={chatMessages}
        isProcessing={chatState.isProcessing}
        onScrollChange={scrollState.handleScroll}
        scrollRef={scrollState.messagesRef}
        showScrollButton={scrollState.showScrollButton}
        onScrollToBottom={scrollState.scrollToBottom}
        onAddTestMessage={debugFunctions.addTestMessage}
        onResetState={debugFunctions.resetChatState}
        onClearMessages={clearMessages}
      />

      {/* Chat Input Area */}
      <ChatInputArea
        transcriptionText={transcriptionText}
        onTranscriptionChange={onTranscriptionChange}
        onClearTranscription={onClearTranscription}
        aiResponseText={aiResponseText}
        onAiResponseChange={onAiResponseChange}
        onClearAiResponse={onClearAiResponse}
        temporaryContext={temporaryContext}
        onTemporaryContextChange={onTemporaryContextChange}
        microphoneState={microphoneState}
        onToggleRecording={onToggleRecording}
        onSendPrompt={onSendPrompt}
        chatState={chatState}
        onSendMessage={handleSendMessage}
        onKeyPress={handleKeyPress}
        onToggleContext={handleToggleContext}
        onAddTestMessage={debugFunctions.addTestMessage || (() => {})}
        onAddTestAI={debugFunctions.addTestAIResponse || (() => {})}
        onRestore={recovery.restoreFromBackup}
        onClearAll={() => {
          clearMessages();
          recovery.clearBackup();
        }}
        hasBackup={recovery.hasBackup}
      />
    </div>
  );
};

// Custom comparison to ignore frequent transcriptionText updates
function areEqual(
  prev: ConversationalChatProps,
  next: ConversationalChatProps
) {
  return (
    prev.aiResponseText === next.aiResponseText &&
    prev.temporaryContext === next.temporaryContext &&
    prev.microphoneState === next.microphoneState &&
    prev.onAiResponseChange === next.onAiResponseChange &&
    prev.onClearAiResponse === next.onClearAiResponse &&
    prev.onClearTranscription === next.onClearTranscription &&
    prev.onSendPrompt === next.onSendPrompt &&
    prev.onToggleRecording === next.onToggleRecording &&
    prev.onTranscriptionChange === next.onTranscriptionChange
    // transcriptionText deliberately ignored
  );
}

// Export component with memo to prevent unnecessary re-renders
export const ConversationalChat = React.memo(
  ConversationalChatRefactored,
  areEqual
);
