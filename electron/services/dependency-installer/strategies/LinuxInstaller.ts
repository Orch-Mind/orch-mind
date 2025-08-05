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
      case "python":
        await this.installPython(onProgress);
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
      python: `Install Python via package manager:
• Ubuntu/Debian: sudo apt update && sudo apt install python3 python3-pip
• CentOS/RHEL/Fedora: sudo dnf install python3 python3-pip
• Arch: sudo pacman -S python python-pip
• Or download from: https://www.python.org/downloads/source/`,
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
   * Detect Linux distribution and available package managers
   */
  private async detectDistribution(): Promise<{
    distro: string;
    packageManagers: Array<{
      name: string;
      checkCommand: string;
      updateCommand?: string;
      installCommand: string;
    }>;
  }> {
    const managers = [];

    // Check for APT (Debian/Ubuntu)
    if (await this.commandExecutor.checkCommand("apt")) {
      managers.push({
        name: "APT",
        checkCommand: "apt",
        updateCommand: "sudo apt update",
        installCommand: "sudo apt install -y",
      });
    }

    // Check for DNF (Fedora/CentOS 8+)
    if (await this.commandExecutor.checkCommand("dnf")) {
      managers.push({
        name: "DNF",
        checkCommand: "dnf",
        installCommand: "sudo dnf install -y",
      });
    }

    // Check for YUM (CentOS/RHEL)
    if (await this.commandExecutor.checkCommand("yum")) {
      managers.push({
        name: "YUM",
        checkCommand: "yum",
        installCommand: "sudo yum install -y",
      });
    }

    // Check for Pacman (Arch)
    if (await this.commandExecutor.checkCommand("pacman")) {
      managers.push({
        name: "Pacman",
        checkCommand: "pacman",
        installCommand: "sudo pacman -S --noconfirm",
      });
    }

    // Check for Zypper (openSUSE)
    if (await this.commandExecutor.checkCommand("zypper")) {
      managers.push({
        name: "Zypper",
        checkCommand: "zypper",
        installCommand: "sudo zypper install -y",
      });
    }

    return {
      distro: "linux",
      packageManagers: managers,
    };
  }

  private async installOllama(
    onProgress?: (message: string) => void
  ): Promise<void> {
    this.progressReporter.reportDownloading(
      "ollama",
      "Installing Ollama for Linux..."
    );

    // Try official install script first (most reliable)
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
      onProgress?.("⚠️ Official script failed, trying package managers...");
      console.log("Official script failed, trying package managers...");
    }

    // Fallback to package managers
    const { packageManagers } = await this.detectDistribution();
    
    if (packageManagers.length === 0) {
      throw new Error("No supported package manager found for this Linux distribution");
    }

    // Try to install via available package managers
    for (const manager of packageManagers) {
      try {
        onProgress?.(`🐧 Trying to install Ollama via ${manager.name}...`);
        
        // Update package lists if supported
        if (manager.updateCommand) {
          await this.executeWithProgress(manager.updateCommand, "ollama", onProgress);
        }
        
        // Try to install (note: Ollama might not be in all distro repos)
        await this.executeWithProgress(
          `${manager.installCommand} ollama`,
          "ollama",
          onProgress
        );
        
        onProgress?.("✅ Ollama installed via package manager!");
        return;
      } catch (error) {
        onProgress?.(`❌ ${manager.name} installation failed, trying next method...`);
        continue;
      }
    }

    throw new Error(
      "Failed to install Ollama via all available methods. Please install manually using: curl -fsSL https://ollama.com/install.sh | sh"
    );
  }

  /**
   * Install Python on Linux
   */
  private async installPython(
    onProgress?: (message: string) => void
  ): Promise<void> {
    this.progressReporter.reportDownloading(
      "python",
      "Installing Python for Linux..."
    );

    const { packageManagers } = await this.detectDistribution();
    
    if (packageManagers.length === 0) {
      throw new Error("No supported package manager found for this Linux distribution");
    }

    // Try to install via available package managers
    for (const manager of packageManagers) {
      try {
        onProgress?.(`🐍 Installing Python via ${manager.name}...`);
        
        // Update package lists if supported
        if (manager.updateCommand) {
          await this.executeWithProgress(manager.updateCommand, "python", onProgress);
        }
        
        // Install Python and pip based on package manager
        let pythonPackages: string;
        if (manager.name === "APT") {
          pythonPackages = "python3 python3-pip python3-venv";
        } else if (manager.name === "DNF" || manager.name === "YUM") {
          pythonPackages = "python3 python3-pip python3-venv";
        } else if (manager.name === "Pacman") {
          pythonPackages = "python python-pip";
        } else if (manager.name === "Zypper") {
          pythonPackages = "python3 python3-pip python3-venv";
        } else {
          pythonPackages = "python3 python3-pip";
        }
        
        await this.executeWithProgress(
          `${manager.installCommand} ${pythonPackages}`,
          "python",
          onProgress
        );
        
        onProgress?.("✅ Python installed successfully!");
        return;
      } catch (error) {
        onProgress?.(`❌ ${manager.name} installation failed, trying next method...`);
        continue;
      }
    }

    throw new Error(
      "Failed to install Python via package managers. Please install manually for your distribution."
    );
  }
}
