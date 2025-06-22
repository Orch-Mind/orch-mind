import React, { useCallback, useEffect, useRef, useState } from "react";
import { cleanThinkTags } from "../../../../context/deepgram/utils/ThinkTagCleaner";
import { useSettingsState } from "../settings/useSettingsState";
import { AudioSettingsPopover } from "./components/AudioSettingsPopover";
import { ChatInputArea } from "./components/ChatInputArea";
import { ChatMessagesContainer } from "./components/ChatMessagesContainer";
import { SummarizationIndicator } from "./components/SummarizationIndicator";
import { TokenStatusBar } from "./components/TokenStatusBar";
import "./ConversationalChat.css";
import { useChatScroll } from "./hooks/useChatScroll";
import { useChatState } from "./hooks/useChatState";
import { useConversationMessages } from "./hooks/useConversationMessages";
import { usePersistentMessages } from "./hooks/usePersistentMessages";
import { ConversationSyncService } from "./services/ConversationSyncService";
import "./styles/ConversationalChat.input.css";
import "./styles/ConversationalChat.messages.css";
import { ConversationalChatProps } from "./types/ChatTypes";

// NOTA: A persistência do estado de processamento foi removida em favor de
// bloquear a mudança de conversa durante o processamento. Isso garante que
// o usuário não perca o processamento ao trocar de conversa acidentalmente.

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
  // Chat History props
  currentConversation,
  onAddMessageToConversation,
  onProcessingChange,
  chatHistory,
}) => {
  // Component lifecycle tracking
  const componentId = useRef(
    `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  );
  const mountTime = useRef(Date.now());

  // Ref para rastrear a conversa anterior
  const previousConversationId = useRef<string | null>(null);

  // Track saved conversation ID
  const savedConversationIdRef = useRef<string | null>(null);

  // Add processing status state
  const [processingStatus, setProcessingStatus] = useState<string>("");

  // Add streaming response state
  const [streamingResponse, setStreamingResponse] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const streamingChunksRef = useRef<string>("");

  // Thinking state - tracks when AI is in thinking phase
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingContent, setThinkingContent] = useState("");

  // Conversation Sync Service
  const syncServiceRef = useRef<ConversationSyncService | null>(null);
  const [syncedMessages, setSyncedMessages] = useState<any[]>([]);

  // Track if sync service is initialized
  const [isSyncServiceInitialized, setIsSyncServiceInitialized] =
    useState(false);

  // Initialize conversation sync service
  useEffect(() => {
    if (!currentConversation) {
      setIsSyncServiceInitialized(false);
      return;
    }

    // Dispose previous sync service
    if (syncServiceRef.current) {
      syncServiceRef.current.dispose();
    }

    // Create new sync service
    syncServiceRef.current = new ConversationSyncService({
      autoSync: true,
      syncInterval: 3000, // 3 seconds
      onSyncComplete: (state) => {
        console.log("[CHAT_SYNC] Sync completed:", {
          conversationId: state.conversationId,
          messageCount: state.messages.length,
        });
      },
      onSyncError: (error) => {
        console.error("[CHAT_SYNC] Sync error:", error);
      },
    });

    // Initialize with current conversation
    syncServiceRef.current.initialize(currentConversation).then((state) => {
      setSyncedMessages(state.messages);
      setIsSyncServiceInitialized(true);

      // Log summary stats
      const stats = syncServiceRef.current!.getSummaryStats();
      if (stats.hasActiveSummary) {
        console.log("[CHAT_SYNC] Loaded conversation with summaries:", {
          totalMessages: stats.totalMessages,
          summaryCount: stats.summaryCount,
          originalMessagesCompressed: stats.originalMessagesCompressed,
        });
      }
    });
  }, [currentConversation]);

  // Clean up sync service on unmount
  useEffect(() => {
    return () => {
      if (syncServiceRef.current) {
        syncServiceRef.current.dispose();
      }
    };
  }, []);

  // Update sync service when messages change
  useEffect(() => {
    // Only update if service is initialized and we have messages
    if (
      isSyncServiceInitialized &&
      syncServiceRef.current &&
      currentConversation?.messages
    ) {
      syncServiceRef.current.updateMessages(currentConversation.messages);
    }
  }, [currentConversation?.messages, isSyncServiceInitialized]);

  // Log prop changes
  useEffect(() => {
    console.log("[CHAT_PROPS] Conversation prop changed:", {
      conversationId: currentConversation?.id,
      title: currentConversation?.title,
      messageCount: currentConversation?.messages.length,
    });
  }, [currentConversation]);

  // Custom hooks for state management (Dependency Inversion Principle)
  // Use conversation messages if available, otherwise fall back to persistent messages
  const persistentMessagesHook = usePersistentMessages();
  const conversationMessagesHook = useConversationMessages({
    currentConversation: currentConversation || null,
    onAddMessage: onAddMessageToConversation || (async () => {}),
    onClearConversation: () => {}, // Will be implemented later
  });

  const chatState = useChatState();

  // Clear input state when conversation changes
  useEffect(() => {
    const currentId = currentConversation?.id;
    const previousId = previousConversationId.current;

    if (currentConversation && currentId) {
      // Clear any input state when switching conversations
      chatState.setInputMessage("");
      chatState.setCurrentContext("");
      chatState.setShowContextField(false);

      // Clear any ongoing processing timeouts
      if (chatState.processingTimeoutRef.current) {
        clearTimeout(chatState.processingTimeoutRef.current);
        chatState.processingTimeoutRef.current = null;
      }

      // Clear any pending AI responses
      if (
        aiResponseText &&
        (aiResponseText === "Processing..." ||
          aiResponseText === "Processando...")
      ) {
        onClearAiResponse();
      }

      // Reset response tracking
      isReceivingResponse.current = false;
      lastProcessedResponse.current = "";

      console.log("[CHAT] Conversation changed, state adjusted");
    }

    // Atualizar referência da conversa anterior
    previousConversationId.current = currentId || null;
  }, [currentConversation?.id, onAiResponseChange]); // chatState and other deps intentionally omitted to prevent infinite loops

  // Select the appropriate hook based on whether we have a conversation system
  const useConversationSystem = !!(
    currentConversation && onAddMessageToConversation
  );
  const {
    messages: chatMessages,
    addMessage,
    clearMessages,
  } = useConversationSystem ? conversationMessagesHook : persistentMessagesHook;

  // Recovery is only available with persistent messages
  const recovery = useConversationSystem
    ? {
        hasBackup: false,
        restoreFromBackup: () => {},
        clearBackup: () => {},
        integrityCheck: () => false,
        lastSaveTime: 0,
      }
    : persistentMessagesHook.recovery;

  // Notify parent when processing state changes
  useEffect(() => {
    if (onProcessingChange) {
      onProcessingChange(chatState.isProcessing);
    }
  }, [chatState.isProcessing, onProcessingChange]);

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

  // Track scroll position to auto-hide TokenStatusBar when at top
  const [isAtTop, setIsAtTop] = useState(false);

  // Monitor scroll position
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // Consider "at top" if within 50 pixels of the top
      const atTop = container.scrollTop <= 50;
      setIsAtTop(atTop);
    };

    // Initial check
    handleScroll();

    // Add scroll listener
    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [chatMessages.length]); // Re-attach when messages change

  // Log component lifecycle (only in development)
  useEffect(() => {
    // Clear state on mount
    chatState.setInputMessage("");
    chatState.setCurrentContext("");
    chatState.setShowContextField(false);
    chatState.setIsProcessing(false);

    if (process.env.NODE_ENV !== "production") {
      console.log("🔄 [CHAT_LIFECYCLE] Component MOUNTED:", {
        componentId: componentId.current,
        mountTime: new Date(mountTime.current).toISOString(),
        conversationId: currentConversation?.id,
      });

      return () => {
        console.log("🔄 [CHAT_LIFECYCLE] Component UNMOUNTING:", {
          componentId: componentId.current,
          lifespan: Date.now() - mountTime.current,
        });

        // Agora que bloqueamos a mudança de conversa durante o processamento,
        // não é mais necessário salvar o estado ao desmontar
      };
    }
  }, []); // chatState, aiResponseText, and currentConversation omitted intentionally - we want this to run only on mount

  // Track if we're currently receiving a response
  const isReceivingResponse = useRef(false);
  const lastProcessedResponse = useRef<string>("");
  const responseDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const processingResponseRef = useRef<string>(""); // Track what we're currently processing

  // Clear processingResponseRef when aiResponseText is cleared
  // This prevents the "Already processing" warning when response is cleared externally
  useEffect(() => {
    if (!aiResponseText || aiResponseText.trim() === "") {
      processingResponseRef.current = "";
    }
  }, [aiResponseText]);

  // Não é mais necessário atualizar estado salvo pois bloqueamos mudança de conversa durante processamento

  // Handle AI response processing with debounce and better state management
  useEffect(() => {
    if (!aiResponseText || aiResponseText.trim() === "") {
      // Clear processing ref AND debounce timer when response is cleared
      processingResponseRef.current = "";
      if (responseDebounceTimer.current) {
        clearTimeout(responseDebounceTimer.current);
        responseDebounceTimer.current = null;
      }
      return;
    }

    // Handle processing state
    if (
      aiResponseText === "Processing..." ||
      aiResponseText === "Processando..."
    ) {
      chatState.setIsProcessing(true);
      isReceivingResponse.current = true;
      console.log(
        "[CHAT] Started processing for conversation:",
        currentConversation?.id,
        {
          lastProcessedResponse: lastProcessedResponse.current.substring(0, 50),
          processingResponseRef: processingResponseRef.current.substring(0, 50),
        }
      );
      return;
    }

    // Clear any existing debounce timer
    if (responseDebounceTimer.current) {
      clearTimeout(responseDebounceTimer.current);
    }

    responseDebounceTimer.current = setTimeout(() => {
      if (!aiResponseText || aiResponseText.trim() === "") {
        // If we get an empty response, ensure processing state is cleared
        if (chatState.isProcessing) {
          console.log(
            "🔓 [CHAT] Empty response received, clearing processing state"
          );
          chatState.setIsProcessing(false);
          isReceivingResponse.current = false;
        }
        return;
      }

      const isProcessingMessage =
        aiResponseText.includes("Processando") ||
        aiResponseText.includes("Generating") ||
        aiResponseText.includes("...");

      if (isProcessingMessage) {
        console.log(
          "Cleanup: aiResponseText contains processing message, clearing.",
          aiResponseText
        );
        // Clear processing state when filtering out processing messages
        chatState.setIsProcessing(false);
        isReceivingResponse.current = false;
        onClearAiResponse();
        return;
      }

      if (aiResponseText === lastProcessedResponse.current) {
        console.log("⚠️ [CHAT] Response already processed, clearing");
        processingResponseRef.current = "";
        onClearAiResponse();
        return;
      }

      // Check for duplicates in existing messages AND in current conversation
      const isDuplicateInHook = chatMessages.some(
        (msg) => msg.type === "system" && msg.content === aiResponseText
      );

      // Also check in the currentConversation messages directly
      const isDuplicateInConversation =
        currentConversation?.messages?.some(
          (msg) => msg.type === "system" && msg.content === aiResponseText
        ) || false;

      const isDuplicate = isDuplicateInHook || isDuplicateInConversation;

      if (isDuplicate) {
        console.log(
          "⚠️ [CHAT] Response already in messages, skipping duplicate"
        );

        // Update tracking refs
        lastProcessedResponse.current = aiResponseText;
        processingResponseRef.current = "";

        // Clear the response since it's already in messages
        onClearAiResponse();
        return;
      }

      // Check if this looks like a final response (not partial)
      // A final response is something that is not a processing/status message.
      const looksLikeFinalResponse =
        !isProcessingMessage && !aiResponseText.endsWith("...");

      // Clean think tags from the response
      const cleanedResponse = cleanThinkTags(aiResponseText);

      if (looksLikeFinalResponse) {
        // Check if this response was already shown via streaming
        const wasStreamedAndAdded =
          (lastProcessedResponse.current &&
            cleanedResponse.trim() === lastProcessedResponse.current.trim()) ||
          (processingResponseRef.current &&
            (aiResponseText.trim() === processingResponseRef.current.trim() ||
              cleanedResponse.trim() ===
                cleanThinkTags(processingResponseRef.current).trim()));

        if (wasStreamedAndAdded) {
          console.log(
            "✅ [CHAT] Response already added via streaming, clearing states"
          );

          // Clear processing state since streaming already handled it
          chatState.setIsProcessing(false);
          isReceivingResponse.current = false;

          // Clear any processing timeout
          if (chatState.processingTimeoutRef.current) {
            clearTimeout(chatState.processingTimeoutRef.current);
            chatState.processingTimeoutRef.current = null;
          }

          // Just clear the AI response since message was already added
          processingResponseRef.current = "";
          onClearAiResponse();
          return;
        }

        // Mark that we're processing this response IMMEDIATELY
        processingResponseRef.current = aiResponseText;
        lastProcessedResponse.current = cleanedResponse;

        console.log(
          "✅ [CHAT] Adding final AI response:",
          cleanedResponse.substring(0, 50),
          {
            wasLastProcessed: lastProcessedResponse.current.substring(0, 50),
            willBeLastProcessed: cleanedResponse.substring(0, 50),
          }
        );

        // Add AI response with cleaned content
        addMessage({
          type: "system",
          content: cleanedResponse,
        });

        // Clear processing state
        chatState.setIsProcessing(false);
        isReceivingResponse.current = false;

        if (chatState.processingTimeoutRef.current) {
          clearTimeout(chatState.processingTimeoutRef.current);
          chatState.processingTimeoutRef.current = null;
        }

        // Force scroll to bottom after AI response
        setTimeout(() => {
          scrollState.scrollToBottom(true);
        }, 150);

        // Clear AI response after successfully adding the message
        // We delay this to ensure the message is properly saved
        setTimeout(() => {
          // Clear the processing ref before clearing the AI response
          processingResponseRef.current = "";
          onClearAiResponse();
        }, 500);
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
        responseDebounceTimer.current = null;
      }
    };
  }, [
    aiResponseText,
    chatMessages,
    addMessage,
    onClearAiResponse,
    chatState,
    currentConversation,
    scrollState,
  ]);

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

    // IMPORTANT: Clear transcription after sending
    if (transcriptionText.trim()) {
      onClearTranscription();
    }

    // Force scroll to bottom after sending message
    setTimeout(() => {
      scrollState.scrollToBottom(true);
    }, 50);

    // Set processing state with timeout
    chatState.setIsProcessing(true);
    if (chatState.processingTimeoutRef.current) {
      clearTimeout(chatState.processingTimeoutRef.current);
    }

    // IMPORTANT: Clear last processed response to allow new responses
    lastProcessedResponse.current = "";
    processingResponseRef.current = "";

    console.log(
      "[CHAT] Sending message for conversation:",
      currentConversation?.id,
      {
        message: finalContent.substring(0, 50),
        hasContext: !!chatState.currentContext,
      }
    );

    // Get current conversation messages to pass to the prompt processor
    // This includes any summaries that were created
    const conversationMessages = syncServiceRef.current
      ? syncServiceRef.current.getMessagesForProcessor()
      : currentConversation?.messages.map((msg) => ({
          role: msg.type === "user" ? "user" : "system", // All non-user messages are system
          content: msg.content,
        })) || [];

    // Send prompt - pass message, context and conversation messages
    setTimeout(() => {
      // Pass the message as first parameter, context as second, and messages as third
      onSendPrompt(
        finalContent,
        chatState.currentContext || undefined,
        conversationMessages
      );
    }, 0);
  }, [
    chatState,
    transcriptionText,
    addMessage,
    onTemporaryContextChange,
    onSendPrompt,
    onClearTranscription,
    scrollState,
    currentConversation,
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

  // Expose processing status updater to window for TranscriptionPromptProcessor
  useEffect(() => {
    // Create a function that can be called from TranscriptionPromptProcessor
    const updateProcessingStatus = (status: string) => {
      setProcessingStatus(status);
    };

    // Expose it on window
    if (typeof window !== "undefined") {
      (window as any).__updateProcessingStatus = updateProcessingStatus;
    }

    // Cleanup
    return () => {
      if (typeof window !== "undefined") {
        delete (window as any).__updateProcessingStatus;
      }
    };
  }, []);

  // Clear processing status when processing completes
  useEffect(() => {
    if (!chatState.isProcessing) {
      setProcessingStatus("");
    }
  }, [chatState.isProcessing]);

  // Expose streaming handlers to window for TranscriptionPromptProcessor
  useEffect(() => {
    // Create handlers for streaming
    const handleStreamingStart = () => {
      console.log("🚀 [STREAMING] Started");
      setIsStreaming(true);
      setStreamingResponse("");
      streamingChunksRef.current = "";
      setIsThinking(false);
      setThinkingContent("");
      // Clear any processing status when streaming starts
      setProcessingStatus("");
      // Ensure we're in processing state during streaming
      chatState.setIsProcessing(true);

      // Debug: Log current state
      console.log("🚀 [STREAMING] Start state:", {
        isProcessing: chatState.isProcessing,
        processingStatus,
        isStreaming: true,
        isThinking: false,
      });
    };

    const handleStreamingChunk = (chunk: string) => {
      // Add chunk to accumulator
      streamingChunksRef.current += chunk;
      const fullContent = streamingChunksRef.current;

      console.log("📝 [STREAMING] Chunk received:", chunk);

      // Check if we're in a thinking phase
      const thinkOpenMatch = fullContent.match(/<think[^>]*>/i);
      const thinkCloseMatch = fullContent.match(/<\/think>/i);

      if (thinkOpenMatch && thinkCloseMatch) {
        // We have a complete think tag
        const thinkMatch = fullContent.match(
          /<think[^>]*>([\s\S]*?)<\/think>/i
        );
        if (thinkMatch && thinkMatch[1]) {
          setThinkingContent(thinkMatch[1].trim());
          setIsThinking(true);
        }

        // For streaming, only show content after the closing think tag
        const afterThinkIndex =
          fullContent.lastIndexOf("</think>") + "</think>".length;
        const contentAfterThink = fullContent.substring(afterThinkIndex).trim();
        setStreamingResponse(contentAfterThink);

        // If we have content after think, we're no longer thinking
        if (contentAfterThink) {
          setIsThinking(false);
          console.log(
            "🧠 [STREAMING] Exited thinking, showing content:",
            contentAfterThink.substring(0, 50)
          );
        }
      } else if (thinkOpenMatch && !thinkCloseMatch) {
        // We're inside a think tag - extract and show thinking content
        const partialMatch = fullContent.match(/<think[^>]*>([\s\S]*?)$/i);
        if (partialMatch && partialMatch[1]) {
          setThinkingContent(partialMatch[1].trim());
          setIsThinking(true);
          console.log(
            "🤔 [STREAMING] Thinking:",
            partialMatch[1].substring(0, 50)
          );
        }
        // Don't show any streaming content while inside think tags
        setStreamingResponse("");
      } else {
        // No think tags or we're past them - show all content
        setIsThinking(false);
        // Clean any complete think tags that might have been there before
        const cleanedContent = cleanThinkTags(fullContent);
        setStreamingResponse(cleanedContent);
        console.log(
          "💬 [STREAMING] Regular content:",
          cleanedContent.substring(0, 50)
        );
      }
    };

    const handleStreamingEnd = () => {
      console.log("🏁 [STREAMING] Ended");

      // Get the final streamed content for tracking
      const finalContent = streamingChunksRef.current
        ? cleanThinkTags(streamingChunksRef.current)
        : "";

      if (finalContent && finalContent.trim() !== "") {
        console.log(
          "✅ [STREAMING] Streaming completed:",
          finalContent.substring(0, 50)
        );

        // Add the final message to the chat history FIRST
        addMessage({
          type: "system",
          content: finalContent,
        });

        // Mark as processed to prevent duplication
        lastProcessedResponse.current = finalContent;
        processingResponseRef.current = streamingChunksRef.current;

        // Clear aiResponseText to prevent double processing
        if (onClearAiResponse) {
          onClearAiResponse();
        }

        // Small delay before clearing streaming states to ensure smooth transition
        setTimeout(() => {
          // Now clear streaming states after message is in the list
          setIsStreaming(false);
          setStreamingResponse("");
        }, 50); // Small delay for visual smoothness
      } else {
        console.log("⚠️ [STREAMING] No content after cleaning");
        // Clear states immediately if no content
        setIsStreaming(false);
        setStreamingResponse("");
      }

      // Clear other states
      setIsThinking(false);
      setThinkingContent("");
      streamingChunksRef.current = "";

      // Clear processing state
      chatState.setIsProcessing(false);
      isReceivingResponse.current = false;

      // Force a re-render by updating a different state
      if (onProcessingChange) {
        onProcessingChange(false);
      }

      // Ensure we're scrolled to bottom
      setTimeout(() => {
        scrollState.scrollToBottom(true);
      }, 100);
    };

    // Expose handlers on window
    if (typeof window !== "undefined") {
      (window as any).__handleStreamingStart = handleStreamingStart;
      (window as any).__handleStreamingChunk = handleStreamingChunk;
      (window as any).__handleStreamingEnd = handleStreamingEnd;
    }

    // Cleanup only
    return () => {
      if (typeof window !== "undefined") {
        delete (window as any).__handleStreamingStart;
        delete (window as any).__handleStreamingChunk;
        delete (window as any).__handleStreamingEnd;
      }
    };
  }, [addMessage, scrollState, chatState, onClearAiResponse]);

  // Clear streaming when full response arrives
  useEffect(() => {
    if (
      aiResponseText &&
      aiResponseText !== "Processing..." &&
      aiResponseText !== "Processando..." &&
      !aiResponseText.startsWith("Processing... [")
    ) {
      // Full response arrived
      if (isStreaming) {
        console.log(
          "🔄 [STREAMING] Clearing streaming state due to aiResponseText arrival"
        );
        setIsStreaming(false);
        setStreamingResponse("");
        streamingChunksRef.current = "";
      }
    }
  }, [aiResponseText, isStreaming]);

  return (
    <div className="conversational-chat">
      {/* Summarization Indicator - Shows when summarizing */}
      {chatHistory?.isSummarizing && (
        <SummarizationIndicator
          isSummarizing={true}
          tokenCount={chatHistory?.tokenStats?.currentTokens}
          maxTokens={chatHistory?.tokenStats?.maxTokens}
        />
      )}

      {/* Token Status Bar - Shows token usage */}
      {currentConversation && chatHistory?.getTokenStats && (
        <TokenStatusBar
          currentTokens={chatHistory.getTokenStats()?.currentTokens || 0}
          maxTokens={chatHistory.getTokenStats()?.maxTokens || 32000}
          summarizationThreshold={30000}
          isAtTop={isAtTop}
        />
      )}

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
        processingStatus={processingStatus}
        streamingContent={streamingResponse}
        isStreaming={isStreaming}
        isThinking={isThinking}
        thinkingContent={thinkingContent}
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
