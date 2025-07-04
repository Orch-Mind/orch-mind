// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { spawn } from "child_process";
import * as crypto from "crypto";
import * as fs from "fs/promises";
import * as path from "path";

export interface AdapterMergeMetadata {
  sourceAdapters: Array<{
    id: string;
    name: string;
    baseModel: string;
    checksum: string;
    timestamp: string;
    author?: string;
    peers?: number;
  }>;
  mergeStrategy: "arithmetic_mean" | "weighted_average" | "svd_merge";
  mergeTimestamp: string;
  mergedBy: string;
  targetBaseModel: string;
  mergedAdapterPath: string;
  mergedChecksum: string;
}

export interface MergeRequest {
  adapters: Array<{
    name: string;
    path: string;
    baseModel: string;
    checksum: string;
    weight?: number; // Para weighted average
  }>;
  strategy: "arithmetic_mean" | "weighted_average" | "svd_merge";
  outputName: string;
  targetBaseModel: string;
}

export interface MergeResult {
  success: boolean;
  mergedAdapterPath?: string;
  metadata?: AdapterMergeMetadata;
  error?: string;
}

export class LoRAMergeService {
  private readonly mergeDir: string;
  private readonly pythonScriptPath: string;

  constructor() {
    const projectRoot = this.getProjectRoot();
    this.mergeDir = path.join(projectRoot, "adapters", "merged");
    this.pythonScriptPath = path.join(
      projectRoot,
      "scripts",
      "python",
      "lora_training",
      "merge_lora.py"
    );

    console.log(`[LoRAMergeService] Using project root: ${projectRoot}`);
    console.log(`[LoRAMergeService] Merge directory: ${this.mergeDir}`);
    console.log(`[LoRAMergeService] Python script: ${this.pythonScriptPath}`);
  }

  /**
   * Get the correct project root directory (same logic as AdapterRegistry)
   */
  private getProjectRoot(): string {
    const { app } = require("electron");
    const fs = require("fs");

    // List of potential project root directories to try
    const potentialRoots = [
      // 1. Use process.cwd() (should work in development)
      process.cwd(),

      // 2. Go up from current file location (works in some Electron contexts)
      path.resolve(__dirname, "../../../.."),

      // 3. Use app.getAppPath() if available (Electron app path)
      app.getAppPath ? app.getAppPath() : null,

      // 4. Production: use parent of resources directory
      process.resourcesPath ? path.resolve(process.resourcesPath, "..") : null,

      // 5. Manual fallback to known project path (last resort)
      "/Users/guilhermeferraribrescia/orch-os",
    ].filter(Boolean) as string[];

    // Try each potential root and find the one that contains lora_adapters
    for (const candidateRoot of potentialRoots) {
      try {
        const loraAdaptersPath = path.join(candidateRoot, "lora_adapters");

        // Check if this path has the lora_adapters directory
        if (fs.existsSync(loraAdaptersPath)) {
          return candidateRoot;
        }
      } catch (error) {
        // Continue to next candidate
      }
    }

    // Fallback to process.cwd()
    return process.cwd();
  }

  /**
   * Valida se todos os adapters são compatíveis para fusão
   */
  private async validateAdaptersForMerge(
    adapters: MergeRequest["adapters"]
  ): Promise<void> {
    if (adapters.length < 2) {
      throw new Error("Pelo menos 2 adapters são necessários para fusão");
    }

    // Verificar se todos os adapters têm o mesmo base model
    const baseModel = adapters[0].baseModel;
    const incompatibleAdapters = adapters.filter(
      (adapter) => adapter.baseModel !== baseModel
    );

    if (incompatibleAdapters.length > 0) {
      throw new Error(
        `Adapters incompatíveis encontrados. Base model esperado: ${baseModel}. ` +
          `Incompatíveis: ${incompatibleAdapters
            .map((a) => `${a.name} (${a.baseModel})`)
            .join(", ")}`
      );
    }

    // Verificar se todos os adapters existem
    for (const adapter of adapters) {
      const configPath = path.join(adapter.path, "adapter_config.json");
      try {
        await fs.access(configPath);
        console.log(`✅ Adapter validated: ${adapter.name}`);
      } catch (error) {
        throw new Error(
          `Adapter não encontrado: ${adapter.name} em ${adapter.path}`
        );
      }
    }

    console.log(
      `🔍 All ${adapters.length} adapters validated for base model: ${baseModel}`
    );
  }

  /**
   * Cria arquivo de configuração para o script Python de fusão
   */
  private async createMergeConfig(
    request: MergeRequest,
    outputPath: string
  ): Promise<string> {
    const adaptersConfig = request.adapters.map((adapter) => ({
      name: adapter.name,
      path: adapter.path,
      weight: adapter.weight || 1.0,
    }));

    const config = {
      adapters: adaptersConfig,
      strategy: request.strategy,
      timestamp: new Date().toISOString(),
    };

    const configPath = path.join(
      this.mergeDir,
      `merge_config_${request.outputName}.json`
    );
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));

    return configPath;
  }

  /**
   * Executa a fusão de adapters LoRA
   */
  async mergeAdapters(request: MergeRequest): Promise<MergeResult> {
    console.log(`🔄 Starting LoRA adapter merge: ${request.outputName}`);

    try {
      // Validar adapters
      await this.validateAdaptersForMerge(request.adapters);

      // Criar diretório de saída
      await fs.mkdir(this.mergeDir, { recursive: true });

      const outputPath = path.join(this.mergeDir, request.outputName);
      await fs.mkdir(outputPath, { recursive: true });

      // Criar arquivo de configuração
      const configPath = await this.createMergeConfig(request, outputPath);

      // Executar script Python
      console.log(`🐍 Executing merge script with config: ${configPath}`);

      const result = await this.executeMergeScript(configPath, outputPath);

      if (!result.success) {
        throw new Error(result.error || "Merge script execution failed");
      }

      // Calcular checksum do adapter merged
      const mergedWeightsPath = path.join(outputPath, "adapter_model.bin");
      const mergedChecksum = await this.calculateFileChecksum(
        mergedWeightsPath
      );

      // Criar metadados de fusão
      const metadata: AdapterMergeMetadata = {
        sourceAdapters: request.adapters.map((adapter) => ({
          id: crypto.randomBytes(16).toString("hex"),
          name: adapter.name,
          baseModel: adapter.baseModel,
          checksum: adapter.checksum,
          timestamp: new Date().toISOString(),
        })),
        mergeStrategy: request.strategy,
        mergeTimestamp: new Date().toISOString(),
        mergedBy: "Orch-OS",
        targetBaseModel: request.targetBaseModel,
        mergedAdapterPath: outputPath,
        mergedChecksum,
      };

      // Salvar metadados
      const metadataPath = path.join(outputPath, "orch_merge_metadata.json");
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

      console.log(`✅ LoRA merge completed: ${request.outputName}`);
      console.log(`📁 Output path: ${outputPath}`);
      console.log(`🔒 Checksum: ${mergedChecksum}`);

      return {
        success: true,
        mergedAdapterPath: outputPath,
        metadata,
      };
    } catch (error) {
      console.error(`❌ LoRA merge failed: ${error}`);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Executa script Python de fusão
   */
  private async executeMergeScript(
    configPath: string,
    outputPath: string
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const python = spawn("python3", [
        this.pythonScriptPath,
        "--config",
        configPath,
        "--output",
        outputPath,
      ]);

      let output = "";
      let errorOutput = "";

      python.stdout.on("data", (data) => {
        const message = data.toString();
        console.log(message);
        output += message;
      });

      python.stderr.on("data", (data) => {
        const error = data.toString();
        console.error(error);
        errorOutput += error;
      });

      python.on("close", (code) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          resolve({
            success: false,
            error: `Script exited with code ${code}. Error: ${errorOutput}`,
          });
        }
      });

      python.on("error", (error) => {
        resolve({
          success: false,
          error: `Failed to execute script: ${error.message}`,
        });
      });
    });
  }

  /**
   * Calcula checksum de um arquivo
   */
  private async calculateFileChecksum(filePath: string): Promise<string> {
    const fileBuffer = await fs.readFile(filePath);
    return crypto.createHash("sha256").update(fileBuffer).digest("hex");
  }

  /**
   * Lista adapters merged disponíveis
   */
  async listMergedAdapters(): Promise<
    Array<{
      name: string;
      path: string;
      metadata: AdapterMergeMetadata;
    }>
  > {
    try {
      const mergedDirs = await fs.readdir(this.mergeDir);
      const adapters = [];

      for (const dirName of mergedDirs) {
        const dirPath = path.join(this.mergeDir, dirName);
        const metadataPath = path.join(dirPath, "orch_merge_metadata.json");

        try {
          const metadataContent = await fs.readFile(metadataPath, "utf-8");
          const metadata = JSON.parse(metadataContent) as AdapterMergeMetadata;

          adapters.push({
            name: dirName,
            path: dirPath,
            metadata,
          });
        } catch (error) {
          console.warn(`⚠️ Could not read metadata for ${dirName}: ${error}`);
        }
      }

      return adapters;
    } catch (error) {
      console.error(`❌ Error listing merged adapters: ${error}`);
      return [];
    }
  }

  /**
   * Remove adapter merged
   */
  async removeMergedAdapter(
    adapterName: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const adapterPath = path.join(this.mergeDir, adapterName);
      await fs.rm(adapterPath, { recursive: true, force: true });

      console.log(`🗑️ Removed merged adapter: ${adapterName}`);
      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(
        `❌ Failed to remove merged adapter ${adapterName}: ${errorMessage}`
      );
      return { success: false, error: errorMessage };
    }
  }
}
