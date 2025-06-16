import { useCallback, useEffect, useRef, useState } from "react";

export interface ChatMessage {
  id: string;
  type: "user" | "system";
  content: string;
  timestamp: Date;
  hasContext?: boolean;
  contextContent?: string;
}

interface UsePersistentMessagesReturn {
  messages: ChatMessage[];
  addMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => void;
  clearMessages: () => void;
  recovery: {
    hasRecovered: boolean;
    recoveredCount: number;
  };
}

const STORAGE_KEY = "orch-os-chat-messages";
const DEBUG_PREFIX = "🔒 [PERSISTENT_MESSAGES]";

export function usePersistentMessages(): UsePersistentMessagesReturn {
  // Use ref to maintain persistent reference across re-renders
  const messagesRef = useRef<ChatMessage[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [recovery, setRecovery] = useState({
    hasRecovered: false,
    recoveredCount: 0,
  });
  const componentId = useRef(
    `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  );

  console.log(
    `${DEBUG_PREFIX} Component initialized with ID:`,
    componentId.current
  );

  // Generate unique message ID
  const generateMessageId = useCallback(() => {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Save to localStorage
  const saveToStorage = useCallback((messagesToSave: ChatMessage[]) => {
    try {
      const dataToSave = {
        messages: messagesToSave,
        timestamp: Date.now(),
        componentId: componentId.current,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      console.log(
        `${DEBUG_PREFIX} Saved ${messagesToSave.length} messages to localStorage`
      );
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Failed to save to localStorage:`, error);
    }
  }, []);

  // Load from localStorage
  const loadFromStorage = useCallback((): ChatMessage[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.messages && Array.isArray(parsed.messages)) {
          console.log(
            `${DEBUG_PREFIX} Loaded ${parsed.messages.length} messages from localStorage`
          );
          return parsed.messages.map((msg) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
        }
      }
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Failed to load from localStorage:`, error);
    }
    return [];
  }, []);

  // Sync messages with ref and localStorage
  const syncMessages = useCallback(
    (newMessages: ChatMessage[]) => {
      console.log(`${DEBUG_PREFIX} Syncing ${newMessages.length} messages`);
      console.log(
        `${DEBUG_PREFIX} Messages:`,
        newMessages.map((m) => ({
          id: m.id,
          type: m.type,
          content: m.content.substring(0, 30),
        }))
      );

      messagesRef.current = newMessages;
      setMessages(newMessages);
      saveToStorage(newMessages);
    },
    [saveToStorage]
  );

  // Initialize from localStorage on mount
  useEffect(() => {
    console.log(
      `${DEBUG_PREFIX} Component mounted, checking for stored messages`
    );
    const storedMessages = loadFromStorage();

    if (storedMessages.length > 0) {
      console.log(
        `${DEBUG_PREFIX} Recovering ${storedMessages.length} messages from storage`
      );
      syncMessages(storedMessages);
      setRecovery({
        hasRecovered: true,
        recoveredCount: storedMessages.length,
      });
    } else {
      console.log(`${DEBUG_PREFIX} No stored messages found, starting fresh`);
    }
  }, [loadFromStorage, syncMessages]);

  // Monitor messages state changes
  useEffect(() => {
    console.log(`${DEBUG_PREFIX} Messages state changed:`, {
      count: messages.length,
      refCount: messagesRef.current.length,
      matches: messages.length === messagesRef.current.length,
      lastMessage:
        messages[messages.length - 1]?.content?.substring(0, 30) || "none",
    });
  }, [messages]);

  // Add message function
  const addMessage = useCallback(
    (messageData: Omit<ChatMessage, "id" | "timestamp">) => {
      const newMessage: ChatMessage = {
        ...messageData,
        id: generateMessageId(),
        timestamp: new Date(),
      };

      console.log(`${DEBUG_PREFIX} Adding new message:`, {
        id: newMessage.id,
        type: newMessage.type,
        content: newMessage.content.substring(0, 50),
      });

      const currentMessages = messagesRef.current;
      const newMessages = [...currentMessages, newMessage];

      // Sanity check
      if (newMessages.length <= currentMessages.length) {
        console.error(
          `${DEBUG_PREFIX} ❌ SANITY CHECK FAILED: New messages count (${newMessages.length}) <= current count (${currentMessages.length})`
        );
      }

      syncMessages(newMessages);
    },
    [generateMessageId, syncMessages]
  );

  // Clear messages function
  const clearMessages = useCallback(() => {
    console.log(`${DEBUG_PREFIX} Clearing all messages`);
    syncMessages([]);
    setRecovery({ hasRecovered: false, recoveredCount: 0 });
  }, [syncMessages]);

  // Periodic sanity check
  useEffect(() => {
    const interval = setInterval(() => {
      const stateCount = messages.length;
      const refCount = messagesRef.current.length;

      if (stateCount !== refCount) {
        console.warn(
          `${DEBUG_PREFIX} ⚠️ MISMATCH DETECTED: State has ${stateCount} messages, ref has ${refCount}`
        );
        console.warn(`${DEBUG_PREFIX} Attempting to recover from ref...`);
        setMessages([...messagesRef.current]);
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [messages.length]);

  return {
    messages,
    addMessage,
    clearMessages,
    recovery,
  };
}
