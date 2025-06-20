// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { BasePlatformInstaller } from "./BasePlatformInstaller";

type LinuxDistro =
  | "ubuntu"
  | "debian"
  | "fedora"
  | "centos"
  | "rhel"
  | "arch"
  | "unknown";

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
      case "docker":
        await this.installDocker(onProgress);
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

      docker: `Run in terminal:
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in for group changes to take effect`,
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

  private async installDocker(
    onProgress?: (message: string) => void
  ): Promise<void> {
    this.progressReporter.reportDownloading(
      "docker",
      "Installing Docker Engine for Linux..."
    );

    const distro = await this.detectDistro();

    switch (distro) {
      case "ubuntu":
      case "debian":
        await this.installDockerDebian(distro, onProgress);
        break;
      case "fedora":
      case "centos":
      case "rhel":
        await this.installDockerRHEL(onProgress);
        break;
      case "arch":
        await this.installDockerArch(onProgress);
        break;
      default:
        // Use universal script
        await this.executeWithProgress(
          "curl -fsSL https://get.docker.com | sh",
          "docker",
          onProgress
        );
    }

    // Add user to docker group
    await this.executeWithProgress(
      "sudo usermod -aG docker $USER",
      "docker",
      onProgress
    );

    this.progressReporter.reportInstalling(
      "docker",
      "Docker installed. Please log out and back in for group changes to take effect."
    );
  }

  private async detectDistro(): Promise<LinuxDistro> {
    try {
      const { stdout } = await this.commandExecutor.execute(
        "cat /etc/os-release"
      );

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

  private async installDockerDebian(
    distro: "ubuntu" | "debian",
    onProgress?: (message: string) => void
  ): Promise<void> {
    const commands = [
      "sudo apt-get update",
      "sudo apt-get install -y ca-certificates curl gnupg",
      "sudo install -m 0755 -d /etc/apt/keyrings",
      `curl -fsSL https://download.docker.com/linux/${distro}/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg`,
      "sudo chmod a+r /etc/apt/keyrings/docker.gpg",
      `echo "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${distro} "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null`,
      "sudo apt-get update",
      "sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin",
    ];

    for (const cmd of commands) {
      await this.executeWithProgress(cmd, "docker", onProgress);
    }
  }

  private async installDockerRHEL(
    onProgress?: (message: string) => void
  ): Promise<void> {
    const commands = [
      "sudo dnf -y install dnf-plugins-core",
      "sudo dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo",
      "sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin",
      "sudo systemctl start docker",
      "sudo systemctl enable docker",
    ];

    for (const cmd of commands) {
      await this.executeWithProgress(cmd, "docker", onProgress);
    }
  }

  private async installDockerArch(
    onProgress?: (message: string) => void
  ): Promise<void> {
    await this.executeWithProgress(
      "sudo pacman -S docker docker-compose --noconfirm",
      "docker",
      onProgress
    );
    await this.executeWithProgress(
      "sudo systemctl start docker",
      "docker",
      onProgress
    );
    await this.executeWithProgress(
      "sudo systemctl enable docker",
      "docker",
      onProgress
    );
  }
}
