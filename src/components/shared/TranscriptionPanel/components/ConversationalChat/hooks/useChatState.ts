import { useRef, useState } from "react";
import { ChatState } from "../types/ChatTypes";

/**
 * Custom hook for managing chat state
 * Follows Single Responsibility Principle - only manages chat state
 */
export const useChatState = (): ChatState & {
  processingTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
  resetState: () => void;
} => {
  const [inputMessage, setInputMessage] = useState("");
  const [currentContext, setCurrentContext] = useState("");
  const [showContextField, setShowContextField] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetState = () => {
    setInputMessage("");
    setCurrentContext("");
    setShowContextField(false);
    setIsProcessing(false);
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = null;
    }
  };

  return {
    inputMessage,
    setInputMessage,
    currentContext,
    setCurrentContext,
    showContextField,
    setShowContextField,
    isProcessing,
    setIsProcessing,
    processingTimeoutRef,
    resetState,
  };
};
