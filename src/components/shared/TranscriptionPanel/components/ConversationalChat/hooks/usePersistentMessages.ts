// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { nanoid } from "nanoid";
import { useCallback, useEffect, useRef, useState } from "react";

export interface ChatMessage {
  id: string;
  type: "user" | "system" | "assistant" | "error";
  content: string;
  timestamp: Date;
  hasContext?: boolean;
  contextContent?: string;
}

interface AddMessageParams {
  type: "user" | "system" | "assistant" | "error";
  content: string;
  hasContext?: boolean;
  contextContent?: string;
}

interface UsePersistentMessagesReturn {
  messages: ChatMessage[];
  addMessage: (params: AddMessageParams) => void;
  clearMessages: () => void;
  recovery: {
    hasBackup: boolean;
    restoreFromBackup: () => void;
    clearBackup: () => void;
    integrityCheck: () => boolean;
    lastSaveTime: number;
  };
}

const STORAGE_KEY = "orch-chat-messages";
const BACKUP_KEY = "orch-chat-backup";
const REDUNDANT_KEY = "orch-chat-redundant";
const COMPONENT_ID_KEY = "orch-chat-component-id";

// Enhanced logging with detailed timestamps
const logWithDetails = (level: string, message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    level,
    message,
    data,
  };

  console.log(`${level} [PERSISTENT_MESSAGES] ${message}`, logData);

  // Store critical logs in localStorage for debugging
  try {
    const logs = JSON.parse(localStorage.getItem("orch-chat-logs") || "[]");
    logs.push(logData);
    if (logs.length > 50) logs.splice(0, logs.length - 50);
    localStorage.setItem("orch-chat-logs", JSON.stringify(logs));
  } catch (e) {
    // Ignore logging errors
  }
};

// Helper function to safely parse and restore messages from a storage key
const loadMessagesFromKey = (key: string, logLabel: string): ChatMessage[] => {
  try {
    const data = localStorage.getItem(key);
    if (data) {
      const parsed = JSON.parse(data);
      const messagesArray = Array.isArray(parsed) ? parsed : parsed.messages;
      if (Array.isArray(messagesArray) && messagesArray.length > 0) {
        logWithDetails(
          "💾",
          `Loaded ${messagesArray.length} messages from ${logLabel}`
        );
        return messagesArray.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
      }
    }
  } catch (error) {
    logWithDetails("❌", `Error loading from ${logLabel}`, { key, error });
  }
  return [];
};

export const usePersistentMessages = (): UsePersistentMessagesReturn => {
  const componentId = useRef<string>(nanoid());

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    logWithDetails("🚀", "Initializing persistent messages state (lazy)");
    let initialMessages = loadMessagesFromKey(STORAGE_KEY, "primary storage");
    if (initialMessages.length > 0) return initialMessages;

    initialMessages = loadMessagesFromKey(BACKUP_KEY, "backup storage");
    if (initialMessages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialMessages));
      return initialMessages;
    }

    initialMessages = loadMessagesFromKey(REDUNDANT_KEY, "redundant storage");
    if (initialMessages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialMessages));
      return initialMessages;
    }

    logWithDetails("ℹ️", "No messages found in any storage for lazy init");
    return [];
  });

  const [lastSaveTime, setLastSaveTime] = useState<number>(0);

  useEffect(() => {
    logWithDetails("✅", "Persistent messages hook mounted", {
      componentId: componentId.current,
      initialMessageCount: messages.length,
    });
    try {
      localStorage.setItem(COMPONENT_ID_KEY, componentId.current);
    } catch (error) {
      logWithDetails("❌", "Error setting component ID", error);
    }
  }, []);

  const saveToStorage = useCallback((currentMessages: ChatMessage[]) => {
    try {
      const dataToSave = JSON.stringify(currentMessages);
      localStorage.setItem(STORAGE_KEY, dataToSave);

      const backupData = JSON.stringify({
        timestamp: Date.now(),
        count: currentMessages.length,
        messages: currentMessages,
      });
      localStorage.setItem(BACKUP_KEY, backupData);
      localStorage.setItem(REDUNDANT_KEY, dataToSave);

      setLastSaveTime(Date.now());
    } catch (error) {
      logWithDetails("❌", "Error saving messages to storage", error);
    }
  }, []);

  const debouncedSave = useRef(
    ((callback: (msgs: ChatMessage[]) => void, delay: number) => {
      let timeout: NodeJS.Timeout;
      return (msgs: ChatMessage[]) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => callback(msgs), delay);
      };
    })(saveToStorage, 500)
  ).current;

  useEffect(() => {
    debouncedSave(messages);
  }, [messages, debouncedSave]);

  const addMessage = useCallback((params: AddMessageParams) => {
    const newMessage: ChatMessage = {
      id: nanoid(),
      timestamp: new Date(),
      ...params,
    };
    setMessages((prevMessages) => [...prevMessages, newMessage]);
  }, []);

  const clearMessages = useCallback(() => {
    logWithDetails("🗑️", "Clearing all messages");
    setMessages([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(BACKUP_KEY);
      localStorage.removeItem(REDUNDANT_KEY);
    } catch (error) {
      logWithDetails("❌", "Error clearing storage", error);
    }
  }, []);

  const hasBackup = useCallback(() => {
    try {
      return !!(
        localStorage.getItem(BACKUP_KEY) || localStorage.getItem(REDUNDANT_KEY)
      );
    } catch {
      return false;
    }
  }, []);

  const restoreFromBackup = useCallback(() => {
    logWithDetails("🔄", "Manual restore requested");
    const backupMessages = loadMessagesFromKey(
      BACKUP_KEY,
      "manual backup restore"
    );
    if (backupMessages.length > 0) {
      setMessages(backupMessages);
      logWithDetails("✅", "Manual restore completed", {
        recoveredCount: backupMessages.length,
      });
      return true;
    }

    const redundantMessages = loadMessagesFromKey(
      REDUNDANT_KEY,
      "manual redundant restore"
    );
    if (redundantMessages.length > 0) {
      setMessages(redundantMessages);
      logWithDetails("✅", "Manual restore completed", {
        recoveredCount: redundantMessages.length,
      });
      return true;
    }

    logWithDetails("⚠️", "No backup data found for manual restore");
    return false;
  }, []);

  const clearBackup = useCallback(() => {
    try {
      localStorage.removeItem(BACKUP_KEY);
      localStorage.removeItem(REDUNDANT_KEY);
      logWithDetails("🗑️", "Backup cleared");
    } catch (error) {
      logWithDetails("❌", "Error clearing backup", error);
    }
  }, []);

  const performIntegrityCheck = useCallback(() => {
    try {
      const primaryCount = loadMessagesFromKey(
        STORAGE_KEY,
        "integrity check"
      ).length;
      const backupCount = loadMessagesFromKey(
        BACKUP_KEY,
        "integrity check"
      ).length;
      const isHealthy = primaryCount >= backupCount;
      logWithDetails("🩺", "Performed integrity check", {
        isHealthy,
        primaryCount,
        backupCount,
      });
      return isHealthy;
    } catch (e) {
      return false;
    }
  }, []);

  return {
    messages,
    addMessage,
    clearMessages,
    recovery: {
      hasBackup: hasBackup(),
      restoreFromBackup,
      clearBackup,
      integrityCheck: performIntegrityCheck,
      lastSaveTime,
    },
  };
};
