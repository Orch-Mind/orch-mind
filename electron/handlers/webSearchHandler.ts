// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { SafeSearchType, search } from "duck-duck-scrape";
import { ipcMain } from "electron";

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
 * Web search handler for the main process
 * Handles web searches without CSP restrictions
 */
export class WebSearchHandler {
  private readonly DEFAULT_MAX_RESULTS = 5;
  private readonly MAX_SNIPPET_LENGTH = 300;

  /**
   * Initialize IPC handlers for web search
   */
  static initialize(): void {
    const handler = new WebSearchHandler();

    // Register IPC handler for web search
    ipcMain.handle(
      "web-search",
      async (event, queries: string[], options: WebSearchOptions = {}) => {
        try {
          console.log(
            `🔍 [MAIN] Web search request: ${queries.length} queries`
          );
          return await handler.performSearch(queries, options);
        } catch (error) {
          console.error("❌ [MAIN] Web search error:", error);
          throw error;
        }
      }
    );

    console.log("✅ [MAIN] Web search handler initialized");
  }

  /**
   * Perform web search using DuckDuckGo
   * @param queries Array of search queries
   * @param options Search options
   * @returns Array of search results
   */
  private async performSearch(
    queries: string[],
    options: WebSearchOptions = {}
  ): Promise<WebSearchResult[]> {
    const allResults: WebSearchResult[] = [];

    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];

      try {
        console.log(
          `🔍 [MAIN] Searching query ${i + 1}/${queries.length}: "${query}"`
        );

        const searchOptions = {
          safeSearch: options.safeSearch
            ? SafeSearchType.STRICT
            : SafeSearchType.OFF,
          locale: "pt-br",
        };

        const searchResults = await search(query, searchOptions);

        if (!searchResults || !searchResults.results) {
          console.warn(`⚠️ [MAIN] No results for query: ${query}`);
          continue;
        }

        // Process and format results
        const formattedResults: WebSearchResult[] = searchResults.results
          .slice(
            0,
            Math.ceil(
              (options.maxResults || this.DEFAULT_MAX_RESULTS) / queries.length
            )
          )
          .map((result: any) => ({
            title: this.cleanText(result.title || ""),
            url: result.url || "",
            snippet: this.truncateSnippet(this.cleanText(result.snippet || "")),
            source: this.extractDomain(result.url || ""),
          }))
          .filter((result) => result.url && result.snippet);

        allResults.push(...formattedResults);

        console.log(
          `✅ [MAIN] Found ${formattedResults.length} results for query: "${query}"`
        );
      } catch (error) {
        console.error(`❌ [MAIN] Error searching query: ${query}`, error);
        continue;
      }
    }

    // Remove duplicates based on URL
    const uniqueResults = allResults.filter(
      (result, index, self) =>
        index === self.findIndex((r) => r.url === result.url)
    );

    console.log(`✅ [MAIN] Total unique results: ${uniqueResults.length}`);

    return uniqueResults.slice(
      0,
      options.maxResults || this.DEFAULT_MAX_RESULTS
    );
  }

  /**
   * Clean HTML entities and excessive whitespace from text
   */
  private cleanText(text: string): string {
    return text
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, "/")
      .replace(/<[^>]*>/g, "") // Remove HTML tags
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();
  }

  /**
   * Truncate snippet to maximum length
   */
  private truncateSnippet(snippet: string): string {
    if (snippet.length <= this.MAX_SNIPPET_LENGTH) {
      return snippet;
    }

    // Try to truncate at a sentence boundary
    const truncated = snippet.substring(0, this.MAX_SNIPPET_LENGTH);
    const lastPeriod = truncated.lastIndexOf(".");
    const lastExclamation = truncated.lastIndexOf("!");
    const lastQuestion = truncated.lastIndexOf("?");

    const lastSentenceEnd = Math.max(lastPeriod, lastExclamation, lastQuestion);

    if (lastSentenceEnd > this.MAX_SNIPPET_LENGTH * 0.8) {
      return truncated.substring(0, lastSentenceEnd + 1);
    }

    // Otherwise, truncate at word boundary
    const lastSpace = truncated.lastIndexOf(" ");
    if (lastSpace > this.MAX_SNIPPET_LENGTH * 0.8) {
      return truncated.substring(0, lastSpace) + "...";
    }

    return truncated + "...";
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace("www.", "");
    } catch {
      return "Unknown source";
    }
  }
}
