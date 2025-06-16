import React, { useRef, useEffect } from "react";
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
  placeholder = "Type your message...",
}) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea (KISS principle - simple and focused)
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "44px";
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="message-input-wrapper">
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
        }}
      />
    </div>
  );
}; 