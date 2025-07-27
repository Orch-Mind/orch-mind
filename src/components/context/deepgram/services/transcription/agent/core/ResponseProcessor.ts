// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { LoggingUtils } from "../../../../utils/LoggingUtils";
import { AgentMode, AgentAction, AgentResponse } from "../types/AgentTypes";

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
    
    const modeInstructions = this._getModeInstructions(mode);
    const contextInfo = this._buildContextInfo(workspaceInfo);
    
    return `${basePrompt}\n\n${modeInstructions}\n\n${contextInfo}`;
  }
  
  private _getModeInstructions(mode: string): string {
    switch (mode) {
      case 'universal':
        return `## UNIVERSAL AGENT MODE - Full IDE Capabilities

⚠️ **CRITICAL: You MUST respond using ONLY the structured command format below. NEVER use conversational responses like "I created..." or "Done!". Always use the exact command syntax.**

🎯 **REQUIRED RESPONSE FORMAT:**
When the user asks you to create/edit/delete files or run commands, you MUST respond with these exact commands:

**File Operations (REQUIRED FORMAT):**
- CREATE FILE: path/to/file.ext
  Content:
  \`\`\`
  file content here
  \`\`\`

- EDIT FILE: path/to/file.ext
  Content:
  \`\`\`
  updated content here
  \`\`\`

- DELETE FILE: path/to/file.ext

**Command Execution:**
- EXECUTE: command here
  Working Directory: /optional/path

**File Search:**
- SEARCH: search query

**Examples of CORRECT responses:**
User: "crie um arquivo teste.txt escrito Olá"
Your response:
CREATE FILE: teste.txt
Content:
\`\`\`
Olá
\`\`\`

User: "delete the old file"
Your response:
DELETE FILE: old_file.txt

❌ **NEVER respond like this:**
- "Beleza! Criei um arquivo..."
- "Done! I've created the file..."
- "OK, arquivo criado com sucesso!"

✅ **ALWAYS respond like this:**
- CREATE FILE: filename.ext
- EDIT FILE: filename.ext
- DELETE FILE: filename.ext

🔥 **REMEMBER: Use ONLY command format, never conversational text!**`;
        
      case 'chat':
        return `## CHAT MODE - Collaborative
- Suggest changes using SUGGEST: commands
- Ask for user confirmation before major changes
- Provide detailed explanations of proposed solutions
- Focus on guidance and recommendations`;
        
      case 'analysis':
        return `## ANALYSIS MODE - Read-only
- Analyze code and provide insights
- Answer questions about the codebase
- Do not suggest file modifications
- Focus on understanding and explanation`;
        
      default:
        return `## UNIVERSAL AGENT MODE - Full IDE Capabilities
- You have full access to create, edit, delete files and execute commands
- Work like Cursor or Windsurf - be proactive and implement solutions directly`;
    }
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
