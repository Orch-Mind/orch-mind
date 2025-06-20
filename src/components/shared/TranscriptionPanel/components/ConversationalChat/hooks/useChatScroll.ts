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

      // Multiple attempts to ensure we reach the absolute bottom
      const forceScroll = () => {
        if (!messagesContainerRef.current) return;

        const container = messagesContainerRef.current;
        const maxScroll = container.scrollHeight - container.clientHeight;

        // Try multiple methods to ensure scroll
        container.scrollTop = container.scrollHeight;
        container.scrollTo({
          top: container.scrollHeight,
          behavior: smooth ? "smooth" : "auto",
        });

        // Find the last element and scroll it into view
        const lastElement = container.lastElementChild?.lastElementChild;
        if (lastElement) {
          lastElement.scrollIntoView({
            behavior: smooth ? "smooth" : "auto",
            block: "end",
          });
        }

        // Verify and retry if needed
        requestAnimationFrame(() => {
          if (container.scrollTop < maxScroll - 2) {
            container.scrollTop = maxScroll + 100; // Overshoot to ensure bottom
          }
        });
      };

      // Execute immediately
      forceScroll();

      // Execute again after DOM updates
      requestAnimationFrame(forceScroll);

      // And once more after a small delay to catch any late renders
      setTimeout(forceScroll, 100);

      // Reset programmatic scroll flag after animation
      setTimeout(
        () => {
          programmaticScrollRef.current = false;
        },
        smooth ? 800 : 200
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
    // Increased threshold for more forgiving detection
    return scrollHeight - scrollTop - clientHeight < 50;
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
      // Small delay to ensure DOM is updated
      requestAnimationFrame(() => {
        scrollToBottom();
      });
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
