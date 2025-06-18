// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * LiveTranscriptionProcessor handles processing of transcription data from Deepgram
 * and management of speaker segments.
 */
import { SpeakerBuffer } from "../utils/DeepgramTypes";
import { Logger } from "../utils/Logger";
// Import of the interface for integration with the transcription storage service
import { getPrimaryUser } from "../../../../../config/UserConfig";
import { ITranscriptionStorageService } from "../../interfaces/transcription/ITranscriptionStorageService";
export class LiveTranscriptionProcessor {
  private logger: Logger;
  private activeSpeakerBuffer: Record<number, SpeakerBuffer> = {};
  private currentSpeaker: string = "";
  private transcriptionList: string[] = [];
  private transcriptionCallback: ((event: string, data: any) => void) | null =
    null;
  private transcriptionStorageService: ITranscriptionStorageService | null =
    null;

  constructor() {
    this.logger = new Logger("LiveTranscriptionProcessor");
  }

  /**
   * Configures the transcription storage service for direct sending
   */
  public setTranscriptionStorageService(
    service: ITranscriptionStorageService
  ): void {
    console.log(
      `💾 [INTEGRATION] Storage service received:`,
      service ? "VALID INSTANCE" : "NULL"
    );
    this.transcriptionStorageService = service;
    if (service && typeof service.updateTranscriptionUI === "function") {
      console.log(
        `✅ [INTEGRATION] updateTranscriptionUI available and ready for use`
      );
    } else {
      console.error(
        `❌ [INTEGRATION] updateTranscriptionUI NOT available!`,
        service
      );
    }
    this.logger.info("Storage service configured for direct sending");
  }

  /**
   * Register a callback to receive transcription events
   */
  public registerTranscriptionCallback(
    callback: (event: string, data: any) => void
  ): void {
    this.transcriptionCallback = callback;
    this.logger.info("Callback registered");
  }

  /**
   * Process incoming transcription data from Deepgram
   */
  public handleTranscriptionEvent(data: any): void {
    try {
      console.log("🔄 [PROCESS] Starting transcription processing");

      // Check if this is a final transcription
      // We ignore all interim (non-final) transcriptions
      if (!data.is_final) {
        console.log("⏭️ [PROCESS] Ignoring interim (non-final) transcription");
        return;
      }

      // Check if data contains channel (singular) or channels (plural)
      if (data.channel) {
        // New Deepgram API (v3)
        const channelIndex =
          data.channel_index && data.channel_index[0] !== undefined
            ? data.channel_index[0]
            : 0;

        console.log(`🔄 [PROCESS] Processing channel ${channelIndex}`);

        // Initialize buffer for this channel if not exists
        if (!this.activeSpeakerBuffer[channelIndex]) {
          console.log(
            `🔄 [PROCESS] Initializing buffer for channel ${channelIndex}`
          );
          this.activeSpeakerBuffer[channelIndex] = {
            lastSpeaker:
              channelIndex === 0 ? getPrimaryUser() : `Speaker ${channelIndex}`,
            currentSegment: [],
            formattedSegment: "",
            lastFlushedText: "",
          };
        }

        const alternative = data.channel.alternatives[0];
        if (!alternative?.transcript) {
          return;
        }

        const buffer = this.activeSpeakerBuffer[channelIndex];
        const speakerPrefix =
          this.currentSpeaker !== buffer.lastSpeaker
            ? `[${buffer.lastSpeaker}] `
            : "";

        console.log(
          `🔄 [PROCESS] Current speaker: "${this.currentSpeaker}", Buffer speaker: "${buffer.lastSpeaker}"`
        );
        console.log(`🔄 [PROCESS] Speaker prefix: "${speakerPrefix}"`);

        // Update current speaker
        this.currentSpeaker = buffer.lastSpeaker;

        // Process the transcript content immediately
        const transcriptText = `${speakerPrefix}${alternative.transcript}`;
        console.log(`🔄 [PROCESS] Formatted text: "${transcriptText}"`);

        // Check if this is new or different content
        if (
          transcriptText &&
          transcriptText.trim() &&
          transcriptText !== buffer.lastFlushedText &&
          transcriptText.trim() !== `[${buffer.lastSpeaker}]`
        ) {
          console.log(
            `✅ [PROCESS] Valid and different text: "${transcriptText}"`
          );
          this.logger.info(
            `Final transcription (channel ${channelIndex}): ${transcriptText}`
          );

          // Send only final transcriptions directly via IPC to the main process
          // Explicitly check the storage service for each transcription
          try {
            if (this.transcriptionStorageService) {
              // Ensure the method exists before calling
              if (
                typeof this.transcriptionStorageService.addTranscription ===
                "function"
              ) {
                console.log(
                  `📝 [PROCESS] Sending directly to TranscriptionStorageService: "${transcriptText}"`
                );
                this.transcriptionStorageService.addTranscription(
                  transcriptText
                );
                console.log(
                  `✅ [PROCESS] Transcription successfully sent to storageService`
                );
                // UI update is now handled automatically inside addTranscription
              } else {
                console.error(
                  `❌ [PROCESS] addTranscription NOT available in service!`
                );
              }
            } else {
              console.warn(
                `⚠️ [PROCESS] TranscriptionStorageService NOT available during transcription processing`
              );
            }
          } catch (error) {
            console.error(
              `❌ [PROCESS] Error sending to TranscriptionStorageService:`,
              error
            );
          }

          // Maintain IPC sending for compatibility with panel
          if (typeof window !== "undefined" && window.electronAPI) {
            try {
              console.log(
                `📢 [PROCESS] Sending final transcription via IPC: "${transcriptText}"`
              );
              window.electronAPI.sendAudioTranscription(transcriptText);
            } catch (error) {
              console.error("❌ [PROCESS] Error sending via IPC:", error);
            }
          }

          // Also send via callback for compatibility
          if (this.transcriptionCallback) {
            console.log(
              `📢 [PROCESS] Sending to callback: "${transcriptText}"`
            );
            this.transcriptionCallback("transcript", {
              text: transcriptText,
              isFinal: true, // Always true because we're filtering out non-final transcriptions
              channel: channelIndex,
              speaker: buffer.lastSpeaker,
            });
          } else {
            console.log("❌ [PROCESS] TranscriptionCallback NOT registered");
          }

          // Add to permanent history
          console.log(
            `📝 [PROCESS] Saving final transcription: "${transcriptText}"`
          );
          this.transcriptionList.push(transcriptText);
          buffer.lastFlushedText = transcriptText;
        } else {
          console.log(
            `⚠️ [PROCESS] Text ignored because it was empty or the same as the previous: "${transcriptText}"`
          );
        }

        // Store the formatted version
        buffer.formattedSegment = alternative.transcript;

        // Still accumulate words for speaker change detection
        if (alternative.words && alternative.words.length > 0) {
          console.log(
            `🔄 [PROCESS] Processing ${alternative.words.length} words for speaker detection`
          );
          buffer.currentSegment = alternative.words.map(
            (w: { word: any }) => w.word
          );

          // Process speaker changes in words if available
          let currentSegmentSpeaker = buffer.lastSpeaker;
          for (const word of alternative.words) {
            if (word.speaker) {
              const speaker = `Speaker ${word.speaker}`;
              if (speaker !== currentSegmentSpeaker) {
                // Speaker change detected
                console.log(
                  `👥 [PROCESS] Speaker change detected: ${currentSegmentSpeaker} -> ${speaker}`
                );
                this.logger.info(
                  `Speaker change detected: ${currentSegmentSpeaker} -> ${speaker}`
                );
                currentSegmentSpeaker = speaker;
                buffer.lastSpeaker = speaker;
              }
            }
          }
        } else {
          console.log("⚠️ [PROCESS] No words for speaker detection");
        }
      } else if (data.channels) {
        console.log(
          `🔄 [PROCESS] Multichannel mode, processing ${data.channels.length} channels`
        );
        // Simplified processing for multiple channels
        data.channels.forEach((channel: any, channelIndex: number) => {
          console.log(`🔄 [PROCESS] Processing channel ${channelIndex}`);

          // Initialize buffer for this channel if not exists
          if (!this.activeSpeakerBuffer[channelIndex]) {
            console.log(
              `🔄 [PROCESS] Initializing buffer for channel ${channelIndex}`
            );
            this.activeSpeakerBuffer[channelIndex] = {
              lastSpeaker:
                channelIndex === 0
                  ? getPrimaryUser()
                  : `Speaker ${channelIndex}`,
              currentSegment: [],
              formattedSegment: "",
              lastFlushedText: "",
            };
          }

          const alternative = channel.alternatives[0];
          if (!alternative?.transcript) {
            console.log(
              `❌ [PROCESS] Channel ${channelIndex} without transcription, skipping`
            );
            return;
          }

          const buffer = this.activeSpeakerBuffer[channelIndex];
          const transcriptText = `[${buffer.lastSpeaker}] ${alternative.transcript}`;

          // Send final transcriptions via IPC to the main process
          if (
            typeof window !== "undefined" &&
            window.electronAPI &&
            transcriptText.trim() &&
            transcriptText !== buffer.lastFlushedText
          ) {
            try {
              console.log(
                `📢 [PROCESS] Sending final transcription via IPC: "${transcriptText}"`
              );
              window.electronAPI.sendAudioTranscription(transcriptText);
            } catch (error) {
              console.error("❌ [PROCESS] Error sending via IPC:", error);
            }
          }

          // Also forward to storage service for unified processing
          if (this.transcriptionStorageService) {
            this.transcriptionStorageService.addTranscription(transcriptText);
          }

          // Also send via callback for compatibility
          if (
            this.transcriptionCallback &&
            transcriptText.trim() &&
            transcriptText !== buffer.lastFlushedText
          ) {
            console.log(
              `📢 [PROCESS] Sending to callback: "${transcriptText}"`
            );
            this.transcriptionCallback("transcript", {
              text: transcriptText,
              isFinal: true, // Always true because we're filtering out non-final transcriptions
              channel: channelIndex,
              speaker: buffer.lastSpeaker,
            });

            // Save final transcription
            console.log(
              `📝 [PROCESS] Saving final transcription: "${transcriptText}"`
            );
            this.transcriptionList.push(transcriptText);
            buffer.lastFlushedText = transcriptText;
          } else {
            console.log(
              `⚠️ [PROCESS] Text ignored: empty=${!transcriptText.trim()}, repeated=${
                transcriptText === buffer.lastFlushedText
              }`
            );
          }

          // Store formatted version
          buffer.formattedSegment = alternative.transcript;
        });
      } else {
        console.log(
          "❌ [PROCESS] Unrecognized data format:",
          Object.keys(data)
        );
      }

      console.log("✅ [PROCESS] Transcription processing completed");
    } catch (error) {
      console.log("❌ [PROCESS] Error during transcription processing:", error);
      this.logger.error("Error processing transcription", error);
    }
  }

  /**
   * Flush the current speaker segment and return formatted text
   */
  public flushSpeakerSegment(channelIndex: number): string | null {
    const buffer = this.activeSpeakerBuffer[channelIndex];
    if (!buffer || buffer.currentSegment.length === 0) return null;

    // Use the original formatted text instead of reconstructing from words
    const content =
      buffer.formattedSegment || buffer.currentSegment.join(" ").trim();
    if (!content) return null;

    // Check if speaker has changed from last transcription segment
    const speakerPrefix =
      this.currentSpeaker !== buffer.lastSpeaker
        ? `[${buffer.lastSpeaker}] `
        : "";

    // Update current speaker
    this.currentSpeaker = buffer.lastSpeaker;

    const text = `${speakerPrefix}${content}`;
    buffer.currentSegment = [];
    buffer.formattedSegment = "";
    return text;
  }

  /**
   * Get the stored transcription list
   */
  public getTranscriptionList(): string[] {
    return [...this.transcriptionList];
  }

  /**
   * Clear the transcription history
   */
  public clearTranscriptionList(): void {
    this.transcriptionList = [];
  }
}
