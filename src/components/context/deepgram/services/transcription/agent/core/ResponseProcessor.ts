// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { LoggingUtils } from "../../../../utils/LoggingUtils";
import { AgentAction, AgentResponse } from "../types/AgentTypes";

/**
 * Response Processor - Parses LLM responses and extracts actions
 * Follows SRP: Single responsibility for response parsing
 */
export class ResponseProcessor {
  
  /**
   * Parse agent response for actions
   * Enhanced with better pattern matching and content extraction
   */
  parseResponse(response: string): AgentResponse {
    const actions: AgentAction[] = [];
    const suggestions: string[] = [];
    const filesModified: string[] = [];
    
    LoggingUtils.logInfo(`🔍 [DEBUG] ResponseProcessor parsing response. Length: ${response.length}`);
    LoggingUtils.logInfo(`📝 [DEBUG] Response content: ${response.substring(0, 500)}...`);
    
    // Enhanced action parsing with support for content and working directory
    const patterns = {
      // CREATE FILE: path/to/file.js
      // Content:
      // ```
      // file content here
      // ```
      create: /CREATE FILE:\s*([^\n]+)(?:\n(?:Content:|CONTENT:)\s*\n```[\w]*\n([\s\S]*?)\n```)?/gi,
      
      // EDIT FILE: path/to/file.js
      // Content:
      // ```
      // new content here
      // ```
      edit: /EDIT FILE:\s*([^\n]+)(?:\n(?:Content:|CONTENT:)\s*\n```[\w]*\n([\s\S]*?)\n```)?/gi,
      
      // DELETE FILE: path/to/file.js
      delete: /DELETE FILE:\s*([^\n]+)/gi,
      
      // EXECUTE: command here
      // Working Directory: /path/to/dir (optional)
      execute: /EXECUTE:\s*([^\n]+)(?:\n(?:Working Directory:|WORKING DIRECTORY:|WorkingDir:|WORKINGDIR:)\s*([^\n]+))?/gi,
      
      // SEARCH: query here
      search: /SEARCH:\s*([^\n]+)/gi
    };
    
    // Extract CREATE actions with content
    let match;
    while ((match = patterns.create.exec(response)) !== null) {
      const target = match[1].trim();
      const content = match[2] ? match[2].trim() : undefined;
      LoggingUtils.logInfo(`✅ [DEBUG] Found CREATE action: target="${target}", hasContent=${!!content}`);
      actions.push({
        type: 'create',
        target,
        content
      });
      filesModified.push(target);
    }
    
    // Extract EDIT actions with content
    patterns.edit.lastIndex = 0; // Reset regex
    while ((match = patterns.edit.exec(response)) !== null) {
      const target = match[1].trim();
      const content = match[2] ? match[2].trim() : undefined;
      actions.push({
        type: 'edit',
        target,
        content
      });
      filesModified.push(target);
    }
    
    // Extract DELETE actions
    patterns.delete.lastIndex = 0;
    while ((match = patterns.delete.exec(response)) !== null) {
      const target = match[1].trim();
      actions.push({
        type: 'delete',
        target
      });
      filesModified.push(target);
    }
    
    // Extract EXECUTE actions with optional working directory
    patterns.execute.lastIndex = 0;
    while ((match = patterns.execute.exec(response)) !== null) {
      const target = match[1].trim();
      const workingDir = match[2] ? match[2].trim() : undefined;
      actions.push({
        type: 'execute',
        target,
        workingDir
      });
    }
    
    // Extract SEARCH actions
    patterns.search.lastIndex = 0;
    while ((match = patterns.search.exec(response)) !== null) {
      const target = match[1].trim();
      actions.push({
        type: 'search',
        target
      });
    }
    
    // Extract suggestions
    const suggestionPattern = /SUGGEST:\s*([^\n]+)/gi;
    let suggestionMatch;
    while ((suggestionMatch = suggestionPattern.exec(response)) !== null) {
      suggestions.push(suggestionMatch[1].trim());
    }
    
    LoggingUtils.logInfo(`🔍 [DEBUG] ResponseProcessor result: found ${actions.length} actions, ${suggestions.length} suggestions`);
    
    return {
      response,
      actions: actions.length > 0 ? actions : undefined,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
      filesModified: filesModified.length > 0 ? filesModified : undefined
    };
  }
  
  /**
   * Build system prompt based on agent mode
   * KISS: Simple mode-specific instructions
   */
  buildSystemPrompt(mode: string, workspaceInfo: { languages: string[]; frameworks: string[] }): string {
    const basePrompt = "You are a helpful AI coding assistant with access to the user's workspace.";
    
    const modeInstructions = this._getModeInstructions();
    const contextInfo = this._buildContextInfo(workspaceInfo);
    
    return `${basePrompt}\n\n${modeInstructions}\n\n${contextInfo}`;
  }
  
  private _getModeInstructions(): string {
    return `You are a Universal AI Agent with full IDE capabilities.

Use the appropriate tools to complete user requests:
- createFile: Create new files
- editFile: Edit existing files  
- deleteFile: Delete files
- readFile: Read and analyze files
- executeCommand: Run commands
- searchFiles: Find files

Be direct and helpful. Use tools based on user intent.`;
  }
  
  private _buildContextInfo(workspaceInfo: { languages: string[]; frameworks: string[] }): string {
    const { languages, frameworks } = workspaceInfo;
    
    let context = "## Workspace Context\n";
    
    if (languages.length > 0) {
      context += `Languages: ${languages.join(', ')}\n`;
    }
    
    if (frameworks.length > 0) {
      context += `Frameworks: ${frameworks.join(', ')}\n`;
    }
    
    return context;
  }
}
