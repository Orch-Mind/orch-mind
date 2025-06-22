// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// Example test scenario for chat summarization integration

// Mock conversation with many messages that would exceed 30k tokens
const mockConversation = {
  id: "test-conv-123",
  title: "Technical Discussion",
  messages: [
    // ... imagine 50+ messages here that total ~25k tokens ...
    
    // Then a summary is automatically created:
    {
      id: "summary-1",
      type: "system",
      content: `📋 **Conversation Summary** (50 messages, ~25000 tokens → ~2500 tokens)

The conversation covered the following main topics:

1. **Database Architecture**: We discussed migrating from PostgreSQL to a distributed system using CockroachDB for better scalability. Key decisions included:
   - Using sharding by tenant_id
   - Implementing read replicas in 3 regions
   - Setting up automatic failover

2. **API Design**: Redesigned the REST API to follow OpenAPI 3.0 spec with:
   - Versioned endpoints (/v2/*)
   - Standardized error responses
   - Rate limiting per API key

3. **Performance Optimizations**: Identified bottlenecks in the message queue processing:
   - Switched from RabbitMQ to Kafka for better throughput
   - Implemented batch processing (100 messages/batch)
   - Added Redis caching layer

4. **Security Updates**: Enhanced authentication system:
   - Migrated to OAuth 2.0 + JWT tokens
   - Added MFA support
   - Implemented API key rotation policy

Unresolved items:
- Need to finalize the data retention policy
- Pending decision on CDN provider (CloudFlare vs Fastly)
- Waiting for load test results before scaling decisions`,
      timestamp: new Date("2024-01-20T10:30:00"),
      isSummary: true,
      originalMessageCount: 50,
      originalTimeRange: {
        start: new Date("2024-01-20T09:00:00"),
        end: new Date("2024-01-20T10:30:00")
      },
      tokenCount: 2500
    },
    
    // Recent messages after summarization:
    {
      id: "msg-51",
      type: "user",
      content: "What was our decision about the database sharding strategy?",
      timestamp: new Date("2024-01-20T10:31:00")
    },
    {
      id: "msg-52", 
      type: "system",
      content: "Based on our earlier discussion (captured in the summary), we decided to implement sharding by tenant_id for the CockroachDB migration. This approach was chosen because:\n\n1. It provides natural data isolation per customer\n2. Allows for easy scaling as new tenants are added\n3. Simplifies compliance with data residency requirements\n4. Enables tenant-specific performance tuning\n\nWe also planned to have read replicas in 3 regions with automatic failover for high availability.",
      timestamp: new Date("2024-01-20T10:31:30")
    }
  ]
};

// When the user sends a new message, this is what gets passed to the LLM:
const messagesPassedToLLM = [
  {
    role: "system",
    content: "You are a symbiotic assistant..." // System prompt
  },
  {
    role: "system",
    content: mockConversation.messages.find(m => m.isSummary)!.content // The summary
  },
  {
    role: "user", 
    content: "What was our decision about the database sharding strategy?"
  },
  {
    role: "system",
    content: "Based on our earlier discussion (captured in the summary)..."
  },
  {
    role: "user",
    content: "Can you also remind me about the API versioning approach?" // New message
  }
];

// The LLM now has access to the summary and can reference it to answer questions
// about topics discussed before the summarization point

console.log("Messages sent to LLM:", messagesPassedToLLM);
console.log("Total tokens (with summary):", calculateTokens(messagesPassedToLLM)); // ~5k tokens
console.log("Total tokens (without summary):", calculateTokens(mockConversation.messages)); // ~30k tokens

function calculateTokens(messages: any[]): number {
  // Rough estimation: 1 token ≈ 4 characters
  const totalChars = messages.reduce((sum, msg) => {
    const content = msg.content || msg.content;
    return sum + content.length;
  }, 0);
  return Math.ceil(totalChars / 4);
}

export { messagesPassedToLLM, mockConversation };
