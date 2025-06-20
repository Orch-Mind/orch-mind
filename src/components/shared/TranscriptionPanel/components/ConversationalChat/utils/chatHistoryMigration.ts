import { nanoid } from "nanoid";
import { ChatMessage } from "../hooks/usePersistentMessages";
import { ChatConversation } from "../types/ChatHistoryTypes";

const OLD_STORAGE_KEY = "orch-chat-messages";
const NEW_STORAGE_KEY = "orch-chat-history";
const MIGRATION_FLAG_KEY = "orch-chat-migration-completed";

/**
 * Migrates old chat messages to the new conversation format
 */
export const migrateOldChatMessages = (): boolean => {
  try {
    // Check if migration has already been completed
    const migrationCompleted = localStorage.getItem(MIGRATION_FLAG_KEY);
    if (migrationCompleted === "true") {
      return false;
    }

    // Check if there's already data in the new format
    const newData = localStorage.getItem(NEW_STORAGE_KEY);
    if (newData) {
      // Mark migration as completed if new data exists
      localStorage.setItem(MIGRATION_FLAG_KEY, "true");
      return false;
    }

    // Try to load old messages
    const oldData = localStorage.getItem(OLD_STORAGE_KEY);
    if (!oldData) {
      // No old data to migrate
      localStorage.setItem(MIGRATION_FLAG_KEY, "true");
      return false;
    }

    console.log("[MIGRATION] Starting chat history migration...");

    // Parse old messages
    const oldMessages: ChatMessage[] = JSON.parse(oldData).map((msg: any) => ({
      ...msg,
      timestamp: new Date(msg.timestamp),
    }));

    if (oldMessages.length === 0) {
      localStorage.setItem(MIGRATION_FLAG_KEY, "true");
      return false;
    }

    // Create a new conversation with the old messages
    const now = new Date();
    const migrationConversation: ChatConversation = {
      id: nanoid(),
      title: "Previous Conversations (Migrated)",
      lastMessage: oldMessages[oldMessages.length - 1]?.content || "",
      lastMessageTime: oldMessages[oldMessages.length - 1]?.timestamp || now,
      createdAt: oldMessages[0]?.timestamp || now,
      messages: oldMessages,
      isActive: true,
    };

    // Save in new format
    const newHistoryData = {
      conversations: [migrationConversation],
      currentId: migrationConversation.id,
    };

    localStorage.setItem(NEW_STORAGE_KEY, JSON.stringify(newHistoryData));

    // Mark migration as completed
    localStorage.setItem(MIGRATION_FLAG_KEY, "true");

    console.log(
      `[MIGRATION] Successfully migrated ${oldMessages.length} messages to new format`
    );

    // Optionally backup old data before removing
    localStorage.setItem(OLD_STORAGE_KEY + "-backup", oldData);

    return true;
  } catch (error) {
    console.error("[MIGRATION] Error during chat history migration:", error);
    return false;
  }
};

/**
 * Clears migration flag (useful for testing)
 */
export const resetMigration = () => {
  localStorage.removeItem(MIGRATION_FLAG_KEY);
  console.log("[MIGRATION] Migration flag reset");
};

/**
 * Checks if migration is needed
 */
export const isMigrationNeeded = (): boolean => {
  const migrationCompleted = localStorage.getItem(MIGRATION_FLAG_KEY);
  const hasOldData = !!localStorage.getItem(OLD_STORAGE_KEY);
  const hasNewData = !!localStorage.getItem(NEW_STORAGE_KEY);

  return !migrationCompleted && hasOldData && !hasNewData;
};
