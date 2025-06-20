// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { exec, spawn } from "child_process";
import { platform } from "os";
import { promisify } from "util";
import { ICommandExecutor } from "../interfaces/IDependency";

const execAsync = promisify(exec);

/**
 * Service responsible for executing system commands
 * Implements DRY by centralizing command execution logic
 */
export class CommandExecutor implements ICommandExecutor {
  private readonly platform: NodeJS.Platform;

  constructor() {
    this.platform = platform();
  }

  /**
   * Execute a command and return output
   */
  async execute(command: string): Promise<{ stdout: string; stderr: string }> {
    try {
      const result = await execAsync(command);
      return { stdout: result.stdout || "", stderr: result.stderr || "" };
    } catch (error: any) {
      throw new Error(`Command failed: ${command}\n${error.message}`);
    }
  }

  /**
   * Execute a command with real-time progress updates
   */
  executeWithProgress(
    command: string,
    onData?: (data: string) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const shellOptions = this.getShellOptions();
      const child = spawn(command, [], {
        shell: true,
        stdio: "pipe",
        ...shellOptions,
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => {
        const output = data.toString();
        stdout += output;
        onData?.(output);
        console.log(`[CommandExecutor] ${output}`);
      });

      child.stderr.on("data", (data) => {
        const output = data.toString();
        stderr += output;
        console.error(`[CommandExecutor] ${output}`);
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(
            new Error(
              `Command failed with code ${code}: ${command}\nstdout: ${stdout}\nstderr: ${stderr}`
            )
          );
        }
      });

      child.on("error", (error) => {
        reject(error);
      });
    });
  }

  /**
   * Check if a command exists on the system
   */
  async checkCommand(command: string): Promise<boolean> {
    try {
      const checkCmd = this.platform === "win32" ? "where" : "which";
      await this.execute(`${checkCmd} ${command}`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get platform-specific shell options
   */
  private getShellOptions(): any {
    if (this.platform === "win32") {
      return { shell: "powershell.exe" };
    }
    return {};
  }
}
