// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import "./MessageItem.css";
import "./ThinkingMessage.css";

interface ThinkingMessageProps {
  thinkingContent: string;
}

/**
 * Component that displays thinking content in a chat bubble
 * with expand/collapse functionality
 */
export const ThinkingMessage: React.FC<ThinkingMessageProps> = ({
  thinkingContent,
}) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const messageId = `thinking-${Date.now()}`;
  const gradientId = `gradient-thinking-${messageId}`;

  return (
    <div className="message system-message thinking-message">
      <div className="message-avatar">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#9b59b6" />
              <stop offset="100%" stopColor="#6c5ce7" />
            </linearGradient>
          </defs>
          <circle cx="12" cy="12" r="10" fill={`url(#${gradientId})`} />
          {/* Brain icon for thinking */}
          <path
            d="M12 6c-1.5 0-2.8.7-3.6 1.8-.3.4-.4.9-.4 1.4 0 .3.1.6.2.9-.7.5-1.2 1.3-1.2 2.2 0 1.1.6 2 1.5 2.5.2.8.9 1.4 1.8 1.6.3.5.9.9 1.5 1 .2.1.4.1.6.1s.4 0 .6-.1c.6-.1 1.2-.5 1.5-1 .9-.2 1.6-.8 1.8-1.6.9-.5 1.5-1.4 1.5-2.5 0-.9-.5-1.7-1.2-2.2.1-.3.2-.6.2-.9 0-.5-.1-1-.4-1.4C14.8 6.7 13.5 6 12 6z"
            fill="white"
          />
        </svg>
      </div>
      <div className="message-bubble-wrapper">
        <div className="message-content">
          <div
            className="thinking-header"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <span className="thinking-icon">🧠</span>
            <span className="thinking-label">{t('chatMessages.thinking')}</span>
            <button
              className="expand-button"
              aria-label={isExpanded ? t('chatMessages.collapse') : t('chatMessages.expand')}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className={isExpanded ? "expanded" : ""}
              >
                <path
                  d="M4 6l4 4 4-4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          {isExpanded && thinkingContent && (
            <div className="thinking-content">{thinkingContent}</div>
          )}
        </div>
      </div>
    </div>
  );
};
