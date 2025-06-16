import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollState } from "../types/ChatTypes";

/**
 * Custom hook for managing chat scroll behavior
 * Follows Single Responsibility Principle - only manages scroll
 */
export const useChatScroll = (messagesLength: number): ScrollState => {
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (messagesRef.current) {
      const scrollContainer = messagesRef.current;
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: "smooth",
      });
      setShowScrollButton(false);
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (messagesRef.current) {
      const scrollContainer = messagesRef.current;
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
      setShowScrollButton(!isNearBottom && scrollHeight > clientHeight);
    }
  }, []);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (messagesRef.current) {
      const scrollContainer = messagesRef.current;
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;

      if (isNearBottom) {
        setShowScrollButton(false);
        requestAnimationFrame(() => {
          scrollContainer.scrollTo({
            top: scrollHeight,
            behavior: "smooth",
          });
        });
      } else {
        setShowScrollButton(true);
      }
    }
  }, [messagesLength]);

  return {
    showScrollButton,
    scrollToBottom,
    handleScroll,
    messagesRef,
  };
};
