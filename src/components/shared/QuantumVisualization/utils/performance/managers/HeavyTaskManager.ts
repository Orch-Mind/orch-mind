// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import type { IHeavyTask, IHeavyTaskManager } from '../interfaces/PerformanceInterfaces';

/**
 * Heavy Task Manager for Orch-Mind Neural Processing
 * Single Responsibility: Management of heavy computational tasks
 */
export class HeavyTaskManager implements IHeavyTaskManager {
  private tasks: IHeavyTask[] = [];
  private processing = false;

  /**
   * Adds a heavy task to the processing queue
   */
  async addTask(fn: () => Promise<void>, id: string, priority: number = 0): Promise<void> {
    const task: IHeavyTask = { fn, id, priority };
    
    this.tasks.push(task);
    this.tasks.sort((a, b) => b.priority - a.priority);
    
    if (!this.processing) {
      await this.processTasks();
    }
  }

  /**
   * Checks if the manager is currently processing tasks
   */
  isProcessing(): boolean {
    return this.processing;
  }

  /**
   * Gets the current queue size
   */
  getQueueSize(): number {
    return this.tasks.length;
  }

  /**
   * Processes all tasks in the queue
   */
  private async processTasks(): Promise<void> {
    this.processing = true;
    
    while (this.tasks.length > 0) {
      const task = this.tasks.shift();
      if (!task) break;

      try {
        await task.fn();
      } catch (error) {
        console.warn(`[HeavyTaskManager] Task ${task.id} failed:`, error);
      }
      
      // Yield control between tasks
      await this.yieldControl();
    }
    
    this.processing = false;
  }

  /**
   * Yields control to allow other operations to proceed
   */
  private async yieldControl(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 1));
  }

  /**
   * Clears all pending tasks
   */
  clearTasks(): void {
    this.tasks = [];
  }
}

// Singleton instance for global use
export const heavyTaskManager = new HeavyTaskManager(); 