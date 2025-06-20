// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { ICommandExecutor } from "../interfaces/IDependency";
import {
  IPlatformInstaller,
  IPlatformInstallerFactory,
} from "../interfaces/IPlatformInstaller";
import { IProgressReporter } from "../interfaces/IProgressReporter";
import { LinuxInstaller } from "./LinuxInstaller";
import { MacOSInstaller } from "./MacOSInstaller";
import { WindowsInstaller } from "./WindowsInstaller";

/**
 * Factory for creating platform-specific installers
 * Factory pattern: Creates installers based on platform
 */
export class PlatformInstallerFactory implements IPlatformInstallerFactory {
  private readonly installers: Map<NodeJS.Platform, IPlatformInstaller>;

  constructor(
    commandExecutor: ICommandExecutor,
    progressReporter: IProgressReporter
  ) {
    this.installers = new Map<NodeJS.Platform, IPlatformInstaller>();
    this.installers.set(
      "darwin",
      new MacOSInstaller(commandExecutor, progressReporter)
    );
    this.installers.set(
      "win32",
      new WindowsInstaller(commandExecutor, progressReporter)
    );
    this.installers.set(
      "linux",
      new LinuxInstaller(commandExecutor, progressReporter)
    );
  }

  /**
   * Create installer for the specified platform
   */
  create(platform: NodeJS.Platform): IPlatformInstaller {
    const installer = this.installers.get(platform);
    if (!installer) {
      throw new Error(`Unsupported platform: ${platform}`);
    }
    return installer;
  }
}
