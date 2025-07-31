// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { LoggingUtils } from "../../../utils/LoggingUtils";
import { buildSimpleUserPrompt } from "../../../../../../shared/utils/neuralPromptBuilder";
import { FunctionSchemaRegistry } from "../../../services/function-calling/FunctionSchemaRegistry";
import { getOption, STORAGE_KEYS } from "./../../../../../../services/StorageService";

// Service interfaces
import { IMemoryService } from "../../../interfaces/memory/IMemoryService";
import { IOpenAIService } from "../../../interfaces/openai/IOpenAIService";
import { ITranscriptionStorageService } from "../../../interfaces/transcription/ITranscriptionStorageService";
import { ISpeakerIdentificationService } from "../../../interfaces/utils/ISpeakerIdentificationService";
import { IUIUpdateService } from "../../../interfaces/utils/IUIUpdateService";

// Refactored components (SRP: Single Responsibility Principle)
import { 
  AgentAction,
  AgentResponse, 
  WorkspaceContext 
} from "./types/AgentTypes";
import { ContextEngine } from "./workspace/ContextEngine";
import { ActionExecutor } from "./execution/ActionExecutor";
import { AgentMemoryManager } from "./memory/AgentMemoryManager";
import { ResponseProcessor } from "./core/ResponseProcessor";
import { WebSearchAdapter } from "./core/WebSearchAdapter";

/**
 * Agent Prompt Processor - Universal IDE Agent (Refactored)
 * Follows SOLID principles: SRP, DRY, KISS, YAGNI
 * 
 * This class now serves as an orchestrator, delegating specific
 * responsibilities to specialized components.
 */
export class AgentPromptProcessor {
  private isProcessing: boolean = false;
  private currentLanguage: string;
  private workspaceContext: WorkspaceContext | null = null;
  
  // Specialized components (SRP: each handles one responsibility)
  private contextEngine!: ContextEngine;
  private actionExecutor!: ActionExecutor;
  private memoryManager!: AgentMemoryManager;
  private responseProcessor!: ResponseProcessor;
  private webSearchAdapter!: WebSearchAdapter;

  constructor(
    private storageService: ITranscriptionStorageService,
    private memoryService: IMemoryService,
    private llmService: IOpenAIService,
    private uiService: IUIUpdateService,
    private speakerService: ISpeakerIdentificationService
  ) {
    // KISS: Simple initialization
    this.currentLanguage = getOption<string>(STORAGE_KEYS.DEEPGRAM_LANGUAGE) || "pt-BR";
    
    this._initializeComponents();
  }

  /**
   * Initialize all specialized components
   * DRY: Single initialization point
   */
  private _initializeComponents(): void {
    this.contextEngine = new ContextEngine();
    this.actionExecutor = new ActionExecutor(this.uiService);
    this.memoryManager = new AgentMemoryManager(this.memoryService);
    this.responseProcessor = new ResponseProcessor();
    this.webSearchAdapter = new WebSearchAdapter(this.llmService, this.uiService);
  }

  /**
   * Initialize workspace context from selected folder
   * SRP: Delegates to ContextEngine and configures ActionExecutor
   */
  async initializeWorkspace(workspacePath: string): Promise<void> {
    try {
      LoggingUtils.logInfo(`🚀 Initializing workspace: ${workspacePath}`);
      
      // Index workspace context
      this.workspaceContext = await this.contextEngine.indexWorkspace(workspacePath);
      
      // Configure ActionExecutor with workspace root
      this.actionExecutor.setWorkspaceRoot(workspacePath);
      
      LoggingUtils.logInfo("✅ Workspace initialized successfully");
    } catch (error) {
      LoggingUtils.logError("❌ Workspace initialization failed", error);
      throw error;
    }
  }

  /**
   * Process user message with agent capabilities
   * KISS: Simple orchestration of components
   */
  async processAgentMessage(
    message: string,
    temporaryContext?: string,
    conversationMessages?: any[]
  ): Promise<AgentResponse> {
    // YAGNI: Simple processing guard
    if (this.isProcessing) {
      LoggingUtils.logWarning("⚠️ Agent already processing a request");
      throw new Error("Agent is already processing a request");
    }

    // Check for workspace changes dynamically (like SimplePromptProcessor)
    await this._checkAndUpdateWorkspace();

    this.isProcessing = true;
    
    // Notify processing start (like SimplePromptProcessor)
    this._updateStatus("⚡ Processing...");
    this.uiService.notifyPromptProcessingStarted?.(temporaryContext);
    
    try {
      // Ensure LLM service is available
      if (!(await this.llmService.ensureOpenAIClient())) {
        throw new Error("LLM service not available");
      }

      // Execute agent completion
      const result = await this._executeAgentCompletion(message, temporaryContext, conversationMessages);
      
      LoggingUtils.logInfo(`🔍 [DEBUG] Agent completion result: hasResponse=${!!result.response}, actionCount=${result.actions?.length || 0}, actions=${JSON.stringify(result.actions?.map(a => ({ type: a.type, target: a.target })) || [])}`);
      
      // Always execute actions automatically (Universal Agent)
      if (result.actions?.length) {
        LoggingUtils.logInfo(`🎯 [DEBUG] Executing ${result.actions.length} actions: ${JSON.stringify(result.actions)}`);
        await this.actionExecutor.executeActions(result.actions);
        LoggingUtils.logInfo(`✅ [DEBUG] Actions execution completed`);
        
        // CRITICAL: Reconstruct response AFTER actions are executed
        const finalResponse = this._buildFinalResponse(result.actions);
        LoggingUtils.logInfo(`🔧 [DEBUG] Final response reconstructed with action results: ${finalResponse.substring(0, 150)}...`);
        result.response = finalResponse;
      } else {
        LoggingUtils.logWarning(`⚠️ [DEBUG] No actions found in agent response. Response: ${result.response?.substring(0, 200)}...`);
      }

      // Update UI and notify completion
      this.uiService.updateUI({ aiResponse: result.response });
      this._updateStatus("✅ Agent processing complete");
      this.uiService.notifyPromptComplete?.(result.response);

      return result;

    } catch (error) {
      LoggingUtils.logError("❌ Agent processing failed", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      this._updateStatus(`❌ Error: ${errorMessage}`);
      
      // Notify error (like SimplePromptProcessor)
      this.uiService.notifyPromptError?.(errorMessage);
      
      throw error;
    } finally {
      this.isProcessing = false;
      this._clearStatus();
    }
  }

  /**
   * Execute agent completion with workspace context using Function Calling
   * SRP: Orchestrates context building and LLM interaction with tools
   */
  private async _executeAgentCompletion(
    message: string,
    temporaryContext?: string,
    conversationMessages?: any[]
  ): Promise<AgentResponse> {
    
    // Build enhanced context using specialized components (DRY)
    const workspaceContext = this.contextEngine.buildRelevantContext(message, this.workspaceContext!);
    LoggingUtils.logInfo(`📋 [AGENT-DEBUG] Workspace context built, length: ${workspaceContext.length}`);
    
    // Build system prompt for function calling
    const systemPrompt = this._buildFunctionCallingSystemPrompt();
    LoggingUtils.logInfo(`📝 [AGENT-DEBUG] System prompt built, length: ${systemPrompt.length}`);
    
    // Get conversation history for web search context (like SimplePromptProcessor)
    const conversationHistory = conversationMessages?.length 
      ? conversationMessages 
      : this.memoryManager.getConversationHistory();
    const webContext = await this.webSearchAdapter.getWebContext(message, conversationHistory);
    
    // Build message history with context
    const memoryContext = await this.memoryManager.getRelevantMemories(message);
    const messages = this._buildMessages(
      message,
      systemPrompt,
      workspaceContext,
      memoryContext, // 4th parameter: memoryContext
      webContext || '', // 5th parameter: webContext
      temporaryContext,
      conversationMessages
    );
    LoggingUtils.logInfo(`💬 [AGENT-DEBUG] Messages array built, count: ${messages.length}`);
    
    // Build tools from registry
    const tools = this._buildAgentTools();
    LoggingUtils.logInfo(`🛠️ [AGENT] Built ${tools.length} tools: ${tools.map(t => t.function.name).join(', ')}`);
    
    try {
      LoggingUtils.logInfo(`🛠️ [AGENT] Calling LLM with ${tools.length} tools available`);
      LoggingUtils.logInfo(`🔧 [AGENT-DEBUG] About to call llmService.callOpenAIWithFunctions with model: gemma3:latest`);
      
      // Use function calling - OllamaServiceFacade routes to proper Gemma3 adaptation
      const response = await this.llmService.callOpenAIWithFunctions({
        model: "gemma3:latest", // Using configured Ollama model
        messages,
        tools,
        temperature: 0.7
      });
      
      LoggingUtils.logInfo(`✅ [AGENT-DEBUG] LLM call completed, response received`);
      LoggingUtils.logInfo(`📦 [AGENT-DEBUG] Response structure: choices=${response.choices?.length}, message=${!!response.choices?.[0]?.message}, content=${!!response.choices?.[0]?.message?.content}, tool_calls=${response.choices?.[0]?.message?.tool_calls?.length || 0}`);
      LoggingUtils.logInfo(`📄 [AGENT-DEBUG] Response content preview: ${response.choices?.[0]?.message?.content?.substring(0, 100)}...`);
      
      LoggingUtils.logInfo(`📥 [AGENT] LLM response received with ${response.choices[0]?.message?.tool_calls?.length || 0} tool calls`);
      
      // Extract actions from tool calls
      const agentResponse = this._processToolCallsResponse(response, message);
      
      // Save interaction using MemoryManager (SRP)
      await this._saveInteraction(message, agentResponse, conversationMessages);
      
      return agentResponse;
      
    } catch (error) {
      LoggingUtils.logError("❌ Agent function calling failed", error);
      throw error;
    }
  }

  /**
   * Build agent tools from FunctionSchemaRegistry
   * Returns tools in OpenAI format for function calling
   */
  private _buildAgentTools(): any[] {
    const registry = FunctionSchemaRegistry.getInstance();
    const toolNames = ['createFile', 'editFile', 'deleteFile', 'readFile', 'executeCommand', 'searchFiles'];
    
    const tools: any[] = [];
    toolNames.forEach(toolName => {
      const schema = registry.get(toolName);
      if (schema) {
        tools.push({
          type: "function",
          function: schema
        });
      }
    });
    
    LoggingUtils.logInfo(`🛠️ [AGENT] Built ${tools.length} tools: ${toolNames.join(', ')}`);
    return tools;
  }

  /**
   * Build final response AFTER actions are executed
   * This ensures readContent and other action results are included
   */
  private _buildFinalResponse(actions: AgentAction[]): string {
    if (!actions || actions.length === 0) {
      return "✅ **Agente Universal - Processamento Completo**\n\n🎯 **Nenhuma ação foi necessária.**";
    }

    let finalResponse = "✅ **Agente Universal - Ações Executadas:**\n\n";
    
    actions.forEach((action, index) => {
      switch (action.type) {
        case 'create':
          finalResponse += `${index + 1}. 📝 **Criado arquivo:** \`${action.target}\`\n`;
          break;
        case 'edit':
          finalResponse += `${index + 1}. ✏️ **Editado arquivo:** \`${action.target}\`\n`;
          break;
        case 'delete':
          finalResponse += `${index + 1}. 🗑️ **Deletado arquivo:** \`${action.target}\`\n`;
          break;
        case 'execute':
          finalResponse += `${index + 1}. ⚡ **Executado comando:** \`${action.target}\`\n`;
          break;
        case 'search':
          finalResponse += `${index + 1}. 🔍 **Busca realizada:** \`${action.target}\`\n`;
          break;
        case 'read':
          finalResponse += `${index + 1}. 📖 **Arquivo lido:** \`${action.target}\`\n`;
          LoggingUtils.logInfo(`🔍 [DEBUG] Building final response for read action. readContent exists: ${!!action.readContent}, length: ${action.readContent?.length || 0}`);
          if (action.readContent) {
            LoggingUtils.logInfo(`📝 [DEBUG] Adding readContent to final response: ${action.readContent.substring(0, 100)}...`);
            finalResponse += `\n**Conteúdo do arquivo:**\n\`\`\`\n${action.readContent}\n\`\`\`\n`;
          } else {
            LoggingUtils.logWarning(`⚠️ [DEBUG] action.readContent is undefined in final response building!`);
          }
          break;
        default:
          finalResponse += `${index + 1}. ❓ **Ação desconhecida:** \`${action.type}\` em \`${action.target}\`\n`;
      }
    });
    
    finalResponse += "\n🎯 **Todas as ações foram processadas com sucesso!**";
    return finalResponse;
  }

  /**
   * Build simplified system prompt for function calling
   * Focus on tool usage rather than text parsing
   * NOTE: OllamaCompletionService already builds the full prompt, so we keep this minimal
   */
  private _buildFunctionCallingSystemPrompt(): string {
    return `You are a Universal AI Agent with access to the user's workspace.

When the user asks you to perform file operations or commands, use the appropriate tools.
You can use multiple tools in sequence to complete complex tasks.

Always be helpful and execute the user's requests directly using the available tools.`;
  }

  /**
   * Process LLM response with tool_calls and convert to AgentActions
   */
  private _processToolCallsResponse(response: any, originalMessage: string): AgentResponse {
    const message = response.choices?.[0]?.message;
    const toolCalls = message?.tool_calls || [];
    const textResponse = message?.content || "";
    
    LoggingUtils.logInfo(`🔧 [AGENT] Processing ${toolCalls.length} tool calls`);
    
    // Debug: Log all tool calls received from LLM
    LoggingUtils.logInfo(`🔧 [DEBUG] All tool calls from LLM: ${JSON.stringify(toolCalls.map((tc: any) => ({ name: tc.function?.name, args: tc.function?.arguments })))}`);
    
    const actions: AgentAction[] = [];
    const filesModified: string[] = [];
    
    toolCalls.forEach((toolCall: any, index: number) => {
      const functionName = toolCall.function?.name;
      let args: any;
      
      LoggingUtils.logInfo(`🔧 [DEBUG] Processing tool call ${index + 1}: ${functionName}`);
      
      try {
        // Parse arguments (might be string or object)
        args = typeof toolCall.function?.arguments === 'string' 
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function?.arguments || {};
      } catch (error) {
        LoggingUtils.logError(`❌ [AGENT] Failed to parse tool call arguments for ${functionName}:`, error);
        return;
      }
      
      LoggingUtils.logInfo(`🔧 [AGENT] Tool call ${index + 1}: ${functionName}(${JSON.stringify(args)})`);
      
      // DEBUG: Log detailed content information
      if (args.content !== undefined) {
        LoggingUtils.logInfo(`📄 [DEBUG] Content length: ${args.content?.length || 0} characters`);
        LoggingUtils.logInfo(`📄 [DEBUG] Content preview: "${(args.content || '').substring(0, 200)}${(args.content || '').length > 200 ? '...' : ''}"`);
        LoggingUtils.logInfo(`📄 [DEBUG] Content type: ${typeof args.content}`);
      }
      
      // Convert tool calls to AgentActions
      switch (functionName) {
        case 'createFile':
          actions.push({
            type: 'create',
            target: args.path,
            content: args.content
          });
          filesModified.push(args.path);
          LoggingUtils.logInfo(`📝 [DEBUG] CreateFile action - Path: ${args.path}, Content length: ${args.content?.length || 0}`);
          break;
          
        case 'editFile':
          actions.push({
            type: 'edit',
            target: args.path,
            content: args.content
          });
          filesModified.push(args.path);
          LoggingUtils.logInfo(`✏️ [DEBUG] EditFile action - Path: ${args.path}, Content length: ${args.content?.length || 0}`);
          break;
          
        case 'deleteFile':
          actions.push({
            type: 'delete',
            target: args.path
          });
          filesModified.push(args.path);
          break;
          
        case 'executeCommand':
          actions.push({
            type: 'execute',
            target: args.command,
            workingDir: args.workingDirectory
          });
          break;
          
        case 'searchFiles':
          actions.push({
            type: 'search',
            target: args.query
          });
          break;
          
        case 'readFile':
          actions.push({
            type: 'read',
            target: args.path
          });
          LoggingUtils.logInfo(`📖 [DEBUG] ReadFile action - Path: ${args.path}`);
          break;
          
        default:
          LoggingUtils.logWarning(`⚠️ Unknown function: ${functionName}`);
      }
    });
    
    LoggingUtils.logInfo(`✅ [AGENT] Converted ${toolCalls.length} tool calls to ${actions.length} actions`);
    
    // Build consistent and detailed response for UI display
    let finalResponse = "";
    
    // ALWAYS show standardized agent response format for consistency
    if (actions.length > 0) {
      finalResponse = "✅ **Agente Universal - Ações Executadas:**\n\n";
      actions.forEach((action, index) => {
        switch (action.type) {
          case 'create':
            finalResponse += `${index + 1}. 📝 **Criado arquivo:** \`${action.target}\`\n`;
            break;
          case 'edit':
            finalResponse += `${index + 1}. ✏️ **Editado arquivo:** \`${action.target}\`\n`;
            break;
          case 'delete':
            finalResponse += `${index + 1}. 🗑️ **Deletado arquivo:** \`${action.target}\`\n`;
            break;
          case 'execute':
            finalResponse += `${index + 1}. ⚡ **Executado comando:** \`${action.target}\`\n`;
            break;
          case 'search':
            finalResponse += `${index + 1}. 🔍 **Busca realizada:** \`${action.target}\`\n`;
            break;
          case 'read':
            finalResponse += `${index + 1}. 📖 **Arquivo lido:** \`${action.target}\`\n`;
            LoggingUtils.logInfo(`🔍 [DEBUG] Processing read action. readContent exists: ${!!action.readContent}, length: ${action.readContent?.length || 0}`);
            if (action.readContent) {
              LoggingUtils.logInfo(`📝 [DEBUG] Adding readContent to response: ${action.readContent.substring(0, 100)}...`);
              finalResponse += `\n**Conteúdo do arquivo:**\n\`\`\`\n${action.readContent}\n\`\`\`\n`;
            } else {
              LoggingUtils.logWarning(`⚠️ [DEBUG] action.readContent is undefined or empty!`);
            }
            break;
        }
      });
      finalResponse += "\n🎯 **Todas as ações foram processadas com sucesso!**";
    } else {
      finalResponse = "✅ **Agente processou a solicitação, mas nenhuma ação foi necessária.**";
    }
    
    // Optionally append LLM text response if it contains useful information
    if (textResponse && textResponse.trim() !== '' && !textResponse.includes('function_name') && !textResponse.includes('createFile') && !textResponse.includes('editFile')) {
      finalResponse += "\n\n---\n\n📝 **Detalhes adicionais:**\n" + textResponse;
    }
    
    LoggingUtils.logInfo(`📄 [AGENT] Final response constructed (${finalResponse.length} chars): ${finalResponse.substring(0, 100)}...`);
    
    return {
      response: finalResponse,
      actions: actions.length > 0 ? actions : undefined,
      filesModified: filesModified.length > 0 ? filesModified : undefined
    };
  }

  /**
   * Build messages array for LLM
   * DRY: Single message building logic
   */
  private _buildMessages(
    message: string,
    systemPrompt: string,
    workspaceContext: string,
    memoryContext: string,
    webContext: string,
    temporaryContext?: string,
    conversationMessages?: any[]
  ): any[] {
    const messages: any[] = [{ role: "system", content: systemPrompt }];

    // 🎯 SIMPLIFICAÇÃO CRÍTICA: Apenas enviar últimas 10 mensagens para contexto
    // A IA precisa ver o histórico recente para entender comandos implícitos como "adiciona mais 3"
    if (conversationMessages?.length) {
      const recentHistory = conversationMessages
        .filter(msg => {
          // Filtrar system messages
          if (msg.role === "system") return false;
          
          // 🚨 CORREÇÃO CRÍTICA: FILTRAR TODAS as mensagens assistant!
          // O modelo está "aprendendo" a responder conversacionalmente ao ver as respostas anteriores
          // Isso quebra a geração de comandos estruturados (EDIT FILE, CREATE FILE, etc.)
          if (msg.role === "assistant") {
            LoggingUtils.logInfo(`🗑️ [AGENT] Filtering assistant message to prevent contamination: ${msg.content.substring(0, 50)}...`);
            return false; // Remover TODAS as mensagens assistant
          }
          
          // 💬 Apenas mensagens USER são permitidas para contexto
          // O contexto vem das mensagens do usuário: "edite funcionarios.csv" -> "adiciona mais 3"
          if (msg.role === "user") {
            LoggingUtils.logInfo(`💬 [AGENT] Including user message for context: ${msg.content.substring(0, 50)}...`);
          }
          
          return true;
        })
        .slice(-10); // Manter últimas 10 mensagens limpas
      
      LoggingUtils.logInfo(`🧹 [AGENT] Filtered history: ${conversationMessages.length} -> ${recentHistory.length} messages`);
      messages.push(...recentHistory);
    }

    // Build user prompt with context (DRY: single prompt construction)
    let userPrompt = message;
    
    if (workspaceContext) {
      userPrompt += `\n\n## 🗂️ RELEVANT WORKSPACE CONTEXT:\n${workspaceContext}`;
    }
    
    if (memoryContext) {
      userPrompt += `\n\n## 🧠 RELEVANT MEMORIES:\n${memoryContext}`;
    }
    
    if (webContext) {
      userPrompt += `\n\n## 🌐 WEB SEARCH CONTEXT:\n${webContext}`;
    }
    
    if (temporaryContext) {
      userPrompt += `\n\n## 📋 ADDITIONAL CONTEXT:\n${temporaryContext}`;
    }

    messages.push({
      role: "user",
      content: buildSimpleUserPrompt(userPrompt, this.currentLanguage)
    });

    return messages;
  }

  /**
   * Save agent interaction using MemoryManager
   * SRP: Delegates to specialized component
   */
  private async _saveInteraction(
    prompt: string,
    response: AgentResponse,
    conversationMessages?: any[]
  ): Promise<void> {
    try {
      // Add to conversation history if no existing messages
      if (!conversationMessages?.length) {
        this.memoryManager.addToHistory("user", prompt);
        this.memoryManager.addToHistory("assistant", response.response);
      }

      // Save interaction
      await this.memoryManager.saveInteraction(
        prompt,
        response.response,
        this.speakerService.getPrimaryUserSpeaker()
      );

      // Save action memory if actions were executed (YAGNI)
      if (response.actions?.length) {
        await this.memoryManager.saveActionMemory(prompt, response.actions);
      }
      
    } catch (error) {
      LoggingUtils.logWarning(`⚠️ Could not save agent interaction: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Simple utility methods (KISS: minimal complexity)
  private _updateStatus(message: string): void {
    if (typeof window !== "undefined" && (window as any).__updateProcessingStatus) {
      (window as any).__updateProcessingStatus(message);
    }
  }

  private _clearStatus(): void {
    if (typeof window !== "undefined" && (window as any).__clearProcessingStatus) {
      (window as any).__clearProcessingStatus();
    }
  }
  
  getWorkspaceContext(): WorkspaceContext | null {
    return this.workspaceContext;
  }

  isProcessingRequest(): boolean {
    return this.isProcessing;
  }

  reset(): void {
    this.isProcessing = false;
    this.workspaceContext = null;
  }

  /**
   * Check and update workspace dynamically (like SimplePromptProcessor)
   * Always checks for current workspace selection before processing
   */
  private async _checkAndUpdateWorkspace(): Promise<void> {
    try {
      LoggingUtils.logInfo("🔍 Checking current workspace selection...");
      
      // Always get the latest workspace path from storage (like WorkspaceExplorer sets)
      const currentWorkspacePath = getOption<string>(STORAGE_KEYS.WORKSPACE_PATH);
      
      // Check if workspace changed or needs initialization
      const needsUpdate = !this.workspaceContext || 
                         (currentWorkspacePath && this.workspaceContext.rootPath !== currentWorkspacePath);
      
      if (currentWorkspacePath && needsUpdate) {
        LoggingUtils.logInfo(`📁 Workspace changed to: ${currentWorkspacePath}`);
        this._updateStatus("📂 Updating workspace context...");
        await this.initializeWorkspace(currentWorkspacePath);
        return;
      }
      
      // Fallback: auto-initialize if no workspace is set
      if (!this.workspaceContext) {
        await this._autoInitializeWorkspace();
      }
      
    } catch (error) {
      LoggingUtils.logError("❌ Workspace check failed", error);
      // Continue with current workspace or initialize minimal
      if (!this.workspaceContext) {
        await this._autoInitializeWorkspace();
      }
    }
  }

  /**
   * Auto-initialize workspace if none is set
   * Tries to get a default workspace or prompts user to select one
   */
  private async _autoInitializeWorkspace(): Promise<void> {
    try {
      LoggingUtils.logInfo("🔍 Auto-initializing workspace for agent mode...");
      
      // Try to get a stored workspace path from storage
       const storedWorkspace = getOption<string>(STORAGE_KEYS.WORKSPACE_PATH);
      
      if (storedWorkspace) {
        LoggingUtils.logInfo(`📁 Using stored workspace: ${storedWorkspace}`);
        await this.initializeWorkspace(storedWorkspace);
        return;
      }
      
      // Try to use current working directory as fallback
      const currentDir = process.cwd();
      LoggingUtils.logInfo(`📁 Using current directory as workspace: ${currentDir}`);
      await this.initializeWorkspace(currentDir);
      
    } catch (error) {
      LoggingUtils.logError("❌ Failed to auto-initialize workspace", error);
      
      // Create a minimal workspace context to allow agent to function
       this.workspaceContext = {
         rootPath: process.cwd(),
         files: [],
         structure: {},
         languages: ['javascript', 'typescript'],
         frameworks: ['electron', 'react'],
         metadata: {
           totalFiles: 0,
           totalSize: 0,
           languages: ['javascript', 'typescript'],
           frameworks: ['electron', 'react'],
           lastIndexed: new Date().toISOString()
         }
       };
      
      // Configure ActionExecutor with current directory
      this.actionExecutor.setWorkspaceRoot(process.cwd());
      
      LoggingUtils.logInfo("✅ Created minimal workspace context for agent operation");
    }
  }
}
