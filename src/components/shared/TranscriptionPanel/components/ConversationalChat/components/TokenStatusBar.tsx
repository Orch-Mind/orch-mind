import React from "react";
import "./TokenStatusBar.css";

interface TokenStatusBarProps {
  currentTokens: number;
  maxTokens: number;
  summarizationThreshold: number;
}

export const TokenStatusBar: React.FC<TokenStatusBarProps> = ({
  currentTokens,
  maxTokens,
  summarizationThreshold,
}) => {
  const percentage = (currentTokens / maxTokens) * 100;
  const summarizationPercentage = (summarizationThreshold / maxTokens) * 100;
  const willSummarize = currentTokens >= summarizationThreshold;

  const getStatusColor = () => {
    if (percentage < 50) return "green";
    if (percentage < 80) return "yellow";
    return "red";
  };

  const formatTokenCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  return (
    <div className="token-status-bar">
      <div className="token-info-text">
        <span className="token-count">
          {formatTokenCount(currentTokens)} / {formatTokenCount(maxTokens)} tokens
        </span>
        <span className="token-percentage">({Math.round(percentage)}%)</span>
        {willSummarize && (
          <span className="summarization-warning">
            📋 Summarization will trigger soon
          </span>
        )}
      </div>
      <div className="token-progress-container">
        <div className="token-progress-background">
          <div
            className={`token-progress-fill ${getStatusColor()}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
          <div
            className="summarization-threshold-marker"
            style={{ left: `${summarizationPercentage}%` }}
            title={`Summarization at ${formatTokenCount(summarizationThreshold)} tokens`}
          />
        </div>
      </div>
    </div>
  );
}; 