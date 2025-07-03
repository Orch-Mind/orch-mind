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

  console.log("[IPC] LoRA training and model management handlers initialized");
}
