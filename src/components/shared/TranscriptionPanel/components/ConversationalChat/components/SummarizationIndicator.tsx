// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";
import "./SummarizationIndicator.css";

interface SummarizationIndicatorProps {
  isSummarizing: boolean;
  tokenCount?: number;
  maxTokens?: number;
}

export const SummarizationIndicator: React.FC<SummarizationIndicatorProps> = ({
  isSummarizing,
  tokenCount,
  maxTokens,
}) => {
  if (!isSummarizing) return null;

  const percentage = tokenCount && maxTokens 
    ? Math.round((tokenCount / maxTokens) * 100) 
    : 0;

  return (
    <div className="summarization-indicator">
      <div className="summarization-content">
        <div className="spinner"></div>
        <span className="summarization-text">
          Summarizing conversation... 
          {tokenCount && (
            <span className="token-info">
              ({tokenCount.toLocaleString()} tokens, {percentage}% of context)
            </span>
          )}
        </span>
      </div>
    </div>
  );
}; 