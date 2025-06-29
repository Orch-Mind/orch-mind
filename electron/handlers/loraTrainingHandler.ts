// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { spawn } from "child_process";
import { ipcMain, IpcMainInvokeEvent } from "electron";
import {
  LoRATrainingService,
  TrainingParams,
} from "../services/training/LoRATrainingService";

export function setupLoRATrainingHandlers(): void {
  const trainingService = new LoRATrainingService();

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
        const result = await trainingService.trainAdapter(params);

        if (result.success) {
          console.log("[IPC] LoRA training completed successfully");
        } else {
          console.error("[IPC] LoRA training failed:", result.error);
        }

        return result;
      } catch (error) {
        console.error("[IPC] LoRA training error:", error);
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
