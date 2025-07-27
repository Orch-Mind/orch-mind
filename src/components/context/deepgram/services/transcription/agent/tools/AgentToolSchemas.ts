// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { IFunctionDefinition } from "../../../../interfaces/function-calling/IFunctionDefinition";

/**
 * Agent Tool Schemas - OpenAI Function Calling Definitions
 * Following app pattern: use tools instead of text parsing for reliable action extraction
 */
export class AgentToolSchemas {
  
  /**
   * Create File Tool Schema
   */
  static getCreateFileSchema(): IFunctionDefinition {
    return {
      name: "createFile",
      description: "Create a new file in the workspace with specified content",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "File path relative to workspace root (e.g., 'components/Button.tsx', 'docs/readme.md')"
          },
          content: {
            type: "string",
            description: "Complete file content to write"
          }
        },
        required: ["path", "content"]
      }
    };
  }

  /**
   * Edit File Tool Schema
   */
  static getEditFileSchema(): IFunctionDefinition {
    return {
      name: "editFile",
      description: "Edit an existing file by replacing its content entirely",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "File path relative to workspace root"
          },
          content: {
            type: "string",
            description: "New complete file content to replace the existing content"
          }
        },
        required: ["path", "content"]
      }
    };
  }

  /**
   * Delete File Tool Schema
   */
  static getDeleteFileSchema(): IFunctionDefinition {
    return {
      name: "deleteFile",
      description: "Delete a file from the workspace",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "File path relative to workspace root to delete"
          }
        },
        required: ["path"]
      }
    };
  }

  /**
   * Execute Command Tool Schema
   */
  static getExecuteCommandSchema(): IFunctionDefinition {
    return {
      name: "executeCommand",
      description: "Execute a shell command in the workspace",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "Shell command to execute (e.g., 'npm install', 'git status', 'python script.py')"
          },
          workingDirectory: {
            type: "string",
            description: "Optional working directory relative to workspace root. If not specified, uses workspace root."
          }
        },
        required: ["command"]
      }
    };
  }

  /**
   * Search Files Tool Schema
   */
  static getSearchFilesSchema(): IFunctionDefinition {
    return {
      name: "searchFiles",
      description: "Search for files in the workspace using a query",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query to find files (can be filename, content, or pattern)"
          },
          fileType: {
            type: "string",
            description: "Optional file type filter (e.g., '.js', '.ts', '.md')"
          }
        },
        required: ["query"]
      }
    };
  }

  /**
   * Get all agent tool schemas
   */
  static getAllSchemas(): IFunctionDefinition[] {
    return [
      this.getCreateFileSchema(),
      this.getEditFileSchema(),
      this.getDeleteFileSchema(),
      this.getExecuteCommandSchema(),
      this.getSearchFilesSchema()
    ];
  }

  /**
   * Register all agent schemas in the FunctionSchemaRegistry
   */
  static registerAllSchemas(): void {
    const { FunctionSchemaRegistry } = require("../../../services/function-calling/FunctionSchemaRegistry");
    const registry = FunctionSchemaRegistry.getInstance();
    
    const schemas = this.getAllSchemas();
    schemas.forEach(schema => {
      registry.register(schema.name, schema);
    });
  }
}
