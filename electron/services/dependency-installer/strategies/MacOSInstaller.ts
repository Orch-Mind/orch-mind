// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { BasePlatformInstaller } from "./BasePlatformInstaller";

/**
 * macOS platform installer
 * Strategy pattern implementation for macOS
 */
export class MacOSInstaller extends BasePlatformInstaller {
  readonly platform: NodeJS.Platform = "darwin";

  /**
   * Install dependency on macOS
   */
  async install(
    dependency: string,
    onProgress?: (message: string) => void
  ): Promise<void> {
    this.progressReporter.reportChecking(
      dependency,
      "Detecting installation method for macOS..."
    );

    switch (dependency) {
      case "ollama":
        await this.installOllama(onProgress);
        break;
      case "docker":
        await this.installDocker(onProgress);
        break;
      default:
        throw new Error(`Unknown dependency: ${dependency}`);
    }
  }

  /**
   * Get manual installation instructions for macOS
   */
  getManualInstructions(dependency: string): string {
    const instructions: Record<string, string> = {
      ollama: `Manual installation for macOS:
1. Download from https://ollama.com/download/mac
2. Open the downloaded file and drag Ollama to Applications
3. Launch Ollama from Applications
Alternative: Run 'brew install ollama' in Terminal`,

      docker: `Manual installation for macOS:
1. Download Docker Desktop from https://docker.com/products/docker-desktop
2. Open the downloaded .dmg file
3. Drag Docker to Applications
4. Launch Docker Desktop
Alternative: Run 'brew install --cask docker' in Terminal`,
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
      "Downloading Ollama for macOS..."
    );

    // Try official install script first
    try {
      await this.executeWithProgress(
        "curl -fsSL https://ollama.com/install.sh | sh",
        "ollama",
        onProgress
      );
      return;
    } catch (error) {
      console.log("Official script failed, trying homebrew...");
    }

    // Try homebrew
    const success = await this.tryPackageManagers("ollama", [
      {
        name: "Homebrew",
        checkCommand: "brew",
        installCommand: "brew install ollama",
      },
    ]);

    if (!success) {
      throw new Error(
        "Homebrew not found. Please install Homebrew first or download Ollama from https://ollama.com"
      );
    }
  }

  private async installDocker(
    onProgress?: (message: string) => void
  ): Promise<void> {
    this.progressReporter.reportDownloading(
      "docker",
      "Installing Docker Desktop for macOS..."
    );

    const success = await this.tryPackageManagers("docker", [
      {
        name: "Homebrew Cask",
        checkCommand: "brew",
        installCommand: "brew install --cask docker",
      },
    ]);

    if (!success) {
      throw new Error(
        "Homebrew not found. Please install Homebrew first or download Docker Desktop from https://docker.com"
      );
    }

    this.progressReporter.reportInstalling(
      "docker",
      "Docker Desktop installed. Please launch Docker Desktop from Applications."
    );
  }
}
