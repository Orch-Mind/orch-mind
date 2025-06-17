import { useCallback, useEffect, useRef, useState } from "react";
import { ChatMessage } from "../types/ChatTypes";

interface UseChatScrollProps {
  messages: ChatMessage[];
  messagesContainerRef: React.RefObject<HTMLDivElement>;
}

/**
 * Custom hook to manage chat scroll behavior
 * Follows SOLID principle - Single responsibility for scroll management
 */
export const useChatScroll = ({
  messages,
  messagesContainerRef,
}: UseChatScrollProps) => {
  const isUserScrollingRef = useRef(false);
  const programmaticScrollRef = useRef(false);
  const userScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitialScrolledRef = useRef(false);

  // State to track if scroll button should be shown
  const [showScrollButton, setShowScrollButton] = useState(false);

  /**
   * Scroll to bottom of messages
   * DRY principle - reusable scroll logic
   */
  const scrollToBottom = useCallback(
    (smooth = true) => {
      if (!messagesContainerRef.current) return;

      // Set programmatic scroll flag
      programmaticScrollRef.current = true;

      // Scroll the messages container to absolute bottom
      const container = messagesContainerRef.current;
      container.scrollTop = container.scrollHeight;

      // Reset programmatic scroll flag after animation
      setTimeout(
        () => {
          programmaticScrollRef.current = false;
        },
        smooth ? 500 : 100
      );
    },
    [messagesContainerRef]
  );

  /**
   * Check if user is at bottom of scroll
   * KISS principle - simple bottom detection
   */
  const isAtBottom = useCallback(() => {
    if (!messagesContainerRef.current) return true;

    const { scrollTop, scrollHeight, clientHeight } =
      messagesContainerRef.current;
    // Reduced threshold for more accurate detection
    return scrollHeight - scrollTop - clientHeight < 5;
  }, [messagesContainerRef]);

  /**
   * Handle scroll events to detect manual scrolling
   */
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;

    // Check if at bottom and update button visibility
    const atBottom = isAtBottom();
    setShowScrollButton(!atBottom);

    // Skip if this is a programmatic scroll
    if (programmaticScrollRef.current) return;

    if (!atBottom && !isUserScrollingRef.current) {
      // User started scrolling up
      isUserScrollingRef.current = true;

      // Clear any existing timeout
      if (userScrollTimeoutRef.current) {
        clearTimeout(userScrollTimeoutRef.current);
      }

      // Set timeout to re-enable auto-scroll after 3 seconds
      userScrollTimeoutRef.current = setTimeout(() => {
        isUserScrollingRef.current = false;
      }, 3000);
    } else if (atBottom && isUserScrollingRef.current) {
      // User scrolled back to bottom
      isUserScrollingRef.current = false;

      // Clear the timeout since user is back at bottom
      if (userScrollTimeoutRef.current) {
        clearTimeout(userScrollTimeoutRef.current);
        userScrollTimeoutRef.current = null;
      }
    }
  }, [isAtBottom, messagesContainerRef]);

  /**
   * Initial scroll to bottom on mount
   */
  useEffect(() => {
    if (!hasInitialScrolledRef.current && messages.length > 0) {
      // Use instant scroll for initial load
      scrollToBottom(false);
      hasInitialScrolledRef.current = true;
    }
  }, [messages.length, scrollToBottom]);

  /**
   * Auto-scroll when new messages arrive (if user hasn't scrolled up)
   */
  useEffect(() => {
    if (messages.length > 0 && !isUserScrollingRef.current) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  /**
   * Setup scroll event listener
   */
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll, { passive: true });

    // Check initial scroll position
    const atBottom = isAtBottom();
    setShowScrollButton(!atBottom);

    return () => {
      container.removeEventListener("scroll", handleScroll);

      // Cleanup timeouts
      if (userScrollTimeoutRef.current) {
        clearTimeout(userScrollTimeoutRef.current);
      }
    };
  }, [handleScroll, messagesContainerRef, isAtBottom]);

  return {
    scrollToBottom,
    isAtBottom,
    showScrollButton,
  };
};
