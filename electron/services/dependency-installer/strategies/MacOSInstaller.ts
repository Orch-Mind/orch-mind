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
1. Preferred (exact version):
   • Install Homebrew: https://brew.sh/
   • Install pyenv: brew install pyenv
   • Install Python 3.11.9: pyenv install 3.11.9 && pyenv global 3.11.9
2. Alternative (may not pin patch): brew install python@3.11
3. Or download official 3.11.9 .pkg: https://www.python.org/downloads/release/python-3119/`,
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
   * Install Homebrew on macOS without sudo privileges
   */
  private async installHomebrew(
    onProgress?: (message: string) => void
  ): Promise<void> {
    this.progressReporter.reportDownloading(
      "homebrew",
      "Installing Homebrew package manager (no admin privileges required)..."
    );

    onProgress?.("📦 Installing Homebrew in user directory - this may take a few minutes...");

    try {
      // Install Homebrew in user directory without sudo
      // This method doesn't require admin privileges
      const homeDir = process.env.HOME || '~';
      
      onProgress?.("📁 Creating Homebrew directory...");
      await this.commandExecutor.execute(`mkdir -p ${homeDir}/homebrew`);
      
      onProgress?.("⬇️ Downloading Homebrew...");
      const installCommand = `curl -L https://github.com/Homebrew/brew/tarball/master | tar xz --strip 1 -C ${homeDir}/homebrew`;
      
      await this.executeWithProgress(
        installCommand,
        "homebrew",
        onProgress
      );

      // Add Homebrew to PATH in current process
      const homebrewBinPath = `${homeDir}/homebrew/bin`;
      const currentPath = process.env.PATH || '';
      if (!currentPath.includes(homebrewBinPath)) {
        process.env.PATH = `${homebrewBinPath}:${currentPath}`;
        onProgress?.("🔧 Updated PATH to include Homebrew");
      }

      // Persist PATH in shell configuration files
      await this.addHomebrewToShellConfig(homebrewBinPath, onProgress);

      // Verify Homebrew was installed
      const homebrewInstalled = await this.commandExecutor.checkCommand("brew");
      if (!homebrewInstalled) {
        // Try direct path check
        try {
          await this.commandExecutor.execute(`${homebrewBinPath}/brew --version`);
          onProgress?.("✅ Homebrew installed successfully (direct path verified)!");
        } catch {
          throw new Error("Homebrew installation verification failed");
        }
      } else {
        onProgress?.("✅ Homebrew installed successfully!");
      }

      this.progressReporter.reportCompleted(
        "homebrew",
        "Homebrew package manager installed successfully in user directory!"
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
   * Add Homebrew to shell configuration files for persistent PATH
   */
  private async addHomebrewToShellConfig(
    homebrewBinPath: string,
    onProgress?: (message: string) => void
  ): Promise<void> {
    try {
      const homeDir = process.env.HOME || '~';
      const pathExport = `export PATH="${homebrewBinPath}:$PATH"`;
      
      // Common shell configuration files
      const shellConfigs = [
        `${homeDir}/.zshrc`,      // zsh (default on macOS Catalina+)
        `${homeDir}/.bash_profile`, // bash
        `${homeDir}/.bashrc`,      // bash alternative
      ];
      
      onProgress?.("📝 Adding Homebrew to shell configuration...");
      
      for (const configFile of shellConfigs) {
        try {
          // Check if file exists
          await this.commandExecutor.execute(`test -f ${configFile}`);
          
          // Check if PATH is already added
          try {
            await this.commandExecutor.execute(`grep -q "${homebrewBinPath}" ${configFile}`);
            onProgress?.(`✅ Homebrew PATH already in ${configFile}`);
            continue;
          } catch {
            // PATH not found, add it
            await this.commandExecutor.execute(
              `echo "\n# Added by Orch-Mind for Homebrew" >> ${configFile}`
            );
            await this.commandExecutor.execute(
              `echo "${pathExport}" >> ${configFile}`
            );
            onProgress?.(`✅ Added Homebrew PATH to ${configFile}`);
          }
        } catch {
          // File doesn't exist, skip
          continue;
        }
      }
      
      onProgress?.("🔧 Homebrew will be available in new terminal sessions");
    } catch (error) {
      onProgress?.("⚠️ Could not update shell configuration - Homebrew may not be available in terminal");
      console.log("Shell config update failed:", error);
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

    // Try official install script first (doesn't require sudo)
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
      onProgress?.("⚠️ Official script failed, checking for Homebrew...");
      console.log("Official script failed, checking homebrew availability...");
    }

    // Check if Homebrew is already available
    const hasHomebrew = await this.commandExecutor.checkCommand("brew");
    
    if (hasHomebrew) {
      // Try homebrew installation with existing Homebrew
      try {
        onProgress?.("🍺 Installing Ollama via existing Homebrew...");
        const success = await this.tryPackageManagers("ollama", [
          {
            name: "Homebrew",
            checkCommand: "brew",
            installCommand: "brew install ollama",
          },
        ]);

        if (success) {
          onProgress?.("✅ Ollama installed via Homebrew!");
          return;
        }
      } catch (error) {
        onProgress?.("⚠️ Existing Homebrew installation failed, trying fresh install...");
        console.log("Existing Homebrew installation failed:", error);
      }
    }

    // Try installing Homebrew without sudo and then install Ollama
    try {
      onProgress?.("🍺 Homebrew not available - installing automatically (no admin required)...");
      await this.ensureHomebrew(onProgress);
      
      // Now try installing Ollama with fresh Homebrew
      onProgress?.("🍺 Installing Ollama via fresh Homebrew...");
      const success = await this.tryPackageManagers("ollama", [
        {
          name: "Homebrew",
          checkCommand: "brew",
          installCommand: "brew install ollama",
        },
      ]);

      if (success) {
        onProgress?.("✅ Ollama installed via fresh Homebrew!");
        return;
      }
    } catch (error) {
      onProgress?.("⚠️ Automatic Homebrew installation failed...");
      console.log("Automatic Homebrew installation failed:", error);
    }

    // Final fallback: Guide user to manual installation
    throw new Error(
      "Automatic Ollama installation failed with all methods. " +
      "Please install Ollama manually from https://ollama.com/download/mac"
    );
  }

  /**
   * Install Python on macOS (user-scope, no admin required)
   */
  private async installPython(
    onProgress?: (message: string) => void
  ): Promise<void> {
    this.progressReporter.reportDownloading(
      "python",
      "Installing Python 3.11.9 for macOS (no admin required)..."
    );

    onProgress?.("🐍 Target version: Python 3.11.9");

    // 1) Ensure Homebrew is available
    await this.ensureHomebrew(onProgress);

    // Helper to verify exact version
    const verifyPythonVersion = async (): Promise<boolean> => {
      const candidates = [
        "/opt/homebrew/opt/python@3.11/bin/python3.11",
        "/usr/local/opt/python@3.11/bin/python3.11",
        "python3",
        "python",
      ];
      for (const bin of candidates) {
        try {
          const { stdout, stderr } = await this.commandExecutor.execute(`${bin} --version`);
          const out = `${stdout} ${stderr}`;
          if (/Python\s+3\.11\.9\b/.test(out)) {
            onProgress?.(`✅ Detected Python 3.11.9 at: ${bin}`);
            return true;
          }
        } catch {
          // try next candidate
        }
      }
      return false;
    };

    // 2) Try Homebrew python@3.11 first
    try {
      onProgress?.("🍺 Installing python@3.11 via Homebrew...");
      const brewSuccess = await this.tryPackageManagers("python", [
        {
          name: "Homebrew",
          checkCommand: "brew",
          installCommand: "brew install python@3.11",
        },
      ]);

      if (brewSuccess) {
        onProgress?.("🔍 Verifying installed version (expecting 3.11.9)...");
        // Allow a brief moment for PATH/linking
        try { await this.commandExecutor.execute("hash -r || true"); } catch {}
        if (await verifyPythonVersion()) {
          return;
        } else {
          onProgress?.("⚠️ Homebrew provided python@3.11 but not 3.11.9. Falling back to pyenv for exact patch.");
        }
      }
    } catch (error) {
      onProgress?.("⚠️ Homebrew python@3.11 installation failed, attempting pyenv...");
      console.log("Homebrew python@3.11 installation failed:", error);
    }

    // 3) Install exact version with pyenv
    try {
      onProgress?.("🍺 Installing pyenv via Homebrew...");
      await this.tryPackageManagers("pyenv", [
        {
          name: "Homebrew",
          checkCommand: "brew",
          installCommand: "brew install pyenv",
        },
      ]);

      onProgress?.("📦 Installing Python 3.11.9 via pyenv (this can take several minutes)...");
      await this.executeWithProgress("pyenv install -s 3.11.9", "python", onProgress);
      onProgress?.("🔧 Setting Python 3.11.9 as global via pyenv...");
      await this.commandExecutor.execute("pyenv global 3.11.9");
      try { await this.commandExecutor.execute("pyenv rehash"); } catch {}

      // Verify exact version
      onProgress?.("🔍 Verifying pyenv Python version...");
      if (await verifyPythonVersion()) {
        onProgress?.("✅ Python 3.11.9 installed via pyenv!");
        return;
      } else {
        // Try direct path
        try {
          const { stdout: rootOut } = await this.commandExecutor.execute("pyenv root");
          const pyenvRoot = rootOut.trim();
          const direct = `${pyenvRoot}/versions/3.11.9/bin/python3`;
          const { stdout, stderr } = await this.commandExecutor.execute(`${direct} --version`);
          if (/Python\s+3\.11\.9\b/.test(`${stdout} ${stderr}`)) {
            onProgress?.("✅ Python 3.11.9 installed and verified (pyenv direct path)!");
            return;
          }
        } catch {}
      }
    } catch (error) {
      onProgress?.("⚠️ pyenv installation path failed, trying official .pkg...");
      console.log("pyenv path failed:", error);
    }

    // 4) Final fallback: official .pkg for 3.11.9
    try {
      onProgress?.("⬇️ Downloading Python 3.11.9 official installer (.pkg)...");
      const downloadCommand = `curl -L -o /tmp/python-3.11.9.pkg https://www.python.org/ftp/python/3.11.9/python-3.11.9-macos11.pkg`;
      await this.executeWithProgress(downloadCommand, "python", onProgress);

      onProgress?.("📦 Installing Python 3.11.9 (may require admin privileges)...");
      // Note: -target / may require admin; we attempt without sudo and report any failure
      const installCommand = `installer -pkg /tmp/python-3.11.9.pkg -target /`;
      await this.executeWithProgress(installCommand, "python", onProgress);

      onProgress?.("🔍 Verifying installed version from official package...");
      if (await verifyPythonVersion()) {
        onProgress?.("✅ Python 3.11.9 installed via official package!");
        return;
      }
    } catch (error) {
      console.log("Official .pkg installation failed or not verified:", error);
    }

    throw new Error(
      "Failed to install Python 3.11.9 automatically. Please use pyenv (brew install pyenv; pyenv install 3.11.9; pyenv global 3.11.9) or install the official 3.11.9 .pkg."
    );
  }
}
