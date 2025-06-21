import React from "react";
import { ChatMessagesContainerProps } from "../types/ChatTypes";
import { MessageItem } from "./MessageItem";
import { ScrollToBottomButton } from "./ScrollToBottomButton";

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
  const scrollAnchorRef = React.useRef<HTMLDivElement>(null);

  // Enhanced scroll to bottom that uses the anchor
  const enhancedScrollToBottom = React.useCallback(() => {
    // Try the original method first
    onScrollToBottom();

    // Then try scrolling to the anchor element
    setTimeout(() => {
      if (scrollAnchorRef.current) {
        scrollAnchorRef.current.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      }
    }, 50);
  }, [onScrollToBottom]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      // Tolerância mínima de 2 pixels, consistente com useChatScroll
      const isNearBottom = distanceFromBottom <= 5;
      onScrollChange(isNearBottom);
    }
  };

  // Auto-scroll when messages change or processing state changes
  React.useEffect(() => {
    // Small delay to ensure DOM is updated
    const timer = setTimeout(() => {
      if (scrollAnchorRef.current) {
        scrollAnchorRef.current.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [messages.length, isProcessing]);

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

          {/* Anchor element for scroll to bottom */}
          <div
            ref={scrollAnchorRef}
            className="scroll-anchor"
            style={{
              float: "left",
              clear: "both",
              height: "1px",
              width: "100%",
            }}
          />
        </div>
      </div>

      {/* Scroll to bottom button */}
      <ScrollToBottomButton
        show={showScrollButton}
        onClick={enhancedScrollToBottom}
      />
    </div>
  );
};
