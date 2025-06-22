// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";
import { ChatMessage } from "../hooks/usePersistentMessages";
import "./MessageItem.css";

interface MessageItemProps {
  message: ChatMessage & { isSummary?: boolean };
}

export const MessageItem: React.FC<MessageItemProps> = React.memo(
  ({ message }) => {
    const isSummary = (message as any).isSummary;
    const messageId = message.id || Math.random().toString(36).substr(2, 9);
    const gradientId = `gradient-${message.type}-${messageId}`;

    return (
      <div
        className={`message ${message.type}-message ${
          isSummary ? "summary-message" : ""
        }`}
      >
        <div className="message-avatar">
          {message.type === "user" ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <defs>
                <linearGradient
                  id={gradientId}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#00faff" />
                  <stop offset="100%" stopColor="#0066cc" />
                </linearGradient>
              </defs>
              <circle cx="12" cy="12" r="10" fill={`url(#${gradientId})`} />
              {/* Bonequinho centralizado - cabeça e corpo */}
              <path
                d="M12 10c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm0 1c-2 0-6 1-6 3v1.5c0 0.28 0.22 0.5 0.5 0.5h11c0.28 0 0.5-0.22 0.5-0.5V14c0-2-4-3-6-3z"
                fill="white"
              />
            </svg>
          ) : isSummary ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <defs>
                <linearGradient
                  id={gradientId}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#ffd700" />
                  <stop offset="100%" stopColor="#ff8c00" />
                </linearGradient>
              </defs>
              <circle cx="12" cy="12" r="10" fill={`url(#${gradientId})`} />
              {/* Summary icon - document with lines */}
              <rect x="7" y="6" width="10" height="12" rx="1" fill="white" />
              <line
                x1="9"
                y1="9"
                x2="15"
                y2="9"
                stroke={`url(#${gradientId})`}
                strokeWidth="1.5"
              />
              <line
                x1="9"
                y1="12"
                x2="15"
                y2="12"
                stroke={`url(#${gradientId})`}
                strokeWidth="1.5"
              />
              <line
                x1="9"
                y1="15"
                x2="13"
                y2="15"
                stroke={`url(#${gradientId})`}
                strokeWidth="1.5"
              />
            </svg>
          ) : message.type === "error" ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <defs>
                <linearGradient
                  id={gradientId}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#ff6b6b" />
                  <stop offset="100%" stopColor="#ff4757" />
                </linearGradient>
              </defs>
              <circle cx="12" cy="12" r="10" fill={`url(#${gradientId})`} />
              {/* Error exclamation mark */}
              <path
                d="M12 7v6m0 4h.01"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <defs>
                <linearGradient
                  id={gradientId}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#ff4dd2" />
                  <stop offset="100%" stopColor="#7c4dff" />
                </linearGradient>
              </defs>
              <circle cx="12" cy="12" r="10" fill={`url(#${gradientId})`} />
              {/* AI brain icon - melhor centralizado */}
              <rect
                x="8.5"
                y="8.5"
                width="7"
                height="7"
                rx="1.5"
                fill="white"
              />
              <circle cx="12" cy="12" r="1.5" fill={`url(#${gradientId})`} />
            </svg>
          )}
        </div>

        <div className="message-bubble-wrapper">
          <div className="message-content">
            {message.hasContext && message.contextContent && (
              <div className="message-context">
                <div className="context-label">Context:</div>
                <div className="context-content">{message.contextContent}</div>
              </div>
            )}

            {isSummary && (
              <div className="summary-header">
                <span className="summary-icon">📋</span>
                <span className="summary-title">Conversation Summary</span>
                {(message as any).originalMessageCount && (
                  <span className="summary-count">
                    ({(message as any).originalMessageCount} messages)
                  </span>
                )}
              </div>
            )}

            <div className="message-text">{message.content}</div>

            {isSummary && (message as any).tokenCount && (
              <div className="summary-metadata">
                <span className="token-info">
                  {(message as any).tokenCount} tokens
                </span>
              </div>
            )}
          </div>

          {/* Timestamp fora do bubble, similar ao WhatsApp */}
          <div className="message-timestamp">
            {message.timestamp.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      </div>
    );
  }
);
