import React, { useEffect, useRef, useState } from "react";
import { MicrophoneState } from "../../../../context";
import "./ConversationalChat.css";

// Local interfaces for chat functionality
interface ChatMessage {
  id: string;
  type: "user" | "system";
  content: string;
  timestamp: Date;
  hasContext?: boolean;
  contextContent?: string;
}

// Interface for memory system integration
interface MemoryMessage {
  role: "user" | "assistant" | "system" | "developer";
  content: string;
}

// Memoized list renderer to prevent unnecessary re-renders
const ChatMessages: React.FC<{
  messages: ChatMessage[];
  isProcessing: boolean;
}> = React.memo(({ messages, isProcessing }) => {
  console.log("🖼️ [CHAT] ChatMessages render:", {
    messagesLength: messages.length,
    isProcessing,
    messageIds: messages.map((m) => m.id),
    lastMessage:
      messages[messages.length - 1]?.content?.substring(0, 30) || "none",
  });
  return (
    <>
      {messages.map((message) => (
        <div key={message.id} className={`message ${message.type}-message`}>
          <div className="message-avatar">
            {message.type === "user" ? (
              // user avatar svg
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="url(#gradient-user)" />
                <path
                  d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                  fill="white"
                />
                <defs>
                  <linearGradient
                    id="gradient-user"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#00faff" />
                    <stop offset="100%" stopColor="#0066cc" />
                  </linearGradient>
                </defs>
              </svg>
            ) : (
              // ai avatar svg
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="url(#gradient-ai)" />
                <rect x="8" y="8" width="8" height="8" rx="2" fill="white" />
                <circle cx="12" cy="12" r="2" fill="url(#gradient-ai)" />
                <defs>
                  <linearGradient
                    id="gradient-ai"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#ff4dd2" />
                    <stop offset="100%" stopColor="#7c4dff" />
                  </linearGradient>
                </defs>
              </svg>
            )}
          </div>

          <div className="message-content">
            {message.hasContext && message.contextContent && (
              <div className="message-context">
                <div className="context-label">Context:</div>
                <div className="context-content">{message.contextContent}</div>
              </div>
            )}
            <div className="message-text">{message.content}</div>
            <div className="message-timestamp">
              {message.timestamp.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        </div>
      ))}
      {isProcessing && (
        <div className="message system-message typing-indicator">
          <div className="message-avatar">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill="url(#gradient-ai)" />
              <rect x="8" y="8" width="8" height="8" rx="2" fill="white" />
              <circle cx="12" cy="12" r="2" fill="url(#gradient-ai)" />
              <defs>
                <linearGradient
                  id="gradient-ai"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#ff4dd2" />
                  <stop offset="100%" stopColor="#7c4dff" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="message-content">
            <div className="message-text typing-animation">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

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

// -------------------- Main Component --------------------

interface ConversationalChatProps {
  // Transcrição
  transcriptionText: string;
  onTranscriptionChange: (value: string) => void;
  onClearTranscription: () => void;

  // IA Response
  aiResponseText: string;
  onAiResponseChange: (value: string) => void;
  onClearAiResponse: () => void;

  // Contexto temporário
  temporaryContext: string;
  onTemporaryContextChange: (value: string) => void;

  // Audio controls
  microphoneState: MicrophoneState;
  onToggleRecording: () => void;
  onSendPrompt: (messageContent?: string) => void;
}

const ConversationalChatComponent: React.FC<ConversationalChatProps> = ({
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
  // Local state for chat messages and input
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [currentContext, setCurrentContext] = useState("");
  const [showContextField, setShowContextField] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Refs for DOM manipulation and preventing infinite loops
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Refs to track processed responses and prevent duplicates
  const lastProcessedAiResponseRef = useRef("");
  const lastUserMessageIdRef = useRef("");
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debug: Log initial state and any changes
  useEffect(() => {
    console.log("🔍 [CHAT] State update:", {
      chatMessagesLength: chatMessages.length,
      inputMessage,
      isProcessing,
      showContextField,
    });
  }, [chatMessages.length, inputMessage, isProcessing, showContextField]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "44px";
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [inputMessage]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
  };

  // Handle send message
  const handleSendMessage = () => {
    const messageContent = inputMessage.trim();
    console.log("🔍 [CHAT] handleSendMessage called:", {
      messageContent,
      inputMessage,
      hasContent: !!messageContent,
    });

    if (messageContent) {
      console.log("📤 [CHAT] Sending message:", messageContent);

      // Create user message
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        type: "user",
        content: messageContent,
        timestamp: new Date(),
        hasContext: !!currentContext,
        contextContent: currentContext || undefined,
      };

      // Add user message to chat immediately
      setChatMessages((prev) => [...prev, userMessage]);
      lastUserMessageIdRef.current = userMessage.id;

      // Clear input and context
      setInputMessage("");
      setCurrentContext("");
      setShowContextField(false);

      // Reset textarea height
      if (inputRef.current) {
        inputRef.current.style.height = "44px";
      }

      // Prepare final context for AI
      const finalContext = currentContext
        ? `${messageContent}\n\nContext: ${currentContext}`
        : messageContent;

      console.log("🚀 [CHAT] Sending to prompt processor:", finalContext);

      // Clear temporary context and set processing state
      onTemporaryContextChange("");
      setIsProcessing(true);

      // Clear any existing processing timeout
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }

      // Set timeout to clear processing state if no response comes
      processingTimeoutRef.current = setTimeout(() => {
        console.log("⏰ [CHAT] Processing timeout - clearing processing state");
        setIsProcessing(false);
      }, 15000); // 15 second timeout

      // Send prompt on next tick
      setTimeout(() => {
        onSendPrompt(finalContext);
      }, 0);
    } else {
      console.log("⚠️ [CHAT] No message content to send");
    }
  };

  // Handle context toggle
  const handleContextToggle = () => {
    if (showContextField) {
      setCurrentContext("");
      setShowContextField(false);
    } else {
      setShowContextField(true);
      setCurrentContext("");
    }
  };

  // Mount / unmount debug
  useEffect(() => {
    console.log("🟢 ConversationalChat mounted");
    return () => {
      console.log("🔴 ConversationalChat unmounted");
      // Clear timeout on unmount
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
    };
  }, []);

  // Test function to add a message directly - memoized to prevent re-renders
  const addTestMessage = React.useCallback(() => {
    console.log("🧪 [CHAT] Adding test message");
    const testMessage: ChatMessage = {
      id: `test-${Date.now()}`,
      type: "user",
      content: "Test message",
      timestamp: new Date(),
    };
    setChatMessages((prev) => {
      console.log("🧪 [CHAT] Test message - current messages:", prev.length);
      const newMessages = [...prev, testMessage];
      console.log("🧪 [CHAT] Test message - new messages:", newMessages.length);
      return newMessages;
    });
  }, []);

  // Handle AI response - fixed to prevent infinite loops and duplicates
  useEffect(() => {
    console.log("🔍 [CHAT] AI Response effect triggered:", {
      aiResponseText,
      lastProcessed: lastProcessedAiResponseRef.current,
      isProcessing,
      hasUserMessage: !!lastUserMessageIdRef.current,
    });

    // Handle processing state first
    if (
      aiResponseText === "Processing..." ||
      aiResponseText === "Processando..."
    ) {
      if (!isProcessing) {
        console.log("🔄 [CHAT] Setting processing state");
        setIsProcessing(true);
      }
      return; // Exit early for processing states
    }

    // Only process if we have a real response that's different from last processed
    if (
      aiResponseText &&
      aiResponseText.trim() !== "" &&
      aiResponseText !== lastProcessedAiResponseRef.current &&
      lastUserMessageIdRef.current // Ensure we have a user message to respond to
    ) {
      console.log("✅ [CHAT] Processing new AI response");

      // Clear processing timeout
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
        processingTimeoutRef.current = null;
      }

      // Create AI message
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        type: "system",
        content: aiResponseText,
        timestamp: new Date(),
      };

      // Add AI message to chat (prevent duplicates)
      setChatMessages((prev) => {
        // Check if this exact content already exists
        const existingMessage = prev.find(
          (msg) => msg.type === "system" && msg.content === aiResponseText
        );

        if (existingMessage) {
          console.log(
            "⚠️ [CHAT] Duplicate AI message detected, skipping:",
            aiResponseText.substring(0, 50)
          );
          return prev;
        }

        console.log(
          "📝 [CHAT] Adding AI message to chat, current length:",
          prev.length
        );
        return [...prev, aiMessage];
      });

      // Update refs to prevent reprocessing
      lastProcessedAiResponseRef.current = aiResponseText;

      // Clear processing state
      setIsProcessing(false);

      // Clear the AI response text to prevent showing it elsewhere
      setTimeout(() => {
        console.log(
          "🧹 [CHAT] Clearing AI response text after successful processing"
        );
        onAiResponseChange("");
      }, 100);

      console.log("📝 [CHAT] AI message added to chat");
    } else if (aiResponseText === "" && isProcessing) {
      // If AI response is cleared while processing, stop processing
      console.log("⏹️ [CHAT] AI response cleared, stopping processing");
      setIsProcessing(false);
    } else {
      console.log("⏭️ [CHAT] Skipping AI response processing:", {
        hasText: !!aiResponseText,
        trimmedText: aiResponseText.trim(),
        isProcessingText:
          aiResponseText === "Processing..." ||
          aiResponseText === "Processando...",
        alreadyProcessed: aiResponseText === lastProcessedAiResponseRef.current,
        hasUserMessage: !!lastUserMessageIdRef.current,
      });
    }
  }, [aiResponseText, onAiResponseChange]); // Added onAiResponseChange back but controlled

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatMessages.length]);

  // Debug log for chatMessages changes - simplified
  useEffect(() => {
    console.log("📊 [CHAT] Chat messages updated:", {
      length: chatMessages.length,
      messages: chatMessages.map((m) => ({
        id: m.id,
        type: m.type,
        content:
          m.content.substring(0, 30) + (m.content.length > 30 ? "..." : ""),
      })),
    });
  }, [chatMessages]);

  // Handle Enter key for sending (Shift+Enter for new line)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle context input change
  const handleContextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setCurrentContext(value);
    // Only update global temporaryContext when user is actively typing in context field
    // This prevents interference with other parts of the system
  };

  // Memoized content to prevent infinite re-renders
  const chatContent = React.useMemo(() => {
    console.log("🎨 [CHAT] Rendering messages area:", {
      chatMessagesLength: chatMessages.length,
      showingWelcome: chatMessages.length === 0,
      isProcessing,
    });

    if (chatMessages.length === 0) {
      console.log("🎨 [CHAT] Showing welcome message");
      return (
        <div className="welcome-message">
          <div className="welcome-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="url(#gradient-welcome)"
                strokeWidth="2"
              />
              <path
                d="M8 12l2 2 4-4"
                stroke="url(#gradient-welcome)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <defs>
                <linearGradient
                  id="gradient-welcome"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#00faff" />
                  <stop offset="100%" stopColor="#7c4dff" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h3>Welcome to Orch-OS Neural Chat</h3>
          <p>
            Start a conversation by typing a message or using voice
            transcription.
          </p>
          <button
            onClick={addTestMessage}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1rem",
              background: "#7c4dff",
              color: "white",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer",
            }}
          >
            🧪 Add Test Message
          </button>
        </div>
      );
    } else {
      console.log("🎨 [CHAT] Showing chat messages");
      return (
        <ChatMessages messages={chatMessages} isProcessing={isProcessing} />
      );
    }
  }, [chatMessages.length, isProcessing, addTestMessage]);

  return (
    <div className="conversational-chat">
      {/* Chat Messages Area */}
      <div className="chat-messages" ref={chatMessagesRef}>
        {chatContent}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="chat-input-area">
        {/* Context Field - FIXED: Only show based on local state, not temporaryContext */}
        {(showContextField || currentContext) && (
          <div className="context-input-wrapper">
            <div className="context-label">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <circle
                  cx="10"
                  cy="10"
                  r="8"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M10 5v5l3 3"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              Context (will be included with next message)
              <button
                className="context-close-btn"
                onClick={() => {
                  setCurrentContext("");
                  setShowContextField(false);
                }}
                title="Remove context"
              >
                ×
              </button>
            </div>
            <textarea
              className="context-input"
              value={currentContext}
              onChange={handleContextChange}
              placeholder="Add situational context..."
              rows={2}
              autoFocus={showContextField}
            />
          </div>
        )}

        {/* Main Input Area */}
        <div className="main-input-wrapper">
          <div className="input-row">
            {/* Transcription Display */}
            {transcriptionText && (
              <div className="transcription-display">
                <div className="transcription-label">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="3" fill="currentColor" />
                    <path
                      d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                  Live Transcription:
                </div>
                <div className="transcription-text">{transcriptionText}</div>
                <button
                  className="transcription-clear-btn"
                  onClick={onClearTranscription}
                  title="Clear transcription"
                >
                  ×
                </button>
              </div>
            )}

            {/* Message Input */}
            <div className="message-input-wrapper">
              <textarea
                ref={inputRef}
                className="message-input"
                value={inputMessage}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Type your message or use voice transcription..."
                rows={1}
                style={{
                  minHeight: "44px",
                  maxHeight: "120px",
                  resize: "none",
                  overflow: "auto",
                }}
              />

              {/* Input Controls */}
              <div className="input-controls">
                {/* Context Toggle Button - FIXED: Only check local state */}
                <button
                  className={`control-btn context-btn ${
                    showContextField || currentContext ? "active" : ""
                  }`}
                  onClick={handleContextToggle}
                  title={
                    showContextField ? "Hide context field" : "Add context"
                  }
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle
                      cx="10"
                      cy="10"
                      r="8"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M10 5v5l3 3"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>

                {/* Microphone Button */}
                <button
                  className={`control-btn mic-btn ${
                    microphoneState === MicrophoneState.Open ? "recording" : ""
                  }`}
                  onClick={onToggleRecording}
                  title={
                    microphoneState === MicrophoneState.Open
                      ? "Stop recording"
                      : "Start recording"
                  }
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    {microphoneState === MicrophoneState.Open ? (
                      <rect
                        x="9"
                        y="9"
                        width="6"
                        height="6"
                        fill="currentColor"
                        rx="1"
                      />
                    ) : (
                      <>
                        <path
                          d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
                          fill="currentColor"
                        />
                        <path
                          d="M19 10v2a7 7 0 0 1-14 0v-2"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        <line
                          x1="12"
                          y1="19"
                          x2="12"
                          y2="23"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                        <line
                          x1="8"
                          y1="23"
                          x2="16"
                          y2="23"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                      </>
                    )}
                  </svg>
                </button>

                {/* Send Button */}
                <button
                  className={`control-btn send-btn ${
                    inputMessage.trim() || transcriptionText.trim()
                      ? "ready"
                      : "disabled"
                  }`}
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() && !transcriptionText.trim()}
                  title="Send message (Enter)"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M2 12l18-8-8 18-3-7-7-3z" fill="currentColor" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Export memoized component (ignores rapid transcriptionText updates)
export const ConversationalChat = React.memo(
  ConversationalChatComponent,
  areEqual
);
