// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * Agent operation mode - Universal agent that handles all operations
 * Works like Cursor/Windsurf for any file in the selected workspace
 */
export const AGENT_MODE = "universal" as const;
export type AgentMode = typeof AGENT_MODE;

/**
 * File type categories for processing
 */
export enum FileType {
  DOCUMENT = "document",     // .txt, .md, .rtf
  SPREADSHEET = "spreadsheet", // .xlsx, .csv
  CODE = "code",            // .ts, .js, .py, .html, .css, etc.  
  DATA = "data",            // .json, .xml, .yaml
  MEDIA = "media",          // .pdf, .docx (requires OCR/parsing)
  UNKNOWN = "unknown"
}

/**
 * Agent action types
 */
export interface AgentAction {
  type: 'create' | 'edit' | 'delete' | 'execute' | 'search';
  target: string;
  content?: string;
  workingDir?: string;
}

/**
 * Agent response structure
 */
export interface AgentResponse {
  response: string;
  actions?: AgentAction[];
  filesModified?: string[];
  suggestions?: string[];
}

/**
 * Individual file in workspace
 */
export interface WorkspaceFile {
  path: string;
  name: string;
  type: FileType;
  size: number;
  lastModified: Date;
  summary?: string;
  content?: string;
}

/**
 * Directory structure representation
 */
export interface DirectoryStructure {
  [key: string]: DirectoryStructure | WorkspaceFile;
}

/**
 * Workspace context information
 */
export interface WorkspaceContext {
  rootPath: string;
  files: WorkspaceFile[];
  structure: DirectoryStructure;
  languages: string[];
  frameworks: string[];
  metadata: WorkspaceMetadata;
}

/**
 * Workspace metadata
 */
export interface WorkspaceMetadata {
  totalFiles: number;
  totalSize: number;
  languages: string[];
  frameworks: string[];
  lastIndexed: string;
}
