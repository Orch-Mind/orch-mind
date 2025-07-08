// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import {
  getOption,
  STORAGE_KEYS,
} from "../../../../../services/StorageService";
import { LoggingUtils } from "../../utils/LoggingUtils";

/**
 * Web search result interface
 */
export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  source?: string;
  content?: string;
  contentLength?: number;
  extractedAt?: Date;
  contentScore?: number;
}

/**
 * LLM-powered web search query generation
 */
export interface WebSearchStrategy {
  searchQueries: string[];
  resultsCount: number;
  reasoning: string;
}

/**
 * Interface for UI update service to provide user feedback
 */
export interface IUIUpdateService {
  updateProcessingStatus?: (message: string) => void;
  notifyWebSearchStep?: (step: string, details?: string) => void;
}

/**
 * Service for performing intelligent web searches
 * Enhanced with LLM-powered query generation and result processing
 * Uses IPC to avoid CSP restrictions in renderer process
 */
export class WebSearchService {
  private readonly DEFAULT_MAX_RESULTS = 5;

  constructor(private llmService?: any, private uiService?: IUIUpdateService) {}

  /**
   * Use LLM to generate optimized search queries
   */
  async generateSearchStrategy(
    userQuery: string,
    conversationHistory?: Array<{ role: string; content: string }>
  ): Promise<WebSearchStrategy> {
    if (this.uiService?.notifyWebSearchStep) {
      this.uiService.notifyWebSearchStep(
        "🧠 Generating queries",
        "Analyzing conversation context"
      );
    }

    try {
      LoggingUtils.logInfo(
        `🧠 [WEB_SEARCH_STRATEGY] Starting strategy generation for query: "${userQuery}"`
      );

      const messages = [
        {
          role: "system",
          content:
            "Generate 2-4 optimized search queries in JSON format. Be specific and target current information.",
        },
      ];

      // Add conversation history if available
      if (conversationHistory && conversationHistory.length > 0) {
        const recentHistory = conversationHistory
          .filter((msg) => msg.role !== "system")
          .slice(-6);

        LoggingUtils.logInfo(
          `📜 [WEB_SEARCH_STRATEGY] Using ${recentHistory.length} conversation messages for context`
        );

        messages.push(...recentHistory);
      }

      // Add the current request
      const currentPrompt = `Generate search queries for: "${userQuery}"

Rules:
- For prices: include store names and "preço"/"price"
- For products: use exact model names
- Add "2025" for current info
- Use language of the user's query for searches

Output JSON only:
\`\`\`json
{
  "searchQueries": ["query 1", "query 2", "query 3"],
  "resultsCount": 6,
  "reasoning": "brief explanation"
}
\`\`\``;

      messages.push({
        role: "user",
        content: currentPrompt,
      });

      const response = await this.llmService.callOpenAIWithFunctions({
        model: getOption(STORAGE_KEYS.OLLAMA_MODEL),
        messages,
        temperature: 0.2,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from LLM");
      }

      // Extract JSON from response
      const jsonMatch =
        content.match(/```json\s*([\s\S]*?)\s*```/) ||
        content.match(/\{[\s\S]*\}/);
      const jsonContent = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content;

      const strategy = JSON.parse(jsonContent) as WebSearchStrategy;

      LoggingUtils.logInfo(
        `🎯 [WEB_SEARCH_STRATEGY] Successfully parsed strategy:`
      );
      LoggingUtils.logInfo(
        `🎯 [WEB_SEARCH_STRATEGY] - Generated ${
          strategy.searchQueries.length
        } queries: ${JSON.stringify(strategy.searchQueries)}`
      );

      if (this.uiService?.notifyWebSearchStep) {
        this.uiService.notifyWebSearchStep(
          "✅ Strategy generated",
          `${strategy.searchQueries.length} queries optimized`
        );
      }

      return strategy;
    } catch (error) {
      LoggingUtils.logError(
        `❌ [WEB_SEARCH_STRATEGY] Strategy generation failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );

      // Simple fallback
      const fallbackStrategy: WebSearchStrategy = {
        searchQueries: [userQuery, `${userQuery} preço`, `${userQuery} 2025`],
        resultsCount: 5,
        reasoning: "Fallback strategy due to LLM error",
      };

      return fallbackStrategy;
    }
  }

  /**
   * Search the web for relevant information using LLM-generated queries
   */
  async searchWeb(
    queries: string[],
    options: Record<string, any> = {}
  ): Promise<WebSearchResult[]> {
    if (!window.electronAPI || !window.electronAPI.webSearch) {
      if (this.uiService?.notifyWebSearchStep) {
        this.uiService.notifyWebSearchStep(
          "❌ Search unavailable",
          "Electron API not available"
        );
      }
      LoggingUtils.logError(
        "❌ [WEB_SEARCH] Electron API not available for web search"
      );
      return [];
    }

    try {
      LoggingUtils.logInfo(
        `🔍 [WEB_SEARCH] Starting web search with ${
          queries.length
        } queries: ${JSON.stringify(queries)}`
      );

      if (this.uiService?.notifyWebSearchStep) {
        this.uiService.notifyWebSearchStep(
          "🔍 Searching web",
          `Executing ${queries.length} queries`
        );
      }

      // Use IPC to perform web search in main process
      const results = await window.electronAPI.webSearch(queries, {
        maxResults: options.maxResults || this.DEFAULT_MAX_RESULTS,
        extractContent: options.extractContent,
        maxContentResults: options.maxContentResults,
      } as any);

      LoggingUtils.logInfo(
        `✅ [WEB_SEARCH] Search completed: ${results.length} total results found`
      );

      if (this.uiService?.notifyWebSearchStep) {
        if (results.length > 0) {
          this.uiService.notifyWebSearchStep(
            "✅ Results found",
            `${results.length} sources found`
          );
        } else {
          this.uiService.notifyWebSearchStep(
            "ℹ️ No results",
            "No relevant results found"
          );
        }
      }

      return results;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (this.uiService?.notifyWebSearchStep) {
        this.uiService.notifyWebSearchStep(
          "❌ Search error",
          `Failed: ${errorMessage}`
        );
      }

      LoggingUtils.logError(
        `❌ [WEB_SEARCH] Web search failed: ${errorMessage}`
      );
      return [];
    }
  }

  /**
   * Process and format search results using LLM
   */
  async processSearchResults(
    results: WebSearchResult[],
    originalQuery: string
  ): Promise<string> {
    if (!results || results.length === 0) {
      LoggingUtils.logInfo("⚠️ [WEB_SEARCH_PROCESS] No results to process");
      return "";
    }

    if (this.uiService?.notifyWebSearchStep) {
      this.uiService.notifyWebSearchStep(
        "🧠 Processing results",
        `Analyzing ${results.length} sources`
      );
    }

    try {
      LoggingUtils.logInfo(
        `🔍 [WEB_SEARCH_PROCESS] Starting processing of ${results.length} results for query: "${originalQuery}"`
      );

      const formattedResults = results
        .map(
          (result, index) => `${index + 1}. ${result.title}
Source: ${result.source || result.url}
${result.snippet}
${result.content ? `Content: ${result.content}` : ""}
---`
        )
        .join("\n");

      const processingPrompt = `Query: "${originalQuery}"

Search Results:
\`\`\`
${formattedResults}
\`\`\`

Extract specific facts to answer the query. Include exact prices, dates, and sources when available.`;

      const response = await this.llmService.callOpenAIWithFunctions({
        model: getOption(STORAGE_KEYS.OLLAMA_MODEL) || "gemma3:latest",
        messages: [
          {
            role: "system",
            content:
              "Extract specific factual information from search results. Be direct and cite sources.",
          },
          { role: "user", content: processingPrompt },
        ],
        temperature: 0.1,
        max_tokens: 1000,
      });

      const processedContent = response.choices[0]?.message?.content || "";

      LoggingUtils.logInfo(
        `✅ [WEB_SEARCH_PROCESS] LLM response received (${processedContent.length} chars)`
      );

      if (this.uiService?.notifyWebSearchStep) {
        this.uiService.notifyWebSearchStep(
          "✅ Processing complete",
          "Results synthesis finished"
        );
      }

      return processedContent;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      LoggingUtils.logError(
        `❌ [WEB_SEARCH_PROCESS] Error processing search results: ${errorMessage}`
      );

      throw error;
    }
  }

  /**
   * Set the LLM service for intelligent search processing
   */
  setLLMService(llmService: any): void {
    this.llmService = llmService;
  }

  /**
   * Set the UI service for user feedback
   */
  setUIService(uiService: IUIUpdateService): void {
    this.uiService = uiService;
  }
}
