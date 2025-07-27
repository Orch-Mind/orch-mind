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
        temperature: 0.3
        // Removed max_tokens limitation for unrestricted responses
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
    if (!(window as any).electronAPI || !(window as any).electronAPI.webSearch) {
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
      const results = await (window as any).electronAPI.webSearch(queries, {
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

      const systemPrompt = "Você é um assistente especializado em análise de resultados de busca web. Sua tarefa é extrair e sintetizar informações específicas dos resultados fornecidos para responder à consulta do usuário.\n\nINSTRUÇÕES OBRIGATÓRIAS:\n1. SEMPRE responda em português brasileiro\n2. Forneça informações específicas e detalhadas\n3. Inclua preços exatos, datas e números quando disponíveis\n4. Cite as fontes com URLs sempre que possível\n5. Organize a resposta de forma clara e estruturada\n6. Se não houver informações suficientes, indique claramente\n7. NUNCA retorne apenas '{}' ou respostas vazias\n8. Mínimo de 100 caracteres na resposta";

      const processingPrompt = `CONSULTA DO USUÁRIO: "${originalQuery}"

RESULTADOS DA BUSCA WEB:
${formattedResults}

TAREFA: Analise os resultados acima e forneça uma resposta completa e detalhada para a consulta do usuário. Inclua informações específicas como preços, datas, especificações técnicas e cite as fontes.`;

      // Log do prompt para depuração
      LoggingUtils.logInfo(
        `🧠 [WEB_SEARCH_PROCESS] Sending prompt to LLM:\nSystem: ${systemPrompt.substring(0, 200)}...\nUser: ${processingPrompt.substring(0, 200)}...`
      );

      const response = await this.llmService.callOpenAIWithFunctions({
        model: getOption(STORAGE_KEYS.OLLAMA_MODEL) || "gemma3:latest",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          { role: "user", content: processingPrompt },
        ],
        temperature: 0.5,
        // Removed max_tokens limitation for unrestricted responses
        // Removido format: "json" que estava causando respostas malformadas
      });

      const processedContent = response.choices[0]?.message?.content || "";

      LoggingUtils.logInfo(
        `✅ [WEB_SEARCH_PROCESS] LLM response received (${processedContent.length} chars)`
      );

      // Log da resposta da LLM para depuração
      LoggingUtils.logInfo(
        `🧠 [WEB_SEARCH_PROCESS] LLM raw response: ${processedContent.substring(0, 500)}${processedContent.length > 500 ? '...' : ''}`
      );

      // Validate response quality and provide fallback if needed
      // Verifica se a resposta é JSON malformado ou inadequada
      const isInvalidJson = processedContent.trim().startsWith('{') && !processedContent.trim().endsWith('}');
      const isEmptyResponse = processedContent.length < 100 || processedContent.trim() === '{}' || processedContent.trim() === '';
      const hasExcessiveWhitespace = (processedContent.match(/\n\s*\n/g) || []).length > 10;
      
      if (isInvalidJson || isEmptyResponse || hasExcessiveWhitespace) {
        LoggingUtils.logWarning(
          `⚠️ [WEB_SEARCH_PROCESS] LLM response inadequate (${processedContent.length} chars: "${processedContent.substring(0, 50)}"), using enhanced fallback`
        );
        
        const fallbackContent = results
          .slice(0, 4)
          .map((result, index) => {
            const title = result.title || 'Título não disponível';
            const source = result.source || result.url || 'Fonte não disponível';
            const snippet = result.snippet || 'Resumo não disponível';
            const content = result.content ? result.content.substring(0, 300) : '';
            
            return `**${index + 1}. ${title}**\n` +
                   `📍 Fonte: ${source}\n` +
                   `📝 Resumo: ${snippet}\n` +
                   (content ? `📄 Detalhes: ${content}...\n` : '') +
                   '\n---\n';
          })
          .join('');
        
        return `## Resultados da busca para: "${originalQuery}"\n\n` +
               `Encontrei ${results.length} resultado(s) relevante(s):\n\n` +
               fallbackContent +
               '\n💡 *Informações extraídas diretamente dos resultados da busca web.*';
      }

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
