import React, { useEffect, useState } from "react";
import { MessageItem } from "../components/MessageItem";
import { SummarizationIndicator } from "../components/SummarizationIndicator";
import { TokenStatusBar } from "../components/TokenStatusBar";
import { useChatHistory } from "../hooks/useChatHistory";

/**
 * Example implementation of token-based chat with automatic summarization
 * 
 * This example demonstrates:
 * - Real-time token monitoring
 * - Automatic summarization at 30k tokens
 * - Visual feedback during summarization
 * - Token usage statistics
 */
export const TokenBasedChatExample: React.FC = () => {
  const {
    currentConversation,
    currentConversationId,
    createNewConversation,
    addMessageToConversation,
    isSummarizing,
    tokenStats: liveSummarizationStats,
    getTokenStats,
  } = useChatHistory();

  const [tokenStats, setTokenStats] = useState<any>(null);

  // Create conversation on mount if needed
  useEffect(() => {
    if (!currentConversationId) {
      createNewConversation();
    }
  }, [currentConversationId, createNewConversation]);

  // Update token stats periodically
  useEffect(() => {
    const updateStats = () => {
      const stats = getTokenStats();
      setTokenStats(stats);
    };

    updateStats();
    const interval = setInterval(updateStats, 1000); // Update every second

    return () => clearInterval(interval);
  }, [getTokenStats, currentConversation]);

  const handleSendMessage = async (content: string) => {
    if (!currentConversationId || !content.trim()) return;

    // Add user message
    await addMessageToConversation(currentConversationId, {
      id: Date.now().toString(),
      type: "user",
      content,
      timestamp: new Date(),
    });

    // Simulate AI response
    setTimeout(async () => {
      await addMessageToConversation(currentConversationId, {
        id: (Date.now() + 1).toString(),
        type: "system",
        content: "This is a simulated AI response to: " + content,
        timestamp: new Date(),
      });
    }, 500);
  };

  return (
    <div className="token-based-chat-example">
      {/* Summarization Indicator */}
      {isSummarizing && (
        <SummarizationIndicator
          isSummarizing={true}
          tokenCount={liveSummarizationStats?.currentTokens}
          maxTokens={liveSummarizationStats?.maxTokens}
        />
      )}

      {/* Token Status Bar */}
      {tokenStats && (
        <TokenStatusBar
          currentTokens={tokenStats.currentTokens}
          maxTokens={tokenStats.maxTokens}
          summarizationThreshold={30000}
        />
      )}

      {/* Messages */}
      <div className="chat-messages" style={{ padding: "20px", maxHeight: "400px", overflow: "auto" }}>
        {currentConversation?.messages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
      </div>

      {/* Input Area */}
      <div className="chat-input" style={{ padding: "20px", borderTop: "1px solid #ccc" }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const input = e.currentTarget.elements.namedItem("message") as HTMLInputElement;
            handleSendMessage(input.value);
            input.value = "";
          }}
        >
          <input
            name="message"
            type="text"
            placeholder="Type a message..."
            style={{ width: "100%", padding: "10px" }}
            disabled={isSummarizing}
          />
        </form>
        
        {/* Debug Info */}
        <div style={{ marginTop: "10px", fontSize: "12px", color: "#666" }}>
          {tokenStats && (
            <>
              <div>Current tokens: {tokenStats.currentTokens.toLocaleString()}</div>
              <div>Until summarization: {tokenStats.tokensUntilSummarization.toLocaleString()} tokens</div>
              <div>Messages: {currentConversation?.messages.length || 0}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Usage example:
// <TokenBasedChatExample />

// Key features demonstrated:
// 1. Real-time token monitoring with TokenStatusBar
// 2. Automatic summarization at 30k tokens
// 3. Visual feedback during summarization with SummarizationIndicator
// 4. Token statistics display
// 5. Message handling with proper typing 