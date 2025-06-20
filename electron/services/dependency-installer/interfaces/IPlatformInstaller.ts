// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * Strategy interface for platform-specific installation
 */
export interface IPlatformInstaller {
  readonly platform: NodeJS.Platform;

  /**
   * Check if the installer can handle the current platform
   */
  canHandle(platform: NodeJS.Platform): boolean;

  /**
   * Install a dependency on this platform
   */
  install(
    dependency: string,
    onProgress?: (message: string) => void
  ): Promise<void>;

  /**
   * Get manual installation instructions
   */
  getManualInstructions(dependency: string): string;

  /**
   * Check if running with required privileges
   */
  checkPrivileges(): Promise<boolean>;
}

/**
 * Factory interface for creating platform installers
 */
export interface IPlatformInstallerFactory {
  create(platform: NodeJS.Platform): IPlatformInstaller;
}
