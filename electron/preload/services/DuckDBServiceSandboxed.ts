// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * DuckDB Service - Sandboxed Version
 *
 * This service is designed to work in Electron's sandboxed preload environment.
 * It delegates DuckDB operations to the main process via IPC.
 *
 * Following Electron best practices for preload scripts:
 * @see https://electronjs.org/docs/latest/tutorial/tutorial-preload
 */

import { ipcRenderer } from "electron";
import { DuckDBMatch } from "../../vector-database/interfaces/IVectorDatabase";
import { ErrorHandler } from "../utils/ErrorHandler";
import { Logger } from "../utils/Logger";

// Legacy compatibility alias
interface NormalizedMatch extends DuckDBMatch {}

export class DuckDBServiceSandboxed {
  private static instance: DuckDBServiceSandboxed | null = null;
  private logger: Logger;

  private constructor(logger: Logger, errorHandler: ErrorHandler) {
    this.logger = logger.createChild("DuckDB-Sandboxed");
  }

  static getInstance(
    logger?: Logger,
    errorHandler?: ErrorHandler
  ): DuckDBServiceSandboxed {
    if (!DuckDBServiceSandboxed.instance) {
      if (!logger || !errorHandler) {
        throw new Error(
          "Logger and ErrorHandler required for first instance creation"
        );
      }
      DuckDBServiceSandboxed.instance = new DuckDBServiceSandboxed(
        logger,
        errorHandler
      );
    }
    return DuckDBServiceSandboxed.instance;
  }

  /**
   * Execute DuckDB command via IPC to main process
   * This approach works in sandboxed environments
   */
  async duckdbCommand(command: string, data: any): Promise<any> {
    try {
      // Log with proper data information
      const dataInfo = data
        ? command === "query"
          ? `embedding[${data.embedding?.length || 0}], topK=${data.topK || 5}`
          : command === "save"
          ? `vectors[${data.vectors?.length || 0}]`
          : "with data"
        : "no data";

      this.logger.info(`🔄 DuckDB-IPC: ${command} (${dataInfo})`);

      // Delegate to main process which can safely use DuckDB Node API
      const result = await ipcRenderer.invoke("duckdb-command", command, data);

      // Log completion with result info
      const resultInfo = result
        ? command === "query" && result.matches
          ? `${result.matches.length} matches`
          : command === "save" && result.success
          ? "saved successfully"
          : "completed"
        : "no result";

      this.logger.success(`✅ DuckDB-IPC: ${command} → ${resultInfo}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ DuckDB-IPC: ${command} failed`, error);

      // Return safe fallback based on command type
      return this.getFallbackResponse(command);
    }
  }

  /**
   * Provide safe fallback responses when DuckDB is not available
   */
  private getFallbackResponse(command: string): any {
    switch (command) {
      case "query":
        return { matches: [] };
      case "save":
        return {
          success: false,
          error: "DuckDB not available in sandboxed mode",
        };
      case "count":
        return { count: 0 };
      case "debug":
        return {
          initialized: false,
          sandboxed: true,
          fallback: true,
          message: "DuckDB operations delegated to main process",
        };
      case "close":
        return { success: true };
      default:
        return { error: "Command not available in sandboxed mode" };
    }
  }

  /**
   * Initialize the service (no-op in sandboxed mode)
   */
  async initialize(): Promise<void> {
    this.logger.info(
      "DuckDB Sandboxed Service initialized - operations via IPC"
    );
  }

  /**
   * Terminate the service (no-op in sandboxed mode)
   */
  async terminate(): Promise<void> {
    this.logger.info("DuckDB Sandboxed Service terminated");
  }
}
