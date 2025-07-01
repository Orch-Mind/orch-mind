// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { exec } from "child_process";
import { app } from "electron";
import * as fs from "fs/promises";
import * as path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface TrainingConversation {
  id: string;
  messages: Array<{
    role: string;
    content: string;
  }>;
}

export interface TrainingParams {
  conversations: TrainingConversation[];
  baseModel: string;
  outputName: string; // Will be ignored, always uses master
}

export interface TrainingResult {
  success: boolean;
  adapterPath?: string;
  error?: string;
  details?: {
    trainingExamples: number;
    modelName: string;
    trainingDuration?: number;
  };
}

export class LoRATrainingService {
  private trainingDir: string;
  private tempDir: string;

  constructor() {
    this.trainingDir = path.join(app.getPath("userData"), "lora-training");
    this.tempDir = path.join(app.getPath("userData"), "temp");
  }

  private extractBaseModel(modelName: string): string {
    // Extract the original base model, removing any "-custom" suffix
    // Examples:
    // "gemma3:latest" → "gemma3:latest"
    // "gemma3-custom:latest" → "gemma3:latest"
    // "llama3.1-custom:latest" → "llama3.1:latest"

    // Remove -custom suffix first
    let result = modelName.replace(/-custom(:latest)?$/, "");

    // Ensure :latest suffix
    if (!result.endsWith(":latest")) {
      result += ":latest";
    }

    // Clean up any double :latest
    result = result.replace(/:latest:latest$/, ":latest");

    return result;
  }

  async trainAdapter(params: TrainingParams): Promise<TrainingResult> {
    const startTime = Date.now();

    try {
      // Validate input parameters
      this.validateTrainingParams(params);

      // Create training directory if it doesn't exist
      await fs.mkdir(this.trainingDir, { recursive: true });

      // Convert conversations to training format
      const trainingData = this.convertToTrainingFormat(params.conversations);

      if (!trainingData || trainingData.trim().length === 0) {
        throw new Error("No valid training data generated from conversations");
      }

      // Save training data
      const dataPath = path.join(
        this.trainingDir,
        `${params.outputName}_data.jsonl`
      );
      await fs.writeFile(dataPath, trainingData);

      // Validate training data file was written correctly
      const fileStats = await fs.stat(dataPath);
      console.log(
        `[LoRA] Training data file created: ${dataPath} (${fileStats.size} bytes)`
      );

      // Get the path to the training script
      const scriptPath = this.getTrainingScriptPath();

      // Check if script exists and is executable
      await this.validateTrainingScript(scriptPath);

      // Check if base model exists in Ollama
      await this.validateBaseModel(params.baseModel);

      // INCREMENTAL TRAINING: Extract original base model to ensure consistency
      const originalBaseModel = this.extractBaseModel(params.baseModel);
      const baseModelClean = originalBaseModel
        .replace(":latest", "")
        .replace(/[:.]/g, "_");
      const modelName = `${baseModelClean}-custom:latest`;

      console.log(`[LoRA] Incremental training logic:
        - Input base model: ${params.baseModel}
        - Extracted base model: ${originalBaseModel}
        - Target custom model: ${modelName}`);

      console.log(`[LoRA] Starting incremental training with:
        - Base model: ${params.baseModel}
        - Data: ${dataPath}
        - Training examples: ${params.conversations.length}
        - Master model name: ${modelName}`);

      // Execute the Python training script
      console.log(
        `[LoRA] Executing FAST training script (optimized for speed)...`
      );
      const pythonCommand = await this.findCompatiblePython();

      // Calculate optimal steps based on dataset size and complexity
      const datasetSize = params.conversations.length;
      const optimalSteps = this.calculateOptimalSteps(datasetSize, true); // true = incremental

      // Always use incremental training (simplified command) with dynamically calculated steps
      let fullCommand = `${pythonCommand} "${scriptPath}" --data "${dataPath}" --base-model "${params.baseModel}" --output "master" --max-steps ${optimalSteps} --complexity medium`;

      // For Windows, prepend command to set console code page to UTF-8
      if (process.platform === "win32") {
        fullCommand = `chcp 65001 >nul && ${fullCommand}`;
      }

      console.log(`[LoRA] Command to execute: ${fullCommand}`);
      console.log(`[LoRA] Working directory: ${this.trainingDir}`);
      console.log(`[LoRA] Mode: Incremental training (always)`);

      // Environment variables for proper encoding
      const execEnv: Record<string, string> = {
        ...process.env,
        PYTHONIOENCODING: "utf-8:replace", // Force UTF-8 with replacement for unprintable chars
        PYTHONLEGACYWINDOWSSTDIO: "0", // Use Unicode console on Windows
        LANG: "en_US.UTF-8", // Set locale to UTF-8
        LC_ALL: "en_US.UTF-8", // Force all locale settings to UTF-8
      };

      // Add Windows-specific encoding fix
      if (process.platform === "win32") {
        execEnv.PYTHONUTF8 = "1"; // Force Python to use UTF-8 mode on Windows
      }

      const result = await execAsync(fullCommand, {
        cwd: this.trainingDir,
        timeout: 5 * 60 * 1000, // REDUCED: 5 minutes timeout (estratégia instant é rápida)
        maxBuffer: 1024 * 1024 * 1000, // 10MB buffer para output
        env: execEnv,
      });

      console.log("[LoRA] Training completed successfully");
      console.log("[LoRA] Training output:", result.stdout);

      if (result.stderr && result.stderr.trim()) {
        console.warn("[LoRA] Training warnings/errors:", result.stderr);

        // Check if stderr contains actual errors (not just warnings)
        if (
          result.stderr.toLowerCase().includes("error") ||
          result.stderr.toLowerCase().includes("traceback")
        ) {
          throw new Error(`Training script failed: ${result.stderr}`);
        }
      }

      // Verify the model was created successfully
      await this.verifyModelCreation(modelName);

      const trainingDuration = Date.now() - startTime;

      // Log training metadata for console output (no file needed)
      const trainingMetadata = {
        baseModel: params.baseModel,
        masterModel: modelName,
        trainingDate: new Date().toISOString(),
        trainingDuration: trainingDuration,
        examples: this.countTrainingExamples(trainingData),
        mode: "incremental",
      };

      console.log(
        `[LoRA] Incremental training completed with metadata:`,
        trainingMetadata
      );

      return {
        success: true,
        adapterPath: modelName,
        details: {
          trainingExamples: this.countTrainingExamples(trainingData),
          modelName: modelName,
          trainingDuration: trainingDuration,
        },
      };
    } catch (error) {
      const trainingDuration = Date.now() - startTime;
      console.error("[LoRA] Training failed:", error);

      // Capturar mais detalhes do erro para debug
      let errorMessage = "Unknown error occurred";
      let errorDetails = "";

      if (error instanceof Error) {
        errorMessage = error.message;

        // Se for erro do execAsync, capturar stdout/stderr
        if ("stdout" in error || "stderr" in error) {
          const execError = error as any;
          errorDetails = `
STDOUT: ${execError.stdout || "N/A"}
STDERR: ${execError.stderr || "N/A"}
EXIT CODE: ${execError.code || "N/A"}`;
          console.error("[LoRA] Command execution details:", errorDetails);
        }
      }

      const baseModelClean = params.baseModel
        .replace(":latest", "")
        .replace(/[:.]/g, "_");
      const expectedModelName = `${baseModelClean}-custom:latest`;

      return {
        success: false,
        error: `${errorMessage}${
          errorDetails ? "\n\nDETAILS:" + errorDetails : ""
        }`,
        details: {
          trainingExamples: 0,
          modelName: expectedModelName,
          trainingDuration: trainingDuration,
        },
      };
    }
  }

  private validateTrainingParams(params: TrainingParams): void {
    if (!params.conversations || params.conversations.length === 0) {
      throw new Error("No conversations provided for training");
    }

    if (!params.baseModel || params.baseModel.trim().length === 0) {
      throw new Error("Base model name is required");
    }

    if (!params.outputName || params.outputName.trim().length === 0) {
      throw new Error("Output name is required");
    }

    // Validate output name doesn't contain invalid characters
    if (!/^[a-zA-Z0-9_-]+$/.test(params.outputName)) {
      throw new Error(
        "Output name can only contain alphanumeric characters, hyphens, and underscores"
      );
    }

    // Check if conversations have valid messages
    const validConversations = params.conversations.filter(
      (conv) => conv.messages && conv.messages.length >= 2
    );

    if (validConversations.length === 0) {
      throw new Error("No conversations with sufficient messages found");
    }

    console.log(
      `[LoRA] Validation passed: ${validConversations.length}/${params.conversations.length} conversations valid`
    );
  }

  private getTrainingScriptPath(): string {
    // Try multiple possible locations for the training script
    const possiblePaths = [
      // For packaged applications (Windows/macOS/Linux) - extraResources
      path.join(
        process.resourcesPath || path.dirname(process.execPath),
        "scripts",
        "python",
        "lora_training",
        "train_lora.py"
      ),
      // For development mode
      path.join(
        process.cwd(),
        "scripts",
        "python",
        "lora_training",
        "train_lora.py"
      ),
      // Alternative for packaged apps in app.asar
      path.join(
        app.getAppPath(),
        "scripts",
        "python",
        "lora_training",
        "train_lora.py"
      ),
      // Alternative relative path from build directory
      path.join(
        __dirname,
        "..",
        "..",
        "..",
        "scripts",
        "python",
        "lora_training",
        "train_lora.py"
      ),
    ];

    console.log(`[LoRA] Searching for training script...`);
    console.log(`[LoRA] process.resourcesPath: ${process.resourcesPath}`);
    console.log(`[LoRA] process.execPath: ${process.execPath}`);
    console.log(`[LoRA] app.getAppPath(): ${app.getAppPath()}`);
    console.log(`[LoRA] process.cwd(): ${process.cwd()}`);
    console.log(`[LoRA] __dirname: ${__dirname}`);

    for (const scriptPath of possiblePaths) {
      try {
        console.log(`[LoRA] Trying path: ${scriptPath}`);
        // Synchronous check since we're in a loop
        require("fs").accessSync(scriptPath);
        console.log(`[LoRA] Found training script at: ${scriptPath}`);
        return scriptPath;
      } catch (error) {
        console.log(`[LoRA] Path not found: ${scriptPath}`);
        // Continue to next path
      }
    }

    throw new Error(
      `Training script not found. Tried paths: ${possiblePaths.join(", ")}`
    );
  }

  private async validateTrainingScript(scriptPath: string): Promise<void> {
    try {
      await fs.access(scriptPath);
      const stats = await fs.stat(scriptPath);

      if (!stats.isFile()) {
        throw new Error("Training script path is not a file");
      }

      // Verificar se o arquivo tem conteúdo e é um script Python válido
      const content = await fs.readFile(scriptPath, "utf8");

      // Verificar imports e funções essenciais
      const requiredElements = [
        "def execute_training_strategy", // Função definida no arquivo
        "def main()", // Função principal definida no arquivo
        "create_instant_adapter_script", // Função importada (agora faz treinamento real baseado em conteúdo)
        "from training_modules.script_factory import", // Import statement
        "calculate_content_based_steps", // Verificar se tem o novo sistema de cálculo
        "Content-Aware Fast Training", // String que existe no train_lora.py
      ];

      const missingElements = requiredElements.filter(
        (element) => !content.includes(element)
      );

      if (missingElements.length > 0) {
        throw new Error(
          `Training script missing required elements: ${missingElements.join(
            ", "
          )}`
        );
      }

      // Verificar se é um script Python válido
      if (!content.includes("python") || !content.includes("import")) {
        throw new Error("Training script appears to be invalid or corrupted");
      }

      console.log(
        `[LoRA] Training script validated: ${scriptPath} (${stats.size} bytes)`
      );
      console.log(
        `[LoRA] Script contains content-aware fast training logic: ✅`
      );
    } catch (error) {
      throw new Error(`Training script validation failed: ${error}`);
    }
  }

  private async validateBaseModel(baseModel: string): Promise<void> {
    try {
      const { stdout } = await execAsync("ollama list");

      if (!stdout.includes(baseModel)) {
        console.warn(
          `[LoRA] Base model ${baseModel} not found locally. Training script will attempt to pull it.`
        );
      } else {
        console.log(`[LoRA] Base model ${baseModel} found locally`);
      }
    } catch (error) {
      console.warn(
        `[LoRA] Could not verify base model (Ollama might not be running): ${error}`
      );
    }
  }

  private async verifyModelCreation(modelName: string): Promise<void> {
    try {
      const { stdout: ollamaList } = await execAsync("ollama list");

      if (ollamaList.includes(modelName)) {
        console.log(`[LoRA] Model ${modelName} successfully created in Ollama`);
      } else {
        throw new Error(
          `Model ${modelName} was not found in Ollama after training`
        );
      }
    } catch (error) {
      throw new Error(`Failed to verify model creation: ${error}`);
    }
  }

  async checkMasterAdapter(
    baseModel: string,
    masterName: string = "master"
  ): Promise<{
    exists: boolean;
    adapterPath?: string;
    trainingHistory?: any;
  }> {
    try {
      const baseModelClean = baseModel
        .replace(":latest", "")
        .replace(/[:.]/g, "_");
      const adapterPath = path.join(
        this.trainingDir,
        "adapters",
        `${baseModelClean}_${masterName}`
      );
      const configPath = path.join(adapterPath, "adapter_config.json");
      const historyPath = path.join(adapterPath, "training_history.json");

      const configExists = await fs
        .access(configPath)
        .then(() => true)
        .catch(() => false);

      if (configExists) {
        let trainingHistory = null;
        try {
          const historyContent = await fs.readFile(historyPath, "utf-8");
          trainingHistory = JSON.parse(historyContent);
        } catch (error) {
          console.log(`[LoRA] No training history found for ${baseModel}`);
        }

        return {
          exists: true,
          adapterPath,
          trainingHistory,
        };
      }

      return { exists: false };
    } catch (error) {
      console.error(`[LoRA] Error checking master adapter: ${error}`);
      return { exists: false };
    }
  }

  private convertToTrainingFormat(
    conversations: TrainingConversation[]
  ): string {
    const trainingExamples: string[] = [];

    console.log(
      `[LoRA Backend Debug] Starting conversion of ${conversations.length} conversations`
    );

    for (let convIndex = 0; convIndex < conversations.length; convIndex++) {
      const conversation = conversations[convIndex];

      console.log(
        `[LoRA Backend Debug] Processing conversation ${convIndex + 1}/${
          conversations.length
        }:`,
        {
          id: conversation.id,
          messageCount: conversation.messages?.length || 0,
          hasMessages: !!conversation.messages,
          firstMessage: conversation.messages?.[0]
            ? {
                role: conversation.messages[0].role,
                type: (conversation.messages[0] as any).type,
                contentLength: conversation.messages[0].content?.length || 0,
              }
            : null,
        }
      );

      if (!conversation.messages || conversation.messages.length < 2) {
        console.warn(
          `[LoRA Backend Debug] Skipping conversation ${
            conversation.id
          }: insufficient messages (${conversation.messages?.length || 0})`
        );
        continue;
      }

      // Log all messages for debugging
      console.log(
        `[LoRA Backend Debug] All messages of conversation ${conversation.id}:`,
        conversation.messages.map((msg, index) => ({
          index,
          role: msg.role,
          type: (msg as any).type,
          contentLength: msg.content?.length || 0,
          contentPreview: msg.content?.substring(0, 50) + "...",
        }))
      );

      let pairsFound = 0;
      const usedMessageIndices = new Set<number>();

      // PRIMEIRA TENTATIVA: Verificação alternada (original)
      console.log(`[LoRA Backend Debug] Tentativa 1: Pares alternados`);
      for (let i = 0; i < conversation.messages.length - 1; i += 2) {
        const userMessage = conversation.messages[i];
        const assistantMessage = conversation.messages[i + 1];

        // Verificar tanto 'role' quanto 'type' para compatibilidade
        const userRole = userMessage?.role || (userMessage as any)?.type;
        const assistantRole =
          assistantMessage?.role || (assistantMessage as any)?.type;

        console.log(`[LoRA Backend Debug] Par alternado ${i}-${i + 1}:`, {
          userRole,
          assistantRole,
          userContent: userMessage?.content?.substring(0, 30) + "...",
          assistantContent: assistantMessage?.content?.substring(0, 30) + "...",
          userHasContent: !!userMessage?.content?.trim(),
          assistantHasContent: !!assistantMessage?.content?.trim(),
        });

        if (
          userRole === "user" &&
          assistantRole === "assistant" &&
          userMessage?.content?.trim() &&
          assistantMessage?.content?.trim()
        ) {
          const example = {
            instruction:
              "Continue the conversation as a helpful AI assistant trained on Orch-OS conversations.",
            input: userMessage.content.trim(),
            output: assistantMessage.content.trim(),
          };

          const exampleJson = JSON.stringify(example);
          trainingExamples.push(exampleJson);
          pairsFound++;
          usedMessageIndices.add(i);
          usedMessageIndices.add(i + 1);

          console.log(
            `[LoRA Backend Debug] ✅ Par alternado válido adicionado:`,
            {
              pairNumber: pairsFound,
              inputLength: example.input.length,
              outputLength: example.output.length,
              jsonLength: exampleJson.length,
            }
          );
        } else {
          console.log(`[LoRA Backend Debug] ❌ Par alternado inválido:`, {
            userRoleValid: userRole === "user",
            assistantRoleValid: assistantRole === "assistant",
            userHasContent: !!userMessage?.content?.trim(),
            assistantHasContent: !!assistantMessage?.content?.trim(),
          });
        }
      }

      // SEGUNDA TENTATIVA: Busca flexível (qualquer user -> assistant)
      console.log(`[LoRA Backend Debug] Tentativa 2: Busca flexível`);
      for (let i = 0; i < conversation.messages.length; i++) {
        if (usedMessageIndices.has(i)) continue; // Pular mensagens já usadas

        const currentMsg = conversation.messages[i];
        const currentRole = currentMsg?.role || (currentMsg as any)?.type;

        if (currentRole === "user" && currentMsg?.content?.trim()) {
          // Procurar próxima mensagem de assistant que não foi usada
          for (let j = i + 1; j < conversation.messages.length; j++) {
            if (usedMessageIndices.has(j)) continue; // Pular mensagens já usadas

            const nextMsg = conversation.messages[j];
            const nextRole = nextMsg?.role || (nextMsg as any)?.type;

            if (nextRole === "assistant" && nextMsg?.content?.trim()) {
              const example = {
                instruction:
                  "Continue the conversation as a helpful AI assistant trained on Orch-OS conversations.",
                input: currentMsg.content.trim(),
                output: nextMsg.content.trim(),
              };

              const exampleJson = JSON.stringify(example);
              trainingExamples.push(exampleJson);
              pairsFound++;
              usedMessageIndices.add(i);
              usedMessageIndices.add(j);

              console.log(
                `[LoRA Backend Debug] ✅ Par flexível encontrado: ${i}->${j}`,
                {
                  pairNumber: pairsFound,
                  inputLength: example.input.length,
                  outputLength: example.output.length,
                }
              );

              break; // Encontrou o par, para de procurar para esta mensagem user
            }
          }
        }
      }

      console.log(
        `[LoRA Backend Debug] Conversa ${conversation.id} contribuiu com ${pairsFound} pares de treinamento`
      );
    }

    const result = trainingExamples.join("\n");

    console.log(`[LoRA Backend Debug] Conversão completa:`, {
      totalConversations: conversations.length,
      totalTrainingExamples: trainingExamples.length,
      resultLength: result.length,
      sampleExample: trainingExamples[0]?.substring(0, 200) + "...",
    });

    if (trainingExamples.length === 0) {
      console.error(
        `[LoRA Backend Debug] ❌ NENHUM exemplo de treinamento gerado!`
      );
      console.error(
        `[LoRA Backend Debug] Estrutura completa das conversas:`,
        JSON.stringify(conversations, null, 2)
      );
    }

    return result;
  }

  private countTrainingExamples(trainingData: string): number {
    return trainingData.split("\n").filter((line) => line.trim().length > 0)
      .length;
  }

  private calculateOptimalSteps(
    datasetSize: number,
    isIncremental: boolean = false
  ): number {
    /**
     * Calculate optimal training steps based on LoRA best practices:
     * - Minimum: 100-200 steps for subtle changes
     * - Recommended: 500-1500 steps for most cases
     * - Small dataset: 300-800 steps
     * - Large dataset: 1000-3000+ steps
     */

    let baseSteps: number;

    // Base step calculation based on dataset size (aligned with Entry Point AI best practices)
    if (datasetSize <= 5) {
      baseSteps = 550; // Very small dataset: 400-600 steps
    } else if (datasetSize <= 10) {
      baseSteps = 650; // Small dataset: 300-800 steps
    } else if (datasetSize <= 15) {
      baseSteps = 700; // Small-medium dataset: 500-800 steps
    } else if (datasetSize <= 25) {
      baseSteps = 800; // Medium-small dataset: 600-1000 steps
    } else if (datasetSize <= 50) {
      baseSteps = 1000; // Medium dataset: 800-1200 steps
    } else if (datasetSize <= 100) {
      baseSteps = 1300; // Medium-large dataset: 1000-1500 steps
    } else if (datasetSize <= 200) {
      baseSteps = 1600; // Large dataset: 1200-2000 steps
    } else {
      baseSteps = Math.min(2000 + (datasetSize - 200) * 5, 3000); // Very large dataset
    }

    // Apply modifiers
    let steps = baseSteps;

    // LoRA rank modifier (we use r=16)
    steps = Math.round(steps * 1.0); // Standard rank

    // Learning rate modifier (we use 3e-4 standard)
    steps = Math.round(steps * 1.0); // Standard LR

    // Task complexity modifier (medium complexity for conversations)
    steps = Math.round(steps * 1.0); // Medium complexity

    // Incremental training adjustment
    if (isIncremental) {
      steps = Math.round(steps * 0.7); // Incremental needs fewer steps
    }

    // Apply safety bounds
    const minSteps = isIncremental ? 100 : 200;
    const maxStepsPerExample = datasetSize <= 10 ? 30 : 15;
    const maxSteps = Math.min(datasetSize * maxStepsPerExample, 5000);

    const finalSteps = Math.max(minSteps, Math.min(steps, maxSteps));

    console.log(`[LoRA] Dynamic step calculation:`, {
      datasetSize,
      isIncremental,
      baseSteps,
      finalSteps,
      efficiency: this.categorizeEfficiency(finalSteps),
    });

    return finalSteps;
  }

  private categorizeEfficiency(steps: number): string {
    if (steps <= 300) return "Quick Training (subtle changes)";
    if (steps <= 800) return "Standard Training (balanced)";
    if (steps <= 1500) return "Thorough Training (comprehensive)";
    if (steps <= 3000) return "Intensive Training (complex tasks)";
    return "Maximum Training (very complex)";
  }

  private async findCompatiblePython(): Promise<string> {
    const isWindows = process.platform === "win32";
    const isMacOS = process.platform === "darwin";
    const isLinux = process.platform === "linux";

    console.log(`[LoRA] Detecting Python on ${process.platform}...`);

    // Define platform-specific Python candidates
    let pythonCandidates: string[] = [];

    if (isWindows) {
      // First try PATH-based commands
      pythonCandidates = [
        "py -3.11", // Python Launcher with specific version
        "py -3.10",
        "py -3.9",
        "py -3.12",
        "python", // Standard command
        "python3", // Sometimes available on Windows
        "py", // Python Launcher default
      ];

      // Then try common Windows installation paths
      const windowsPaths = [
        // Python.org installer locations
        "C:\\Python311\\python.exe",
        "C:\\Python310\\python.exe",
        "C:\\Python39\\python.exe",
        "C:\\Python312\\python.exe",
        // Microsoft Store installations
        `${process.env.LOCALAPPDATA}\\Programs\\Python\\Python311\\python.exe`,
        `${process.env.LOCALAPPDATA}\\Programs\\Python\\Python310\\python.exe`,
        `${process.env.LOCALAPPDATA}\\Programs\\Python\\Python39\\python.exe`,
        `${process.env.LOCALAPPDATA}\\Programs\\Python\\Python312\\python.exe`,
        // User AppData installations
        `${process.env.APPDATA}\\Python\\Python311\\python.exe`,
        `${process.env.APPDATA}\\Python\\Python310\\python.exe`,
        `${process.env.APPDATA}\\Python\\Python39\\python.exe`,
        `${process.env.APPDATA}\\Python\\Python312\\python.exe`,
        // Program Files installations
        "C:\\Program Files\\Python311\\python.exe",
        "C:\\Program Files\\Python310\\python.exe",
        "C:\\Program Files\\Python39\\python.exe",
        "C:\\Program Files\\Python312\\python.exe",
        "C:\\Program Files (x86)\\Python311\\python.exe",
        "C:\\Program Files (x86)\\Python310\\python.exe",
        "C:\\Program Files (x86)\\Python39\\python.exe",
        "C:\\Program Files (x86)\\Python312\\python.exe",
      ];

      pythonCandidates = pythonCandidates.concat(windowsPaths);
    } else {
      // macOS/Linux Python commands
      pythonCandidates = [
        "python3.11", // PRIORIDADE: Funciona melhor com estratégia instant
        "python3.10",
        "python3.9",
        "python3.12", // Pode ter problemas, mas ainda compatível
        "python3", // fallback Unix
        "python", // General fallback
      ];
    }

    console.log(
      `[LoRA] Trying ${pythonCandidates.length} Python candidates...`
    );

    for (const pythonCmd of pythonCandidates) {
      try {
        console.log(`[LoRA] Testing Python: ${pythonCmd}`);

        // For full paths on Windows, check if file exists first
        if (isWindows && pythonCmd.includes(":\\")) {
          try {
            await fs.access(pythonCmd);
          } catch {
            console.log(`[LoRA] ❌ Path not found: ${pythonCmd}`);
            continue;
          }
        }

        // Check if this Python version exists and get its version
        const { stdout } = await execAsync(`"${pythonCmd}" --version`);

        // Parse version (e.g., "Python 3.12.10")
        const versionStr = stdout.trim().split(" ")[1];
        const [major, minor] = versionStr.split(".").map(Number);

        console.log(
          `[LoRA] Found Python version: ${major}.${minor} (${versionStr})`
        );

        // Check if it's in the compatible range for LoRA training
        if (major === 3 && minor >= 9 && minor <= 13) {
          // Adicionar nota sobre versões problemáticas
          if (minor >= 12) {
            console.log(
              `[LoRA] ⚠️ Found Python ${versionStr} - may have ML library compatibility issues, but will use instant strategy`
            );
          }

          console.log(
            `[LoRA] ✅ Selected Python: ${pythonCmd} (version ${versionStr}) on ${process.platform}`
          );
          return pythonCmd;
        } else {
          console.log(
            `[LoRA] ⚠️ ${pythonCmd} version ${versionStr} not compatible (needs 3.9-3.13)`
          );
        }
      } catch (error) {
        console.log(
          `[LoRA] ❌ ${pythonCmd} failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
        // This Python version doesn't exist or is not accessible
        continue;
      }
    }

    // Enhanced error message with platform-specific instructions
    let installInstructions = "";
    if (isWindows) {
      installInstructions = `
🔧 For Windows - Python Installation Guide:

OPTION 1 - Download from python.org (RECOMMENDED):
1. Go to https://python.org/downloads/
2. Download Python 3.11 (most stable for LoRA training)
3. ⚠️ IMPORTANT: Check "Add Python to PATH" during installation
4. Restart this application after installation

OPTION 2 - Using Windows Package Manager:
1. Open Command Prompt as Administrator
2. Run: winget install Python.Python.3.11
3. Restart this application

OPTION 3 - If Python is already installed but not in PATH:
1. Press Win + R, type "sysdm.cpl", press Enter
2. Click "Environment Variables"
3. Find "Path" variable and click "Edit"
4. Add your Python installation directory (e.g., C:\\Python311)
5. Add your Python Scripts directory (e.g., C:\\Python311\\Scripts)
6. Restart this application

📍 Common Python installation locations we checked:
- C:\\Python311\\python.exe
- %LOCALAPPDATA%\\Programs\\Python\\Python311\\python.exe
- C:\\Program Files\\Python311\\python.exe`;
    } else if (isMacOS) {
      installInstructions = `
For macOS:
1. brew install python@3.11
2. Or download from https://python.org/downloads/
3. Restart the application after installation`;
    } else {
      installInstructions = `
For Linux:
1. sudo apt install python3.11 (Ubuntu/Debian)
2. sudo yum install python3.11 (RHEL/CentOS)
3. Restart the application after installation`;
    }

    throw new Error(
      `No compatible Python version found for LoRA training on ${process.platform}. ` +
        `We checked ${pythonCandidates.length} possible locations.${installInstructions}`
    );
  }
}
