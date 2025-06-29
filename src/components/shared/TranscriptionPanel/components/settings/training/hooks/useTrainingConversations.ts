// SPDX-License-Identifier: MIT OR Apache-2.0
// Hook for managing training conversations - Following SRP
// Single responsibility: Handle conversation loading, selection, and state

import { useState, useEffect } from 'react';
import type { ConversationStatus, TrainingStats } from '../types';
import { formatConversationSummary, loadFromStorage, saveToStorage } from '../utils';

interface ChatConversationData {
  id: string;
  messages: Array<{
    role: string;
    content: string;
    timestamp?: string;
  }>;
  title?: string;
  createdAt?: string;
  lastMessageTime?: string;
}

export const useTrainingConversations = () => {
  const [conversations, setConversations] = useState<ConversationStatus[]>([]);
  const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set());
  const [trainingStats, setTrainingStats] = useState<TrainingStats>({
    totalConversations: 0,
    processedConversations: 0,
    pendingConversations: 0,
    totalMessages: 0,
  });

  // Load conversations from localStorage
  useEffect(() => {
    const loadConversations = async () => {
      try {
        console.log("[Training Debug] Loading conversations...");

        // Try main data source
        const data = localStorage.getItem("orch-chat-history");
        
        if (!data) {
          // Try legacy format
          const oldMessages = localStorage.getItem("orch-chat-messages");
          if (oldMessages) {
            console.log("[Training Debug] Converting legacy messages...");
            const oldParsed = JSON.parse(oldMessages);
            
            if (Array.isArray(oldParsed) && oldParsed.length > 0) {
              const convertedConversation = {
                id: "converted_conversation",
                title: "Conversa Importada",
                lastMessage: oldParsed[oldParsed.length - 1]?.content || "",
                lastMessageTime: new Date(),
                createdAt: new Date(),
                isActive: true,
                messages: oldParsed.map((msg: any) => ({
                  id: msg.id,
                  role: msg.type === "user" ? "user" : msg.type === "assistant" ? "assistant" : "system",
                  content: msg.content,
                  timestamp: msg.timestamp,
                })),
              };

              const newFormat = {
                conversations: [convertedConversation],
                currentId: convertedConversation.id,
              };

              localStorage.setItem("orch-chat-history", JSON.stringify(newFormat));
              return loadConversations(); // Reload with new data
            }
          }

          console.warn("[Training Debug] No conversations found");
          setConversations([]);
          updateStats([]);
          return;
        }

        const parsed = JSON.parse(data);
        
        if (!parsed.conversations || !Array.isArray(parsed.conversations)) {
          console.error("[Training Debug] Invalid conversation structure");
          setConversations([]);
          updateStats([]);
          return;
        }

        // Convert to display format
        const convs: ConversationStatus[] = parsed.conversations
          .map((conv: ChatConversationData, index: number) => {
            const summary = formatConversationSummary(conv);
            
            return {
              id: conv.id || `conv_${index}`,
              title: summary.title || `Conversation ${index + 1}`,
              messageCount: summary.messageCount,
              validPairs: summary.validPairs,
              preview: summary.preview,
              isProcessed: false,
              isSelected: false,
            };
          })
          .filter((conv: ConversationStatus) => conv.validPairs > 0);

        console.log("[Training Debug] Loaded conversations:", {
          total: parsed.conversations.length,
          valid: convs.length,
        });

        setConversations(convs);
        updateStats(convs);
      } catch (error) {
        console.error("[Training Debug] Error loading conversations:", error);
        setConversations([]);
        updateStats([]);
      }
    };

    loadConversations();
  }, []);

  const updateStats = (convs: ConversationStatus[]) => {
    const processed = convs.filter((c) => c.isProcessed).length;
    const pending = convs.filter((c) => !c.isProcessed).length;
    const totalMessages = convs.reduce((sum, c) => sum + c.messageCount, 0);

    setTrainingStats({
      totalConversations: convs.length,
      processedConversations: processed,
      pendingConversations: pending,
      totalMessages,
    });
  };

  const handleSelectConversation = (id: string) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === id ? { ...conv, isSelected: !conv.isSelected } : conv
      )
    );

    setSelectedConversations((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const unprocessed = conversations.filter((c) => !c.isProcessed);
    
    if (selectedConversations.size === unprocessed.length) {
      // Deselect all
      setConversations((prev) =>
        prev.map((conv) => ({ ...conv, isSelected: false }))
      );
      setSelectedConversations(new Set());
    } else {
      // Select all unprocessed
      setConversations((prev) =>
        prev.map((conv) => ({
          ...conv,
          isSelected: !conv.isProcessed,
        }))
      );
      setSelectedConversations(new Set(unprocessed.map((c) => c.id)));
    }
  };

  const markConversationsAsProcessed = (conversationIds: string[], modelName: string) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conversationIds.includes(conv.id)
          ? {
              ...conv,
              isProcessed: true,
              isSelected: false,
              lastTrainedAt: new Date(),
            }
          : conv
      )
    );

    // Update stats
    const updatedConvs = conversations.map((conv) =>
      conversationIds.includes(conv.id)
        ? { ...conv, isProcessed: true }
        : conv
    );
    updateStats(updatedConvs);
  };

  const resetTrainingData = () => {
    setConversations((prevConvs) =>
      prevConvs.map((conv) => ({
        ...conv,
        isProcessed: false,
        isSelected: false,
        lastTrainedAt: undefined,
      }))
    );
    setSelectedConversations(new Set());
  };

  return {
    conversations,
    selectedConversations,
    trainingStats,
    handleSelectConversation,
    handleSelectAll,
    markConversationsAsProcessed,
    resetTrainingData,
  };
};