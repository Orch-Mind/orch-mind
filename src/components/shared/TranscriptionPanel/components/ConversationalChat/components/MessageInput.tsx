import React, { useEffect, useRef, useState } from "react";
import { ChatInputProps } from "../types/ChatTypes";

/**
 * Message input component
 * Follows Single Responsibility Principle - only handles message input
 */
export const MessageInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  onKeyPress,
  disabled = false,
  placeholder = "Type your message or use voice transcription...",
}) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-resize textarea (KISS principle - simple and focused)
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "44px";
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [value]);

  // Handle typing indicator
  useEffect(() => {
    if (value.trim().length > 0) {
      setIsTyping(true);

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to remove typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 1000);
    } else {
      setIsTyping(false);
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={`message-input-wrapper ${isTyping ? "typing" : ""}`}>
      <textarea
        ref={inputRef}
        className="message-input"
        value={value}
        onChange={handleChange}
        onKeyPress={onKeyPress}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        style={{
          minHeight: "44px",
          maxHeight: "120px",
          resize: "none",
          overflow: "auto",
          background: "transparent",
          border: "none",
          outline: "none",
        }}
      />
    </div>
  );
};
