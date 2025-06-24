// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ChatMessage } from "../types/ChatTypes";

interface UseChatScrollProps {
  messages: ChatMessage[];
  streamingContent?: string;
  processingStatus?: string;
  thinkingContent?: string;
  isThinking?: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Custom hook to manage chat scroll behavior.
 * Determines if the user is near the bottom to allow auto-scrolling.
 * Shows a button to scroll down if the user has scrolled up.
 */
export const useChatScroll = ({
  messages,
  streamingContent,
  processingStatus,
  thinkingContent,
  isThinking,
  containerRef,
}: UseChatScrollProps) => {
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const userInteractedRef = useRef(false);
  const lastScrollTop = useRef(0);
  const autoScrollTimeout = useRef<NodeJS.Timeout | null>(null);

  const isAtBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return true;
    const { scrollHeight, scrollTop, clientHeight } = container;
    // Consider at bottom if within a small threshold (e.g., 10px)
    // This helps account for sub-pixel rendering differences.
    return scrollHeight - scrollTop - clientHeight < 10;
  }, [containerRef]);

  const scrollToBottom = useCallback(
    (behavior: "smooth" | "auto" = "smooth") => {
      // An explicit call to scroll to bottom means user interaction is reset.
      userInteractedRef.current = false;
      setShowScrollButton(false);

      // Using a reference to an anchor at the end of the list is the most reliable way
      // to scroll to the bottom, especially with dynamic content.
      if (scrollAnchorRef.current) {
        scrollAnchorRef.current.scrollIntoView({ behavior, block: "end" });
      }
    },
    [] // containerRef and isAtBottom removed as they are not direct dependencies here.
  );

  // Effect to handle user scroll interaction and button visibility
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const atBottom = isAtBottom();
      const currentScrollTop = container.scrollTop;

      // User scrolls up
      if (currentScrollTop < lastScrollTop.current && !atBottom) {
        userInteractedRef.current = true;
      }
      // User scrolls back to bottom
      else if (atBottom) {
        userInteractedRef.current = false;
      }

      lastScrollTop.current = currentScrollTop <= 0 ? 0 : currentScrollTop;
      setShowScrollButton(!atBottom);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (autoScrollTimeout.current) {
        clearTimeout(autoScrollTimeout.current);
      }
    };
  }, [containerRef, isAtBottom]);

  // Effect for auto-scrolling on new content
  // useLayoutEffect is crucial here to ensure the scroll happens after the DOM is updated
  // but before the browser paints, preventing flickering.
  useLayoutEffect(() => {
    // If the user hasn't scrolled up manually, we auto-scroll to the bottom.
    if (!userInteractedRef.current) {
      // We call scrollToBottom directly without a timeout. useLayoutEffect ensures
      // that the DOM has been updated with the new messages at this point.
      scrollToBottom("auto");
    } else {
      // If the user has scrolled up, we show the button so they can get back to the bottom easily.
      setShowScrollButton(true);
    }
  }, [
    messages,
    streamingContent,
    processingStatus,
    thinkingContent,
    isThinking,
    scrollToBottom,
  ]);

  return {
    scrollToBottom,
    scrollAnchorRef,
    showScrollButton,
  };
};
