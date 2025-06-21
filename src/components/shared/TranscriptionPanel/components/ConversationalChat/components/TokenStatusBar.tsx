import React from "react";
import "./TokenStatusBar.css";

interface TokenStatusBarProps {
  currentTokens: number;
  maxTokens: number;
  summarizationThreshold: number;
  isAtTop?: boolean;
}

export const TokenStatusBar: React.FC<TokenStatusBarProps> = ({
  currentTokens,
  maxTokens,
  summarizationThreshold,
  isAtTop = false,
}) => {
  const percentage = (currentTokens / maxTokens) * 100;
  const summarizationPercentage = (summarizationThreshold / maxTokens) * 100;
  const willSummarize = currentTokens >= summarizationThreshold;

  const getStatusClass = () => {
    if (percentage < 50) return "safe";
    if (percentage < 80) return "warning";
    return "critical";
  };

  // Additional hiding when at scroll top
  const scrollHideClass = isAtTop ? "at-top" : "";

  const formatTokenCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  // Calculate tokens remaining until summarization
  const tokensUntilSummarization = Math.max(
    0,
    summarizationThreshold - currentTokens
  );
  const shouldShowWarning =
    tokensUntilSummarization <= 5000 && tokensUntilSummarization > 0;

  return (
    <div className={`token-status-bar ${getStatusClass()} ${scrollHideClass}`}>
      {/* Progress wrapper */}
      <div className="token-progress-wrapper">
        <div className="token-progress-track">
          {/* Background glow effect */}
          <div
            className="token-progress-glow"
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />

          {/* Main progress bar */}
          <div
            className="token-progress-bar"
            style={{ width: `${Math.min(percentage, 100)}%` }}
          >
            <div className="token-progress-shine" />
          </div>

          {/* Compact info inside the bar */}
          <div className="token-info-overlay">
            <div className="token-info-left">
              <span className="token-count">
                {formatTokenCount(currentTokens)} /{" "}
                {formatTokenCount(maxTokens)}
              </span>
              <span className="token-percentage">
                {Math.round(percentage)}%
              </span>
            </div>

            {shouldShowWarning && (
              <div className="token-warning-compact">
                <span className="warning-icon">⚡</span>
                <span className="warning-text">
                  {formatTokenCount(tokensUntilSummarization)} left
                </span>
              </div>
            )}
          </div>

          {/* Summarization threshold marker */}
          <div
            className="summarization-threshold"
            style={{ left: `${summarizationPercentage}%` }}
          >
            <div className="threshold-line" />
          </div>
        </div>
      </div>

      {/* Summarization alert - only when triggered */}
      {willSummarize && (
        <div className="summarization-alert-compact">
          <span className="alert-icon">🚀</span>
          <span className="alert-text">Summarizing next message</span>
        </div>
      )}
    </div>
  );
};
