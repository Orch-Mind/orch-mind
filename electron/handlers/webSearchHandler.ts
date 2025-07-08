// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import axios from "axios";
import { ipcMain } from "electron";
import { getOption, STORAGE_KEYS } from "../../src/services/StorageService";

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
 * Web search options interface
 */
export interface WebSearchOptions {
  maxResults?: number;
  extractContent?: boolean;
  maxContentResults?: number;
}

/**
 * Content extraction result interface
 */
interface ContentExtractionResult {
  content: string;
  contentLength: number;
  contentScore: number;
}

/**
 * Simplified web search handler with Bing as primary engine and content extraction
 */
export class WebSearchHandler {
  private readonly DEFAULT_MAX_RESULTS = 5;
  private readonly MAX_CONTENT_LENGTH = 3000;
  private readonly MIN_CONTENT_LENGTH = 200;
  private readonly REQUEST_TIMEOUT = 15000;
  private readonly CONTENT_EXTRACTION_TIMEOUT = 10000;

  private readonly USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edge/120.0.0.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  ];

  /**
   * Initialize IPC handlers for web search
   */
  static initialize(): void {
    const handler = new WebSearchHandler();

    ipcMain.handle(
      "web-search",
      async (event, queries: string[], options: WebSearchOptions = {}) => {
        try {
          console.log(
            `🔍 [WEB_SEARCH] Starting search with ${queries.length} queries`
          );

          const results = await handler.performSearch(queries, options);

          console.log(`✅ [WEB_SEARCH] Completed: ${results.length} results`);

          // Log content extraction stats if enabled
          if (options.extractContent) {
            const withContent = results.filter(
              (r) => r.content && r.content.length > 0
            );
            if (withContent.length > 0) {
              const avgLength =
                withContent.reduce(
                  (sum, r) => sum + (r.contentLength || 0),
                  0
                ) / withContent.length;
              const avgScore =
                withContent.reduce((sum, r) => sum + (r.contentScore || 0), 0) /
                withContent.length;
              console.log(
                `📄 [WEB_SEARCH] Content: ${withContent.length}/${
                  results.length
                } pages, avg ${Math.round(avgLength)} chars, ${(
                  avgScore * 100
                ).toFixed(1)}% quality`
              );
            }
          }

          return results;
        } catch (error) {
          console.error("❌ [WEB_SEARCH] Error:", error);
          return [];
        }
      }
    );

    console.log("✅ [WEB_SEARCH] Handler initialized");
  }

  /**
   * Perform web search using Bing
   */
  private async performSearch(
    queries: string[],
    options: WebSearchOptions = {}
  ): Promise<WebSearchResult[]> {
    const allResults: WebSearchResult[] = [];

    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      if (!query?.trim()) continue;

      console.log(
        `🔍 [WEB_SEARCH] Processing (${i + 1}/${queries.length}): "${query}"`
      );

      try {
        const queryResults = await this.searchWithBing(query, options);
        allResults.push(...queryResults);

        console.log(
          `✅ [WEB_SEARCH] Found ${queryResults.length} results for: "${query}"`
        );
      } catch (error) {
        console.warn(
          `⚠️ [WEB_SEARCH] Failed for "${query}": ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }

      // Delay between queries
      if (i < queries.length - 1) {
        await this.delay(2000);
      }
    }

    const finalResults = this.removeDuplicates(allResults).slice(
      0,
      options.maxResults || this.DEFAULT_MAX_RESULTS
    );

    // Extract content if requested
    if (options.extractContent && finalResults.length > 0) {
      const maxContentResults = options.maxContentResults || 3;
      const topResults = finalResults.slice(0, maxContentResults);

      console.log(
        `📄 [WEB_SEARCH] Extracting content from ${topResults.length} results...`
      );
      await this.extractContentFromResults(topResults);
    }

    return finalResults;
  }

  /**
   * Search using Bing
   */
  private async searchWithBing(
    query: string,
    options: WebSearchOptions
  ): Promise<WebSearchResult[]> {
    try {
      const cheerio = await import("cheerio");

      const url = new URL("https://www.bing.com/search");
      url.searchParams.set("q", query);
      url.searchParams.set("form", "QBLH");

      const response = await axios.get(url.toString(), {
        headers: {
          "User-Agent": this.getRandomUserAgent(),
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": this.getSearchLocale(),
          "Accept-Encoding": "gzip, deflate, br",
          "Cache-Control": "no-cache",
          DNT: "1",
        },
        timeout: this.REQUEST_TIMEOUT,
        validateStatus: (status: number) => status < 500,
      });

      const $ = cheerio.load(response.data);
      const results: WebSearchResult[] = [];

      // Check for bot detection
      if (this.detectBotBlocking($)) {
        console.warn("🚨 [WEB_SEARCH] Bot detection triggered");
        throw new Error("Bot detected");
      }

      // Extract results
      $(".b_algo").each((index, element) => {
        if (results.length >= 5) return false;

        const $element = $(element);
        const titleElement = $element.find("h2 a").first();
        const snippetElement = $element
          .find(".b_caption p, .b_snippet")
          .first();

        const title = titleElement.text().trim();
        const url = this.cleanUrl(titleElement.attr("href") || "");
        const snippet = snippetElement.text().trim();

        if (title && url && snippet) {
          results.push({
            title: this.cleanText(title),
            url,
            snippet: this.cleanText(snippet),
            source: "Bing",
          });
        }
      });

      return results;
    } catch (error) {
      console.error(
        `❌ [WEB_SEARCH] Bing error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }

  /**
   * Extract content from search results with fallback strategy
   */
  private async extractContentFromResults(
    results: WebSearchResult[]
  ): Promise<void> {
    const extractionPromises = results.map(async (result, index) => {
      try {
        console.log(
          `📄 [WEB_SEARCH] Extracting (${index + 1}/${results.length}): ${
            result.url
          }`
        );

        const extractionResult = await this.extractPageContent(result.url);

        if (extractionResult.content) {
          result.content = extractionResult.content;
          result.contentLength = extractionResult.contentLength;
          result.contentScore = extractionResult.contentScore;
          result.extractedAt = new Date();

          console.log(
            `✅ [WEB_SEARCH] Extracted: ${
              extractionResult.contentLength
            } chars, ${(extractionResult.contentScore * 100).toFixed(
              1
            )}% quality`
          );
        } else {
          console.log(
            `⚠️ [WEB_SEARCH] Content extraction failed, trying fallback...`
          );

          // Try fallback with alternative search if primary extraction fails
          const fallbackResult = await this.tryFallbackContentExtraction(
            result
          );
          if (fallbackResult.content) {
            result.content = fallbackResult.content;
            result.contentLength = fallbackResult.contentLength;
            result.contentScore = fallbackResult.contentScore;
            result.extractedAt = new Date();

            console.log(
              `✅ [WEB_SEARCH] Fallback succeeded: ${
                fallbackResult.contentLength
              } chars, ${(fallbackResult.contentScore * 100).toFixed(
                1
              )}% quality`
            );
          }
        }
      } catch (error) {
        console.warn(
          `⚠️ [WEB_SEARCH] Content extraction failed for ${result.url}`
        );
      }
    });

    // Execute with limited parallelism
    for (let i = 0; i < extractionPromises.length; i += 2) {
      const batch = extractionPromises.slice(i, i + 2);
      await Promise.allSettled(batch);

      if (i + 2 < extractionPromises.length) {
        await this.delay(1000);
      }
    }
  }

  /**
   * Try fallback content extraction using reliable sources
   */
  private async tryFallbackContentExtraction(
    result: WebSearchResult
  ): Promise<ContentExtractionResult> {
    console.log(`🔄 [WEB_SEARCH] Trying fallback content extraction...`);

    try {
      // Extract key terms from the title and snippet for fallback search
      const keyTerms = this.extractKeyTerms(result.title, result.snippet);

      if (keyTerms.length === 0) {
        return { content: "", contentLength: 0, contentScore: 0 };
      }

      // Try reliable content sources as fallback
      const fallbackSources = [
        `https://pt.wikipedia.org/wiki/${encodeURIComponent(keyTerms[0])}`,
        `https://en.wikipedia.org/wiki/${encodeURIComponent(keyTerms[0])}`,
        // Could add more reliable sources here
      ];

      for (const fallbackUrl of fallbackSources) {
        try {
          console.log(`📚 [WEB_SEARCH] Trying fallback source: ${fallbackUrl}`);

          const fallbackContent = await this.extractPageContent(fallbackUrl);

          if (
            fallbackContent.content &&
            fallbackContent.contentLength > this.MIN_CONTENT_LENGTH
          ) {
            console.log(`✅ [WEB_SEARCH] Fallback source worked!`);

            // Add context that this is fallback content
            const contextualContent = `Informação relacionada sobre "${keyTerms[0]}": ${fallbackContent.content}`;

            return {
              content: contextualContent,
              contentLength: contextualContent.length,
              contentScore: fallbackContent.contentScore * 0.8, // Slightly lower score for fallback
            };
          }
        } catch (error) {
          console.log(`⚠️ [WEB_SEARCH] Fallback source failed: ${fallbackUrl}`);
        }
      }

      return { content: "", contentLength: 0, contentScore: 0 };
    } catch (error) {
      return { content: "", contentLength: 0, contentScore: 0 };
    }
  }

  /**
   * Extract key terms from title and snippet for fallback searches
   */
  private extractKeyTerms(title: string, snippet: string): string[] {
    const text = `${title} ${snippet}`.toLowerCase();

    // Remove common words and extract meaningful terms
    const stopWords = new Set([
      "o",
      "a",
      "os",
      "as",
      "um",
      "uma",
      "uns",
      "umas",
      "de",
      "da",
      "do",
      "das",
      "dos",
      "em",
      "na",
      "no",
      "nas",
      "nos",
      "para",
      "por",
      "com",
      "sem",
      "que",
      "e",
      "ou",
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
      "from",
      "up",
      "about",
      "into",
      "through",
      "during",
      "before",
      "after",
      "above",
      "below",
      "between",
      "among",
      "against",
      "within",
      "without",
      "upon",
    ]);

    const words = text
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter(
        (word) => word.length > 3 && !stopWords.has(word) && !/^\d+$/.test(word) // Not just numbers
      );

    // Get most relevant terms (first few non-stop words)
    return Array.from(new Set(words)).slice(0, 3);
  }

  /**
   * Extract main content from a web page
   */
  private async extractPageContent(
    url: string
  ): Promise<ContentExtractionResult> {
    const maxRetries = 2;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `📄 [WEB_SEARCH] Attempt ${attempt}/${maxRetries} for: ${url}`
        );

        const response = await axios.get(url, {
          timeout: this.CONTENT_EXTRACTION_TIMEOUT + attempt * 2000, // Increase timeout on retries
          headers: {
            "User-Agent": this.getRandomUserAgent(),
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": this.getSearchLocale(),
            "Accept-Encoding": "gzip, deflate, br",
            "Cache-Control": "no-cache",
            DNT: "1",
            Connection: "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
          },
          maxRedirects: 5,
          validateStatus: (status) => status < 500,
          responseType: "text",
        });

        if (!response.data || typeof response.data !== "string") {
          throw new Error("Invalid response data type");
        }

        // Check for common blocking patterns
        const blockedPatterns = [
          /blocked|forbidden|access denied/i,
          /cloudflare|captcha|bot protection/i,
          /403|401|429/i,
        ];

        const isBlocked = blockedPatterns.some((pattern) =>
          pattern.test(response.data.substring(0, 1000))
        );

        if (isBlocked && attempt < maxRetries) {
          console.log(
            `🚨 [WEB_SEARCH] Blocking detected, retrying with different approach...`
          );
          await this.delay(2000 * attempt); // Progressive delay
          continue;
        }

        const extractedContent = await this.extractMainContent(response.data);

        if (
          !extractedContent ||
          extractedContent.length < this.MIN_CONTENT_LENGTH
        ) {
          if (attempt < maxRetries) {
            console.log(
              `⚠️ [WEB_SEARCH] Content too short (${extractedContent.length} chars), retrying...`
            );
            await this.delay(1000 * attempt);
            continue;
          }
          // Final attempt failed
          throw new Error(
            `Content too short: ${extractedContent.length} chars`
          );
        }

        const contentScore = this.calculateContentScore(extractedContent);

        const finalContent =
          extractedContent.length > this.MAX_CONTENT_LENGTH
            ? extractedContent.substring(0, this.MAX_CONTENT_LENGTH) + "..."
            : extractedContent;

        console.log(
          `✅ [WEB_SEARCH] Success on attempt ${attempt}: ${
            finalContent.length
          } chars, ${(contentScore * 100).toFixed(1)}% quality`
        );

        return {
          content: finalContent,
          contentLength: finalContent.length,
          contentScore,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.warn(
          `⚠️ [WEB_SEARCH] Attempt ${attempt} failed for ${url}: ${errorMessage}`
        );

        if (attempt === maxRetries) {
          console.error(`❌ [WEB_SEARCH] All attempts failed for ${url}`);
          return {
            content: "",
            contentLength: 0,
            contentScore: 0,
          };
        }

        // Progressive delay between retries
        await this.delay(2000 * attempt);
      }
    }

    return {
      content: "",
      contentLength: 0,
      contentScore: 0,
    };
  }

  /**
   * Extract main content from HTML with enhanced strategies
   */
  private async extractMainContent(html: string): Promise<string> {
    try {
      const cheerio = await import("cheerio");
      const $ = cheerio.load(html);

      // Remove unwanted elements with more comprehensive selectors
      $(
        'script, style, nav, header, footer, aside, .advertisement, .ads, .social, .comments, .sidebar, .menu, .navigation, .breadcrumb, .pagination, [class*="ad"], [id*="ad"], [class*="social"], [class*="share"], [class*="cookie"], [class*="popup"], [class*="modal"], [class*="overlay"], .hidden, [style*="display:none"], [style*="visibility:hidden"]'
      ).remove();

      // Enhanced content extraction strategies with priority
      const strategies = [
        // Strategy 1: JSON-LD structured data
        () => {
          const jsonLd = $('script[type="application/ld+json"]').first();
          if (jsonLd.length > 0) {
            try {
              const data = JSON.parse(jsonLd.html() || "");
              if (data.description || data.text || data.articleBody) {
                const content =
                  data.description || data.text || data.articleBody;
                if (
                  typeof content === "string" &&
                  content.length > this.MIN_CONTENT_LENGTH
                ) {
                  return content;
                }
              }
            } catch (e) {
              // Ignore JSON parsing errors
            }
          }
          return "";
        },

        // Strategy 2: Main content areas with priority order
        () => {
          const selectors = [
            'main[role="main"]',
            "main",
            'article[role="main"]',
            "article",
            '[role="main"]',
            ".main-content",
            ".content-main",
            ".article-content",
            ".post-content",
            ".entry-content",
            ".content",
            "#main-content",
            "#content",
            ".text-content",
          ];

          for (const selector of selectors) {
            const element = $(selector).first();
            if (element.length > 0) {
              const text = element.text().trim();
              if (text.length > this.MIN_CONTENT_LENGTH) {
                return text;
              }
            }
          }
          return "";
        },

        // Strategy 3: Paragraph-based extraction with smart filtering
        () => {
          const contentAreas = $(
            ".content, .article, .post, .entry, main, article, .main"
          );
          if (contentAreas.length > 0) {
            const paragraphs = contentAreas
              .find("p")
              .map((i, el) => {
                const text = $(el).text().trim();
                // Filter out navigation, short text, and common footer text
                if (
                  text.length < 30 ||
                  /^(home|about|contact|privacy|terms|copyright|©)/i.test(
                    text
                  ) ||
                  /^(menu|navigation|breadcrumb)/i.test(text)
                ) {
                  return null;
                }
                return text;
              })
              .get()
              .filter(Boolean);

            if (paragraphs.length > 2) {
              const content = paragraphs.join("\n\n");
              if (content.length > this.MIN_CONTENT_LENGTH) {
                return content;
              }
            }
          }
          return "";
        },

        // Strategy 4: All paragraphs with smart filtering
        () => {
          const allParagraphs = $("body p")
            .map((i, el) => {
              const text = $(el).text().trim();
              // More sophisticated filtering
              if (
                text.length < 40 ||
                /^(home|about|contact|menu|navigation|privacy|terms|copyright|©|subscribe|follow|share)/i.test(
                  text
                ) ||
                /^\d+$/.test(text) || // Just numbers
                text.split(" ").length < 6
              ) {
                // Too few words
                return null;
              }
              return text;
            })
            .get()
            .filter(Boolean);

          if (allParagraphs.length > 1) {
            // Take first 15 meaningful paragraphs
            const content = allParagraphs.slice(0, 15).join("\n\n");
            if (content.length > this.MIN_CONTENT_LENGTH) {
              return content;
            }
          }
          return "";
        },

        // Strategy 5: Heading + paragraph combination
        () => {
          const headingsAndParagraphs: string[] = [];
          $("h1, h2, h3, p").each((i, el) => {
            const text = $(el).text().trim();
            if (
              text.length > 20 &&
              !text.match(/^(menu|navigation|home|about|contact)/i)
            ) {
              headingsAndParagraphs.push(text);
            }
          });

          if (headingsAndParagraphs.length > 3) {
            const content = headingsAndParagraphs.slice(0, 20).join("\n\n");
            if (content.length > this.MIN_CONTENT_LENGTH) {
              return content;
            }
          }
          return "";
        },

        // Strategy 6: Meta description fallback
        () => {
          const metaDesc =
            $('meta[name="description"]').attr("content") ||
            $('meta[property="og:description"]').attr("content");
          if (metaDesc && metaDesc.length > 100) {
            return metaDesc;
          }
          return "";
        },
      ];

      // Try each strategy in order
      for (let i = 0; i < strategies.length; i++) {
        const content = strategies[i]();
        if (content && content.length > this.MIN_CONTENT_LENGTH) {
          console.log(
            `✅ [WEB_SEARCH] Strategy ${i + 1} succeeded: ${
              content.length
            } chars`
          );
          return this.cleanExtractedContent(content);
        }
      }

      console.log(`⚠️ [WEB_SEARCH] All extraction strategies failed`);
      return "";
    } catch (error) {
      console.warn(
        `⚠️ [WEB_SEARCH] HTML parsing failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return "";
    }
  }

  /**
   * Enhanced content cleaning
   */
  private cleanExtractedContent(content: string): string {
    return content
      .replace(/\s+/g, " ") // Normalize whitespace
      .replace(/\n\s*\n\s*\n/g, "\n\n") // Clean up excessive line breaks
      .replace(/[^\w\s\.,!?;:()\-""'']/g, " ") // Remove unusual characters
      .replace(/\b(cookies?|privacy|terms|subscribe|follow us)\b/gi, "") // Remove common noise
      .trim()
      .substring(0, this.MAX_CONTENT_LENGTH);
  }

  /**
   * Enhanced content quality calculation
   */
  private calculateContentScore(content: string): number {
    if (!content || content.length < this.MIN_CONTENT_LENGTH) {
      return 0;
    }

    let score = 0.3; // Base score

    // Length factor (more content is generally better)
    const lengthFactor = Math.min(content.length / 1500, 1) * 0.25;
    score += lengthFactor;

    // Sentence structure factor
    const sentences = content
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 15);
    const sentenceFactor = Math.min(sentences.length / 8, 1) * 0.2;
    score += sentenceFactor;

    // Word diversity factor
    const words = content.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    const diversityFactor = (uniqueWords.size / words.length) * 0.15;
    score += diversityFactor;

    // Penalty for repetitive content
    const avgWordLength =
      words.reduce((sum, word) => sum + word.length, 0) / words.length;
    if (avgWordLength > 4) {
      score += 0.1; // Bonus for more substantial words
    }

    return Math.min(score, 1);
  }

  /**
   * Detect bot blocking patterns
   */
  private detectBotBlocking($: any): boolean {
    const blockingPatterns = [
      ".anomaly-modal__modal",
      ".anomaly-modal__mask",
      '[data-testid="captcha"]',
      ".captcha",
      ".blocked",
    ];

    return blockingPatterns.some((pattern) => $(pattern).length > 0);
  }

  /**
   * Get search locale from settings
   */
  private getSearchLocale(): string {
    try {
      const language = getOption(STORAGE_KEYS.DEEPGRAM_LANGUAGE) || "pt-BR";
      const localeMap: Record<string, string> = {
        "pt-BR": "pt-BR,pt;q=0.9,en;q=0.8",
        "en-US": "en-US,en;q=0.9",
        en: "en-US,en;q=0.9",
      };
      return localeMap[language] || "en-US,en;q=0.9";
    } catch {
      return "en-US,en;q=0.9";
    }
  }

  /**
   * Get random user agent
   */
  private getRandomUserAgent(): string {
    return this.USER_AGENTS[
      Math.floor(Math.random() * this.USER_AGENTS.length)
    ];
  }

  /**
   * Clean and normalize URLs
   */
  private cleanUrl(url: string): string {
    if (!url) return "";

    // Handle relative URLs
    if (url.startsWith("/")) {
      return `https://www.bing.com${url}`;
    }

    // Clean Bing redirects
    if (url.includes("bing.com/ck/a")) {
      try {
        const urlParams = new URLSearchParams(url.split("?")[1]);
        const encodedUrl = urlParams.get("u");
        if (encodedUrl) {
          const decodedUrl = atob(encodedUrl.substring(2));
          if (decodedUrl.startsWith("http")) {
            return decodedUrl;
          }
        }
      } catch {
        // Return original if decoding fails
      }
    }

    return url;
  }

  /**
   * Remove duplicate results
   */
  private removeDuplicates(results: WebSearchResult[]): WebSearchResult[] {
    const seen = new Set();
    return results.filter((result) => {
      const key = `${result.url.toLowerCase()}-${result.title.toLowerCase()}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Clean text by removing extra whitespace and HTML entities
   */
  private cleanText(text: string): string {
    if (!text) return "";

    return text
      .replace(/\s+/g, " ")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .trim();
  }

  /**
   * Add delay to avoid rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
