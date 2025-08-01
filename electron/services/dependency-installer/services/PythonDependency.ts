// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import {
  DependencyStatus,
  ICommandExecutor,
  IInstallableDependency,
} from "../interfaces/IDependency";
import { IPlatformInstaller } from "../interfaces/IPlatformInstaller";

/**
 * Python dependency implementation
 * Single Responsibility: Managing Python dependency checks and metadata
 */
export class PythonDependency implements IInstallableDependency {
  readonly name = "python";
  readonly displayName = "Python";

  constructor(
    private readonly commandExecutor: ICommandExecutor,
    private readonly installerFactory: (
      platform: NodeJS.Platform
    ) => IPlatformInstaller
  ) {}

  /**
   * Check if Python is installed
   */
  async check(): Promise<DependencyStatus> {
    try {
      console.log('🐍 [PythonDependency] Starting Python detection...');
      
      // Try different Python commands in order of preference
      const versionCommands = [
        "python3 --version",
        "python --version",
      ];

      let version: string | undefined;
      let stdout = "";
      let lastError: any = null;

      for (const cmd of versionCommands) {
        try {
          console.log(`🐍 [PythonDependency] Trying command: ${cmd}`);
          const result = await this.commandExecutor.execute(cmd);
          console.log(`🐍 [PythonDependency] Command result:`, {
            stdout: result.stdout,
            stderr: result.stderr
          });
          
          stdout = result.stdout;
          version = this.parseVersion(stdout);
          
          if (version) {
            console.log(`✅ [PythonDependency] Version found: ${version}`);
            break;
          } else {
            console.log(`⚠️ [PythonDependency] Could not parse version from: ${stdout}`);
          }
        } catch (cmdError) {
          console.log(`❌ [PythonDependency] Command failed: ${cmd}`, cmdError);
          lastError = cmdError;
        }
      }

      // If no version found, just check if command exists
      if (!version) {
        console.log('🐍 [PythonDependency] No version found, checking command existence...');
        
        const python3Exists = await this.commandExecutor.checkCommand("python3");
        const pythonExists = await this.commandExecutor.checkCommand("python");
        
        console.log(`🐍 [PythonDependency] Command existence:`, {
          python3Exists,
          pythonExists
        });
        
        const exists = python3Exists || pythonExists;
        
        if (!exists) {
          console.log('❌ [PythonDependency] No Python commands found in PATH');
          return {
            installed: false,
          };
        }
      }

      const isInstalled = !!version;
      const pythonPath = isInstalled ? await this.getPythonPath() : undefined;
      
      console.log(`🎯 [PythonDependency] Final result:`, {
        installed: isInstalled,
        version,
        path: pythonPath
      });

      return {
        installed: isInstalled,
        version: version,
        path: pythonPath,
      };
    } catch (error) {
      console.error('❌ [PythonDependency] Check failed with error:', error);
      return {
        installed: false,
      };
    }
  }

  /**
   * Install Python using platform-specific installer
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
   * Parse version from command output
   */
  private parseVersion(output: string): string | undefined {
    const patterns = [/Python (\d+\.\d+\.\d+)/i, /^(\d+\.\d+\.\d+)$/m, /v?(\d+\.\d+\.\d+)/i];

    for (const pattern of patterns) {
      const match = output.match(pattern);
      if (match?.[1]) {
        return match[1];
      }
    }

    // Return trimmed output if no pattern matches
    const trimmed = output.trim();
    return trimmed.length > 0 && trimmed.length < 20 ? trimmed : undefined;
  }

  /**
   * Get Python executable path
   */
  private async getPythonPath(): Promise<string | undefined> {
    try {
      // Try python3 first
      const python3Result = await this.commandExecutor.execute("which python3");
      
      if (python3Result.stdout.trim()) {
        return python3Result.stdout.trim();
      }

      // Fallback to python command
      const pythonResult = await this.commandExecutor.execute("which python");
      
      if (pythonResult.stdout.trim()) {
        return pythonResult.stdout.trim();
      }
    } catch (error) {
      console.warn("Could not determine Python path:", error);
    }
    
    return undefined;
  }
}
