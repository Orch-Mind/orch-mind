// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { ICommandExecutor } from "../interfaces/IDependency";
import { IPlatformInstaller } from "../interfaces/IPlatformInstaller";
import { IProgressReporter } from "../interfaces/IProgressReporter";

/**
 * Base class for platform installers
 * DRY: Contains common functionality for all platform installers
 */
export abstract class BasePlatformInstaller implements IPlatformInstaller {
  abstract readonly platform: NodeJS.Platform;

  constructor(
    protected readonly commandExecutor: ICommandExecutor,
    protected readonly progressReporter: IProgressReporter
  ) {}

  /**
   * Check if this installer can handle the given platform
   */
  canHandle(platform: NodeJS.Platform): boolean {
    return this.platform === platform;
  }

  /**
   * Install a dependency
   */
  abstract install(
    dependency: string,
    onProgress?: (message: string) => void
  ): Promise<void>;

  /**
   * Get manual installation instructions
   */
  abstract getManualInstructions(dependency: string): string;

  /**
   * Check if running with required privileges
   */
  abstract checkPrivileges(): Promise<boolean>;

  /**
   * Execute command with progress reporting
   */
  protected async executeWithProgress(
    command: string,
    dependency: string,
    onProgress?: (message: string) => void
  ): Promise<void> {
    await this.commandExecutor.executeWithProgress(command, (data) => {
      onProgress?.(data);
    });
  }

  /**
   * Try multiple package managers in order
   */
  protected async tryPackageManagers(
    dependency: string,
    managers: Array<{
      name: string;
      checkCommand: string;
      installCommand: string;
    }>
  ): Promise<boolean> {
    for (const manager of managers) {
      const hasManager = await this.commandExecutor.checkCommand(
        manager.checkCommand
      );
      
      if (hasManager) {
        this.progressReporter.reportDownloading(
          dependency,
          `Installing ${dependency} using ${manager.name}...`
        );
        
        try {
          await this.executeWithProgress(manager.installCommand, dependency);
          return true;
        } catch (installError) {
          // Continue to next package manager
          continue;
        }
      }
    }
    
    return false;
  }
}
