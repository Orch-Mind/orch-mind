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
}

/**
 * Web search options
 */
export interface WebSearchOptions {
  maxResults?: number;
  safeSearch?: boolean;
  timeRange?: "any" | "day" | "week" | "month" | "year";
}

/**
 * LLM-powered web search decision and query generation
 */
export interface WebSearchDecision {
  shouldSearch: boolean;
  reasoning: string;
  searchQueries: string[];
}

/**
 * Interface for UI update service to provide user feedback
 */
export interface IUIUpdateService {
  updateProcessingStatus?: (message: string) => void;
  notifyWebSearchStep?: (step: string, details?: string) => void;
}

/**
 * Service for performing intelligent web searches using DuckDuckGo
 * Enhanced with LLM-powered query generation and result processing
 * Uses IPC to avoid CSP restrictions in renderer process
 */
export class WebSearchService {
  private readonly DEFAULT_MAX_RESULTS = 5;
  private readonly MAX_SNIPPET_LENGTH = 300;

  constructor(private llmService?: any, private uiService?: IUIUpdateService) {} // Will be injected with IOpenAIService and IUIUpdateService

  /**
   * Use LLM to determine if web search is needed and generate optimized queries
   * @param userQuery The user's original query
   * @returns Decision object with reasoning and search queries
   */
  async analyzeSearchNeed(userQuery: string): Promise<WebSearchDecision> {
    // Notify user about analysis step
    if (this.uiService?.notifyWebSearchStep) {
      this.uiService.notifyWebSearchStep(
        "🧠 Analyzing query",
        "Determining if web search would be helpful..."
      );
    }

    if (!this.llmService) {
      // Fallback to simple keyword-based detection
      if (this.uiService?.notifyWebSearchStep) {
        this.uiService.notifyWebSearchStep(
          "⚡ Using fallback analysis",
          "LLM not available, using keyword detection"
        );
      }
      return this.fallbackSearchDecision(userQuery);
    }

    try {
      LoggingUtils.logInfo("🧠 [WEB_SEARCH] Using LLM to analyze search need");

      if (this.uiService?.notifyWebSearchStep) {
        this.uiService.notifyWebSearchStep(
          "🤖 Consulting AI",
          "AI is analyzing your question..."
        );
      }

      const analysisPrompt = `Analyze the following user query and determine if it would benefit from current web search results.

User Query: "${userQuery}"

Consider these factors:
- Does it ask for recent news, current events, or time-sensitive information?
- Does it need real-time data like weather, stock prices, or sports scores?
- Does it ask about recent developments, latest updates, or current status?
- Would web search provide more accurate or up-to-date information?

Respond in JSON format:
{
  "shouldSearch": boolean,
  "reasoning": "Brief explanation of why search is/isn't needed",
  "searchQueries": ["optimized query 1", "optimized query 2"] // If shouldSearch is true, provide 1-3 optimized search queries
}

Examples:
- "Como está o tempo hoje?" → shouldSearch: true, queries: ["weather today", "previsão tempo hoje"]
- "O que é inteligência artificial?" → shouldSearch: false (general knowledge)
- "Notícias sobre tecnologia hoje" → shouldSearch: true, queries: ["tech news today", "technology news latest"]`;

      const response = await this.llmService.callOpenAIWithFunctions({
        model: getOption(STORAGE_KEYS.OLLAMA_MODEL), // Use a fast model for analysis
        messages: [
          {
            role: "system",
            content:
              "You are a search analysis expert. Respond only with valid JSON.",
          },
          { role: "user", content: analysisPrompt },
        ],
        temperature: 0.1,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from LLM");
      }

      // Parse the JSON response
      const decision = JSON.parse(content) as WebSearchDecision;

      // Notify user about the decision
      if (decision.shouldSearch && this.uiService?.notifyWebSearchStep) {
        this.uiService.notifyWebSearchStep(
          "✅ Search needed",
          `AI determined: ${decision.reasoning}`
        );
        this.uiService.notifyWebSearchStep(
          "🎯 Generated queries",
          `Optimized search queries: ${decision.searchQueries.join(", ")}`
        );
      } else if (
        !decision.shouldSearch &&
        this.uiService?.notifyWebSearchStep
      ) {
        this.uiService.notifyWebSearchStep(
          "❌ Search not needed",
          `AI determined: ${decision.reasoning}`
        );
      }

      LoggingUtils.logInfo(
        `🎯 [WEB_SEARCH] LLM Decision: ${
          decision.shouldSearch ? "SEARCH" : "NO SEARCH"
        } - ${decision.reasoning}`
      );

      return decision;
    } catch (error) {
      if (this.uiService?.notifyWebSearchStep) {
        this.uiService.notifyWebSearchStep(
          "⚠️ Fallback mode",
          "AI analysis failed, using keyword detection"
        );
      }
      LoggingUtils.logWarning(
        "⚠️ [WEB_SEARCH] LLM analysis failed, using fallback: " +
          (error instanceof Error ? error.message : String(error))
      );
      return this.fallbackSearchDecision(userQuery);
    }
  }

  /**
   * Fallback search decision using keyword-based analysis
   */
  private fallbackSearchDecision(userQuery: string): WebSearchDecision {
    const lowerQuery = userQuery.toLowerCase();

    const webSearchKeywords = [
      "news",
      "notícias",
      "hoje",
      "today",
      "atual",
      "current",
      "latest",
      "último",
      "weather",
      "tempo",
      "clima",
      "previsão",
      "price",
      "preço",
      "custo",
      "valor",
      "quando",
      "when",
      "onde",
      "where",
      "como está",
      "how is",
      "what is the",
      "aconteceu",
      "happened",
      "evento",
      "event",
      "2024",
      "2025",
      "este ano",
      "this year",
      "stock",
      "ação",
      "bolsa",
      "mercado",
      "score",
      "placar",
      "resultado",
      "jogo",
      "game",
    ];

    const shouldSearch = webSearchKeywords.some((keyword) =>
      lowerQuery.includes(keyword)
    );

    return {
      shouldSearch,
      reasoning: shouldSearch
        ? "Query contains time-sensitive keywords"
        : "Query appears to be general knowledge",
      searchQueries: shouldSearch ? [userQuery] : [],
    };
  }

  /**
   * Determine if web search is enabled and should be performed
   * @param userQuery The user query to analyze
   * @returns Promise<WebSearchDecision>
   */
  async shouldSearchWeb(userQuery: string): Promise<WebSearchDecision> {
    // First check if web search is enabled in settings
    const webSearchEnabled = getOption<boolean>(
      STORAGE_KEYS.WEB_SEARCH_ENABLED
    );

    if (!webSearchEnabled) {
      LoggingUtils.logInfo(
        "🚫 [WEB_SEARCH] Web search is disabled in settings"
      );
      return {
        shouldSearch: false,
        reasoning: "Web search disabled in settings",
        searchQueries: [],
      };
    }

    // Use LLM to analyze if search is needed
    return await this.analyzeSearchNeed(userQuery);
  }

  /**
   * Search the web for relevant information using LLM-generated queries
   * @param queries Array of search queries generated by LLM
   * @param options Search options
   * @returns Array of search results
   */
  async searchWeb(
    queries: string[],
    options: WebSearchOptions = {}
  ): Promise<WebSearchResult[]> {
    // Check if electronAPI is available
    if (!window.electronAPI || !window.electronAPI.webSearch) {
      if (this.uiService?.notifyWebSearchStep) {
        this.uiService.notifyWebSearchStep(
          "❌ Web search unavailable",
          "Electron API not available"
        );
      }
      LoggingUtils.logError(
        "❌ [WEB_SEARCH] Electron API not available for web search"
      );
      return [];
    }

    // Notify user about search start
    if (this.uiService?.notifyWebSearchStep) {
      this.uiService.notifyWebSearchStep(
        "🔍 Starting web search",
        `Searching with ${queries.length} optimized ${
          queries.length === 1 ? "query" : "queries"
        }...`
      );
    }

    try {
      LoggingUtils.logInfo(
        `🔍 [WEB_SEARCH] Starting web search with ${queries.length} queries`
      );

      // Use IPC to perform web search in main process (no CSP restrictions)
      const results = await window.electronAPI.webSearch(queries, {
        maxResults: options.maxResults || this.DEFAULT_MAX_RESULTS,
        safeSearch: options.safeSearch !== false, // Default to true
        timeRange: options.timeRange || "any",
      });

      // Notify about final results
      if (this.uiService?.notifyWebSearchStep) {
        this.uiService.notifyWebSearchStep(
          "🎯 Search complete",
          `Found ${results.length} unique results total`
        );
      }

      LoggingUtils.logInfo(
        `✅ [WEB_SEARCH] Web search completed: ${results.length} results`
      );

      return results;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (this.uiService?.notifyWebSearchStep) {
        this.uiService.notifyWebSearchStep(
          "❌ Search failed",
          `Web search error: ${errorMessage}`
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
   * @param results Raw search results
   * @param originalQuery The original user query
   * @returns Formatted and processed results
   */
  async processSearchResults(
    results: WebSearchResult[],
    originalQuery: string
  ): Promise<string> {
    if (!results || results.length === 0) {
      return "";
    }

    // Check if LLM service is available
    if (!this.llmService) {
      LoggingUtils.logWarning(
        "❌ [WEB_SEARCH] LLM service not available for result processing"
      );

      // Return simple concatenated results without LLM processing
      return results
        .map(
          (result) =>
            `**${result.title}** (${result.source}): ${result.snippet}`
        )
        .join("\n\n");
    }

    if (this.uiService?.notifyWebSearchStep) {
      this.uiService.notifyWebSearchStep(
        "🧠 Processing results",
        "AI analyzing search results for relevant information..."
      );
    }

    try {
      // Build prompt for LLM to process and summarize results
      const processingPrompt = `Based on the following search results, provide a comprehensive and relevant summary that directly answers the user's question: "${originalQuery}"

Search Results:
${results
  .map(
    (result, index) => `${index + 1}. **${result.title}** (${result.source})
   ${result.snippet}
   URL: ${result.url}
`
  )
  .join("\n")}

Instructions:
- Focus on information that directly answers the user's question
- Synthesize information from multiple sources when relevant
- Provide specific details, facts, and figures when available
- Include source references when mentioning specific information
- Keep the response informative but concise
- Write in Portuguese (pt-BR) if the user's question was in Portuguese

Summary:`;

      const response = await this.llmService.callOpenAIWithFunctions({
        model: getOption(STORAGE_KEYS.OLLAMA_MODEL) || "gemma3:latest",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that processes web search results to answer user questions accurately and comprehensively.",
          },
          { role: "user", content: processingPrompt },
        ],
        temperature: 0.3, // Lower temperature for more factual processing
        max_tokens: 800,
      });

      const processedContent = response.choices[0]?.message?.content || "";

      if (this.uiService?.notifyWebSearchStep) {
        this.uiService.notifyWebSearchStep(
          "✅ Results processed",
          "AI has analyzed and summarized the search results"
        );
      }

      LoggingUtils.logInfo(
        "✅ [WEB_SEARCH] Results processed successfully by LLM"
      );

      return processedContent;
    } catch (error) {
      LoggingUtils.logError(
        "❌ [WEB_SEARCH] Error processing search results with LLM",
        error
      );

      if (this.uiService?.notifyWebSearchStep) {
        this.uiService.notifyWebSearchStep(
          "⚠️ Processing fallback",
          "Using basic result formatting due to AI processing error"
        );
      }

      // Fallback to simple concatenation
      return results
        .map(
          (result) =>
            `**${result.title}** (${result.source}): ${result.snippet}`
        )
        .join("\n\n");
    }
  }

  /**
   * Set the LLM service for intelligent search processing
   * @param llmService The LLM service instance
   */
  setLLMService(llmService: any): void {
    this.llmService = llmService;
  }

  /**
   * Set the UI service for user feedback
   * @param uiService The UI service instance
   */
  setUIService(uiService: IUIUpdateService): void {
    this.uiService = uiService;
  }

  /**
   * Check if web search is enabled via settings
   */
  private isWebSearchEnabled(): boolean {
    return getOption(STORAGE_KEYS.WEB_SEARCH_ENABLED) === "true";
  }
}
