// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { cleanThinkTags } from "../../../../../context/deepgram/utils/ThinkTagCleaner";

/**
 * StreamingManager - Responsável por gerenciar o estado de streaming de respostas
 * Aplica SRP: Uma única responsabilidade - gerenciar streaming
 */
export class StreamingManager {
  private streamingChunks: string = "";
  private isStreaming: boolean = false;
  private isThinking: boolean = false;
  private thinkingContent: string = "";
  private streamingResponse: string = "";

  constructor(
    private onStateChange: (state: StreamingState) => void,
    private onMessageComplete: (content: string) => void
  ) {}

  /**
   * Inicia o streaming
   */
  startStreaming(): void {
    console.log("🚀 [STREAMING] Started");
    this.isStreaming = true;
    this.streamingResponse = "";
    this.streamingChunks = "";
    this.isThinking = false;
    this.thinkingContent = "";

    this.notifyStateChange();
  }

  /**
   * Processa um chunk de streaming
   */
  processChunk(chunk: string): void {
    this.streamingChunks += chunk;
    const fullContent = this.streamingChunks;

    console.log("📝 [STREAMING] Chunk received:", chunk);

    // Verifica se estamos em fase de thinking
    const thinkOpenMatch = fullContent.match(/<think[^>]*>/i);
    const thinkCloseMatch = fullContent.match(/<\/think>/i);

    if (thinkOpenMatch && thinkCloseMatch) {
      // Temos uma tag think completa
      const thinkMatch = fullContent.match(/<think[^>]*>([\s\S]*?)<\/think>/i);
      if (thinkMatch && thinkMatch[1]) {
        this.thinkingContent = thinkMatch[1].trim();
        this.isThinking = true;
        console.log(
          "🧠 [STREAMING] Complete thinking tag found:",
          this.thinkingContent.substring(0, 50)
        );
      }

      // Para streaming, mostra apenas conteúdo após a tag think
      const afterThinkIndex =
        fullContent.lastIndexOf("</think>") + "</think>".length;
      const contentAfterThink = fullContent.substring(afterThinkIndex).trim();
      this.streamingResponse = contentAfterThink;

      // Se temos conteúdo após think, não estamos mais pensando
      if (contentAfterThink) {
        this.isThinking = false;
        console.log(
          "🧠 [STREAMING] Exited thinking, showing content:",
          contentAfterThink.substring(0, 50)
        );
      }
    } else if (thinkOpenMatch && !thinkCloseMatch) {
      // Estamos dentro de uma tag think
      const partialMatch = fullContent.match(/<think[^>]*>([\s\S]*?)$/i);
      if (partialMatch && partialMatch[1]) {
        this.thinkingContent = partialMatch[1].trim();
        this.isThinking = true;
        console.log(
          "🤔 [STREAMING] Thinking (partial):",
          partialMatch[1].substring(0, 50),
          "| isThinking:",
          this.isThinking
        );
      }
      this.streamingResponse = "";
    } else {
      // Sem tags think ou já passamos delas
      if (this.isThinking) {
        console.log("🧠 [STREAMING] Exiting thinking mode");
      }
      this.isThinking = false;
      const cleanedContent = cleanThinkTags(fullContent);
      this.streamingResponse = cleanedContent;
      console.log(
        "💬 [STREAMING] Regular content:",
        cleanedContent.substring(0, 50)
      );
    }

    this.notifyStateChange();
  }

  /**
   * Finaliza o streaming
   */
  endStreaming(): void {
    console.log("🏁 [STREAMING] Ended");

    const finalContent = this.streamingChunks
      ? cleanThinkTags(this.streamingChunks)
      : "";

    if (finalContent && finalContent.trim() !== "") {
      console.log(
        "✅ [STREAMING] Streaming completed:",
        finalContent.substring(0, 50)
      );
      this.onMessageComplete(finalContent);
    } else {
      console.log("⚠️ [STREAMING] No content after cleaning");
    }

    // Limpa o estado
    this.reset();
  }

  /**
   * Reseta o estado do streaming
   */
  reset(): void {
    this.isStreaming = false;
    this.streamingResponse = "";
    this.isThinking = false;
    this.thinkingContent = "";
    this.streamingChunks = "";

    this.notifyStateChange();
  }

  /**
   * Obtém o estado atual
   */
  getState(): StreamingState {
    return {
      isStreaming: this.isStreaming,
      streamingResponse: this.streamingResponse,
      isThinking: this.isThinking,
      thinkingContent: this.thinkingContent,
    };
  }

  /**
   * Notifica mudanças de estado
   */
  private notifyStateChange(): void {
    const state = this.getState();
    console.log("[StreamingManager] State change:", {
      isStreaming: state.isStreaming,
      streamingResponseLength: state.streamingResponse.length,
      streamingResponsePreview: state.streamingResponse.substring(0, 50),
      isThinking: state.isThinking,
      thinkingContentLength: state.thinkingContent.length,
      thinkingContentPreview: state.thinkingContent.substring(0, 50),
    });
    this.onStateChange(state);
  }
}

export interface StreamingState {
  isStreaming: boolean;
  streamingResponse: string;
  isThinking: boolean;
  thinkingContent: string;
}
