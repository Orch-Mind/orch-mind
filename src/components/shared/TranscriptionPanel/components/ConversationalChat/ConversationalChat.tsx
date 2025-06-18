import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSettingsState } from "../settings/useSettingsState";
import { AudioSettingsPopover } from "./components/AudioSettingsPopover";
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
  // Audio settings props
  language,
  setLanguage,
  isMicrophoneOn,
  setIsMicrophoneOn,
  isSystemAudioOn,
  setIsSystemAudioOn,
  audioDevices,
  selectedDevices,
  handleDeviceChange,
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

  // Audio settings state
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const audioSettingsButtonRef = useRef<HTMLElement>(null!);
  const audioSettings = useSettingsState(showAudioSettings);

  // Refs for scroll management
  const messagesContainerRef = useRef<HTMLDivElement>(null!);

  // Use the updated scroll hook
  const scrollState = useChatScroll({
    messages: chatMessages,
    messagesContainerRef,
  });

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

  // Track if we're currently receiving a response
  const isReceivingResponse = useRef(false);
  const lastProcessedResponse = useRef<string>("");
  const responseDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Handle AI response processing with debounce and better state management
  useEffect(() => {
    if (!aiResponseText || aiResponseText.trim() === "") {
      return;
    }

    // Handle processing state
    if (
      aiResponseText === "Processing..." ||
      aiResponseText === "Processando..."
    ) {
      chatState.setIsProcessing(true);
      isReceivingResponse.current = true;
      return;
    }

    // Clear any existing debounce timer
    if (responseDebounceTimer.current) {
      clearTimeout(responseDebounceTimer.current);
    }

    // Debounce the response processing to avoid rapid updates
    responseDebounceTimer.current = setTimeout(() => {
      // Check if this is truly a new response
      if (aiResponseText === lastProcessedResponse.current) {
        console.log("⚠️ [CHAT] Same response, skipping");
        return;
      }

      // Check for duplicates in existing messages
      const isDuplicate = chatMessages.some(
        (msg) => msg.type === "system" && msg.content === aiResponseText
      );

      if (isDuplicate) {
        console.log("⚠️ [CHAT] Duplicate AI response in messages, skipping");
        return;
      }

      // Check if this looks like a final response (not partial)
      // A final response typically doesn't end with "..." and has reasonable length
      const looksLikeFinalResponse =
        !aiResponseText.endsWith("...") &&
        aiResponseText.length > 10 &&
        !aiResponseText.includes("Processando") &&
        !aiResponseText.includes("Processing");

      if (looksLikeFinalResponse) {
        console.log(
          "✅ [CHAT] Adding final AI response:",
          aiResponseText.substring(0, 50)
        );

        // Add AI response
        addMessage({
          type: "system",
          content: aiResponseText,
        });

        // Update last processed response
        lastProcessedResponse.current = aiResponseText;

        // Clear processing state
        chatState.setIsProcessing(false);
        isReceivingResponse.current = false;

        if (chatState.processingTimeoutRef.current) {
          clearTimeout(chatState.processingTimeoutRef.current);
          chatState.processingTimeoutRef.current = null;
        }

        // Only clear AI response after successfully adding the message
        // Add a small delay to ensure the message is properly saved
        setTimeout(() => {
          onClearAiResponse();
        }, 100);
      } else {
        console.log("🔄 [CHAT] Partial response detected, waiting for more...");
        // For partial responses, just update the processing state
        isReceivingResponse.current = true;
      }
    }, 300); // 300ms debounce

    // Cleanup function
    return () => {
      if (responseDebounceTimer.current) {
        clearTimeout(responseDebounceTimer.current);
      }
    };
  }, [aiResponseText, chatMessages, addMessage, onClearAiResponse, chatState]);

  // Handle send message (KISS principle - simple and clear)
  const handleSendMessage = useCallback(() => {
    const messageContent = chatState.inputMessage.trim();

    if (!messageContent && !transcriptionText.trim()) {
      return;
    }

    const finalContent = messageContent || transcriptionText.trim();

    // Add user message with context info
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

    // Send prompt - pass message and context separately
    setTimeout(() => {
      // Pass the message as first parameter and context as second
      onSendPrompt(finalContent, chatState.currentContext || undefined);
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

  // Handle audio settings toggle
  const handleToggleAudioSettings = useCallback(() => {
    setShowAudioSettings(!showAudioSettings);
  }, [showAudioSettings]);

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

  // Force scroll to bottom on mount and when messages are loaded
  useEffect(() => {
    // Small delay to ensure DOM is fully rendered
    const scrollTimer = setTimeout(() => {
      if (messagesContainerRef.current && chatMessages.length > 0) {
        // Force multiple scroll attempts to ensure we reach the absolute bottom
        const forceScroll = () => {
          if (!messagesContainerRef.current) return;

          const element = messagesContainerRef.current;
          const maxScroll = element.scrollHeight - element.clientHeight;

          // Try different methods to ensure scroll
          element.scrollTop = element.scrollHeight;
          element.scrollTo(0, element.scrollHeight);

          // Verify and retry if needed
          requestAnimationFrame(() => {
            if (element.scrollTop < maxScroll - 2) {
              element.scrollTop = maxScroll + 100; // Overshoot to ensure bottom
            }
          });
        };

        // Execute multiple times with delays
        forceScroll();
        setTimeout(forceScroll, 100);
        setTimeout(forceScroll, 300);
      }
    }, 50);

    return () => clearTimeout(scrollTimer);
  }, []); // Only run once on mount

  return (
    <div className="conversational-chat">
      {/* Chat Messages Container */}
      <ChatMessagesContainer
        messages={chatMessages}
        isProcessing={chatState.isProcessing}
        onScrollChange={() => {}} // Not needed anymore
        scrollRef={messagesContainerRef}
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
        onToggleAudioSettings={handleToggleAudioSettings}
        showAudioSettings={showAudioSettings}
        audioSettingsButtonRef={audioSettingsButtonRef}
      />

      {/* Audio Settings Popover */}
      <AudioSettingsPopover
        show={showAudioSettings}
        onClose={() => setShowAudioSettings(false)}
        anchorRef={audioSettingsButtonRef}
        settings={{
          // Language
          language: language || "pt-BR",
          setLanguage: setLanguage || (() => {}),

          // Device selection
          isMicrophoneOn: isMicrophoneOn || false,
          setIsMicrophoneOn: setIsMicrophoneOn || (() => {}),
          isSystemAudioOn: isSystemAudioOn || false,
          setIsSystemAudioOn: setIsSystemAudioOn || (() => {}),
          audioDevices: audioDevices || [],
          selectedDevices: selectedDevices || {
            microphone: null,
            systemAudio: null,
          },
          handleDeviceChange: handleDeviceChange || (() => {}),
        }}
      />
    </div>
  );
};

// Custom comparison to ignore frequent transcriptionText updates
function areEqual(
  prev: ConversationalChatProps,
  next: ConversationalChatProps
) {
  const isEqual =
    prev.aiResponseText === next.aiResponseText &&
    prev.temporaryContext === next.temporaryContext &&
    prev.microphoneState === next.microphoneState &&
    prev.onAiResponseChange === next.onAiResponseChange &&
    prev.onClearAiResponse === next.onClearAiResponse &&
    prev.onClearTranscription === next.onClearTranscription &&
    prev.onSendPrompt === next.onSendPrompt &&
    prev.onToggleRecording === next.onToggleRecording &&
    prev.onTranscriptionChange === next.onTranscriptionChange &&
    // Audio settings comparisons (only check if props changed, not device arrays)
    prev.language === next.language &&
    prev.setLanguage === next.setLanguage &&
    prev.isMicrophoneOn === next.isMicrophoneOn &&
    prev.setIsMicrophoneOn === next.setIsMicrophoneOn &&
    prev.isSystemAudioOn === next.isSystemAudioOn &&
    prev.setIsSystemAudioOn === next.setIsSystemAudioOn &&
    prev.handleDeviceChange === next.handleDeviceChange;
  // transcriptionText, audioDevices and selectedDevices deliberately ignored

  if (!isEqual && process.env.NODE_ENV !== "production") {
    console.log(
      "🔄 [CHAT_RERENDER] ConversationalChat re-rendering due to prop change:",
      {
        aiResponseChanged: prev.aiResponseText !== next.aiResponseText,
        aiResponseText: {
          prev: prev.aiResponseText?.substring(0, 50),
          next: next.aiResponseText?.substring(0, 50),
        },
        temporaryContextChanged:
          prev.temporaryContext !== next.temporaryContext,
        microphoneStateChanged: prev.microphoneState !== next.microphoneState,
      }
    );
  }

  return isEqual;
}

// Export component with memo to prevent unnecessary re-renders
export const ConversationalChat = React.memo(
  ConversationalChatRefactored,
  areEqual
);
