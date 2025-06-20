// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { BasePlatformInstaller } from "./BasePlatformInstaller";

/**
 * Windows platform installer
 * Strategy pattern implementation for Windows
 */
export class WindowsInstaller extends BasePlatformInstaller {
  readonly platform: NodeJS.Platform = "win32";

  /**
   * Install dependency on Windows
   */
  async install(
    dependency: string,
    onProgress?: (message: string) => void
  ): Promise<void> {
    this.progressReporter.reportChecking(
      dependency,
      "Detecting installation method for Windows..."
    );

    // Check admin privileges
    const hasAdmin = await this.checkPrivileges();
    if (!hasAdmin) {
      throw new Error(
        "Administrator privileges required for installation on Windows"
      );
    }

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
   * Get manual installation instructions for Windows
   */
  getManualInstructions(dependency: string): string {
    const instructions: Record<string, string> = {
      ollama: `1. Download from https://ollama.com/download/windows
2. Run the installer
3. Follow the installation wizard
Alternative: Run 'winget install Ollama.Ollama' in PowerShell`,

      docker: `1. Download Docker Desktop from https://docker.com/products/docker-desktop
2. Run the installer
3. Follow the installation wizard
4. Restart your computer
Alternative: Run 'winget install Docker.DockerDesktop' in PowerShell`,
    };

    return (
      instructions[dependency] ||
      "Please visit the official website for installation instructions."
    );
  }

  /**
   * Check if running with administrator privileges
   */
  async checkPrivileges(): Promise<boolean> {
    try {
      await this.commandExecutor.execute("net session");
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
      "Downloading Ollama for Windows..."
    );

    const success = await this.tryPackageManagers("ollama", [
      {
        name: "winget",
        checkCommand: "winget",
        installCommand: "winget install --id Ollama.Ollama",
      },
      {
        name: "Chocolatey",
        checkCommand: "choco",
        installCommand: "choco install ollama -y",
      },
    ]);

    if (!success) {
      throw new Error(
        "Please download Ollama from https://ollama.com/download/windows"
      );
    }
  }

  private async installDocker(
    onProgress?: (message: string) => void
  ): Promise<void> {
    this.progressReporter.reportDownloading(
      "docker",
      "Installing Docker Desktop for Windows..."
    );

    const success = await this.tryPackageManagers("docker", [
      {
        name: "winget",
        checkCommand: "winget",
        installCommand: "winget install Docker.DockerDesktop",
      },
      {
        name: "Chocolatey",
        checkCommand: "choco",
        installCommand: "choco install docker-desktop -y",
      },
    ]);

    if (!success) {
      throw new Error(
        "Please download Docker Desktop from https://docker.com/products/docker-desktop"
      );
    }
  }

  /**
   * Override to handle Windows-specific command execution
   */
  protected async executeWithProgress(
    command: string,
    dependency: string,
    onProgress?: (message: string) => void
  ): Promise<void> {
    // Wrap in PowerShell for better Windows compatibility
    const powershellCommand = command.startsWith("powershell")
      ? command
      : `powershell -Command "${command}"`;

    await super.executeWithProgress(powershellCommand, dependency, onProgress);
  }
}
