// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";
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
  // Preserva espaços e quebras de linha convertendo \n em <br>
  const formattedContent = React.useMemo(() => {
    if (!content) return null;

    // Divide o conteúdo por quebras de linha
    const lines = content.split("\n");

    return lines.map((line, index) => (
      <React.Fragment key={index}>
        {line || "\u00A0"} {/* Usa espaço não-quebrável para linhas vazias */}
        {index < lines.length - 1 && <br />}
      </React.Fragment>
    ));
  }, [content]);

  return (
    <div className="streaming-message">
      <div className="streaming-text">
        {formattedContent}
        {!isComplete && <span className="streaming-cursor" />}
      </div>
    </div>
  );
};
