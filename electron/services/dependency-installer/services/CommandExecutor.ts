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
      const shellOptions = this.getShellOptions();
      const result = await execAsync(command, shellOptions);
      return {
        stdout: result.stdout?.toString() || "",
        stderr: result.stderr?.toString() || "",
      };
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
      // Special handling for Homebrew on macOS
      if (command === "brew" && this.platform === "darwin") {
        return await this.checkHomebrew();
      }

      const checkCmd = this.platform === "win32" ? "where" : "which";
      await this.execute(`${checkCmd} ${command}`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if Homebrew is installed on macOS
   * Tries common installation paths
   */
  private async checkHomebrew(): Promise<boolean> {
    const brewPaths = [
      "/opt/homebrew/bin/brew", // Apple Silicon default
      "/usr/local/bin/brew", // Intel Mac default
      "/home/linuxbrew/.linuxbrew/bin/brew", // Linux brew
    ];

    // First try which command
    try {
      await this.execute("which brew");
      return true;
    } catch {
      // If which fails, try direct paths
    }

    // Try common installation paths
    for (const brewPath of brewPaths) {
      try {
        await this.execute(`test -f ${brewPath}`);
        console.log(`🍺 [CommandExecutor] Found Homebrew at: ${brewPath}`);
        return true;
      } catch {
        // Continue to next path
      }
    }

    // Try using the shell's PATH expansion
    try {
      await this.execute("brew --version");
      return true;
    } catch {
      // Last resort failed
    }

    console.log(
      "🍺 [CommandExecutor] Homebrew not found in any common location"
    );
    return false;
  }

  /**
   * Get platform-specific shell options
   */
  private getShellOptions(): any {
    if (this.platform === "win32") {
      return { shell: "powershell.exe" };
    }

    // For macOS/Linux, ensure we have the full PATH including Homebrew
    const env = { ...process.env };
    if (this.platform === "darwin") {
      // Add common Homebrew paths to PATH
      const brewPaths = [
        "/opt/homebrew/bin", // Apple Silicon
        "/opt/homebrew/sbin",
        "/usr/local/bin", // Intel Mac
        "/usr/local/sbin",
      ];

      const currentPath = env.PATH || "";
      const additionalPaths = brewPaths.filter(
        (path) => !currentPath.includes(path)
      );

      if (additionalPaths.length > 0) {
        env.PATH = `${additionalPaths.join(":")}:${currentPath}`;
        console.log(
          `🍺 [CommandExecutor] Enhanced PATH with Homebrew directories: ${env.PATH}`
        );
      }
    }

    return { env };
  }
}
