// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { LoggingUtils } from "../../../../utils/LoggingUtils";
import {
  WorkspaceContext,
  WorkspaceFile,
  WorkspaceMetadata,
  DirectoryStructure,
  FileType
} from "../types/AgentTypes";

/**
 * Context Engine - Manages workspace indexing and context building
 * Follows SRP: Single responsibility for workspace context management
 */
export class ContextEngine {
  
  /**
   * Index workspace files and build context
   * KISS: Simple, focused method for workspace indexing
   */
  async indexWorkspace(path: string): Promise<WorkspaceContext> {
    try {
      LoggingUtils.logInfo(`📂 Indexing workspace: ${path}`);
      
      if (!(window as any).electronAPI?.readDirectory) {
        throw new Error("Electron file system API not available");
      }

      const dirInfo = await (window as any).electronAPI.readDirectory(path);
      const files: WorkspaceFile[] = [];
      const directories: string[] = [];
      const mainFiles: string[] = [];
      const configFiles: string[] = [];
      const languages = new Set<string>();
      const frameworks = new Set<string>();

      // Process files (DRY: single loop for all processing)
      for (const file of dirInfo.files || []) {
        if (file.isDirectory) {
          directories.push(file.name);
          continue;
        }

        const fileType = this._detectFileType(file.name);
        const language = this._detectLanguage(file.name);
        const framework = this._detectFramework(file.name);
        
        if (language) languages.add(language);
        if (framework) frameworks.add(framework);
        
        const workspaceFile: WorkspaceFile = {
          path: file.path,
          name: file.name,
          type: fileType,
          size: file.size || 0,
          lastModified: new Date(file.updatedAt || Date.now())
        };
        
        // Read content for small text files (YAGNI: only when needed)
        if (this._shouldReadContent(fileType, workspaceFile.size)) {
          try {
            // TODO: Implement file content reading via Electron API
            LoggingUtils.logInfo(`📄 Reading content for: ${file.name}`);
          } catch (error) {
            LoggingUtils.logWarning(`⚠️ Could not read file content: ${file.name}`);
          }
        }
        
        files.push(workspaceFile);
        
        // Categorize files
        if (this._isMainFile(file.name)) mainFiles.push(file.name);
        if (this._isConfigFile(file.name)) configFiles.push(file.name);
      }
      
      const metadata: WorkspaceMetadata = {
        totalFiles: files.length,
        totalSize: files.reduce((sum, f) => sum + f.size, 0),
        languages: Array.from(languages),
        frameworks: Array.from(frameworks),
        lastIndexed: new Date().toISOString()
      };
      
      const structure: DirectoryStructure = {
        ...directories.reduce((acc, dir) => ({ ...acc, [dir]: {} }), {}),
        ...files.reduce((acc, file) => ({ ...acc, [file.name]: file }), {})
      };
      
      LoggingUtils.logInfo(`✅ Workspace indexed: ${files.length} files, ${directories.length} directories`);
      
      return {
        rootPath: path,
        files,
        structure,
        languages: metadata.languages,
        frameworks: metadata.frameworks,
        metadata
      };
      
    } catch (error) {
      LoggingUtils.logError("❌ Workspace indexing failed", error);
      throw error;
    }
  }
  
  /**
   * Build relevant context for a query
   * KISS: Simple relevance scoring
   */
  buildRelevantContext(query: string, workspace: WorkspaceContext): string {
    const relevantFiles = this._findRelevantFiles(query, workspace.files);
    
    if (relevantFiles.length === 0) {
      return `Workspace: ${workspace.rootPath}\nTotal files: ${workspace.metadata.totalFiles}\nLanguages: ${workspace.metadata.languages.join(', ')}`;
    }
    
    const context = [`## Workspace: ${workspace.rootPath}`, ''];
    
    context.push('### Relevant Files:');
    relevantFiles.forEach(file => {
      context.push(`- ${file.name} (${file.type}) - ${this._formatFileSize(file.size)}`);
      if (file.summary) {
        context.push(`  Summary: ${file.summary}`);
      }
    });
    
    context.push('', '### Project Info:');
    context.push(`- Languages: ${workspace.metadata.languages.join(', ')}`);
    context.push(`- Frameworks: ${workspace.metadata.frameworks.join(', ')}`);
    
    return context.join('\n');
  }
  
  private _findRelevantFiles(query: string, files: WorkspaceFile[]): WorkspaceFile[] {
    const queryLower = query.toLowerCase();
    const keywords = queryLower.split(' ').filter(word => word.length > 2);
    
    return files
      .filter(file => {
        const fileName = file.name.toLowerCase();
        const filePath = file.path.toLowerCase();
        
        return keywords.some(keyword => 
          fileName.includes(keyword) || 
          filePath.includes(keyword) ||
          file.type.toString().includes(keyword)
        );
      })
      .slice(0, 10); // Limit to top 10 relevant files
  }
  
  private _detectFileType(fileName: string): FileType {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    
    // Code files
    if (['ts', 'js', 'tsx', 'jsx', 'py', 'java', 'cpp', 'c', 'h', 'cs', 'php', 'rb', 'go', 'rs', 'kt', 'swift'].includes(ext)) {
      return FileType.CODE;
    }
    
    // Markup and styles
    if (['html', 'htm', 'css', 'scss', 'sass', 'less'].includes(ext)) {
      return FileType.CODE;
    }
    
    // Documents
    if (['txt', 'md', 'markdown', 'rtf'].includes(ext)) {
      return FileType.DOCUMENT;
    }
    
    // Data files
    if (['json', 'xml', 'yaml', 'yml', 'toml', 'ini', 'env'].includes(ext)) {
      return FileType.DATA;
    }
    
    // Spreadsheets
    if (['csv', 'xlsx', 'xls'].includes(ext)) {
      return FileType.SPREADSHEET;
    }
    
    // Media files
    if (['pdf', 'docx', 'doc', 'pptx', 'ppt'].includes(ext)) {
      return FileType.MEDIA;
    }
    
    return FileType.UNKNOWN;
  }
  
  private _detectLanguage(fileName: string): string | null {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    
    const languageMap: Record<string, string> = {
      'ts': 'TypeScript', 'tsx': 'TypeScript',
      'js': 'JavaScript', 'jsx': 'JavaScript',
      'py': 'Python',
      'java': 'Java',
      'cpp': 'C++', 'c': 'C', 'h': 'C/C++',
      'cs': 'C#',
      'php': 'PHP',
      'rb': 'Ruby',
      'go': 'Go',
      'rs': 'Rust',
      'kt': 'Kotlin',
      'swift': 'Swift'
    };
    
    return languageMap[ext] || null;
  }
  
  private _detectFramework(fileName: string): string | null {
    const name = fileName.toLowerCase();
    
    if (name.includes('package.json')) return 'Node.js';
    if (name.includes('requirements.txt')) return 'Python';
    if (name.includes('cargo.toml')) return 'Rust';
    if (name.includes('pom.xml')) return 'Maven';
    if (name.includes('build.gradle')) return 'Gradle';
    
    return null;
  }
  
  private _isMainFile(fileName: string): boolean {
    const mainFiles = ['index', 'main', 'app', 'server', 'client'];
    const baseName = fileName.split('.')[0].toLowerCase();
    return mainFiles.includes(baseName);
  }
  
  private _isConfigFile(fileName: string): boolean {
    const configPatterns = ['config', 'settings', '.env', 'docker', 'package.json', 'tsconfig', 'webpack'];
    const name = fileName.toLowerCase();
    return configPatterns.some(pattern => name.includes(pattern));
  }
  
  private _shouldReadContent(fileType: FileType, size: number): boolean {
    // YAGNI: Only read small text files
    return fileType !== FileType.MEDIA && size < 100000; // 100KB limit
  }
  
  private _formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
