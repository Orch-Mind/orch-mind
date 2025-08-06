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
      python: `Manual installation for Windows:
1. Download from https://www.python.org/downloads/windows/
2. Run the installer
3. Check "Add Python to PATH" during installation
Alternative: Run 'winget install Python.Python.3.11' in PowerShell`,
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
  ): Promise<void> {
    // Check if winget is available (comes with Windows 10 1709+ and Windows 11)
    const hasWinget = await this.commandExecutor.checkCommand("winget");
    if (hasWinget) {
      onProgress?.("📦 Winget package manager is available");
      return;
    }

    // Check if Chocolatey is available
    const hasChoco = await this.commandExecutor.checkCommand("choco");
    if (hasChoco) {
      onProgress?.("🍫 Chocolatey package manager is available");
      return;
    }

    // Try to install Chocolatey as fallback (user-scope if possible)
    onProgress?.("📦 No package manager found - installing Chocolatey...");
    try {
      await this.installChocolatey(onProgress);
    } catch (error) {
      onProgress?.("❌ Failed to install package manager automatically");
      throw new Error(
        "No package manager available. Please install Winget (via Microsoft Store) or Chocolatey manually."
      );
    }
  }

  /**
   * Install Chocolatey package manager (user-scope when possible)
   */
  private async installChocolatey(
    onProgress?: (message: string) => void
  ): Promise<void> {
    this.progressReporter.reportDownloading(
      "chocolatey",
      "Installing Chocolatey package manager..."
    );

    onProgress?.("🍫 Installing Chocolatey package manager...");
    
    try {
      // Try user-scope installation first (no admin required)
      const userInstallCommand = `[Environment]::SetEnvironmentVariable('ChocolateyInstall', '$env:USERPROFILE\\chocolatey', 'User'); Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))`;
      
      await this.executeWithProgress(
        userInstallCommand,
        "chocolatey",
        onProgress
      );
    } catch (error) {
      onProgress?.("⚠️ User-scope installation failed, trying system-wide...");
      
      // Check if we have admin privileges for system-wide installation
      const hasAdmin = await this.checkPrivileges();
      if (!hasAdmin) {
        throw new Error(
          "Chocolatey installation failed. Please run as administrator or install Winget from Microsoft Store."
        );
      }
      
      // Fallback to system-wide installation
      const systemInstallCommand = `Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))`;
      
      await this.executeWithProgress(
        systemInstallCommand,
        "chocolatey",
        onProgress
      );
    }

    // Verify installation
    const hasChoco = await this.commandExecutor.checkCommand("choco");
    if (!hasChoco) {
      throw new Error("Chocolatey installation verification failed");
    }

    onProgress?.("✅ Chocolatey installed successfully!");
    this.progressReporter.reportCompleted(
      "chocolatey",
      "Chocolatey package manager installed successfully!"
    );
  }

  private async installOllama(
    onProgress?: (message: string) => void
  ): Promise<void> {
    this.progressReporter.reportDownloading(
      "ollama",
      "Downloading Ollama for Windows..."
    );

    // Try official install script first (if available)
    try {
      onProgress?.("📥 Trying official Ollama installer...");
      await this.executeWithProgress(
        "powershell -Command \"& {Invoke-WebRequest -Uri https://ollama.com/install.sh -OutFile $env:TEMP\\install-ollama.ps1; & $env:TEMP\\install-ollama.ps1}\"",
        "ollama",
        onProgress
      );
      onProgress?.("✅ Ollama installed via official installer!");
      return;
    } catch (error) {
      onProgress?.("⚠️ Official script failed, trying package managers...");
      console.log("Official script failed, trying package managers...");
    }

    // Try package managers
    try {
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

      if (success) {
        onProgress?.("✅ Ollama installed via package manager!");
        return;
      }
    } catch (error) {
      onProgress?.("⚠️ Package manager installation failed...");
      console.log("Package manager installation failed:", error);
    }

    // Final fallback: Direct download
    try {
      onProgress?.("⬇️ Downloading Ollama installer directly...");
      const downloadCommand = `powershell -Command "Invoke-WebRequest -Uri 'https://ollama.com/download/OllamaSetup.exe' -OutFile '$env:TEMP\\OllamaSetup.exe'; Start-Process '$env:TEMP\\OllamaSetup.exe' -Wait"`;
      await this.executeWithProgress(downloadCommand, "ollama", onProgress);
      
      onProgress?.("✅ Ollama installed successfully!");
    } catch (error) {
      throw new Error(
        "Automatic Ollama installation failed with all methods. " +
        "Please install Ollama manually from https://ollama.com/download/windows"
      );
    }
  }

  /**
   * Install Python 3.11.9 on Windows (user-scope when possible)
   */
  private async installPython(
    onProgress?: (message: string) => void
  ): Promise<void> {
    this.progressReporter.reportDownloading(
      "python",
      "Installing Python 3.11.9 for Windows..."
    );

    onProgress?.("🐍 Installing Python 3.11.9...");

    // Try package managers first
    try {
      await this.ensurePackageManagers(onProgress);
      
      onProgress?.("📦 Installing Python via package manager...");
      const success = await this.tryPackageManagers("python", [
        {
          name: "winget",
          checkCommand: "winget",
          installCommand: "winget install --id Python.Python.3.11 --accept-source-agreements --accept-package-agreements",
        },
        {
          name: "Chocolatey",
          checkCommand: "choco",
          installCommand: "choco install python311 -y",
        },
      ]);

      if (success) {
        onProgress?.("✅ Python installed via package manager!");
        return;
      }
    } catch (error) {
      onProgress?.("⚠️ Package manager installation failed, trying direct download...");
      console.log("Package manager Python installation failed:", error);
    }

    // Fallback: Direct download and installation
    try {
      onProgress?.("⬇️ Downloading Python 3.11.9 installer...");
      const downloadCommand = `powershell -Command "Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe' -OutFile '$env:TEMP\\python-3.11.9-installer.exe'"`;
      await this.executeWithProgress(downloadCommand, "python", onProgress);
      
      onProgress?.("📦 Installing Python for current user...");
      // Install Python for current user (no admin required)
      const installCommand = `powershell -Command "Start-Process '$env:TEMP\\python-3.11.9-installer.exe' -ArgumentList '/quiet', 'InstallAllUsers=0', 'PrependPath=1', 'Include_test=0' -Wait"`;
      await this.executeWithProgress(installCommand, "python", onProgress);
      
      onProgress?.("✅ Python 3.11.9 installed successfully!");
    } catch (error) {
      throw new Error(
        "Failed to install Python automatically. Please download and install manually from https://www.python.org/downloads/windows/"
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
