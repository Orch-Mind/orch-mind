// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useCallback, useLayoutEffect, useRef } from "react";
import { ChatMessage } from "../types/ChatTypes";

interface UseChatScrollProps {
  messages: ChatMessage[];
  streamingContent?: string;
  processingStatus?: string;
  thinkingContent?: string;
  isThinking?: boolean;
}

/**
 * Custom hook to manage chat scroll behavior using a reliable anchor element.
 * This approach avoids scroll height calculations and is more resilient.
 */
export const useChatScroll = ({
  messages,
  streamingContent,
  processingStatus,
  thinkingContent,
  isThinking,
}: UseChatScrollProps) => {
  const scrollAnchorRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(
    (behavior: "smooth" | "auto" = "smooth") => {
      console.log("[useChatScroll] scrollToBottom called:", {
        behavior,
        anchorExists: !!scrollAnchorRef.current,
        anchorElement: scrollAnchorRef.current,
      });

      if (scrollAnchorRef.current) {
        scrollAnchorRef.current.scrollIntoView({ behavior, block: "end" });
        console.log("[useChatScroll] scrollIntoView called successfully");
      } else {
        console.warn("[useChatScroll] scrollAnchorRef.current is null!");
      }
    },
    []
  );

  // Auto-scroll when messages or streaming content changes
  // useLayoutEffect is used to ensure the scroll happens after the DOM is updated
  // but before the browser paints, preventing visual inconsistencies.
  useLayoutEffect(() => {
    console.log("[useChatScroll] Effect triggered:", {
      messagesLength: messages.length,
      lastMessage: messages[messages.length - 1],
      streamingContent: streamingContent?.substring(0, 50),
      hasStreamingContent: !!streamingContent,
      processingStatus: processingStatus?.substring(0, 50),
      hasProcessingStatus: !!processingStatus,
      thinkingContent: thinkingContent?.substring(0, 50),
      hasThinkingContent: !!thinkingContent,
      isThinking: isThinking,
      scrollAnchorExists: !!scrollAnchorRef.current,
    });

    // A setTimeout with a delay of 0 pushes the execution to the end of the
    // event loop, after the browser has finished its rendering and layout
    // calculations. This is a robust way to handle tricky scroll timing issues.
    const timer = setTimeout(() => {
      console.log("[useChatScroll] Attempting scroll to bottom");
      scrollToBottom("auto");
    }, 0);

    return () => clearTimeout(timer);
  }, [
    messages,
    streamingContent,
    processingStatus,
    thinkingContent,
    isThinking,
    scrollToBottom,
  ]);

  // For the button, we can still use the container logic, but it's less critical.
  // This part can be added back if the button logic is needed. For now, we simplify.

  return {
    scrollToBottom,
    scrollAnchorRef, // Return the ref to be placed in the DOM
  };
};
