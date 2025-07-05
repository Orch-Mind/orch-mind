// SPDX-License-Identifier: MIT OR Apache-2.0
// Conversation Selector Component - Following SRP and KISS
// Single responsibility: Handle conversation selection UI

import React from "react";
import type { ConversationStatus } from "../types";

interface ConversationSelectorProps {
  conversations: ConversationStatus[];
  selectedCount: number;
  isTraining: boolean;
  onSelectConversation: (id: string) => void;
  onSelectAll: () => void;
}

export const ConversationSelector: React.FC<ConversationSelectorProps> = ({
  conversations,
  selectedCount,
  isTraining,
  onSelectConversation,
  onSelectAll,
}) => {
  const unprocessedCount = conversations.filter((c) => !c.isProcessed).length;
  const isAllSelected = selectedCount === unprocessedCount;

  if (conversations.length === 0) {
    return (
      <div className="bg-black/20 backdrop-blur-sm rounded-md p-2 border border-cyan-400/20">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h3 className="text-sm font-semibold text-cyan-400">
              Select Conversations
            </h3>
            <p className="text-gray-400 text-[9px]">
              Choose quality user/assistant pairs
            </p>
          </div>
        </div>

        <div className="text-center py-3">
          <svg
            className="w-6 h-6 text-gray-500 mx-auto mb-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <h4 className="text-gray-400 font-medium text-xs">
            No Conversations
          </h4>
          <p className="text-gray-500 text-[9px]">
            Start chatting to create data
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black/20 backdrop-blur-sm rounded-md p-2 border border-cyan-400/20 h-52">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h3 className="text-sm font-semibold text-cyan-400">
            Select Conversations
          </h3>
          <p className="text-gray-400 text-[9px]">
            Choose quality user/assistant pairs
          </p>
        </div>
        <button
          onClick={onSelectAll}
          className="px-2 py-1 text-[10px] text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10 rounded transition-all duration-200 border border-cyan-400/30"
          disabled={isTraining}
        >
          {isAllSelected ? "Deselect" : "Select All"}
        </button>
      </div>

      <div className="space-y-1 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
        {conversations.map((conv) => (
          <ConversationItem
            key={conv.id}
            conversation={conv}
            isTraining={isTraining}
            onSelect={onSelectConversation}
          />
        ))}
      </div>
    </div>
  );
};

// Separate component for individual conversation item (SRP)
interface ConversationItemProps {
  conversation: ConversationStatus;
  isTraining: boolean;
  onSelect: (id: string) => void;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isTraining,
  onSelect,
}) => {
  const handleSelect = () => {
    if (!conversation.isProcessed && !isTraining) {
      onSelect(conversation.id);
    }
  };

  const handleCheckboxChange = () => {
    // Debug para verificar se está sendo chamado
    console.log(
      "[Checkbox] Clicked:",
      conversation.id,
      "Current state:",
      conversation.isSelected
    );

    // Sem e.stopPropagation() - permite comportamento natural do checkbox
    handleSelect();
  };

  const handleDivClick = (e: React.MouseEvent) => {
    // Evita duplo clique quando clica no checkbox
    if ((e.target as HTMLElement).tagName === "INPUT") {
      return;
    }
    handleSelect();
  };

  return (
    <div
      className={`group relative p-2 rounded transition-all duration-200 cursor-pointer border text-xs ${
        conversation.isProcessed
          ? "bg-green-900/10 border-green-400/30 cursor-not-allowed"
          : conversation.isSelected
          ? "bg-cyan-900/30 border-cyan-400/50 shadow-sm shadow-cyan-400/10"
          : "bg-gray-900/30 border-gray-600/30 hover:border-cyan-400/40 hover:bg-gray-900/50"
      }`}
      onClick={handleDivClick}
    >
      <div className="flex items-start space-x-2">
        <input
          type="checkbox"
          checked={conversation.isSelected}
          onChange={handleCheckboxChange}
          disabled={conversation.isProcessed || isTraining}
          className={`w-4 h-4 mt-0.5 rounded border focus:outline-none focus:ring-0 cursor-pointer disabled:cursor-not-allowed transition-all duration-200 accent-cyan-500 ${
            conversation.isProcessed || isTraining ? "opacity-50" : ""
          }`}
          aria-label={`Select ${conversation.title} for training`}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-white text-xs font-medium truncate">
              {conversation.title}
            </h4>
            {conversation.isProcessed && (
              <span className="flex items-center text-green-400 text-[9px]">
                <svg
                  className="w-2 h-2 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Trained
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2 text-[9px] text-gray-400 mt-0.5">
            <span>{conversation.messageCount}m</span>
            <span>•</span>
            <span className="text-cyan-400">{conversation.validPairs}p</span>
            {conversation.isProcessed && conversation.lastTrainedAt && (
              <>
                <span>•</span>
                <span>{conversation.lastTrainedAt.toLocaleDateString()}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
