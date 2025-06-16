import React from "react";
import { ChatMessage, ChatMessagesContainerProps } from "../types/ChatTypes";
import { ScrollToBottomButton } from "./ScrollToBottomButton";

// Memoized message component for performance
const MessageItem: React.FC<{ message: ChatMessage }> = React.memo(
  ({ message }) => (
    <div className={`message ${message.type}-message`}>
      <div className="message-avatar">
        {message.type === "user" ? (
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
  )
);

// Typing indicator component
const TypingIndicator: React.FC = React.memo(() => (
  <div className="message system-message typing-indicator">
    <div className="message-avatar">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="url(#gradient-ai)" />
        <rect x="8" y="8" width="8" height="8" rx="2" fill="white" />
        <circle cx="12" cy="12" r="2" fill="url(#gradient-ai)" />
        <defs>
          <linearGradient id="gradient-ai" x1="0%" y1="0%" x2="100%" y2="100%">
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
));

// Welcome message component
const WelcomeMessage: React.FC<{
  onAddTestMessage: () => void;
  onResetState: () => void;
  onClearMessages: () => void;
}> = React.memo(({ onAddTestMessage, onResetState, onClearMessages }) => (
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
      Start a conversation by typing a message or using voice transcription.
    </p>

    {/* Only show debug buttons in development */}
    {process.env.NODE_ENV !== "production" && (
      <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
        <button
          onClick={onAddTestMessage}
          style={{
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
        <button
          onClick={onResetState}
          style={{
            padding: "0.5rem 1rem",
            background: "#ff6b6b",
            color: "white",
            border: "none",
            borderRadius: "0.5rem",
            cursor: "pointer",
          }}
        >
          🔄 Reset State
        </button>
        <button
          onClick={onClearMessages}
          style={{
            padding: "0.5rem 1rem",
            background: "#ffa726",
            color: "white",
            border: "none",
            borderRadius: "0.5rem",
            cursor: "pointer",
          }}
        >
          🗑️ Clear Chat
        </button>
      </div>
    )}
  </div>
));

/**
 * Chat messages container component
 * Follows Single Responsibility Principle - only handles message display and scroll
 */
export const ChatMessagesContainer: React.FC<
  ChatMessagesContainerProps & {
    scrollRef: React.RefObject<HTMLDivElement>;
    showScrollButton: boolean;
    onScrollToBottom: () => void;
    onAddTestMessage?: () => void;
    onResetState?: () => void;
    onClearMessages?: () => void;
  }
> = ({
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
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
      onScrollChange(isNearBottom);
    }
  };

  return (
    <div className="chat-messages" ref={scrollRef} onScroll={handleScroll}>
      {messages.length === 0 ? (
        <WelcomeMessage
          onAddTestMessage={onAddTestMessage}
          onResetState={onResetState}
          onClearMessages={onClearMessages}
        />
      ) : (
        <>
          {messages.map((message) => (
            <MessageItem key={message.id} message={message} />
          ))}
          {isProcessing && <TypingIndicator />}
        </>
      )}

      {/* Scroll to Bottom Button */}
      <ScrollToBottomButton
        show={showScrollButton}
        onClick={onScrollToBottom}
      />
    </div>
  );
};
