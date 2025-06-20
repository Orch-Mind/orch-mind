// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { EventEmitter } from "events";
import {
  IProgressReporter,
  InstallProgress,
} from "../interfaces/IProgressReporter";

/**
 * Service responsible for reporting installation progress
 * Single Responsibility: Progress reporting
 */
export class ProgressReporter
  extends EventEmitter
  implements IProgressReporter
{
  private static readonly PROGRESS_EVENT = "progress";

  /**
   * Report progress update
   */
  report(progress: InstallProgress): void {
    this.emit(ProgressReporter.PROGRESS_EVENT, progress);
    console.log(
      `[${progress.dependency}] ${progress.status}: ${progress.message}`
    );
  }

  /**
   * Subscribe to progress updates
   */
  onProgress(callback: (progress: InstallProgress) => void): void {
    this.on(ProgressReporter.PROGRESS_EVENT, callback);
  }

  /**
   * Unsubscribe from progress updates
   */
  removeProgressListener(callback: (progress: InstallProgress) => void): void {
    this.removeListener(ProgressReporter.PROGRESS_EVENT, callback);
  }

  /**
   * Helper method to report checking status
   */
  reportChecking(dependency: string, message: string): void {
    this.report({
      dependency,
      status: "checking",
      message,
    });
  }

  /**
   * Helper method to report downloading status
   */
  reportDownloading(
    dependency: string,
    message: string,
    progress?: number
  ): void {
    this.report({
      dependency,
      status: "downloading",
      message,
      progress,
    });
  }

  /**
   * Helper method to report installing status
   */
  reportInstalling(dependency: string, message: string): void {
    this.report({
      dependency,
      status: "installing",
      message,
    });
  }

  /**
   * Helper method to report completion
   */
  reportCompleted(dependency: string, message: string): void {
    this.report({
      dependency,
      status: "completed",
      message,
    });
  }

  /**
   * Helper method to report errors
   */
  reportError(dependency: string, message: string, error?: string): void {
    this.report({
      dependency,
      status: "error",
      message,
      error,
    });
  }
}
