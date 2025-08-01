// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { EventEmitter } from "events";
import { platform } from "os";
import {
  DependencyStatus,
  IDependency,
  IInstallableDependency,
  IServiceDependency,
} from "./interfaces/IDependency";
import { InstallProgress } from "./interfaces/IProgressReporter";
import { CommandExecutor } from "./services/CommandExecutor";

import { OllamaDependency } from "./services/OllamaDependency";
import { PythonDependency } from "./services/PythonDependency";
import { ProgressReporter } from "./services/ProgressReporter";
import { PlatformInstallerFactory } from "./strategies/PlatformInstallerFactory";

/**
 * Combined dependency status for all dependencies
 */
export interface AllDependenciesStatus {
  ollama: DependencyStatus;
  python: DependencyStatus;
}

/**
 * Main dependency installer orchestrator
 * Follows SOLID principles by delegating responsibilities to specialized classes
 */
export class DependencyInstaller extends EventEmitter {
  private readonly platform: NodeJS.Platform;
  private readonly dependencies: Map<string, IDependency>;
  private readonly commandExecutor: CommandExecutor;
  private readonly progressReporter: ProgressReporter;

  constructor() {
    super();
    this.platform = platform();
    this.commandExecutor = new CommandExecutor();
    this.progressReporter = new ProgressReporter();

    // Forward progress events
    this.progressReporter.onProgress((progress) => {
      this.emit("progress", progress);
    });

    // Initialize dependencies
    const installerFactory = new PlatformInstallerFactory(
      this.commandExecutor,
      this.progressReporter
    );

    this.dependencies = new Map<string, IDependency>();
    this.dependencies.set(
      "ollama",
      new OllamaDependency(this.commandExecutor, (platform) =>
        installerFactory.create(platform)
      )
    );
    this.dependencies.set(
      "python",
      new PythonDependency(this.commandExecutor, (platform) =>
        installerFactory.create(platform)
      )
    );
  }

  /**
   * Check if all dependencies are installed
   */
  async checkDependencies(): Promise<AllDependenciesStatus> {
    const ollama = await this.checkDependency("ollama");
    const python = await this.checkDependency("python");

    return { ollama, python };
  }

  /**
   * Check a specific dependency
   */
  async checkDependency(name: string): Promise<DependencyStatus> {
    const dependency = this.dependencies.get(name);
    if (!dependency) {
      throw new Error(`Unknown dependency: ${name}`);
    }
    return dependency.check();
  }

  /**
   * Install Ollama
   */
  async installOllama(): Promise<void> {
    await this.installDependency("ollama");
  }

  /**
   * Install Python
   */
  async installPython(): Promise<void> {
    await this.installDependency("python");
  }

  /**
   * Get manual installation instructions
   */
  getManualInstructions(dependency: "ollama"): string {
    const dep = this.dependencies.get(dependency);
    if (!dep) {
      return "Unknown dependency";
    }
    return dep.getManualInstructions(this.platform);
  }

  /**
   * Subscribe to progress updates
   */
  onProgress(callback: (progress: InstallProgress) => void): void {
    this.on("progress", callback);
  }

  /**
   * Install a specific dependency
   */
  private async installDependency(name: string): Promise<void> {
    const dependency = this.dependencies.get(name);
    if (!dependency) {
      throw new Error(`Unknown dependency: ${name}`);
    }

    if (!this.isInstallableDependency(dependency)) {
      throw new Error(`Dependency ${name} is not installable`);
    }

    this.progressReporter.reportChecking(
      name,
      "Checking current installation status..."
    );

    try {
      // Check if already installed
      const status = await dependency.check();
      if (status.installed) {
        this.progressReporter.reportCompleted(
          name,
          `${dependency.displayName} is already installed!`
        );
        return;
      }

      // Install the dependency
      await dependency.install(this.commandExecutor, this.platform);

      // Verify installation
      const verifyStatus = await dependency.check();
      if (!verifyStatus.installed) {
        throw new Error(
          `${dependency.displayName} installation verification failed`
        );
      }

      this.progressReporter.reportCompleted(
        name,
        `${dependency.displayName} installed successfully!`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.progressReporter.reportError(
        name,
        `Failed to install ${dependency.displayName}`,
        errorMessage
      );
      throw error;
    }
  }

  /**
   * Type guard for installable dependencies
   */
  private isInstallableDependency(
    dep: IDependency
  ): dep is IInstallableDependency {
    return "install" in dep;
  }

  /**
   * Type guard for service dependencies
   */
  private isServiceDependency(dep: IDependency): dep is IServiceDependency {
    return "start" in dep && "stop" in dep;
  }
}
