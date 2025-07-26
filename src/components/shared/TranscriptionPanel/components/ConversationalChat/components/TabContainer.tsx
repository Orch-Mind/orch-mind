// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React, { useState } from "react";
import "../styles/TabContainer.css";
import { ChatHistorySidebar } from "./ChatHistorySidebar";
import { WorkspaceExplorer } from "./WorkspaceExplorer";
import { ChatConversation } from "../types/ChatHistoryTypes";

interface TabContainerProps {
  // Chat History props
  conversations: ChatConversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onCreateNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onSearchConversations: (query: string) => ChatConversation[];
  isProcessing?: boolean;
}

type TabType = "chat" | "workspace";

export const TabContainer: React.FC<TabContainerProps> = ({
  conversations,
  currentConversationId,
  onSelectConversation,
  onCreateNewConversation,
  onDeleteConversation,
  onSearchConversations,
  isProcessing = false,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("chat");

  return (
    <div className="tab-container">
      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === "chat" ? "active" : ""}`}
          onClick={() => setActiveTab("chat")}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="tab-icon">
            <path
              d="M8 1c-1.7 0-3.2.6-4.3 1.7C2.6 3.8 2 5.3 2 7c0 1.2.3 2.3.8 3.3L2 14l3.7-.8c1 .5 2.1.8 3.3.8 1.7 0 3.2-.6 4.3-1.7C14.4 11.2 15 9.7 15 8c0-1.7-.6-3.2-1.7-4.3C12.2 2.6 10.7 2 9 2H8z"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
          CHAT
        </button>
        
        <button
          className={`tab-button ${activeTab === "workspace" ? "active" : ""}`}
          onClick={() => setActiveTab("workspace")}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="tab-icon">
            <path
              d="M2 3h12v10H2V3z"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <path
              d="M2 6h12"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            <path
              d="M6 3v3"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
          WORKSPACE
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === "chat" && (
          <ChatHistorySidebar
            conversations={conversations}
            currentConversationId={currentConversationId}
            onSelectConversation={onSelectConversation}
            onCreateNewConversation={onCreateNewConversation}
            onDeleteConversation={onDeleteConversation}
            onSearchConversations={onSearchConversations}
            isProcessing={isProcessing}
          />
        )}
        
        {activeTab === "workspace" && (
          <WorkspaceExplorer />
        )}
      </div>
    </div>
  );
};
