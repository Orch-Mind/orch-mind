// SPDX-License-Identifier: MIT OR Apache-2.0
// Very small helper that encapsulates starting/stopping the vLLM docker container.
// The goal is to keep any docker-specific details away from the high-level VllmManager.

import { spawnSync, spawn, ChildProcessWithoutNullStreams } from "child_process";

export class DockerRunner {
  private readonly image: string;
  private readonly port: number;
  private containerId: string | null = null;
  private proc: ChildProcessWithoutNullStreams | null = null;

  constructor(image = "ghcr.io/vllm/vllm-openai:latest", port = 33220) {
    this.image = image;
    this.port = port;
  }

  /** Pull image if not present and start the container detached */
  async run(): Promise<void> {
    await this.ensureImage();

    // Run container detached
    const run = spawnSync("docker", [
      "run",
      "-d",
      "--rm",
      "-p",
      `${this.port}:8000`,
      this.image,
    ], { encoding: "utf8" });

    if (run.status !== 0) {
      throw new Error(`docker run failed: ${run.stderr}`);
    }
    this.containerId = run.stdout.trim();
  }

  /** Stop the running container if any */
  async stop(): Promise<void> {
    if (!this.containerId) return;
    spawnSync("docker", ["stop", this.containerId]);
    this.containerId = null;
  }

  /* ---------- helpers ---------- */
  private async ensureImage(): Promise<void> {
    const inspect = spawnSync("docker", ["inspect", "--type=image", this.image]);
    if (inspect.status === 0) return; // image exists

    const pull = spawnSync("docker", ["pull", this.image], { stdio: "inherit" });
    if (pull.status !== 0) {
      throw new Error(`docker pull ${this.image} failed`);
    }
  }
}
