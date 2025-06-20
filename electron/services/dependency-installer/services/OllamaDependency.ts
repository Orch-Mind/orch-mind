// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import {
  DependencyStatus,
  ICommandExecutor,
  IInstallableDependency,
} from "../interfaces/IDependency";
import { IPlatformInstaller } from "../interfaces/IPlatformInstaller";

/**
 * Ollama dependency implementation
 * Single Responsibility: Managing Ollama dependency checks and metadata
 */
export class OllamaDependency implements IInstallableDependency {
  readonly name = "ollama";
  readonly displayName = "Ollama";

  constructor(
    private readonly commandExecutor: ICommandExecutor,
    private readonly installerFactory: (
      platform: NodeJS.Platform
    ) => IPlatformInstaller
  ) {}

  /**
   * Check if Ollama is installed
   */
  async check(): Promise<DependencyStatus> {
    try {
      // Try different version commands in order of preference
      const versionCommands = [
        "ollama --version",
        "ollama version",
        "ollama -v",
      ];

      let version: string | undefined;
      let stdout = "";

      for (const cmd of versionCommands) {
        try {
          const result = await this.commandExecutor.execute(cmd);
          stdout = result.stdout;
          version = this.parseVersion(stdout);
          if (version) break;
        } catch {
          // Try next command
        }
      }

      // If no version found, just check if command exists
      if (!version) {
        const exists = await this.commandExecutor.checkCommand("ollama");
        if (!exists) {
          return { installed: false };
        }
        version = "installed";
      }

      // Get installation path
      const path = await this.getPath();

      return {
        installed: true,
        version,
        path,
      };
    } catch (error) {
      console.error("[OllamaDependency] Check failed:", error);
      return { installed: false };
    }
  }

  /**
   * Install Ollama using platform-specific installer
   */
  async install(
    executor: ICommandExecutor,
    platform: NodeJS.Platform
  ): Promise<void> {
    const installer = this.installerFactory(platform);
    await installer.install(this.name);
  }

  /**
   * Get manual installation instructions
   */
  getManualInstructions(platform: NodeJS.Platform): string {
    const installer = this.installerFactory(platform);
    return installer.getManualInstructions(this.name);
  }

  /**
   * Parse version from command output
   */
  private parseVersion(output: string): string | undefined {
    const patterns = [/ollama version ([\d.]+)/i, /^([\d.]+)$/m, /v?([\d.]+)/i];

    for (const pattern of patterns) {
      const match = output.match(pattern);
      if (match?.[1]) {
        return match[1];
      }
    }

    // Return trimmed output if no pattern matches
    const trimmed = output.trim();
    return trimmed.length > 0 && trimmed.length < 20 ? trimmed : undefined;
  }

  /**
   * Get Ollama installation path
   */
  private async getPath(): Promise<string | undefined> {
    try {
      const { stdout } = await this.commandExecutor.execute(
        process.platform === "win32" ? "where ollama" : "which ollama"
      );
      return stdout.trim().split("\n")[0]; // First result on Windows
    } catch {
      return undefined;
    }
  }
}
