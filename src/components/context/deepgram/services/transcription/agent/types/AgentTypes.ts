// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

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
  type: 'create' | 'edit' | 'delete' | 'execute' | 'search' | 'read';
  target: string;
  content?: string;
  workingDir?: string;
  readContent?: string; // Content read from file for 'read' actions
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
