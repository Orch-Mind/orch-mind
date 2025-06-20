// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { ProgressInfo } from "../interfaces/types";
import { Logger } from "./logging";

// Type definition for stages to avoid repetition and improve type safety
export type ProgressStage = "parsing" | "deduplicating" | "generating_embeddings" | "saving";

// Stage weights configuration - extracted as a constant for better maintainability
const STAGE_WEIGHTS: Record<ProgressStage, number> = {
  parsing: 0.1,              // 10%
  deduplicating: 0.2,        // 20%
  generating_embeddings: 0.5, // 50%
  saving: 0.2,               // 20%
};

// Stage order for progress calculation
const STAGE_ORDER: ProgressStage[] = [
  "parsing",
  "deduplicating",
  "generating_embeddings",
  "saving",
];

/**
 * Class responsible for reporting the progress of operations
 * Enhanced to provide smoother and more accurate progress updates
 */
export class ProgressReporter {
  private onProgress?: (info: ProgressInfo) => void;
  private logger: Logger;
  private lastUpdate: number = 0;
  private throttleInterval: number = 50; // Reduced from 100ms for smoother updates
  private lastPercentage: number = -1; // Track last percentage to avoid duplicate updates
  private queuedUpdate: NodeJS.Timeout | null = null;
  private globalProgress: number = 0; // Track overall progress across all stages

  constructor(onProgress?: (info: ProgressInfo) => void, logger?: Logger) {
    this.onProgress = onProgress;
    this.logger = logger || new Logger("[ProgressReporter]");
  }

  /**
   * Starts a new processing stage
   */
  public startStage(stage: ProgressStage, total: number): void {
    this.lastPercentage = -1; // Reset percentage tracker on new stage

    // Calculate stage weight for overall progress
    const stageWeight = this.getStageWeight(stage);
    const baseProgress = this.getBaseProgressForStage(stage);

    this.globalProgress = baseProgress;
    this.updateProgress(stage, 0, total);
  }

  /**
   * Get the weight of each stage for overall progress calculation
   */
  private getStageWeight(stage: ProgressStage): number {
    return STAGE_WEIGHTS[stage];
  }

  /**
   * Get the base progress for a stage (cumulative weight of completed stages)
   */
  private getBaseProgressForStage(stage: ProgressStage): number {
    const currentIndex = STAGE_ORDER.indexOf(stage);

    let baseProgress = 0;
    for (let i = 0; i < currentIndex; i++) {
      baseProgress += STAGE_WEIGHTS[STAGE_ORDER[i]] * 100;
    }

    return Math.round(baseProgress);
  }

  /**
   * Updates the progress of a stage with throttling and error handling
   *
   * IMPORTANT: This method calculates and reports the OVERALL/GLOBAL progress,
   * not just the progress of the current stage. Each stage has a weight, and
   * the final percentage shown to the user is the weighted sum of all stages.
   *
   * Example: If "generating_embeddings" (weight 50%) is 60% complete:
   * - Stage progress = 60%
   * - Previous stages completed = 30% (parsing 10% + deduplicating 20%)
   * - Global progress shown = 30% + (60% * 50%) = 30% + 30% = 60%
   */
  public updateProgress(
    stage: ProgressStage,
    processed: number,
    total: number
  ): void {
    if (!this.onProgress) return;

    const now = Date.now();
    const stagePercentage = Math.round((processed / Math.max(total, 1)) * 100);

    // Calculate overall progress considering stage weights
    const stageWeight = this.getStageWeight(stage);
    const baseProgress = this.getBaseProgressForStage(stage);
    const weightedProgress = Math.round(
      baseProgress + stagePercentage * stageWeight
    );

    // Ensure progress never goes backwards
    const finalProgress = Math.max(
      this.globalProgress,
      Math.min(weightedProgress, 100)
    );

    // Debug logging to show the difference between stage and global progress
    if (stagePercentage % 10 === 0 || stagePercentage === 100) {
      this.logger.debug(
        `[Progress] Stage: ${stage} | Stage Progress: ${stagePercentage}% | Global Progress: ${finalProgress}% ` +
          `(Base: ${baseProgress}% + Current: ${Math.round(
            stagePercentage * stageWeight
          )}%)`
      );
    }

    // Skip if same percentage and not the final update (100%)
    if (
      finalProgress === this.lastPercentage &&
      finalProgress !== 100 &&
      processed !== total
    ) {
      return;
    }

    // If we recently updated and this isn't a completion update, throttle it
    if (
      now - this.lastUpdate < this.throttleInterval &&
      finalProgress !== 100 &&
      processed !== total
    ) {
      // Clear any existing queued update
      if (this.queuedUpdate) {
        clearTimeout(this.queuedUpdate);
      }

      // Queue this update to run after the throttle interval
      this.queuedUpdate = setTimeout(() => {
        this.lastUpdate = Date.now();
        this.lastPercentage = finalProgress;
        this.globalProgress = finalProgress;
        this.safelyCallProgressCallback({
          processed,
          total,
          percentage: finalProgress, // <-- This is ALWAYS the global progress!
          stage,
        });
        this.queuedUpdate = null;
      }, this.throttleInterval - (now - this.lastUpdate));
      return;
    }

    // Otherwise, update immediately
    this.lastUpdate = now;
    this.lastPercentage = finalProgress;
    this.globalProgress = finalProgress;
    this.safelyCallProgressCallback({
      processed,
      total,
      percentage: finalProgress, // <-- This is ALWAYS the global progress!
      stage,
    });
  }

  /**
   * Safely calls the progress callback with error handling
   */
  private safelyCallProgressCallback(info: ProgressInfo): void {
    if (!this.onProgress) return;

    try {
      this.onProgress(info);

      // Log progress for debugging
      this.logger.debug(
        `Progress update: ${info.stage} - ${info.percentage}% (${info.processed}/${info.total})`
      );
    } catch (error) {
      // Log the error but don't let it crash the process
      this.logger.warn(`Error sending progress update: ${error}`);
      // If we've had one error, don't keep trying to call the callback
      if (
        error instanceof Error &&
        error.message.includes("Object has been destroyed")
      ) {
        this.logger.warn(
          "WebContents has been destroyed, disabling progress updates"
        );
        this.onProgress = undefined; // Stop trying to call the callback
      }
    }
  }

  /**
   * Completes a processing stage
   */
  public completeStage(stage: ProgressStage, total: number): void {
    // Clear any queued updates
    if (this.queuedUpdate) {
      clearTimeout(this.queuedUpdate);
      this.queuedUpdate = null;
    }

    // Calculate the completion progress for this stage
    const baseProgress = this.getBaseProgressForStage(stage);
    const stageWeight = this.getStageWeight(stage);
    const completionProgress = Math.round(baseProgress + 100 * stageWeight);

    // Force completion update with proper overall progress
    this.lastPercentage = completionProgress;
    this.globalProgress = completionProgress;
    this.safelyCallProgressCallback({
      processed: total,
      total,
      percentage: completionProgress,
      stage,
    });
  }
}
