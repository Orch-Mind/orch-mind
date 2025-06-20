// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import {
  DependencyStatus,
  ICommandExecutor,
  IInstallableDependency,
  IServiceDependency,
} from "../interfaces/IDependency";
import { IPlatformInstaller } from "../interfaces/IPlatformInstaller";

/**
 * Docker dependency implementation
 * Single Responsibility: Managing Docker dependency checks, metadata and service control
 */
export class DockerDependency
  implements IInstallableDependency, IServiceDependency
{
  readonly name = "docker";
  readonly displayName = "Docker";

  constructor(
    private readonly commandExecutor: ICommandExecutor,
    private readonly installerFactory: (
      platform: NodeJS.Platform
    ) => IPlatformInstaller
  ) {}

  /**
   * Check if Docker is installed and running
   */
  async check(): Promise<DependencyStatus> {
    try {
      const { stdout } = await this.commandExecutor.execute("docker --version");
      const versionMatch = stdout.match(/Docker version ([\d.]+)/);
      const version = versionMatch ? versionMatch[1] : "unknown";

      // Check if Docker daemon is running
      let running = false;
      try {
        await this.commandExecutor.execute("docker ps");
        running = true;
      } catch {
        console.log("[DockerDependency] Docker daemon not running");
      }

      return {
        installed: true,
        version,
        running,
      };
    } catch {
      return { installed: false };
    }
  }

  /**
   * Install Docker using platform-specific installer
   */
  async install(
    executor: ICommandExecutor,
    platform: NodeJS.Platform
  ): Promise<void> {
    const installer = this.installerFactory(platform);
    await installer.install(this.name);
  }

  /**
   * Get manual installation instructions
   */
  getManualInstructions(platform: NodeJS.Platform): string {
    const installer = this.installerFactory(platform);
    return installer.getManualInstructions(this.name);
  }

  /**
   * Try to start Docker service
   */
  async start(): Promise<boolean> {
    const platform = process.platform;

    try {
      switch (platform) {
        case "darwin":
          await this.startDockerMacOS();
          break;
        case "win32":
          await this.startDockerWindows();
          break;
        case "linux":
          await this.startDockerLinux();
          break;
        default:
          return false;
      }

      // Wait for Docker to start
      await this.waitForDocker();
      return true;
    } catch (error) {
      console.error("[DockerDependency] Failed to start Docker:", error);
      return false;
    }
  }

  /**
   * Stop Docker service
   */
  async stop(): Promise<boolean> {
    try {
      if (process.platform === "linux") {
        await this.commandExecutor.execute("sudo systemctl stop docker");
      }
      // On macOS and Windows, stopping requires GUI interaction
      return true;
    } catch {
      return false;
    }
  }

  private async startDockerMacOS(): Promise<void> {
    console.log("[DockerDependency] Starting Docker Desktop on macOS...");
    await this.commandExecutor.execute("open -a Docker");
  }

  private async startDockerWindows(): Promise<void> {
    console.log("[DockerDependency] Starting Docker Desktop on Windows...");
    try {
      await this.commandExecutor.execute(
        'start "" "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe"'
      );
    } catch {
      // Try alternative
      await this.commandExecutor.execute("start docker");
    }
  }

  private async startDockerLinux(): Promise<void> {
    console.log("[DockerDependency] Starting Docker service on Linux...");
    try {
      await this.commandExecutor.execute("sudo systemctl start docker");
    } catch {
      // Try service command as fallback
      await this.commandExecutor.execute("sudo service docker start");
    }
  }

  private async waitForDocker(maxAttempts = 10, delayMs = 2000): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        await this.commandExecutor.execute("docker ps");
        return;
      } catch {
        if (i < maxAttempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }
    throw new Error("Docker failed to start within timeout");
  }
}
