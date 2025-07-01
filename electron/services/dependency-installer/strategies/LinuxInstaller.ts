// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { BasePlatformInstaller } from "./BasePlatformInstaller";

/**
 * Linux platform installer
 * Strategy pattern implementation for Linux
 */
export class LinuxInstaller extends BasePlatformInstaller {
  readonly platform: NodeJS.Platform = "linux";

  /**
   * Install dependency on Linux
   */
  async install(
    dependency: string,
    onProgress?: (message: string) => void
  ): Promise<void> {
    this.progressReporter.reportChecking(
      dependency,
      "Detecting Linux distribution..."
    );

    switch (dependency) {
      case "ollama":
        await this.installOllama(onProgress);
        break;
      default:
        throw new Error(`Unknown dependency: ${dependency}`);
    }
  }

  /**
   * Get manual installation instructions for Linux
   */
  getManualInstructions(dependency: string): string {
    const instructions: Record<string, string> = {
      ollama: `Run in terminal:
curl -fsSL https://ollama.com/install.sh | sh`,
    };

    return (
      instructions[dependency] ||
      "Please visit the official website for installation instructions."
    );
  }

  /**
   * Check if running with required privileges
   */
  async checkPrivileges(): Promise<boolean> {
    try {
      // Check if running as root
      const { stdout } = await this.commandExecutor.execute("id -u");
      if (stdout.trim() === "0") return true;

      // Check if user can sudo without password
      await this.commandExecutor.execute("sudo -n true");
      return true;
    } catch {
      return false;
    }
  }

  private async installOllama(
    onProgress?: (message: string) => void
  ): Promise<void> {
    this.progressReporter.reportDownloading(
      "ollama",
      "Downloading Ollama for Linux..."
    );

    await this.executeWithProgress(
      "curl -fsSL https://ollama.com/install.sh | sh",
      "ollama",
      onProgress
    );
  }
}
