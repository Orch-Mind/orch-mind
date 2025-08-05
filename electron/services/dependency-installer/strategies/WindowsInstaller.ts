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
      case "python":
        await this.installPython(onProgress);
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
      python: `1. Download from https://www.python.org/downloads/windows/
2. Run the installer
3. Check "Add Python to PATH" during installation
Alternative: Run 'winget install Python.Python.3.12' in PowerShell`,
      winget: `Winget comes pre-installed with Windows 10 (1709+) and Windows 11.
If missing:
1. Install from Microsoft Store: "App Installer"
2. Or download from: https://github.com/microsoft/winget-cli/releases`,
      chocolatey: `Install Chocolatey package manager:
1. Run PowerShell as Administrator
2. Run: Set-ExecutionPolicy Bypass -Scope Process -Force
3. Run: iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))`,
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

  /**
   * Ensure package managers are available, installing if necessary
   */
  private async ensurePackageManagers(
    onProgress?: (message: string) => void
  ): Promise<boolean> {
    // Check if winget is available (comes with Windows 10 1709+ and Windows 11)
    const hasWinget = await this.commandExecutor.checkCommand("winget");
    if (hasWinget) {
      onProgress?.("📦 Winget package manager is available");
      return true;
    }

    // Check if Chocolatey is available
    const hasChoco = await this.commandExecutor.checkCommand("choco");
    if (hasChoco) {
      onProgress?.("🍫 Chocolatey package manager is available");
      return true;
    }

    // Try to install Chocolatey as fallback
    onProgress?.("📦 No package manager found - installing Chocolatey...");
    try {
      await this.installChocolatey(onProgress);
      return true;
    } catch (error) {
      onProgress?.("❌ Failed to install package manager automatically");
      throw new Error(
        "No package manager available. Please install Winget (via Microsoft Store) or Chocolatey manually."
      );
    }
  }

  /**
   * Install Chocolatey package manager
   */
  private async installChocolatey(
    onProgress?: (message: string) => void
  ): Promise<void> {
    onProgress?.("🍫 Installing Chocolatey package manager...");
    
    const installCommand = `Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))`;
    
    await this.executeWithProgress(
      installCommand,
      "chocolatey",
      onProgress
    );

    // Verify installation
    const hasChoco = await this.commandExecutor.checkCommand("choco");
    if (!hasChoco) {
      throw new Error("Chocolatey installation verification failed");
    }

    onProgress?.("✅ Chocolatey installed successfully!");
  }

  private async installOllama(
    onProgress?: (message: string) => void
  ): Promise<void> {
    this.progressReporter.reportDownloading(
      "ollama",
      "Installing Ollama for Windows..."
    );

    // Ensure package managers are available
    await this.ensurePackageManagers(onProgress);

    onProgress?.("🦙 Installing Ollama via package manager...");
    const success = await this.tryPackageManagers("ollama", [
      {
        name: "winget",
        checkCommand: "winget",
        installCommand: "winget install --id Ollama.Ollama --accept-source-agreements --accept-package-agreements",
      },
      {
        name: "Chocolatey",
        checkCommand: "choco",
        installCommand: "choco install ollama -y",
      },
    ]);

    if (!success) {
      throw new Error(
        "Failed to install Ollama via package managers. Please download manually from https://ollama.com/download/windows"
      );
    }

    onProgress?.("✅ Ollama installed successfully!");
  }

  /**
   * Install Python on Windows
   */
  private async installPython(
    onProgress?: (message: string) => void
  ): Promise<void> {
    this.progressReporter.reportDownloading(
      "python",
      "Installing Python for Windows..."
    );

    // Ensure package managers are available
    await this.ensurePackageManagers(onProgress);

    onProgress?.("🐍 Installing Python via package manager...");
    const success = await this.tryPackageManagers("python", [
      {
        name: "winget",
        checkCommand: "winget",
        installCommand: "winget install --id Python.Python.3.12 --accept-source-agreements --accept-package-agreements",
      },
      {
        name: "Chocolatey",
        checkCommand: "choco",
        installCommand: "choco install python312 -y",
      },
    ]);

    if (!success) {
      throw new Error(
        "Failed to install Python via package managers. Please download manually from https://www.python.org/downloads/windows/"
      );
    }

    onProgress?.("✅ Python installed successfully!");
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
