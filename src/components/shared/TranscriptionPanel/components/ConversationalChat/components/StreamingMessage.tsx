// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import "./MarkdownRenderer.css";
import "./StreamingMessage.css";

interface StreamingMessageProps {
  content: string;
  isComplete?: boolean;
}

/**
 * Component that displays streaming markdown with smooth animation
 * Shows a cursor while streaming and removes it when complete
 * Supports real-time markdown formatting during streaming
 */
export const StreamingMessage: React.FC<StreamingMessageProps> = ({
  content,
  isComplete = false,
}) => {
  return (
    <div className="streaming-message">
      <div className="streaming-text">
        <MarkdownRenderer content={content || ""} isStreaming={!isComplete} />
        {!isComplete && <span className="streaming-cursor" />}
      </div>
    </div>
  );
};
