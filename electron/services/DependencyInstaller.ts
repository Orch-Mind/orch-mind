// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { exec, spawn } from "child_process";
import { EventEmitter } from "events";
import { platform } from "os";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface DependencyStatus {
  ollama: {
    installed: boolean;
    version?: string;
    path?: string;
  };
  docker: {
    installed: boolean;
    version?: string;
    running?: boolean;
  };
}

export interface InstallProgress {
  dependency: "ollama" | "docker";
  status: "checking" | "downloading" | "installing" | "completed" | "error";
  progress?: number;
  message: string;
  error?: string;
}

export class DependencyInstaller extends EventEmitter {
  private readonly platform: NodeJS.Platform;

  constructor() {
    super();
    this.platform = platform();
  }

  /**
   * Check if both Ollama and Docker are installed
   */
  async checkDependencies(): Promise<DependencyStatus> {
    const [ollama, docker] = await Promise.all([
      this.checkOllama(),
      this.checkDocker(),
    ]);

    return { ollama, docker };
  }

  /**
   * Check if Ollama is installed
   */
  private async checkOllama(): Promise<DependencyStatus["ollama"]> {
    try {
      // Try different commands to get version
      let stdout = "";
      let versionFound = false;

      // Try "ollama --version" first
      try {
        const result = await execAsync("ollama --version");
        stdout = result.stdout;
        versionFound = true;
      } catch (e) {
        console.log(
          "[DependencyInstaller] ollama --version failed, trying alternatives..."
        );
      }

      // Try "ollama version" (without --)
      if (!versionFound) {
        try {
          const result = await execAsync("ollama version");
          stdout = result.stdout;
          versionFound = true;
        } catch (e) {
          console.log(
            "[DependencyInstaller] ollama version failed, trying -v..."
          );
        }
      }

      // Try "ollama -v"
      if (!versionFound) {
        try {
          const result = await execAsync("ollama -v");
          stdout = result.stdout;
          versionFound = true;
        } catch (e) {
          console.log("[DependencyInstaller] ollama -v failed");
        }
      }

      // If no version command works, just check if ollama exists
      if (!versionFound) {
        const whereCmd = this.platform === "win32" ? "where" : "which";
        await execAsync(`${whereCmd} ollama`);
        return {
          installed: true,
          version: "installed",
          path: await this.getOllamaPath(),
        };
      }

      // Log the output for debugging
      console.log(
        "[DependencyInstaller] Ollama version output:",
        stdout.trim()
      );

      // Try different regex patterns to match various version formats
      // Pattern 1: "ollama version 0.1.17"
      let versionMatch = stdout.match(/ollama version ([\d.]+)/i);

      // Pattern 2: "0.1.17" (just the version number)
      if (!versionMatch) {
        versionMatch = stdout.match(/^([\d.]+)$/m);
      }

      // Pattern 3: "v0.1.17" or "Version: 0.1.17"
      if (!versionMatch) {
        versionMatch = stdout.match(/v?([\d.]+)/i);
      }

      const version = versionMatch
        ? versionMatch[1]
        : stdout.trim().substring(0, 20);

      return {
        installed: true,
        version: version || "installed",
        path: await this.getOllamaPath(),
      };
    } catch (error) {
      console.error("[DependencyInstaller] Failed to check Ollama:", error);
      return { installed: false };
    }
  }

  /**
   * Check if Docker is installed and running
   */
  private async checkDocker(): Promise<DependencyStatus["docker"]> {
    try {
      const { stdout } = await execAsync("docker --version");
      const versionMatch = stdout.match(/Docker version ([\d.]+)/);

      // Check if Docker daemon is running
      let running = false;
      try {
        await execAsync("docker ps");
        running = true;
      } catch {
        // Don't try to start Docker automatically - let the user decide
        console.log("[DependencyInstaller] Docker daemon not running");
        running = false;
      }

      return {
        installed: true,
        version: versionMatch ? versionMatch[1] : "unknown",
        running,
      };
    } catch {
      return { installed: false };
    }
  }

  /**
   * Try to start Docker daemon based on platform
   */
  private async tryStartDockerDaemon(): Promise<boolean> {
    try {
      switch (this.platform) {
        case "darwin":
          // On macOS, try to open Docker Desktop
          console.log(
            "[DependencyInstaller] Starting Docker Desktop on macOS..."
          );
          try {
            await execAsync("open -a Docker");
            // Wait a bit for Docker to start
            await new Promise((resolve) => setTimeout(resolve, 5000));
            // Check if it's running now
            await execAsync("docker ps");
            return true;
          } catch {
            return false;
          }

        case "win32":
          // On Windows, try to start Docker Desktop
          console.log(
            "[DependencyInstaller] Starting Docker Desktop on Windows..."
          );
          try {
            // Try to start Docker Desktop
            await execAsync(
              'start "" "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe"'
            );
            // Wait a bit for Docker to start
            await new Promise((resolve) => setTimeout(resolve, 5000));
            // Check if it's running now
            await execAsync("docker ps");
            return true;
          } catch {
            // Try alternative path
            try {
              await execAsync("start docker");
              await new Promise((resolve) => setTimeout(resolve, 5000));
              await execAsync("docker ps");
              return true;
            } catch {
              return false;
            }
          }

        case "linux":
          // On Linux, try to start Docker service with systemctl
          console.log(
            "[DependencyInstaller] Starting Docker service on Linux..."
          );
          try {
            // Check if systemctl is available
            await execAsync("which systemctl");
            await execAsync("sudo systemctl start docker");
            // Wait a bit for Docker to start
            await new Promise((resolve) => setTimeout(resolve, 2000));
            // Check if it's running now
            await execAsync("docker ps");
            return true;
          } catch {
            // Try service command as fallback
            try {
              await execAsync("sudo service docker start");
              await new Promise((resolve) => setTimeout(resolve, 2000));
              await execAsync("docker ps");
              return true;
            } catch {
              return false;
            }
          }

        default:
          return false;
      }
    } catch (error) {
      console.error(
        "[DependencyInstaller] Failed to start Docker daemon:",
        error
      );
      return false;
    }
  }

  /**
   * Get Ollama installation path
   */
  private async getOllamaPath(): Promise<string | undefined> {
    try {
      const { stdout } = await execAsync("which ollama");
      return stdout.trim();
    } catch {
      return undefined;
    }
  }

  /**
   * Install Ollama based on platform
   */
  async installOllama(): Promise<void> {
    this.emit("progress", {
      dependency: "ollama",
      status: "checking",
      message: "Detecting platform and installation method...",
    } as InstallProgress);

    try {
      switch (this.platform) {
        case "darwin":
          await this.installOllamaMacOS();
          break;
        case "win32":
          await this.installOllamaWindows();
          break;
        case "linux":
          await this.installOllamaLinux();
          break;
        default:
          throw new Error(`Unsupported platform: ${this.platform}`);
      }

      // Verify installation
      const status = await this.checkOllama();
      if (!status.installed) {
        throw new Error("Ollama installation verification failed");
      }

      this.emit("progress", {
        dependency: "ollama",
        status: "completed",
        message: "Ollama installed successfully!",
      } as InstallProgress);
    } catch (error) {
      this.emit("progress", {
        dependency: "ollama",
        status: "error",
        message: "Failed to install Ollama",
        error: error instanceof Error ? error.message : String(error),
      } as InstallProgress);
      throw error;
    }
  }

  /**
   * Install Docker based on platform
   */
  async installDocker(): Promise<void> {
    this.emit("progress", {
      dependency: "docker",
      status: "checking",
      message: "Detecting platform and installation method...",
    } as InstallProgress);

    try {
      switch (this.platform) {
        case "darwin":
          await this.installDockerMacOS();
          break;
        case "win32":
          await this.installDockerWindows();
          break;
        case "linux":
          await this.installDockerLinux();
          break;
        default:
          throw new Error(`Unsupported platform: ${this.platform}`);
      }

      // Verify installation
      const status = await this.checkDocker();
      if (!status.installed) {
        throw new Error("Docker installation verification failed");
      }

      this.emit("progress", {
        dependency: "docker",
        status: "completed",
        message: "Docker installed successfully!",
      } as InstallProgress);
    } catch (error) {
      this.emit("progress", {
        dependency: "docker",
        status: "error",
        message: "Failed to install Docker",
        error: error instanceof Error ? error.message : String(error),
      } as InstallProgress);
      throw error;
    }
  }

  /**
   * macOS: Install Ollama using curl script or homebrew
   */
  private async installOllamaMacOS(): Promise<void> {
    this.emit("progress", {
      dependency: "ollama",
      status: "downloading",
      message: "Downloading Ollama for macOS...",
    } as InstallProgress);

    // Try official install script first
    try {
      await this.runCommand("curl -fsSL https://ollama.com/install.sh | sh");
      return;
    } catch (error) {
      console.log("Official script failed, trying homebrew...");
    }

    // Fallback to homebrew
    const hasHomebrew = await this.checkCommand("brew");
    if (!hasHomebrew) {
      throw new Error(
        "Homebrew not found. Please install Homebrew first or download Ollama from https://ollama.com"
      );
    }

    await this.runCommand("brew install ollama");
  }

  /**
   * Windows: Install Ollama using winget or chocolatey
   */
  private async installOllamaWindows(): Promise<void> {
    this.emit("progress", {
      dependency: "ollama",
      status: "downloading",
      message: "Downloading Ollama for Windows...",
    } as InstallProgress);

    // Try winget first
    const hasWinget = await this.checkCommand("winget");
    if (hasWinget) {
      await this.runCommand("winget install --id Ollama.Ollama");
      return;
    }

    // Try chocolatey
    const hasChoco = await this.checkCommand("choco");
    if (hasChoco) {
      await this.runCommand("choco install ollama -y");
      return;
    }

    // Direct download as fallback
    throw new Error(
      "Please download Ollama from https://ollama.com/download/windows"
    );
  }

  /**
   * Linux: Install Ollama using official script
   */
  private async installOllamaLinux(): Promise<void> {
    this.emit("progress", {
      dependency: "ollama",
      status: "downloading",
      message: "Downloading Ollama for Linux...",
    } as InstallProgress);

    // Use official install script
    await this.runCommand("curl -fsSL https://ollama.com/install.sh | sh");
  }

  /**
   * macOS: Install Docker Desktop using homebrew cask
   */
  private async installDockerMacOS(): Promise<void> {
    this.emit("progress", {
      dependency: "docker",
      status: "downloading",
      message: "Installing Docker Desktop for macOS...",
    } as InstallProgress);

    const hasHomebrew = await this.checkCommand("brew");
    if (!hasHomebrew) {
      throw new Error(
        "Homebrew not found. Please install Homebrew first or download Docker Desktop from https://docker.com"
      );
    }

    // Install Docker Desktop via homebrew cask
    await this.runCommand("brew install --cask docker");

    this.emit("progress", {
      dependency: "docker",
      status: "installing",
      message:
        "Docker Desktop installed. Please launch Docker Desktop from Applications.",
    } as InstallProgress);
  }

  /**
   * Windows: Install Docker Desktop
   */
  private async installDockerWindows(): Promise<void> {
    this.emit("progress", {
      dependency: "docker",
      status: "downloading",
      message: "Installing Docker Desktop for Windows...",
    } as InstallProgress);

    // Try winget
    const hasWinget = await this.checkCommand("winget");
    if (hasWinget) {
      await this.runCommand("winget install Docker.DockerDesktop");
      return;
    }

    // Try chocolatey
    const hasChoco = await this.checkCommand("choco");
    if (hasChoco) {
      await this.runCommand("choco install docker-desktop -y");
      return;
    }

    throw new Error(
      "Please download Docker Desktop from https://docker.com/products/docker-desktop"
    );
  }

  /**
   * Linux: Install Docker Engine
   */
  private async installDockerLinux(): Promise<void> {
    this.emit("progress", {
      dependency: "docker",
      status: "downloading",
      message: "Installing Docker Engine for Linux...",
    } as InstallProgress);

    // Detect Linux distribution
    const distro = await this.detectLinuxDistro();

    switch (distro) {
      case "ubuntu":
      case "debian":
        await this.installDockerDebian();
        break;
      case "fedora":
      case "centos":
      case "rhel":
        await this.installDockerRHEL();
        break;
      case "arch":
        await this.installDockerArch();
        break;
      default:
        // Use official Docker install script
        await this.runCommand("curl -fsSL https://get.docker.com | sh");
    }

    // Add user to docker group
    await this.runCommand("sudo usermod -aG docker $USER");

    this.emit("progress", {
      dependency: "docker",
      status: "installing",
      message:
        "Docker installed. Please log out and back in for group changes to take effect.",
    } as InstallProgress);
  }

  /**
   * Install Docker on Debian/Ubuntu
   */
  private async installDockerDebian(): Promise<void> {
    const commands = [
      "sudo apt-get update",
      "sudo apt-get install -y ca-certificates curl gnupg",
      "sudo install -m 0755 -d /etc/apt/keyrings",
      "curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg",
      "sudo chmod a+r /etc/apt/keyrings/docker.gpg",
      'echo "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null',
      "sudo apt-get update",
      "sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin",
    ];

    for (const cmd of commands) {
      await this.runCommand(cmd);
    }
  }

  /**
   * Install Docker on RHEL/Fedora/CentOS
   */
  private async installDockerRHEL(): Promise<void> {
    const commands = [
      "sudo dnf -y install dnf-plugins-core",
      "sudo dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo",
      "sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin",
      "sudo systemctl start docker",
      "sudo systemctl enable docker",
    ];

    for (const cmd of commands) {
      await this.runCommand(cmd);
    }
  }

  /**
   * Install Docker on Arch Linux
   */
  private async installDockerArch(): Promise<void> {
    await this.runCommand("sudo pacman -S docker docker-compose --noconfirm");
    await this.runCommand("sudo systemctl start docker");
    await this.runCommand("sudo systemctl enable docker");
  }

  /**
   * Detect Linux distribution
   */
  private async detectLinuxDistro(): Promise<string> {
    try {
      const { stdout } = await execAsync("cat /etc/os-release");
      if (stdout.includes("ubuntu")) return "ubuntu";
      if (stdout.includes("debian")) return "debian";
      if (stdout.includes("fedora")) return "fedora";
      if (stdout.includes("centos")) return "centos";
      if (stdout.includes("rhel")) return "rhel";
      if (stdout.includes("arch")) return "arch";
      return "unknown";
    } catch {
      return "unknown";
    }
  }

  /**
   * Check if a command exists
   */
  private async checkCommand(command: string): Promise<boolean> {
    try {
      await execAsync(
        `${this.platform === "win32" ? "where" : "which"} ${command}`
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Run a command with progress updates
   */
  private runCommand(command: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, [], {
        shell: true,
        stdio: "pipe",
      });

      child.stdout.on("data", (data) => {
        console.log(`[DependencyInstaller] ${data.toString()}`);
      });

      child.stderr.on("data", (data) => {
        console.error(`[DependencyInstaller] ${data.toString()}`);
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with code ${code}: ${command}`));
        }
      });

      child.on("error", (error) => {
        reject(error);
      });
    });
  }

  /**
   * Get installation instructions for manual installation
   */
  getManualInstructions(dependency: "ollama" | "docker"): string {
    const instructions = {
      ollama: {
        darwin: `1. Download from https://ollama.com/download/mac
2. Open the downloaded file and drag Ollama to Applications
3. Launch Ollama from Applications
Alternative: Run 'brew install ollama' in Terminal`,
        win32: `1. Download from https://ollama.com/download/windows
2. Run the installer
3. Follow the installation wizard
Alternative: Run 'winget install Ollama.Ollama' in PowerShell`,
        linux: `Run in terminal:
curl -fsSL https://ollama.com/install.sh | sh`,
      },
      docker: {
        darwin: `1. Download Docker Desktop from https://docker.com/products/docker-desktop
2. Open the downloaded .dmg file
3. Drag Docker to Applications
4. Launch Docker Desktop
Alternative: Run 'brew install --cask docker' in Terminal`,
        win32: `1. Download Docker Desktop from https://docker.com/products/docker-desktop
2. Run the installer
3. Follow the installation wizard
4. Restart your computer
Alternative: Run 'winget install Docker.DockerDesktop' in PowerShell`,
        linux: `Run in terminal:
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in for group changes to take effect`,
      },
    };

    return (
      instructions[dependency][this.platform] ||
      "Please visit the official website for installation instructions."
    );
  }
}
