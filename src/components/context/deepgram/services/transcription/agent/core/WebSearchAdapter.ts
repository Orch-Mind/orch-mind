// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { LoggingUtils } from "../../../../utils/LoggingUtils";
import { IUIUpdateService } from "../../../../interfaces/utils/IUIUpdateService";
import { 
  getOption,
  STORAGE_KEYS,
} from "./../../../../../../../services/StorageService";
import { 
  WebSearchService, 
  IUIUpdateService as WebUIUpdateService 
} from "./../../../web/WebSearchService";

/**
 * Web Search Adapter - Provides contextual web search for agent
 * Follows SRP: Single responsibility for web search integration
 */
export class WebSearchAdapter {
  private webSearchService: WebSearchService;
  
  constructor(llmService: any, uiService: IUIUpdateService) {
    const uiAdapter = new UIServiceAdapter(uiService);
    this.webSearchService = new WebSearchService(llmService, uiAdapter);
  }
  
  /**
   * Get web context if web search is enabled and message suggests need for web search
   * Based on SimplePromptProcessor pattern
   */
  async getWebContext(message: string, conversationHistory?: Array<{ role: string; content: string }>): Promise<string> {
    // Check if web search is enabled (same as SimplePromptProcessor)
    const isWebSearchEnabled = getOption(STORAGE_KEYS.WEB_SEARCH_ENABLED) || false;
    if (!isWebSearchEnabled) {
      LoggingUtils.logInfo("🌐 Web search disabled in settings");
      return "";
    }
    
    // YAGNI: Simple trigger words, no complex NLP
    const webSearchTriggers = ['latest', 'current', 'new', 'update', 'documentation', 'how to', 'what is', 'explain'];
    const needsWebSearch = webSearchTriggers.some(trigger => 
      message.toLowerCase().includes(trigger)
    );
    
    if (!needsWebSearch) return "";
    
    try {
      // Use same pattern as SimplePromptProcessor
      const searchStrategy = await this.webSearchService.generateSearchStrategy(
        message, 
        conversationHistory || []
      );
      
      const webResults = await this.webSearchService.searchWeb(
        searchStrategy.searchQueries, 
        {
          maxResults: searchStrategy.resultsCount,
          safeSearch: true,
        }
      );
      
      if (webResults?.length > 0) {
        return await this.webSearchService.processSearchResults(webResults, message);
      }
      
      return "";
    } catch (error) {
      LoggingUtils.logWarning("⚠️ Web search unavailable");
      return "";
    }
  }
}

/**
 * UI Service adapter for WebSearchService
 * Follows SRP: Single responsibility for UI adaptation
 */
class UIServiceAdapter implements WebUIUpdateService {
  constructor(private originalUIService: IUIUpdateService) {}

  updateProcessingStatus(message: string): void {
    // KISS: Simple status update
    if (typeof window !== "undefined" && (window as any).__updateProcessingStatus) {
      (window as any).__updateProcessingStatus(message);
    }
  }

  notifyWebSearchStep(step: string, details?: string): void {
    const statusMessage = details ? `🌐 ${step}: ${details}` : `🌐 ${step}`;
    this.updateProcessingStatus(statusMessage);
    LoggingUtils.logInfo(`🔍 [WEB_SEARCH] ${statusMessage}`);
  }
}
