// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { LoggingUtils } from "../../../../utils/LoggingUtils";
import { IUIUpdateService } from "../../../../interfaces/utils/IUIUpdateService";
import { AgentAction } from "../types/AgentTypes";
import * as path from "path";

/**
 * Action Executor - Executes agent actions on the file system
 * Follows SRP: Single responsibility for action execution
 */
export class ActionExecutor {
  private workspaceRoot: string | null = null;
  
  constructor(private uiService: IUIUpdateService) {}
  
  /**
   * Set workspace root for relative path resolution
   */
  setWorkspaceRoot(workspaceRoot: string): void {
    this.workspaceRoot = workspaceRoot;
    LoggingUtils.logInfo(`📁 Workspace root set to: ${workspaceRoot}`);
  }

  /**
   * Execute a single agent action
   * KISS: Simple action dispatch with improved parsing
   */
  async executeAction(action: AgentAction): Promise<void> {
    if (!action || !action.type || !action.target) {
      throw new Error('Invalid action: missing type or target');
    }

    LoggingUtils.logInfo(`🤖 Executing action: ${action.type} on ${action.target}`);
    
    try {
      // Validate action type
      const validActions = ['create', 'edit', 'delete', 'read', 'execute', 'search'];
      if (!validActions.includes(action.type)) {
        throw new Error(`Invalid action type: ${action.type}`);
      }

      // Parse and resolve target path for file operations
      const resolvedTarget = ['create', 'edit', 'delete', 'read'].includes(action.type) 
        ? this._resolveTargetPath(action.target)
        : action.target;
      
      switch (action.type) {
        case 'create':
          await this._createFile(resolvedTarget, action.content || '');
          break;
        case 'edit':
          await this._editFile(resolvedTarget, action.content || '');
          break;
        case 'delete':
          await this._deleteFile(resolvedTarget);
          break;
        case 'execute':
          await this._executeCommand(action.target, action.workingDir);
          break;
        case 'search':
          await this._searchFiles(action.target, this.workspaceRoot || undefined);
          break;
        case 'read':
          const readContent = await this._readFile(resolvedTarget, action);
          action.readContent = readContent;
          LoggingUtils.logInfo(`📝 [DEBUG] Set action.readContent: ${readContent.substring(0, 100)}...`);
          break;
        default:
          LoggingUtils.logWarning(`⚠️ Unknown action type: ${action.type}`);
      }
    } catch (error) {
      LoggingUtils.logError(`❌ Action execution failed: ${action.type}`, error);
      throw error;
    }
  }
  
  /**
   * Execute multiple actions in sequence
   * DRY: Reuses single action execution
   */
  async executeActions(actions: AgentAction[]): Promise<void> {
    if (!Array.isArray(actions)) {
      throw new Error('Actions must be an array');
    }

    if (actions.length === 0) {
      LoggingUtils.logInfo('📝 No actions to execute');
      return;
    }

    LoggingUtils.logInfo(`🚀 Executing ${actions.length} actions in sequence`);
    
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      try {
        LoggingUtils.logInfo(`📋 Action ${i + 1}/${actions.length}: ${action.type}`);
        await this.executeAction(action);
      } catch (error) {
        LoggingUtils.logError(`❌ Failed at action ${i + 1}/${actions.length}`, error);
        throw new Error(`Action sequence failed at step ${i + 1}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    LoggingUtils.logInfo(`✅ All ${actions.length} actions completed successfully`);
  }
  
  private async _createFile(filePath: string, content: string): Promise<void> {
    LoggingUtils.logInfo(`📝 Creating file: ${filePath}`);
    this._updateUI(`Creating file: ${filePath}`);
    
    try {
      if (!(window as any).electronAPI) {
        throw new Error("Electron API not available");
      }
      
      // Validate file path
      if (!filePath || filePath.trim() === '') {
        throw new Error('Invalid file path provided');
      }
      
      // Ensure content is properly formatted
      const sanitizedContent = this._sanitizeContent(content);
      
      // Use the specific file system method from IPC handlers
      const result = await (window as any).electronAPI.invoke('fs-write-file', filePath, sanitizedContent);
      
      if (result.success) {
        LoggingUtils.logInfo(`✅ File created successfully: ${filePath}`);
        LoggingUtils.logInfo(`📄 Content length: ${sanitizedContent.length} characters`);
        this._updateUI(`✅ Created: ${filePath}`);
      } else {
        throw new Error(result.error || 'Unknown error creating file');
      }
    } catch (error) {
      LoggingUtils.logError(`❌ Failed to create file: ${filePath}`, error);
      this._updateUI(`❌ Failed to create: ${filePath}`);
      throw error;
    }
  }
  
  private async _editFile(filePath: string, content: string): Promise<void> {
    LoggingUtils.logInfo(`✏️ Editing file: ${filePath}`);
    this._updateUI(`Editing file: ${filePath}`);
    
    try {
      if (!(window as any).electronAPI) {
        throw new Error("Electron API not available");
      }
      
      // Check if file exists first using available API
      const fileInfo = await (window as any).electronAPI.getFileInfo?.(filePath);
      if (!fileInfo?.success || fileInfo.info?.isDirectory) {
        throw new Error(`File not found or is directory: ${filePath}`);
      }
      
      // Use the specific file system method from IPC handlers
      const result = await (window as any).electronAPI.invoke('fs-write-file', filePath, content);
      
      if (result.success) {
        LoggingUtils.logInfo(`✅ File edited successfully: ${filePath}`);
        LoggingUtils.logInfo(`📄 New content length: ${content.length} characters`);
        this._updateUI(`✅ Edited: ${filePath}`);
      } else {
        throw new Error(result.error || 'Unknown error editing file');
      }
    } catch (error) {
      LoggingUtils.logError(`❌ Failed to edit file: ${filePath}`, error);
      this._updateUI(`❌ Failed to edit: ${filePath}`);
      throw error;
    }
  }
  
  private async _deleteFile(filePath: string): Promise<void> {
    LoggingUtils.logInfo(`🗑️ [DEBUG] Starting file deletion: ${filePath}`);
    this._updateUI(`Deleting file: ${filePath}`);
    
    try {
      // Debug: Check Electron API availability
      LoggingUtils.logInfo(`🔍 [DEBUG] Checking Electron API availability...`);
      if (!(window as any).electronAPI) {
        throw new Error("Electron API not available");
      }
      LoggingUtils.logInfo(`✅ [DEBUG] Electron API available`);
      
      // Debug: Resolve absolute path
      const absolutePath = this._resolveTargetPath(filePath);
      LoggingUtils.logInfo(`📍 [DEBUG] Resolved path: ${filePath} -> ${absolutePath}`);
      
      // Debug: Check if file exists first
      LoggingUtils.logInfo(`🔍 [DEBUG] Checking file existence: ${absolutePath}`);
      const fileInfo = await (window as any).electronAPI.getFileInfo?.(absolutePath);
      LoggingUtils.logInfo(`📋 [DEBUG] File info result: ${JSON.stringify(fileInfo)}`);
      
      if (!fileInfo?.success) {
        throw new Error(`File not found: ${absolutePath} - ${fileInfo?.error || 'No file info'}`);
      }
      
      if (fileInfo.info?.isDirectory) {
        throw new Error(`Cannot delete directory as file: ${absolutePath}`);
      }
      
      // Debug: Show file details before deletion
      LoggingUtils.logInfo(`⚠️ [DEBUG] Deleting file (be careful):`);
      LoggingUtils.logInfo(`   📁 Path: ${absolutePath}`);
      LoggingUtils.logInfo(`   📊 Size: ${fileInfo.info?.size || 'unknown'} bytes`);
      LoggingUtils.logInfo(`   📅 Modified: ${fileInfo.info?.mtime || 'unknown'}`);
      
      // Debug: Call deletion via IPC
      LoggingUtils.logInfo(`🔧 [DEBUG] Calling fs-delete-file IPC handler...`);
      const result = await (window as any).electronAPI.invoke('fs-delete-file', absolutePath);
      LoggingUtils.logInfo(`📋 [DEBUG] Deletion result: ${JSON.stringify(result)}`);
      
      if (result.success) {
        LoggingUtils.logInfo(`✅ [DEBUG] File deleted successfully: ${absolutePath}`);
        this._updateUI(`✅ Deleted: ${filePath}`);
      } else {
        throw new Error(result.error || 'Unknown error deleting file');
      }
    } catch (error) {
      LoggingUtils.logError(`❌ [DEBUG] Failed to delete file: ${filePath}`, error);
      LoggingUtils.logError(`❌ [DEBUG] Error details: ${JSON.stringify({
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        filePath,
        workspaceRoot: this.workspaceRoot
      })}`);
      this._updateUI(`❌ Failed to delete: ${filePath}`);
      throw error;
    }
  }
  
  private async _readFile(filePath: string, action?: AgentAction): Promise<string> {
    LoggingUtils.logInfo(`📖 Reading file: ${filePath}`);
    this._updateUI(`Reading file: ${filePath}`);
    
    try {
      if (!(window as any).electronAPI) {
        throw new Error("Electron API not available");
      }
      
      // Validate file path
      if (!filePath || filePath.trim() === '') {
        throw new Error('Invalid file path provided');
      }
      
      // Use the specific file system method from IPC handlers
      const result = await (window as any).electronAPI.invoke('fs-read-file', filePath);
      
      if (result.success) {
        LoggingUtils.logInfo(`✅ File read successfully: ${filePath}`);
        LoggingUtils.logInfo(`📋 Content preview: ${result.content.substring(0, 200)}${result.content.length > 200 ? '...' : ''}`);
        LoggingUtils.logInfo(`📊 File size: ${result.size} characters`);
        this._updateUI(`✅ Read: ${filePath} (${result.size} chars)`);
        
        // Store the read content in the action for response building
        if (action) {
          action.readContent = result.content;
          LoggingUtils.logInfo(`💾 [DEBUG] Stored readContent in action: ${result.content.substring(0, 100)}...`);
        } else {
          LoggingUtils.logWarning(`⚠️ [DEBUG] No action provided to store readContent!`);
        }
        
        // Return the content
        return result.content;
      } else {
        throw new Error(result.error || 'Unknown error reading file');
      }
    } catch (error) {
      LoggingUtils.logError(`❌ Failed to read file: ${filePath}`, error);
      this._updateUI(`❌ Failed to read: ${filePath}`);
      throw error;
    }
  }
  
  private async _executeCommand(command: string, workingDir?: string): Promise<void> {
    if (!command || command.trim() === '') {
      throw new Error('Command cannot be empty');
    }

    LoggingUtils.logInfo(`⚡ Executing command: ${command}`);
    if (workingDir) {
      LoggingUtils.logInfo(`📁 Working directory: ${workingDir}`);
    }
    this._updateUI(`Executing: ${command}`);
    
    try {
      if (!(window as any).electronAPI) {
        throw new Error("Electron API not available");
      }
      
      // Enhanced security check for dangerous commands
      const dangerousPatterns = [
        'rm -rf', 'del /f', 'format', 'mkfs', 'dd if=', 'sudo rm', 'rmdir /s',
        'shutdown', 'reboot', 'halt', 'poweroff', 'init 0', 'init 6',
        'chmod 777', 'chown root', 'passwd', 'su -', 'sudo su',
        '> /dev/', 'curl.*|.*sh', 'wget.*|.*sh', 'eval', 'exec'
      ];
      
      const isDangerous = dangerousPatterns.some(pattern => {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'), 'i');
        return regex.test(command);
      });
      
      if (isDangerous) {
        LoggingUtils.logWarning(`⚠️ Potentially dangerous command detected: ${command}`);
        LoggingUtils.logWarning(`🚫 Command execution blocked for safety`);
        this._updateUI(`🚫 Dangerous command blocked: ${command}`);
        throw new Error(`Dangerous command blocked for security: ${command}`);
      }
      
      // Resolve working directory
      const resolvedWorkingDir = workingDir ? this._resolveTargetPath(workingDir) : this.workspaceRoot;
      
      // Use the specific shell execution method from IPC handlers
      const result = await (window as any).electronAPI.invoke('shell-execute', command, resolvedWorkingDir);
      
      if (result.success) {
        LoggingUtils.logInfo(`✅ Command executed successfully: ${command}`);
        if (result.stdout) {
          LoggingUtils.logInfo(`📤 STDOUT: ${result.stdout.substring(0, 500)}${result.stdout.length > 500 ? '...' : ''}`);
        }
        this._updateUI(`✅ Executed: ${command}`);
      } else {
        LoggingUtils.logWarning(`⚠️ Command failed with code ${result.code}: ${command}`);
        if (result.stderr) {
          LoggingUtils.logWarning(`📥 STDERR: ${result.stderr.substring(0, 500)}${result.stderr.length > 500 ? '...' : ''}`);
        }
        this._updateUI(`⚠️ Command failed: ${command}`);
        throw new Error(`Command failed with code ${result.code}: ${result.stderr || 'Unknown error'}`);
      }
    } catch (error) {
      LoggingUtils.logError(`❌ Failed to execute command: ${command}`, error);
      this._updateUI(`❌ Failed to execute: ${command}`);
      throw error;
    }
  }
  
  private async _searchFiles(query: string, searchPath?: string): Promise<void> {
    LoggingUtils.logInfo(`🔍 Searching files for: ${query}`);
    this._updateUI(`Searching: ${query}`);
    
    try {
      if (!(window as any).electronAPI) {
        throw new Error("Electron API not available");
      }
      
      // Use provided path, workspace root, or default to current directory
      const basePath = searchPath || this.workspaceRoot || process.cwd();
      const supportedExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.md', '.txt', '.json', '.html', '.css'];
      
      LoggingUtils.logInfo(`🔍 Searching in: ${basePath}`);
      LoggingUtils.logInfo(`📝 Extensions: ${supportedExtensions.join(', ')}`);
      
      // Validate search path exists
      if (!basePath) {
        throw new Error('No valid search path available');
      }
      
      // Use the specific file search method from IPC handlers
      const result = await (window as any).electronAPI.invoke('search-files', basePath, query, supportedExtensions);
      
      if (result.success) {
        LoggingUtils.logInfo(`✅ Search completed: found ${result.results.length} files with matches`);
        
        // Log top results
        result.results.slice(0, 5).forEach((fileResult: any, index: number) => {
          LoggingUtils.logInfo(`📄 [${index + 1}] ${fileResult.path} (${fileResult.matches} matches)`);
        });
        
        this._updateUI(`✅ Search completed: ${result.results.length} files found`);
      } else {
        throw new Error(result.error || 'Unknown error searching files');
      }
    } catch (error) {
      LoggingUtils.logError(`❌ Failed to search files: ${query}`, error);
      this._updateUI(`❌ Search failed: ${query}`);
      throw error;
    }
  }
  
  /**
   * Resolve target path relative to workspace root
   * Enhanced with better path validation and security checks
   */
  private _resolveTargetPath(target: string): string {
    if (!target || target.trim() === '') {
      throw new Error('Target path cannot be empty');
    }

    const cleanTarget = target.trim();
    
    // Security check: prevent path traversal attacks
    if (cleanTarget.includes('..') || cleanTarget.includes('~')) {
      LoggingUtils.logWarning(`⚠️ Potentially unsafe path detected: ${cleanTarget}`);
      // Allow but log for monitoring
    }
    
    // If path is already absolute, validate and return
    if (path.isAbsolute(cleanTarget)) {
      return path.normalize(cleanTarget);
    }
    
    // If workspace root is available, resolve relative to it
    if (this.workspaceRoot) {
      const resolved = path.resolve(this.workspaceRoot, cleanTarget);
      
      // Security check: ensure resolved path is within workspace
      if (!resolved.startsWith(this.workspaceRoot)) {
        LoggingUtils.logWarning(`⚠️ Path resolves outside workspace: ${resolved}`);
        // Allow but log for monitoring
      }
      
      return path.normalize(resolved);
    }
    
    // If no workspace root, resolve relative to current working directory
    const resolved = path.resolve(process.cwd(), cleanTarget);
    LoggingUtils.logInfo(`📁 Resolved path without workspace root: ${resolved}`);
    return path.normalize(resolved);
  }
  
  /**
   * Sanitize content for file writing
   * Enhanced with better validation and encoding handling
   * CRITICAL: Converts literal \n sequences to actual line breaks for CSV files
   */
  private _sanitizeContent(content: string): string {
    if (content === null || content === undefined) {
      return '';
    }
    
    if (typeof content !== 'string') {
      LoggingUtils.logWarning(`⚠️ Content is not a string, converting: ${typeof content}`);
      content = String(content);
    }
    
    // 🔧 CRITICAL FIX: Convert literal \n sequences to actual line breaks (LLM sends literal \n)
    content = content.replace(/\\n/g, '\n');
    
    // Normalize line endings to platform-specific
    let normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Convert to platform-specific line endings
    if (process.platform === 'win32') {
      normalized = normalized.replace(/\n/g, '\r\n');
    }
    
    // Remove null bytes and other control characters that might cause issues
    normalized = normalized.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Ensure content doesn't exceed reasonable size (10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (normalized.length > maxSize) {
      LoggingUtils.logWarning(`⚠️ Content size (${normalized.length}) exceeds maximum (${maxSize}), truncating`);
      normalized = normalized.substring(0, maxSize);
    }
    
    return normalized;
  }
  
  /**
   * Update UI with current action status
   * Enhanced with better error handling and service integration
   */
  private _updateUI(message: string): void {
    try {
      // Use injected UI service if available
      if (this.uiService && typeof this.uiService.updateUI === 'function') {
        this.uiService.updateUI({ status: message });
      }
      
      // Fallback to global status update function
      if (typeof window !== "undefined" && (window as any).__updateProcessingStatus) {
        (window as any).__updateProcessingStatus(message);
      }
    } catch (error) {
      // Don't throw on UI update failures, just log
      LoggingUtils.logWarning(`⚠️ Failed to update UI: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get current workspace root
   */
  getWorkspaceRoot(): string | null {
    return this.workspaceRoot;
  }

  /**
   * Check if workspace is initialized
   */
  isWorkspaceInitialized(): boolean {
    return this.workspaceRoot !== null && this.workspaceRoot.trim() !== '';
  }
}
