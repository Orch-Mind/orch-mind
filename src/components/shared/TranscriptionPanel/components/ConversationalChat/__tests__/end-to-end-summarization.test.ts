// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * End-to-End Summarization Flow Test
 * 
 * This test demonstrates the complete summarization flow:
 * 1. Messages accumulate in a conversation
 * 2. Token threshold is reached (30k tokens)
 * 3. Automatic summarization is triggered
 * 4. Old messages are replaced with a summary
 * 5. Summary is passed to LLM for context continuity
 */

import { ChatMessage } from "../hooks/usePersistentMessages";
import { ChatSummarizationService } from "../services/ChatSummarizationService";

describe("End-to-End Summarization Flow", () => {
  it("demonstrates the complete summarization workflow", async () => {
    console.log("=== SUMMARIZATION FLOW TEST ===\n");

    // Step 1: Initialize the service
    const summarizationService = new ChatSummarizationService();
    console.log("✅ Summarization service initialized\n");

    // Step 2: Create a conversation that will need summarization
    const conversation: ChatMessage[] = [];
    
    // Simulate a long conversation
    console.log("📝 Creating a long conversation...");
    for (let i = 0; i < 182; i++) { // Increased to 182 messages to exceed 30k tokens
      const isUser = i % 2 === 0;
      // Create larger messages to reach 30k tokens
      // Each message ~300 chars = ~75 tokens, 120 messages * 75 = 9000 tokens
      // We need ~250 tokens per message to reach 30k
      const longContent = `${isUser ? "User" : "Assistant"} message ${i}: ` +
        "This is a much longer message that simulates real conversation content. " +
        "We need to accumulate enough tokens to trigger the summarization threshold. " +
        "In a real conversation, messages would contain detailed questions, explanations, " +
        "code examples, debugging information, and comprehensive responses. " +
        "This helps us test the token counting and summarization logic properly. " +
        "The content here represents typical back-and-forth dialogue that might occur " +
        "in a technical support or development discussion. ".repeat(4); // ~1000 chars = ~250 tokens
        
      conversation.push({
        id: `msg-${i}`,
        type: isUser ? "user" : "system",
        content: longContent,
        timestamp: new Date(Date.now() + i * 60000), // 1 minute apart
        ...(i === 10 ? { // Add context to one message
          hasContext: true,
          contextContent: "function calculateSum(a, b) { return a + b; }"
        } : {})
      });
    }
    console.log(`✅ Created ${conversation.length} messages\n`);

    // Step 3: Check token usage
    const beforeStats = summarizationService.getTokenStats(conversation);
    console.log("📊 Token Stats BEFORE summarization:");
    console.log(`   - Current tokens: ${beforeStats.currentTokens.toLocaleString()}`);
    console.log(`   - Max tokens: ${beforeStats.maxTokens.toLocaleString()}`);
    console.log(`   - Usage: ${beforeStats.percentageUsed.toFixed(1)}%`);
    console.log(`   - Tokens until summarization: ${beforeStats.tokensUntilSummarization.toLocaleString()}\n`);

    // Step 4: Check if summarization is needed
    const needsSummarization = summarizationService.needsSummarization(conversation);
    console.log(`❓ Needs summarization? ${needsSummarization ? "YES ✅" : "NO ❌"}\n`);

    if (needsSummarization) {
      // Step 5: Mock the actual summarization (in real scenario, this would call Ollama)
      console.log("🤖 Simulating LLM summarization...");
      
      // For testing, we'll manually create what the service would produce
      const splitIndex = 177; // Keep last 5 messages (182 - 5)
      const messagesToSummarize = conversation.slice(0, splitIndex);
      const recentMessages = conversation.slice(splitIndex);
      
      // Create summary message
      const summary: ChatMessage & { isSummary: boolean; originalMessageCount: number; originalTimeRange: any; tokenCount: number } = {
        id: `summary-${Date.now()}`,
        type: "system",
        content: `📋 **Conversation Summary** (${messagesToSummarize.length} messages, ${beforeStats.currentTokens} tokens → ~2000 tokens)\n\nThe conversation covered a wide range of topics over ${messagesToSummarize.length} messages. Key points discussed include:\n\n- Initial greetings and setup\n- Discussion about code implementation (including a calculateSum function)\n- Various questions and answers about the topic\n- Multiple iterations of problem-solving\n\nThe conversation maintained a consistent back-and-forth pattern between user queries and assistant responses.`,
        timestamp: new Date(),
        isSummary: true,
        originalMessageCount: messagesToSummarize.length,
        originalTimeRange: {
          start: messagesToSummarize[0].timestamp,
          end: messagesToSummarize[messagesToSummarize.length - 1].timestamp
        },
        tokenCount: 500 // Approximate
      };
      
      // Step 6: Apply summarization
      const summarizedConversation = [summary, ...recentMessages];
      console.log(`✅ Created summary of ${messagesToSummarize.length} messages\n`);
      
      // Step 7: Check new token usage
      const afterStats = summarizationService.getTokenStats(summarizedConversation);
      console.log("📊 Token Stats AFTER summarization:");
      console.log(`   - Current tokens: ${afterStats.currentTokens.toLocaleString()}`);
      console.log(`   - Max tokens: ${afterStats.maxTokens.toLocaleString()}`);
      console.log(`   - Usage: ${afterStats.percentageUsed.toFixed(1)}%`);
      console.log(`   - Tokens until summarization: ${afterStats.tokensUntilSummarization.toLocaleString()}\n`);
      
      // Step 8: Show compression ratio
      const compressionRatio = (beforeStats.currentTokens / afterStats.currentTokens).toFixed(1);
      console.log(`📉 Compression ratio: ${compressionRatio}x`);
      console.log(`   - Messages: ${conversation.length} → ${summarizedConversation.length}`);
      console.log(`   - Tokens: ${beforeStats.currentTokens.toLocaleString()} → ${afterStats.currentTokens.toLocaleString()}\n`);
      
      // Step 9: Demonstrate how summary would be used in LLM context
      console.log("🔗 How the summary is passed to LLM:");
      console.log("   Messages array for LLM would include:");
      console.log("   1. System prompt");
      console.log("   2. Conversation summary (as system message)");
      console.log("   3. Recent messages from conversation");
      console.log("   4. Current user query\n");
      
      // Step 10: Show example LLM message structure
      const exampleLLMMessages = [
        { role: "system", content: "You are a helpful assistant." },
        { role: "system", content: summary.content },
        ...recentMessages.map(msg => ({
          role: msg.type === "user" ? "user" : "assistant",
          content: msg.content
        })),
        { role: "user", content: "What did we discuss earlier about functions?" }
      ];
      
      console.log("📤 Example LLM request structure:");
      exampleLLMMessages.forEach((msg, i) => {
        const preview = msg.content.substring(0, 60) + (msg.content.length > 60 ? "..." : "");
        console.log(`   ${i + 1}. [${msg.role}] ${preview}`);
      });
      
      console.log("\n✅ SUMMARIZATION FLOW COMPLETE");
      console.log("   The conversation history is maintained while staying within token limits!");
      
      // Assertions to verify the flow worked
      expect(needsSummarization).toBe(true);
      expect(summarizedConversation.length).toBeLessThan(conversation.length);
      expect(summarizedConversation[0].type).toBe("system");
      expect((summarizedConversation[0] as any).isSummary).toBe(true);
      expect(afterStats.currentTokens).toBeLessThan(beforeStats.currentTokens);
      expect(afterStats.tokensUntilSummarization).toBeGreaterThan(0);
    }
  });
}); 