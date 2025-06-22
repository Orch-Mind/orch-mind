// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React, { useEffect, useRef } from "react";
import "./StreamingMessage.css";

interface StreamingMessageProps {
  content: string;
  isComplete?: boolean;
}

/**
 * Component that displays streaming text with smooth animation
 * Shows a cursor while streaming and removes it when complete
 */
export const StreamingMessage: React.FC<StreamingMessageProps> = ({
  content,
  isComplete = false,
}) => {
  const textRef = useRef<HTMLDivElement>(null);
  const lastContentRef = useRef<string>("");

  useEffect(() => {
    if (textRef.current && content !== lastContentRef.current) {
      // Find the new characters
      const newChars = content.slice(lastContentRef.current.length);

      if (newChars) {
        // Create spans for new characters with animation
        const fragment = document.createDocumentFragment();

        for (const char of newChars) {
          const span = document.createElement("span");
          span.textContent = char;
          span.className = "char-fade-in";
          fragment.appendChild(span);
        }

        // Remove cursor from previous position if exists
        const existingCursor =
          textRef.current.querySelector(".streaming-cursor");
        if (existingCursor) {
          existingCursor.remove();
        }

        // Add new characters
        textRef.current.appendChild(fragment);

        // Add cursor if not complete
        if (!isComplete) {
          const cursor = document.createElement("span");
          cursor.className = "streaming-cursor";
          textRef.current.appendChild(cursor);
        }
      }

      lastContentRef.current = content;
    }
  }, [content, isComplete]);

  // Reset when content is cleared
  useEffect(() => {
    if (!content && textRef.current) {
      textRef.current.innerHTML = "";
      lastContentRef.current = "";
    }
  }, [content]);

  return (
    <div className="streaming-message">
      <div className="streaming-text" ref={textRef}></div>
    </div>
  );
};
