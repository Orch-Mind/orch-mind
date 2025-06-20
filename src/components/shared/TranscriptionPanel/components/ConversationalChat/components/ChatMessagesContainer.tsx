import React from "react";
import { ChatMessage, ChatMessagesContainerProps } from "../types/ChatTypes";
import { ScrollToBottomButton } from "./ScrollToBottomButton";

// Memoized message component for performance
const MessageItem: React.FC<{ message: ChatMessage }> = React.memo(
  ({ message }) => {
    // Generate unique IDs for gradients to avoid conflicts
    const messageId = message.id || Math.random().toString(36).substr(2, 9);
    const gradientId = `gradient-${message.type}-${messageId}`;

    return (
      <div className={`message ${message.type}-message`}>
        <div className="message-avatar">
          {message.type === "user" ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <defs>
                <linearGradient
                  id={gradientId}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#00faff" />
                  <stop offset="100%" stopColor="#0066cc" />
                </linearGradient>
              </defs>
              <circle cx="12" cy="12" r="10" fill={`url(#${gradientId})`} />
              {/* Bonequinho centralizado - cabeça e corpo */}
              <path
                d="M12 10c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm0 1c-2 0-6 1-6 3v1.5c0 0.28 0.22 0.5 0.5 0.5h11c0.28 0 0.5-0.22 0.5-0.5V14c0-2-4-3-6-3z"
                fill="white"
              />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <defs>
                <linearGradient
                  id={gradientId}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#ff4dd2" />
                  <stop offset="100%" stopColor="#7c4dff" />
                </linearGradient>
              </defs>
              <circle cx="12" cy="12" r="10" fill={`url(#${gradientId})`} />
              {/* AI brain icon - melhor centralizado */}
              <rect
                x="8.5"
                y="8.5"
                width="7"
                height="7"
                rx="1.5"
                fill="white"
              />
              <circle cx="12" cy="12" r="1.5" fill={`url(#${gradientId})`} />
            </svg>
          )}
        </div>

        <div className="message-bubble-wrapper">
          <div className="message-content">
            {message.hasContext && message.contextContent && (
              <div className="message-context">
                <div className="context-label">Context:</div>
                <div className="context-content">{message.contextContent}</div>
              </div>
            )}
            <div className="message-text">{message.content}</div>
          </div>

          {/* Timestamp fora do bubble, similar ao WhatsApp */}
          <div className="message-timestamp">
            {message.timestamp.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      </div>
    );
  }
);

// Typing indicator component
const TypingIndicator: React.FC = React.memo(() => {
  const gradientId = `gradient-typing-${Date.now()}`;

  return (
    <div className="message system-message typing-indicator">
      <div className="message-avatar">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff4dd2" />
              <stop offset="100%" stopColor="#7c4dff" />
            </linearGradient>
          </defs>
          <circle cx="12" cy="12" r="10" fill={`url(#${gradientId})`} />
          {/* AI brain icon - melhor centralizado */}
          <rect x="8.5" y="8.5" width="7" height="7" rx="1.5" fill="white" />
          <circle cx="12" cy="12" r="1.5" fill={`url(#${gradientId})`} />
        </svg>
      </div>
      <div className="message-bubble-wrapper">
        <div className="message-content">
          <div className="message-text typing-animation">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </div>
  );
});

// Welcome message component
const WelcomeMessage: React.FC<{
  onAddTestMessage: () => void;
  onResetState: () => void;
  onClearMessages: () => void;
}> = React.memo(({ onAddTestMessage, onResetState, onClearMessages }) => {
  const gradientId = `gradient-welcome-${Date.now()}`;

  return (
    <div className="welcome-message">
      <div className="welcome-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00faff" />
              <stop offset="100%" stopColor="#7c4dff" />
            </linearGradient>
          </defs>
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke={`url(#${gradientId})`}
            strokeWidth="2"
          />
          <path
            d="M8 12l2 2 4-4"
            stroke={`url(#${gradientId})`}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h3>Welcome to Orch-OS Neural Chat</h3>
      <p>
        Start a conversation by typing a message or using voice transcription.
      </p>

      {/* Debug buttons removed for cleaner UI */}
    </div>
  );
});

/**
 * Chat messages container component
 * Follows Single Responsibility Principle - only handles message display and scroll
 */
export const ChatMessagesContainer: React.FC<ChatMessagesContainerProps> = ({
  messages,
  isProcessing,
  onScrollChange,
  scrollRef,
  showScrollButton,
  onScrollToBottom,
  onAddTestMessage = () => {},
  onResetState = () => {},
  onClearMessages = () => {},
}) => {
  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      // Tolerância mínima de 2 pixels, consistente com useChatScroll
      const isNearBottom = distanceFromBottom <= 2;
      onScrollChange(isNearBottom);
    }
  };

  return (
    <div className="chat-messages-container">
      <div className="chat-messages" ref={scrollRef} onScroll={handleScroll}>
        <div className="messages-wrapper">
          {messages.map((message) => (
            <MessageItem key={message.id} message={message} />
          ))}

          {isProcessing && <TypingIndicator />}

          {messages.length === 0 && !isProcessing && (
            <WelcomeMessage
              onAddTestMessage={onAddTestMessage}
              onResetState={onResetState}
              onClearMessages={onClearMessages}
            />
          )}

          {/* Hidden div for scroll to bottom */}
          <div style={{ float: "left", clear: "both" }} />
        </div>
      </div>

      {/* Scroll to bottom button */}
      <ScrollToBottomButton
        show={showScrollButton}
        onClick={onScrollToBottom}
      />
    </div>
  );
};
