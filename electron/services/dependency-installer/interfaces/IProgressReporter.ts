// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * Progress status types
 */
export type ProgressStatus =
  | "checking"
  | "downloading"
  | "installing"
  | "completed"
  | "error";

/**
 * Progress update information
 */
export interface InstallProgress {
  dependency: string;
  status: ProgressStatus;
  progress?: number;
  message: string;
  error?: string;
}

/**
 * Interface for progress reporting
 */
export interface IProgressReporter {
  report(progress: InstallProgress): void;
  onProgress(callback: (progress: InstallProgress) => void): void;
  removeProgressListener(callback: (progress: InstallProgress) => void): void;

  // Helper methods for specific status reports
  reportChecking(dependency: string, message: string): void;
  reportDownloading(
    dependency: string,
    message: string,
    progress?: number
  ): void;
  reportInstalling(dependency: string, message: string): void;
  reportCompleted(dependency: string, message: string): void;
  reportError(dependency: string, message: string, error?: string): void;
}
