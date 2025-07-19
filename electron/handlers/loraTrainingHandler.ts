// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { spawn } from "child_process";
import { ipcMain, IpcMainInvokeEvent } from "electron";
import {
  LoRAMergeService,
  MergeRequest,
} from "../services/training/LoRAMergeService";
import {
  LoRATrainingService,
  TrainingParams,
} from "../services/training/LoRATrainingService";

export function setupLoRATrainingHandlers(): void {
  const trainingService = new LoRATrainingService();
  const mergeService = new LoRAMergeService();

  // Handle LoRA training requests
  ipcMain.handle(
    "train-lora-adapter",
    async (event: IpcMainInvokeEvent, params: TrainingParams) => {
      console.log("[IPC] Received LoRA training request:", {
        conversationCount: params.conversations.length,
        baseModel: params.baseModel,
        outputName: params.outputName,
      });

      try {
        // Handle special actions
        if (params.action === "deploy_adapter") {
          console.log("[IPC] Deploying adapter:", params.adapterId);
          const result = await trainingService.deployAdapter(
            params.adapterId!,
            params.baseModel,
            params.outputName
          );

          if (result.success) {
            console.log("[IPC] Adapter deployed successfully");
          } else {
            console.error("[IPC] Adapter deployment failed:", result.error);
          }

          return result;
        }

        // Add progress callback to send updates to renderer
        const paramsWithProgress = {
          ...params,
          onProgress: (progress: number, message: string) => {
            console.log(`[IPC] Training progress: ${progress}% - ${message}`);
            event.sender.send("training-progress", { progress, message });
          },
        };

        const result = await trainingService.trainAdapter(paramsWithProgress);

        if (result.success) {
          console.log("[IPC] LoRA training completed successfully");
          // Send final progress update
          event.sender.send("training-progress", {
            progress: 100,
            message: "Training completed successfully!",
          });
        } else {
          console.error("[IPC] LoRA training failed:", result.error);
          // Send error progress update
          event.sender.send("training-progress", {
            progress: 0,
            message: `Training failed: ${result.error}`,
          });
        }

        return result;
      } catch (error) {
        console.error("[IPC] LoRA training error:", error);
        // Send error progress update
        event.sender.send("training-progress", {
          progress: 0,
          message: `Training error: ${error}`,
        });
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    }
  );

  // Handle LoRA Adapter Deployment (Unsloth-compatible)
  ipcMain.handle(
    "deploy-lora-adapter",
    async (
      event: IpcMainInvokeEvent,
      params: {
        adapterId: string;
        adapterName: string;
        baseModel: string;
        outputModelName: string;
        deploymentType: "unsloth_gguf" | "ollama_adapter" | "merged_model";
        adapterPath: string;
      }
    ) => {
      console.log("[IPC] Received LoRA adapter deployment request:", {
        adapterId: params.adapterId,
        adapterName: params.adapterName,
        baseModel: params.baseModel,
        outputModelName: params.outputModelName,
        deploymentType: params.deploymentType,
      });

      try {
        // Use the existing deployAdapter method from LoRATrainingService
        // which already implements the Unsloth-compatible deployment flow
        const result = await trainingService.deployAdapter(
          params.adapterId,
          params.baseModel,
          params.outputModelName
        );

        if (result.success) {
          console.log("[IPC] LoRA adapter deployed successfully:", {
            modelName: params.outputModelName,
            adapterId: params.adapterId,
          });

          return {
            success: true,
            modelName: params.outputModelName,
            deploymentDetails: {
              adapterPath: params.adapterPath,
              deploymentType: params.deploymentType,
              baseModel: params.baseModel,
              ...result.details,
            },
          };
        } else {
          console.error("[IPC] LoRA adapter deployment failed:", result.error);
          return {
            success: false,
            error: result.error || "Deployment failed",
          };
        }
      } catch (error) {
        console.error("[IPC] LoRA adapter deployment error:", error);
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Unknown deployment error",
        };
      }
    }
  );

  // Handle LoRA adapter merging requests
  ipcMain.handle(
    "merge-lora-adapters",
    async (event: IpcMainInvokeEvent, request: MergeRequest) => {
      console.log("[IPC] Received LoRA merge request:", {
        adapterCount: request.adapters.length,
        strategy: request.strategy,
        outputName: request.outputName,
        baseModel: request.targetBaseModel,
      });

      try {
        const result = await mergeService.mergeAdapters(request);

        if (result.success) {
          console.log("[IPC] LoRA merge completed successfully");
          console.log("[IPC] Merged adapter path:", result.mergedAdapterPath);
        } else {
          console.error("[IPC] LoRA merge failed:", result.error);
        }

        return result;
      } catch (error) {
        console.error("[IPC] LoRA merge error:", error);
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    }
  );

  // Handle listing merged adapters
  ipcMain.handle("list-merged-adapters", async (event: IpcMainInvokeEvent) => {
    try {
      const adapters = await mergeService.listMergedAdapters();
      console.log(`[IPC] Listed ${adapters.length} merged adapters`);
      return { success: true, adapters };
    } catch (error) {
      console.error("[IPC] Error listing merged adapters:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        adapters: [],
      };
    }
  });

  // Handle removing merged adapter
  ipcMain.handle(
    "remove-merged-adapter",
    async (event: IpcMainInvokeEvent, adapterName: string) => {
      console.log(
        "[IPC] Received request to remove merged adapter:",
        adapterName
      );

      try {
        const result = await mergeService.removeMergedAdapter(adapterName);

        if (result.success) {
          console.log("[IPC] Merged adapter removed successfully");
        } else {
          console.error("[IPC] Failed to remove merged adapter:", result.error);
        }

        return result;
      } catch (error) {
        console.error("[IPC] Error removing merged adapter:", error);
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    }
  );

  // Handle sharing merged adapter via P2P
  ipcMain.handle(
    "share-merged-adapter",
    async (event: IpcMainInvokeEvent, adapterName: string) => {
      console.log(
        "[IPC] Received request to share merged adapter:",
        adapterName
      );

      try {
        // Get merged adapter info
        const mergedAdapters = await mergeService.listMergedAdapters();
        const targetAdapter = mergedAdapters.find(
          (adapter) => adapter.name === adapterName
        );

        if (!targetAdapter) {
          throw new Error(`Merged adapter not found: ${adapterName}`);
        }

        // Create P2P adapter info with merge metadata
        const adapterInfo = {
          name: `${adapterName} (merged)`,
          topic: `merged-${adapterName}-${Date.now()}`,
          size: "Unknown", // Will be calculated during sharing
          metadata: targetAdapter.metadata,
        };

        console.log("[IPC] Sharing merged adapter with metadata:", {
          name: adapterInfo.name,
          topic: adapterInfo.topic,
          sourceAdapters: targetAdapter.metadata.sourceAdapters.length,
          strategy: targetAdapter.metadata.mergeStrategy,
        });

        return {
          success: true,
          adapterInfo,
          mergedAdapterPath: targetAdapter.path,
        };
      } catch (error) {
        console.error("[IPC] Error sharing merged adapter:", error);
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    }
  );

  // Handle delete Ollama model requests
  ipcMain.handle(
    "delete-ollama-model",
    async (event: IpcMainInvokeEvent, modelName: string) => {
      console.log("[IPC] Received delete model request for:", modelName);

      try {
        return new Promise((resolve) => {
          const ollamaProcess = spawn("ollama", ["rm", modelName], {
            stdio: ["pipe", "pipe", "pipe"],
          });

          let stdout = "";
          let stderr = "";

          ollamaProcess.stdout?.on("data", (data: Buffer) => {
            stdout += data.toString();
          });

          ollamaProcess.stderr?.on("data", (data: Buffer) => {
            stderr += data.toString();
          });

          ollamaProcess.on("close", (code: number) => {
            console.log(`[IPC] Ollama delete finished with code: ${code}`);
            console.log(`[IPC] Stdout: ${stdout}`);
            console.log(`[IPC] Stderr: ${stderr}`);

            if (code === 0) {
              console.log(`[IPC] Successfully deleted model: ${modelName}`);
              resolve({
                success: true,
                message: `Model ${modelName} deleted successfully`,
              });
            } else {
              console.error(`[IPC] Failed to delete model: ${modelName}`);
              resolve({
                success: false,
                error: `Failed to delete model. Exit code: ${code}. Error: ${stderr}`,
              });
            }
          });

          ollamaProcess.on("error", (error: Error) => {
            console.error("[IPC] Error spawning ollama process:", error);
            resolve({
              success: false,
              error: `Failed to start ollama command: ${error.message}`,
            });
          });
        });
      } catch (error) {
        console.error("[IPC] Delete model error:", error);
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    }
  );

  // Handle delete adapter files from filesystem
  ipcMain.handle(
    "delete-adapter-files",
    async (event: IpcMainInvokeEvent, adapterName: string) => {
      console.log(
        "[IPC] Received delete adapter files request for:",
        adapterName
      );

      try {
        const fs = await import("fs/promises");
        const path = await import("path");
        const { app } = require("electron");

        // Get project root directory
        const getProjectRoot = (): string => {
          const os = require("os");

          // Platform-specific paths to match Python's behavior
          let userDataDir: string;
          if (process.platform === "win32") {
            // Windows: Use AppData/Local/Programs/lora_adapters as reported by user
            userDataDir = path.join(os.homedir(), "AppData", "Local", "Programs");
          } else if (process.platform === "darwin") {
            // macOS: Use Library/Application Support/Orch-OS
            userDataDir = path.join(os.homedir(), "Library", "Application Support", "Orch-OS");
          } else {
            // Linux: Use .local/share/orch-os
            userDataDir = path.join(os.homedir(), ".local", "share", "orch-os");
          }

          const potentialRoots = [
            userDataDir,
            process.cwd(),
            path.resolve(__dirname, "../../../.."),
            app.getAppPath ? app.getAppPath() : null,
            process.resourcesPath
              ? path.resolve(process.resourcesPath, "..")
              : null,
            "/Users/guilhermeferraribrescia/orch-os",
          ].filter(Boolean) as string[];

          // Find the one that contains lora_adapters
          for (const candidateRoot of potentialRoots) {
            try {
              const loraAdaptersPath = path.join(
                candidateRoot,
                "lora_adapters"
              );
              const fs = require("fs");
              if (fs.existsSync(loraAdaptersPath)) {
                return candidateRoot;
              }
            } catch (error) {
              // Continue to next candidate
            }
          }

          // Fallback to userData directory
          return userDataDir;
        };

        const projectRoot = getProjectRoot();
        const weightsDir = path.join(projectRoot, "lora_adapters", "weights");
        const registryDir = path.join(projectRoot, "lora_adapters", "registry");

        console.log(`[IPC] Project root: ${projectRoot}`);
        console.log(`[IPC] Weights dir: ${weightsDir}`);
        console.log(`[IPC] Registry dir: ${registryDir}`);

        // Clean adapter name - remove _adapter suffix if present for directory search
        const cleanAdapterName = adapterName.replace(/_adapter$/, "");

        // Try multiple possible adapter directory names
        const possibleAdapterDirs = [
          path.join(weightsDir, `${adapterName}_adapter`),
          path.join(weightsDir, adapterName),
          path.join(weightsDir, `${cleanAdapterName}_adapter`),
          path.join(weightsDir, cleanAdapterName),
          // Handle underscore to hyphen conversion
          path.join(
            weightsDir,
            `${cleanAdapterName.replace(/_/g, "-")}_adapter`
          ),
          path.join(weightsDir, cleanAdapterName.replace(/_/g, "-")),
          // Handle full name underscore to hyphen conversion
          path.join(weightsDir, adapterName.replace(/_/g, "-")),
          path.join(weightsDir, `${adapterName.replace(/_/g, "-")}_adapter`),
        ];

        // Try multiple possible registry file names
        const possibleRegistryFiles = [
          path.join(registryDir, `${adapterName}_adapter.json`),
          path.join(registryDir, `${adapterName}.json`),
          path.join(registryDir, `${cleanAdapterName}_adapter.json`),
          path.join(registryDir, `${cleanAdapterName}.json`),
          // Handle underscore to hyphen conversion
          path.join(
            registryDir,
            `${cleanAdapterName.replace(/_/g, "-")}_adapter.json`
          ),
          path.join(registryDir, `${cleanAdapterName.replace(/_/g, "-")}.json`),
          // Handle full name underscore to hyphen conversion
          path.join(
            registryDir,
            `${adapterName.replace(/_/g, "-")}_adapter.json`
          ),
          path.join(registryDir, `${adapterName.replace(/_/g, "-")}.json`),
        ];

        let deletedFiles = 0;
        let deletedDirs = 0;

        // Delete adapter weight directory
        for (const adapterDir of possibleAdapterDirs) {
          try {
            const stat = await fs.stat(adapterDir);
            if (stat.isDirectory()) {
              await fs.rm(adapterDir, { recursive: true, force: true });
              console.log(`[IPC] Deleted adapter directory: ${adapterDir}`);
              deletedDirs++;
              break; // Found and deleted, stop searching
            }
          } catch (error) {
            // Directory doesn't exist or can't be accessed, continue to next
          }
        }

        // Delete adapter registry file
        for (const registryFile of possibleRegistryFiles) {
          try {
            await fs.access(registryFile);
            await fs.unlink(registryFile);
            console.log(`[IPC] Deleted registry file: ${registryFile}`);
            deletedFiles++;
            break; // Found and deleted, stop searching
          } catch (error) {
            // File doesn't exist or can't be accessed, continue to next
          }
        }

        const success = deletedFiles > 0 || deletedDirs > 0;
        const message = success
          ? `Deleted ${deletedDirs} directories and ${deletedFiles} files for adapter: ${adapterName}`
          : `No files found for adapter: ${adapterName}`;

        console.log(`[IPC] Delete adapter result: ${message}`);

        return {
          success: true, // Always return success even if no files found
          message,
          deletedFiles,
          deletedDirs,
        };
      } catch (error) {
        console.error("[IPC] Delete adapter files error:", error);
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    }
  );

  console.log("[IPC] LoRA training and model management handlers initialized");
}
