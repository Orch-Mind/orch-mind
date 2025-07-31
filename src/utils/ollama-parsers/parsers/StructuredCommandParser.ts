// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { IToolCallParser, ToolCall } from "../interfaces/IToolCallParser";

/**
 * Parser para comandos estruturados do Agent Universal
 * Detecta comandos no formato: CREATE FILE: path, EDIT FILE: path, etc.
 * 
 * SRP: Responsável apenas por parsing de comandos estruturados
 * KISS: Patterns simples e diretos
 */
export class StructuredCommandParser implements IToolCallParser {
  readonly formatName = "Structured Command";

  canParse(content: string): boolean {
    if (!content || typeof content !== "string") return false;

    // Verifica se contém comandos estruturados
    const patterns = [
      /CREATE FILE:\s*(.+)/i,
      /EDIT FILE:\s*(.+)/i,  
      /DELETE FILE:\s*(.+)/i,
      /READ FILE:\s*(.+)/i,
      /EXECUTE:\s*(.+)/i,
      /SEARCH:\s*(.+)/i
    ];

    return patterns.some(pattern => pattern.test(content));
  }

  parse(content: string): ToolCall[] {
    const toolCalls: ToolCall[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // CREATE FILE: path
      const createMatch = line.match(/CREATE FILE:\s*(.+)/i);
      if (createMatch) {
        const path = createMatch[1].trim();
        const content = this.extractFileContent(lines, i + 1);
        
        toolCalls.push({
          type: "function",
          function: {
            name: "createFile",
            arguments: JSON.stringify({
              path: path,
              content: content || ""
            })
          }
        });
        continue;
      }

      // EDIT FILE: path  
      const editMatch = line.match(/EDIT FILE:\s*(.+)/i);
      if (editMatch) {
        const path = editMatch[1].trim();
        const content = this.extractFileContent(lines, i + 1);
        
        toolCalls.push({
          type: "function",
          function: {
            name: "editFile", 
            arguments: JSON.stringify({
              path: path,
              content: content || ""
            })
          }
        });
        continue;
      }

      // DELETE FILE: path
      const deleteMatch = line.match(/DELETE FILE:\s*(.+)/i);
      if (deleteMatch) {
        const path = deleteMatch[1].trim();
        
        toolCalls.push({
          type: "function",
          function: {
            name: "deleteFile",
            arguments: JSON.stringify({
              path: path
            })
          }
        });
        continue;
      }

      // READ FILE: path
      const readMatch = line.match(/READ FILE:\s*(.+)/i);
      if (readMatch) {
        const path = readMatch[1].trim();
        
        toolCalls.push({
          type: "function",
          function: {
            name: "readFile",
            arguments: JSON.stringify({
              path: path
            })
          }
        });
        continue;
      }

      // EXECUTE: command
      const executeMatch = line.match(/EXECUTE:\s*(.+)/i);
      if (executeMatch) {
        const command = executeMatch[1].trim();
        let workingDirectory = "";
        
        // Procurar por Working Directory na próxima linha
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          const workingDirMatch = nextLine.match(/Working Directory:\s*(.+)/i);
          if (workingDirMatch) {
            workingDirectory = workingDirMatch[1].trim();
          }
        }
        
        toolCalls.push({
          type: "function",
          function: {
            name: "executeCommand",
            arguments: JSON.stringify({
              command: command,
              workingDirectory: workingDirectory || undefined
            })
          }
        });
        continue;
      }

      // SEARCH: query
      const searchMatch = line.match(/SEARCH:\s*(.+)/i);
      if (searchMatch) {
        const query = searchMatch[1].trim();
        
        toolCalls.push({
          type: "function",
          function: {
            name: "searchFiles",
            arguments: JSON.stringify({
              query: query
            })
          }
        });
        continue;
      }
    }

    if (toolCalls.length > 0) {
      console.log(`[${this.formatName}] Parsed ${toolCalls.length} structured commands`);
    }

    return toolCalls;
  }

  /**
   * Extrai conteúdo do arquivo das linhas seguintes
   * Procura por bloco ```...``` após "Content:"
   */
  private extractFileContent(lines: string[], startIndex: number): string | null {
    let contentFound = false;
    let inCodeBlock = false;
    let content = "";

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Procurar por "Content:"
      if (!contentFound && line.match(/Content:\s*$/i)) {
        contentFound = true;
        continue;
      }
      
      if (!contentFound) continue;
      
      // Início do bloco de código
      if (!inCodeBlock && line.match(/^```/)) {
        inCodeBlock = true;
        continue;
      }
      
      // Fim do bloco de código
      if (inCodeBlock && line.match(/^```/)) {
        break;
      }
      
      // Adicionar linha do conteúdo
      if (inCodeBlock) {
        content += (content ? '\n' : '') + lines[i]; // Usar linha original sem trim
      }
    }

    return content || null;
  }
}
