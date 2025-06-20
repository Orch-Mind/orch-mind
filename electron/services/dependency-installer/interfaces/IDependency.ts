// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * Represents the status of a dependency
 */
export interface DependencyStatus {
  installed: boolean;
  version?: string;
  running?: boolean;
  path?: string;
}

/**
 * Base interface for all dependencies
 */
export interface IDependency {
  readonly name: string;
  readonly displayName: string;
  check(): Promise<DependencyStatus>;
  getManualInstructions(platform: NodeJS.Platform): string;
}

/**
 * Interface for dependencies that can be automatically installed
 */
export interface IInstallableDependency extends IDependency {
  install(
    installer: ICommandExecutor,
    platform: NodeJS.Platform
  ): Promise<void>;
}

/**
 * Interface for dependencies that can be started/stopped
 */
export interface IServiceDependency extends IDependency {
  start(): Promise<boolean>;
  stop(): Promise<boolean>;
}

/**
 * Command executor interface
 */
export interface ICommandExecutor {
  execute(command: string): Promise<{ stdout: string; stderr: string }>;
  executeWithProgress(
    command: string,
    onData?: (data: string) => void
  ): Promise<void>;
  checkCommand(command: string): Promise<boolean>;
}
