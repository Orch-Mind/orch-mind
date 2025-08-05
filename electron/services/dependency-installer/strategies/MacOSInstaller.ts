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
      case "python":
        await this.installPython(onProgress);
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
      python: `Manual installation for macOS:
1. Download from https://www.python.org/downloads/macos/
2. Run the installer package
3. Follow the installation wizard
Alternative: Run 'brew install python@3.12' in Terminal`,
      homebrew: `Manual installation for Homebrew:
1. Open Terminal
2. Run: /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
3. Follow the prompts
4. Restart Terminal after installation`,
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

  /**
   * Install Homebrew on macOS
   */
  private async installHomebrew(
    onProgress?: (message: string) => void
  ): Promise<void> {
    this.progressReporter.reportDownloading(
      "homebrew",
      "Installing Homebrew package manager..."
    );

    onProgress?.("📦 Installing Homebrew - this may take a few minutes...");

    try {
      // Official Homebrew installation script
      const installCommand = `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`;
      
      await this.executeWithProgress(
        installCommand,
        "homebrew",
        onProgress
      );

      // Verify Homebrew was installed
      const homebrewInstalled = await this.commandExecutor.checkCommand("brew");
      if (!homebrewInstalled) {
        throw new Error("Homebrew installation verification failed");
      }

      onProgress?.("✅ Homebrew installed successfully!");
      this.progressReporter.reportCompleted(
        "homebrew",
        "Homebrew package manager installed successfully!"
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      onProgress?.("❌ Homebrew installation failed");
      this.progressReporter.reportError(
        "homebrew",
        "Failed to install Homebrew",
        errorMessage
      );
      throw new Error(`Homebrew installation failed: ${errorMessage}`);
    }
  }

  /**
   * Ensure Homebrew is available, installing if necessary
   */
  private async ensureHomebrew(
    onProgress?: (message: string) => void
  ): Promise<void> {
    const hasHomebrew = await this.commandExecutor.checkCommand("brew");
    
    if (!hasHomebrew) {
      onProgress?.("🍺 Homebrew not found - installing automatically...");
      await this.installHomebrew(onProgress);
    } else {
      onProgress?.("🍺 Homebrew is already installed");
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
      onProgress?.("📥 Trying official Ollama installer...");
      await this.executeWithProgress(
        "curl -fsSL https://ollama.com/install.sh | sh",
        "ollama",
        onProgress
      );
      onProgress?.("✅ Ollama installed via official installer!");
      return;
    } catch (error) {
      onProgress?.("⚠️ Official script failed, trying Homebrew...");
      console.log("Official script failed, trying homebrew...");
    }

    // Ensure Homebrew is available before using it
    await this.ensureHomebrew(onProgress);

    // Now try homebrew
    onProgress?.("🍺 Installing Ollama via Homebrew...");
    const success = await this.tryPackageManagers("ollama", [
      {
        name: "Homebrew",
        checkCommand: "brew",
        installCommand: "brew install ollama",
      },
    ]);

    if (!success) {
      throw new Error(
        "Failed to install Ollama via Homebrew. Please try manual installation from https://ollama.com"
      );
    }

    onProgress?.("✅ Ollama installed via Homebrew!");
  }

  /**
   * Install Python on macOS
   */
  private async installPython(
    onProgress?: (message: string) => void
  ): Promise<void> {
    this.progressReporter.reportDownloading(
      "python",
      "Installing Python for macOS..."
    );

    // Ensure Homebrew is available before using it
    await this.ensureHomebrew(onProgress);

    // Install Python via Homebrew
    onProgress?.("🐍 Installing Python via Homebrew...");
    const success = await this.tryPackageManagers("python", [
      {
        name: "Homebrew",
        checkCommand: "brew",
        installCommand: "brew install python@3.12",
      },
    ]);

    if (!success) {
      throw new Error(
        "Failed to install Python via Homebrew. Please install manually from https://www.python.org/downloads/"
      );
    }

    onProgress?.("✅ Python installed via Homebrew!");
  }
}
