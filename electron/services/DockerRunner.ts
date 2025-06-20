// SPDX-License-Identifier: MIT OR Apache-2.0
// Enhanced DockerRunner with proper vLLM configuration
// Based on official vLLM documentation: https://docs.vllm.ai/en/v0.8.4/deployment/docker.html

import { ChildProcessWithoutNullStreams, spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

export interface DockerRunnerConfig {
  image?: string;
  port?: number;
  modelName?: string;
  ollamaModelsPath?: string;
  enableGPU?: boolean;
  gpuMemoryUtilization?: number;
  maxModelLen?: number;
  huggingFaceToken?: string;
  shmSize?: string; // e.g., "16g"
}

export class DockerRunner {
  private readonly image: string;
  private readonly port: number;
  private readonly config: DockerRunnerConfig;
  private containerId: string | null = null;
  private proc: ChildProcessWithoutNullStreams | null = null;

  constructor(config: DockerRunnerConfig = {}) {
    this.config = {
      image: "vllm/vllm-openai:latest", // Use official vLLM image
      port: 33220,
      modelName: "microsoft/DialoGPT-medium",
      enableGPU: true,
      gpuMemoryUtilization: 0.9,
      maxModelLen: 4096,
      shmSize: "16g", // Default shared memory size
      ...config,
    };

    this.image = this.config.image!;
    this.port = this.config.port!;
  }

  /** Pull image if not present and start the container with proper configuration */
  async run(modelName?: string): Promise<void> {
    // Use provided model name or default from config
    if (modelName) {
      this.config.modelName = modelName;
    }

    await this.ensureImage();

    // Get paths for volumes
    const ollamaModelsPath = this.getOllamaModelsPath();
    const huggingFaceCachePath = this.getHuggingFaceCachePath();

    // Build docker run command following official vLLM documentation
    const dockerArgs = [
      "run",
      "-d",
      "--rm",
      "--name",
      `orch-vllm-${Date.now()}`,
    ];

    // Add GPU support if available (following official docs)
    const hasGPU = await this.hasNvidiaGPU();
    if (this.config.enableGPU && hasGPU) {
      // Add runtime nvidia (required for GPU support)
      dockerArgs.push("--runtime", "nvidia");
      dockerArgs.push("--gpus", "all");
    }

    // Add IPC host mode for PyTorch shared memory (critical for performance)
    dockerArgs.push("--ipc=host");

    // Alternative: use --shm-size if --ipc=host is not desired
    // dockerArgs.push("--shm-size", this.config.shmSize!);

    // Port mapping
    dockerArgs.push("-p", `${this.port}:8000`);

    // Volume for HuggingFace cache (following official docs)
    dockerArgs.push("-v", `${huggingFaceCachePath}:/root/.cache/huggingface`);

    // Add volume for Ollama models if they exist
    if (ollamaModelsPath && fs.existsSync(ollamaModelsPath)) {
      dockerArgs.push("-v", `${ollamaModelsPath}:/models:ro`);
    }

    // Environment variables
    if (this.config.huggingFaceToken) {
      dockerArgs.push(
        "-e",
        `HUGGING_FACE_HUB_TOKEN=${this.config.huggingFaceToken}`
      );
    }

    // Add other environment variables for vLLM configuration
    if (hasGPU) {
      dockerArgs.push("-e", "CUDA_VISIBLE_DEVICES=0");
    }

    // Add the image
    dockerArgs.push(this.image);

    // Add vLLM command arguments (following official docs format)
    dockerArgs.push(
      "--model",
      this.config.modelName!,
      "--host",
      "0.0.0.0",
      "--port",
      "8000"
    );

    // Add optional vLLM engine arguments
    if (this.config.maxModelLen) {
      dockerArgs.push("--max-model-len", String(this.config.maxModelLen));
    }

    if (this.config.enableGPU && hasGPU && this.config.gpuMemoryUtilization) {
      dockerArgs.push(
        "--gpu-memory-utilization",
        String(this.config.gpuMemoryUtilization)
      );
    }

    // Additional performance optimizations
    dockerArgs.push("--dtype", "auto", "--tensor-parallel-size", "1");

    // Run the container
    console.log(
      `[DockerRunner] Starting vLLM container with args:`,
      dockerArgs.join(" ")
    );
    const run = spawnSync("docker", dockerArgs, { encoding: "utf8" });

    if (run.status !== 0) {
      // Check for common errors
      if (run.stderr?.includes("runtime")) {
        throw new Error(
          `Docker runtime error. On Linux, ensure nvidia-docker2 is installed. ` +
            `On Windows/Mac, Docker Desktop should handle GPU support automatically.\n` +
            `Error: ${run.stderr}`
        );
      }
      throw new Error(`Docker run failed: ${run.stderr || run.stdout}`);
    }

    this.containerId = run.stdout.trim();
    console.log(`[DockerRunner] vLLM container started: ${this.containerId}`);

    // Wait a bit for the server to start
    await this.waitForServer();
  }

  /** Stop the running container if any */
  async stop(): Promise<void> {
    if (!this.containerId) return;

    console.log(`[DockerRunner] Stopping container: ${this.containerId}`);
    const stop = spawnSync("docker", ["stop", this.containerId], {
      encoding: "utf8",
    });

    if (stop.status !== 0) {
      console.error(`[DockerRunner] Failed to stop container: ${stop.stderr}`);
    }

    this.containerId = null;
  }

  /** Check if container is running */
  async isRunning(): Promise<boolean> {
    if (!this.containerId) return false;

    const inspect = spawnSync(
      "docker",
      ["inspect", "-f", "{{.State.Running}}", this.containerId],
      { encoding: "utf8" }
    );

    return inspect.status === 0 && inspect.stdout.trim() === "true";
  }

  /* ---------- helpers ---------- */

  private async ensureImage(): Promise<void> {
    console.log(`[DockerRunner] Checking for image: ${this.image}`);
    const inspect = spawnSync("docker", ["image", "inspect", this.image], {
      encoding: "utf8",
    });

    if (inspect.status === 0) {
      console.log(`[DockerRunner] Image already exists`);
      return;
    }

    console.log(
      `[DockerRunner] Pulling image: ${this.image} (this may take a while)`
    );
    const pull = spawnSync("docker", ["pull", this.image], {
      stdio: "inherit",
    });

    if (pull.status !== 0) {
      throw new Error(
        `Failed to pull vLLM image. Ensure Docker is running and you have internet access.`
      );
    }
  }

  private getOllamaModelsPath(): string {
    // Default Ollama models path based on OS
    const homeDir = os.homedir();
    const platform = os.platform();

    let modelsPath: string;
    if (platform === "darwin") {
      // macOS
      modelsPath = path.join(homeDir, ".ollama", "models");
    } else if (platform === "win32") {
      // Windows
      const appData =
        process.env.APPDATA || path.join(homeDir, "AppData", "Roaming");
      modelsPath = path.join(appData, "ollama", "models");
    } else {
      // Linux
      modelsPath = path.join(homeDir, ".ollama", "models");
    }

    // Check if custom path is set via environment variable
    if (process.env.OLLAMA_MODELS) {
      modelsPath = process.env.OLLAMA_MODELS;
    }

    console.log(`[DockerRunner] Ollama models path: ${modelsPath}`);
    return modelsPath;
  }

  private getHuggingFaceCachePath(): string {
    const homeDir = os.homedir();
    const platform = os.platform();

    let cachePath: string;
    if (platform === "win32") {
      // Windows uses different path
      cachePath = path.join(homeDir, ".cache", "huggingface");
    } else {
      // macOS and Linux
      cachePath = path.join(homeDir, ".cache", "huggingface");
    }

    // Ensure directory exists
    if (!fs.existsSync(cachePath)) {
      fs.mkdirSync(cachePath, { recursive: true });
    }

    return cachePath;
  }

  private async hasNvidiaGPU(): Promise<boolean> {
    const platform = os.platform();

    try {
      if (platform === "win32") {
        // Windows: Check using wmic
        const check = spawnSync(
          "wmic",
          ["path", "win32_VideoController", "get", "name"],
          { encoding: "utf8", shell: true }
        );

        if (
          check.status === 0 &&
          check.stdout.toLowerCase().includes("nvidia")
        ) {
          console.log("[DockerRunner] NVIDIA GPU detected on Windows");
          return true;
        }
      } else {
        // Linux/macOS: Use nvidia-smi
        const check = spawnSync(
          "nvidia-smi",
          ["--query-gpu=name", "--format=csv,noheader"],
          { encoding: "utf8" }
        );

        if (check.status === 0 && check.stdout.trim()) {
          console.log(
            `[DockerRunner] NVIDIA GPU detected: ${check.stdout.trim()}`
          );
          return true;
        }
      }
    } catch (error) {
      // Command not found or failed
      console.log(`[DockerRunner] GPU detection failed: ${error}`);
    }

    console.log(
      "[DockerRunner] No NVIDIA GPU detected, vLLM will run in CPU mode"
    );
    return false;
  }

  private async waitForServer(maxRetries = 30, delayMs = 2000): Promise<void> {
    console.log("[DockerRunner] Waiting for vLLM server to be ready...");

    for (let i = 0; i < maxRetries; i++) {
      try {
        // Check if container is still running
        if (!(await this.isRunning())) {
          throw new Error("Container stopped unexpectedly");
        }

        // Try to check server health
        const health = spawnSync(
          "curl",
          ["-s", "-f", `http://localhost:${this.port}/health`],
          { encoding: "utf8" }
        );

        if (health.status === 0) {
          console.log("[DockerRunner] vLLM server is ready!");
          return;
        }
      } catch (error) {
        // Server not ready yet
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    throw new Error("vLLM server failed to start within timeout");
  }
}
