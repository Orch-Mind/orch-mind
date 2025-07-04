// SPDX-License-Identifier: MIT OR Apache-2.0
// Training Utilities - Following DRY (Don't Repeat Yourself) Principle
// Single source of truth for common training operations

import type {
  ConversationSummary,
  TrainingConversation,
  ValidationResult,
  ValidationSummary,
} from "./types";

// === TIME FORMATTING ===
export const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

export const updateTimeEstimate = (
  currentProgress: number,
  startTime: number
): string => {
  if (currentProgress <= 0) return "";

  const elapsed = Date.now() - startTime;
  const totalEstimated = (elapsed / currentProgress) * 100;
  const remaining = totalEstimated - elapsed;

  return remaining > 0 ? formatDuration(remaining) : "Almost done...";
};

// === CONVERSATION FORMATTING ===
export const formatConversationSummary = (
  conv: TrainingConversation
): ConversationSummary => {
  const messageCount = conv.messages.length;
  const firstMessage = conv.messages[0]?.content || "";
  const preview =
    firstMessage.length > 50
      ? firstMessage.substring(0, 50) + "..."
      : firstMessage;

  // Count valid user/assistant pairs
  let validPairs = 0;
  if (conv.messages && Array.isArray(conv.messages)) {
    for (let i = 0; i < conv.messages.length - 1; i += 2) {
      const userMsg = conv.messages[i];
      const assistantMsg = conv.messages[i + 1];

      const userRole = userMsg?.role || (userMsg as any)?.type;
      const assistantRole = assistantMsg?.role || (assistantMsg as any)?.type;

      if (
        userRole === "user" &&
        assistantRole === "assistant" &&
        userMsg?.content?.trim() &&
        assistantMsg?.content?.trim()
      ) {
        validPairs++;
      }
    }
  }

  return {
    id: conv.id,
    title: preview || `Conversation`,
    messageCount,
    validPairs,
    preview,
  };
};

// === TRAINING VALIDATION ===
export const validateTrainingData = (
  conversations: TrainingConversation[]
): ValidationSummary => {
  let totalValidPairs = 0;

  const validationResults: ValidationResult[] = conversations.map((conv) => {
    let validPairs = 0;

    if (!conv.messages || !Array.isArray(conv.messages)) {
      console.warn(
        `[Training] Conversation ${conv.id}: No messages array found`
      );
      return {
        id: conv.id,
        valid: false,
        error: "No messages array found",
        validPairs: 0,
        totalMessages: 0,
      };
    }

    console.log(
      `[Training] Validating conversation ${conv.id} with ${conv.messages.length} messages`
    );

    // Log message roles to debug
    const roles = conv.messages.map(
      (msg) => msg?.role || (msg as any)?.type || "unknown"
    );
    console.log(`[Training] Message roles in ${conv.id}:`, roles);

    // Check for user/assistant pairs (adjacent)
    for (let i = 0; i < conv.messages.length - 1; i += 2) {
      const userMsg = conv.messages[i];
      const assistantMsg = conv.messages[i + 1];

      const userRole = userMsg?.role || (userMsg as any)?.type;
      const assistantRole = assistantMsg?.role || (assistantMsg as any)?.type;

      if (
        userRole === "user" &&
        assistantRole === "assistant" &&
        userMsg?.content?.trim() &&
        assistantMsg?.content?.trim()
      ) {
        validPairs++;
        console.log(
          `[Training] Found valid pair at positions ${i}-${
            i + 1
          } in conversation ${conv.id}`
        );
      }
    }

    // Also check for non-alternating sequences
    for (let i = 0; i < conv.messages.length; i++) {
      const currentMsg = conv.messages[i];
      const currentRole = currentMsg?.role || (currentMsg as any)?.type;

      if (currentRole === "user" && currentMsg?.content?.trim()) {
        for (let j = i + 1; j < conv.messages.length; j++) {
          const nextMsg = conv.messages[j];
          const nextRole = nextMsg?.role || (nextMsg as any)?.type;

          if (nextRole === "assistant" && nextMsg?.content?.trim()) {
            // Only count if not already counted in alternating check
            const isAlternating = j === i + 1;
            if (!isAlternating) {
              validPairs++;
              console.log(
                `[Training] Found non-adjacent valid pair at positions ${i}-${j} in conversation ${conv.id}`
              );
            }
            break;
          }
        }
      }
    }

    totalValidPairs += validPairs;

    const result = {
      id: conv.id,
      valid: validPairs > 0,
      validPairs,
      totalMessages: conv.messages.length,
      error:
        validPairs === 0
          ? `No valid user/assistant pairs found. Roles found: ${roles.join(
              ", "
            )}`
          : undefined,
    };

    console.log(
      `[Training] Conversation ${conv.id} validation result:`,
      result
    );
    return result;
  });

  console.log(
    `[Training] Total validation summary: ${totalValidPairs} valid pairs across ${conversations.length} conversations`
  );
  return { totalValidPairs, validationResults };
};

// === PROGRESS MESSAGES ===
export const getProgressMessage = (progress: number): string => {
  if (progress < 5) {
    return "🔄 Initializing LoRA training environment...";
  } else if (progress < 15) {
    return "📊 Analyzing training data quality...";
  } else if (progress < 25) {
    return "🚀 Loading base model (optimized)...";
  } else if (progress < 35) {
    return "⚙️ Configuring LoRA adapters (r=32, α=64)...";
  } else if (progress < 45) {
    return "🧠 Setting up PEFT neural pathways...";
  } else if (progress < 55) {
    return "📈 Training step 1-5 (warmup phase)...";
  } else if (progress < 65) {
    return "⚡ Training step 6-15 (main training)...";
  } else if (progress < 75) {
    return "🔥 Training step 16-25 (fine-tuning)...";
  } else if (progress < 85) {
    return "💾 Saving adapter weights...";
  } else if (progress < 95) {
    return "🔗 Creating Ollama model file...";
  } else {
    return "✅ Finalizing model deployment...";
  }
};

// === SANITIZATION ===
export const sanitizeModelName = (name: string): string => {
  if (!name || typeof name !== "string") {
    return "unknown";
  }

  // Convert to lowercase and normalize
  let sanitized = name.toLowerCase().normalize("NFD");

  // Replace special characters with hyphens
  sanitized = sanitized.replace(/[^a-z0-9_-]/g, "-");

  // Remove consecutive hyphens/underscores
  sanitized = sanitized.replace(/[-_]+/g, "-");

  // Remove leading/trailing hyphens
  sanitized = sanitized.replace(/^[-_]+|[-_]+$/g, "");

  // Ensure it doesn't start with a number
  if (/^[0-9]/.test(sanitized)) {
    sanitized = "model-" + sanitized;
  }

  // Fallback for empty strings
  if (!sanitized) {
    sanitized = "unknown";
  }

  return sanitized;
};

// === STORAGE HELPERS ===
export const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (error) {
    console.error(`Error loading from storage (${key}):`, error);
    return defaultValue;
  }
};

export const saveToStorage = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving to storage (${key}):`, error);
  }
};

// === DATA TRANSFORMATION ===
export const generateOutputName = (baseModel?: string): string => {
  const timestamp = Date.now();

  if (baseModel) {
    // Extract base model name and sanitize it
    const baseModelClean = baseModel.replace(":latest", "").replace(":", "_");
    const sanitizedBase = sanitizeModelName(baseModelClean);
    return `${sanitizedBase}_adapter_${timestamp}`;
  }

  // Fallback for when no base model is provided
  const timestampStr = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);
  return `custom-${timestampStr}`;
};

export const getExpectedModelName = (outputName: string): string => {
  return `orch-lora-${outputName}:latest`;
};

// === DEBUG HELPERS ===
export const debugConversationFormat = (): void => {
  try {
    const data = localStorage.getItem("orch-chat-history");
    if (!data) {
      console.log(
        "[Training Debug] No orch-chat-history found in localStorage"
      );
      return;
    }

    const parsed = JSON.parse(data);
    console.log("[Training Debug] Raw localStorage data structure:", {
      hasConversations: !!parsed.conversations,
      conversationsType: Array.isArray(parsed.conversations)
        ? "array"
        : typeof parsed.conversations,
      conversationsLength: parsed.conversations?.length || 0,
      sampleKeys: Object.keys(parsed).slice(0, 5),
    });

    if (parsed.conversations && Array.isArray(parsed.conversations)) {
      parsed.conversations.slice(0, 3).forEach((conv: any, index: number) => {
        console.log(`[Training Debug] Conversation ${index}:`, {
          id: conv.id,
          hasMessages: !!conv.messages,
          messagesType: Array.isArray(conv.messages)
            ? "array"
            : typeof conv.messages,
          messagesLength: conv.messages?.length || 0,
          sampleMessage: conv.messages?.[0]
            ? {
                hasRole: !!conv.messages[0].role,
                role: conv.messages[0].role,
                hasType: !!(conv.messages[0] as any).type,
                type: (conv.messages[0] as any).type,
                hasContent: !!conv.messages[0].content,
                contentLength: conv.messages[0].content?.length || 0,
              }
            : null,
          allRoles:
            conv.messages
              ?.map((msg: any) => msg.role || msg.type || "unknown")
              .slice(0, 10) || [],
        });
      });
    }
  } catch (error) {
    console.error("[Training Debug] Error analyzing localStorage:", error);
  }
};

// Test function to create sample conversations for debugging
export const createTestConversation = (): TrainingConversation => {
  return {
    id: "test-conversation-" + Date.now(),
    messages: [
      { role: "user", content: "Hello, can you help me with something?" },
      {
        role: "assistant",
        content:
          "Of course! I'd be happy to help you. What do you need assistance with?",
      },
      {
        role: "user",
        content: "I need to understand how machine learning works.",
      },
      {
        role: "assistant",
        content:
          "Machine learning is a subset of artificial intelligence where computers learn patterns from data...",
      },
    ],
  };
};

// Test the validation with a sample conversation
export const testValidation = (): void => {
  console.log("[Training Test] Testing validation with sample conversation...");
  const testConv = createTestConversation();
  console.log("[Training Test] Sample conversation:", testConv);

  const validation = validateTrainingData([testConv]);
  console.log("[Training Test] Validation result:", validation);

  if (validation.totalValidPairs > 0) {
    console.log("✅ [Training Test] Validation working correctly!");
  } else {
    console.log("❌ [Training Test] Validation failed - check the logic");
  }
};
