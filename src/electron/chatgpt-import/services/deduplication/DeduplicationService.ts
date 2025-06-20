// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { ProcessedMessage } from "../../interfaces/types";
import { Logger } from "../../utils/logging";
import { ProgressReporter } from "../../utils/progressReporter";

/**
 * Interface for checking existing vectors (abstraction for Pinecone/DuckDB)
 */
interface IVectorChecker {
  checkExistingIds(
    ids: string[],
    progressCallback?: (processed: number, total: number) => void
  ): Promise<string[]>;
}

/**
 * Service to check and eliminate duplicate messages
 */
export class DeduplicationService {
  private vectorChecker: IVectorChecker;
  private progressReporter: ProgressReporter;
  private logger: Logger;

  constructor(
    vectorChecker: IVectorChecker,
    progressReporter: ProgressReporter,
    logger?: Logger
  ) {
    this.vectorChecker = vectorChecker;
    this.progressReporter = progressReporter;
    this.logger = logger || new Logger("[DeduplicationService]");
    this.logger.info("DeduplicationService successfully instantiated");
  }

  /**
   * Filters duplicate messages based on existing IDs
   */
  public async filterDuplicates(
    messages: ProcessedMessage[],
    mode: "increment" | "overwrite"
  ): Promise<ProcessedMessage[]> {
    // Log detalhado das primeiras mensagens recebidas
    this.logger.debug(
      "First 3 messages received for deduplication:",
      JSON.stringify(messages.slice(0, 3), null, 2)
    );

    // Ensure all messages have a valid id
    const messagesWithIds = messages.map((msg, idx) => ({
      ...msg,
      id: msg.id && msg.id !== "" ? msg.id : `fallback_id_${idx}_${Date.now()}`,
    }));

    // If mode is overwrite, deduplication is not needed
    if (mode === "overwrite") {
      this.logger.info("OVERWRITE mode selected, skipping duplicate check");
      return messagesWithIds;
    }

    this.logger.info("INCREMENT mode selected, verifying duplicates...");

    // Start progress
    const originalLength = messagesWithIds.length;
    this.progressReporter.startStage("deduplicating", originalLength);

    // Extract all message IDs to check for duplicates
    const messageIdsToCheck = messagesWithIds
      .filter(
        (m: ProcessedMessage) =>
          m.id !== null && m.id !== undefined && m.id !== ""
      )
      .map((m: ProcessedMessage) => m.id as string);

    const limitedMessageIdsToCheck = messageIdsToCheck;

    this.logger.debug(`Total of original messages: ${originalLength}`);
    this.logger.debug(
      `Total messages with valid ID: ${messageIdsToCheck.length}`
    );
    this.logger.debug(
      `Messages without valid ID: ${originalLength - messageIdsToCheck.length}`
    );

    if (messageIdsToCheck.length === 0) {
      this.logger.warn("No valid message ID found in file.");
      this.progressReporter.completeStage("deduplicating", originalLength);
      return messages;
    }

    // Verify existence of IDs in storage with timeout
    this.logger.info(
      `Verifying ${limitedMessageIdsToCheck.length} IDs in vector storage`
    );
    this.logger.debug(
      "First 10 IDs to be verified:",
      JSON.stringify(limitedMessageIdsToCheck.slice(0, 10))
    );
    const existingMessageIds = new Set<string>();
    const timeoutPromise = new Promise<string[]>((_, reject) => {
      const timeoutId = setTimeout(() => {
        clearTimeout(timeoutId);
        reject(
          new Error(
            "Timeout checking IDs in vector storage - operation took more than 5 minutes"
          )
        );
      }, 5 * 60 * 1000); // 5 minutes timeout
    });
    let existingIds: string[] = [];
    try {
      this.logger.info(
        "Starting complete ID verification with security timeout..."
      );
      this.logger.debug("Calling vectorChecker.checkExistingIds...");

      // Create a progress tracking wrapper
      let lastProgressUpdate = 0;
      const progressInterval = 100; // Update every 100 IDs minimum

      const checkIdsPromise = this.vectorChecker.checkExistingIds(
        limitedMessageIdsToCheck,
        (processed, total) => {
          // Throttle progress updates to avoid overwhelming the UI
          if (
            processed - lastProgressUpdate >= progressInterval ||
            processed === total
          ) {
            lastProgressUpdate = processed;
            this.logger.debug(`[Dedup] Progress: ${processed}/${total}`);
            this.progressReporter.updateProgress(
              "deduplicating",
              processed,
              total
            );

            // Log significant milestones
            if (processed % 1000 === 0 || processed === total) {
              this.logger.info(
                `Progress of ID verification: ${processed}/${total} (${Math.round(
                  (processed / total) * 100
                )}%)`
              );
            }
          }
        }
      );
      existingIds = (await Promise.race([
        checkIdsPromise,
        timeoutPromise,
      ])) as string[];
      this.logger.info("checkExistingIds completed successfully");
      this.logger.debug(
        "First 10 IDs returned:",
        JSON.stringify(existingIds.slice(0, 10))
      );
      this.logger.info(`Total of existing IDs found: ${existingIds.length}`);

      // Verify result
      if (!existingIds || !Array.isArray(existingIds)) {
        throw new Error(`Invalid result of checkExistingIds: ${existingIds}`);
      }

      existingIds.forEach((id) => existingMessageIds.add(id));
      this.logger.info(`Found ${existingIds.length} existing IDs`);
      this.logger.info("ID verification process completed successfully");
    } catch (error) {
      this.logger.error("Error checking existing IDs:", error);
      if (error instanceof Error) {
        this.logger.error(`Error details: ${error.message}`);
        this.logger.error(`Stack trace: ${error.stack || "Not available"}`);
      }
      this.progressReporter.completeStage("deduplicating", originalLength);
      // In case of error, proceed as if there are no duplicates
      this.logger.warn(
        "Continuing without complete duplicate check due to error"
      );
      return messagesWithIds;
    }

    // Filter duplicate messages
    this.logger.info("Starting duplicate message filtering...");
    try {
      const duplicateMessages = messages.filter(
        (m: ProcessedMessage) => m.id && existingMessageIds.has(m.id)
      );

      const uniqueMessages = messages.filter(
        (m: ProcessedMessage) => !m.id || !existingMessageIds.has(m.id)
      );

      // Deduplication analysis logs
      this.logger.info("Deduplication analysis:");
      this.logger.info(`- Total of messages in file: ${originalLength}`);
      this.logger.info(
        `- Existing messages (ignored): ${duplicateMessages.length}`
      );
      this.logger.info(
        `- New messages to be imported: ${uniqueMessages.length}`
      );

      // Verify data
      if (!uniqueMessages || !Array.isArray(uniqueMessages)) {
        throw new Error(
          `Invalid result of message filtering: ${uniqueMessages}`
        );
      }

      // Log to indicate process completion
      this.logger.info("====== DEDUPLICATION SUCCESSFULLY COMPLETED ======");
      this.logger.info(`Returning ${uniqueMessages.length} unique messages`);

      // Complete progress (ensures this happens even if the return fails)
      this.progressReporter.completeStage("deduplicating", originalLength);

      return uniqueMessages;
    } catch (error) {
      // Detailed error log
      this.logger.error("FATAL ERROR filtering messages:", error);
      if (error instanceof Error) {
        this.logger.error(`Error details: ${error.message}`);
        this.logger.error(`Stack trace: ${error.stack || "Not available"}`);
      }

      // Ensure progress is completed even in case of error
      this.progressReporter.completeStage("deduplicating", originalLength);

      // Rethrow the error for higher-level handling
      throw new Error(
        `Failed to process duplicate messages: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}
