// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChatConversation } from "../types/ChatHistoryTypes";

interface ChatHistorySidebarProps {
  conversations: ChatConversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onCreateNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onSearchConversations: (query: string) => ChatConversation[];
  isProcessing?: boolean; // Disable new conversation while AI is processing
}

export const ChatHistorySidebar: React.FC<ChatHistorySidebarProps> = ({
  conversations,
  currentConversationId,
  onSelectConversation,
  onCreateNewConversation,
  onDeleteConversation,
  onSearchConversations,
  isProcessing = false,
}) => {
  const { t, i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Filter conversations based on search
  const displayedConversations = searchQuery
    ? onSearchConversations(searchQuery)
    : conversations;

  // Format date for display
  const formatDate = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('chatSidebar.timeFormats.now');
    if (diffMins < 60) return t('chatSidebar.timeFormats.minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('chatSidebar.timeFormats.hoursAgo', { count: diffHours });
    if (diffDays < 7) return t('chatSidebar.timeFormats.daysAgo', { count: diffDays });

    const locale = i18n.language === 'pt' ? 'pt-BR' : 'en-US';
    return date.toLocaleDateString(locale, {
      day: "2-digit",
      month: "short",
    });
  };

  return (
    <div className="chat-history-sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <h2 className="sidebar-title">{t('chatSidebar.title')}</h2>
        <button
          className={`new-chat-button ${isProcessing ? "disabled" : ""}`}
          onClick={onCreateNewConversation}
          disabled={isProcessing}
          title={
            isProcessing ? t('chatSidebar.waitProcessing') : t('chatSidebar.newChat')
          }
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 4v12m6-6H4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Search */}
      <div className="sidebar-search">
        <input
          type="text"
          placeholder={t('chatSidebar.search')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <svg
          className="search-icon"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
        >
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M11 11l3 3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Conversations List */}
      <div className="conversations-list">
        {displayedConversations.length === 0 ? (
          <div className="no-conversations">
            {searchQuery
              ? t('chatSidebar.noConversationsFound')
              : t('chatSidebar.noConversationsYet')}
          </div>
        ) : (
          displayedConversations.map((conv) => (
            <div
              key={conv.id}
              className={`conversation-item ${
                conv.id === currentConversationId ? "active" : ""
              } ${
                isProcessing && conv.id !== currentConversationId
                  ? "disabled"
                  : ""
              }`}
              onClick={() => {
                if (isProcessing && conv.id !== currentConversationId) {
                  // Não permitir mudança de conversa durante processamento
                  return;
                }
                onSelectConversation(conv.id);
              }}
              onMouseEnter={() => setHoveredId(conv.id)}
              onMouseLeave={() => setHoveredId(null)}
              title={
                isProcessing && conv.id !== currentConversationId
                  ? t('chatSidebar.waitProcessing')
                  : undefined
              }
            >
              <div className="conversation-content">
                <h3 className="conversation-title">{conv.title}</h3>
                <p className="conversation-preview">
                  {conv.lastMessage || t('chatSidebar.noMessagesYet')}
                </p>
                <span className="conversation-time">
                  {formatDate(conv.lastMessageTime)}
                </span>
              </div>

              {/* Delete button */}
              {hoveredId === conv.id && (
                <button
                  className="delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(t('chatSidebar.deleteConversation'))) {
                      onDeleteConversation(conv.id);
                    }
                  }}
                  title={t('chatSidebar.deleteConversationTitle')}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M4 4l8 8m0-8l-8 8"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
