import { nanoid } from "nanoid";
import { useCallback, useEffect, useRef, useState } from "react";

export interface ChatMessage {
  id: string;
  type: "user" | "system" | "error";
  content: string;
  timestamp: Date;
  hasContext?: boolean;
  contextContent?: string;
}

interface AddMessageParams {
  type: "user" | "system" | "error";
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
  };
}

const STORAGE_KEY = "orch-chat-messages";
const BACKUP_KEY = "orch-chat-backup";
const COMPONENT_ID_KEY = "orch-chat-component-id";

export const usePersistentMessages = (): UsePersistentMessagesReturn => {
  // Generate a unique component ID to track remounting
  const componentId = useRef<string>(nanoid());
  const isInitialized = useRef(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Initialize messages from storage or backup
  useEffect(() => {
    if (isInitialized.current) return;

    console.log("🔄 [PERSISTENT_MESSAGES] Initializing component:", {
      componentId: componentId.current,
      timestamp: new Date().toISOString(),
    });

    try {
      // Try to load from primary storage first
      const storedMessages = localStorage.getItem(STORAGE_KEY);
      const lastComponentId = localStorage.getItem(COMPONENT_ID_KEY);

      if (storedMessages) {
        const parsedMessages = JSON.parse(storedMessages);
        const validMessages = parsedMessages
          .map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }))
          .filter(
            (msg: ChatMessage) =>
              msg.id && msg.type && msg.content && msg.timestamp
          );

        console.log("✅ [PERSISTENT_MESSAGES] Restored from storage:", {
          messageCount: validMessages.length,
          lastComponentId,
          currentComponentId: componentId.current,
        });

        setMessages(validMessages);
      } else {
        // Try to restore from backup if primary storage is empty
        const backupData = localStorage.getItem(BACKUP_KEY);
        if (backupData) {
          const backup = JSON.parse(backupData);
          if (backup.messages && Array.isArray(backup.messages)) {
            const validMessages = backup.messages
              .map((msg: any) => ({
                ...msg,
                timestamp: new Date(msg.timestamp),
              }))
              .filter(
                (msg: ChatMessage) =>
                  msg.id && msg.type && msg.content && msg.timestamp
              );

            console.log("🔄 [PERSISTENT_MESSAGES] Restored from backup:", {
              messageCount: validMessages.length,
              backupTimestamp: backup.timestamp,
            });

            setMessages(validMessages);
          }
        }
      }

      // Store current component ID
      localStorage.setItem(COMPONENT_ID_KEY, componentId.current);
      isInitialized.current = true;
    } catch (error) {
      console.error("❌ [PERSISTENT_MESSAGES] Error loading messages:", error);
      isInitialized.current = true;
    }
  }, []);

  // Auto-save messages to storage
  useEffect(() => {
    if (!isInitialized.current || messages.length === 0) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));

      // Also create a backup
      const backup = {
        messages,
        timestamp: Date.now(),
        componentId: componentId.current,
      };
      localStorage.setItem(BACKUP_KEY, JSON.stringify(backup));

      console.log("💾 [PERSISTENT_MESSAGES] Auto-saved:", {
        messageCount: messages.length,
        componentId: componentId.current,
      });
    } catch (error) {
      console.error("❌ [PERSISTENT_MESSAGES] Error saving messages:", error);
    }
  }, [messages]);

  // Detect component remounting
  useEffect(() => {
    const handleBeforeUnload = () => {
      console.log(
        "🔄 [PERSISTENT_MESSAGES] Component unmounting, creating backup"
      );
      try {
        const backup = {
          messages,
          timestamp: Date.now(),
          componentId: componentId.current,
        };
        localStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
      } catch (error) {
        console.error("❌ [PERSISTENT_MESSAGES] Error creating backup:", error);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      handleBeforeUnload(); // Create backup on unmount
    };
  }, [messages]);

  const addMessage = useCallback((params: AddMessageParams) => {
    const newMessage: ChatMessage = {
      id: nanoid(),
      type: params.type,
      content: params.content,
      timestamp: new Date(),
      hasContext: params.hasContext,
      contextContent: params.contextContent,
    };

    console.log("➕ [PERSISTENT_MESSAGES] Adding message:", {
      id: newMessage.id,
      type: newMessage.type,
      contentLength: newMessage.content.length,
      hasContext: newMessage.hasContext,
    });

    setMessages((prev) => {
      // Prevent duplicates
      const isDuplicate = prev.some(
        (msg) =>
          msg.content === newMessage.content &&
          msg.type === newMessage.type &&
          Math.abs(msg.timestamp.getTime() - newMessage.timestamp.getTime()) <
            1000
      );

      if (isDuplicate) {
        console.log(
          "⚠️ [PERSISTENT_MESSAGES] Duplicate message detected, skipping"
        );
        return prev;
      }

      return [...prev, newMessage];
    });
  }, []);

  const clearMessages = useCallback(() => {
    console.log("🗑️ [PERSISTENT_MESSAGES] Clearing all messages");
    setMessages([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(BACKUP_KEY);
    } catch (error) {
      console.error("❌ [PERSISTENT_MESSAGES] Error clearing storage:", error);
    }
  }, []);

  // Recovery functions
  const hasBackup = useCallback(() => {
    try {
      const backup = localStorage.getItem(BACKUP_KEY);
      return !!backup;
    } catch {
      return false;
    }
  }, []);

  const restoreFromBackup = useCallback(() => {
    try {
      const backupData = localStorage.getItem(BACKUP_KEY);
      if (backupData) {
        const backup = JSON.parse(backupData);
        if (backup.messages && Array.isArray(backup.messages)) {
          const validMessages = backup.messages
            .map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
            }))
            .filter(
              (msg: ChatMessage) =>
                msg.id && msg.type && msg.content && msg.timestamp
            );

          console.log(
            "🔄 [PERSISTENT_MESSAGES] Manually restored from backup:",
            {
              messageCount: validMessages.length,
            }
          );

          setMessages(validMessages);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error(
        "❌ [PERSISTENT_MESSAGES] Error restoring from backup:",
        error
      );
      return false;
    }
  }, []);

  const clearBackup = useCallback(() => {
    try {
      localStorage.removeItem(BACKUP_KEY);
      console.log("🗑️ [PERSISTENT_MESSAGES] Backup cleared");
    } catch (error) {
      console.error("❌ [PERSISTENT_MESSAGES] Error clearing backup:", error);
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
    },
  };
};
