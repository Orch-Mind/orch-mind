// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// PineconeMemoryService.ts
// Implementation of IPersistenceService using Pinecone or DuckDB (for basic mode)

import { IPersistenceService } from "../../interfaces/memory/IPersistenceService";
import { IEmbeddingService } from "../../interfaces/openai/IEmbeddingService";
import { SpeakerTranscription } from "../../interfaces/transcription/TranscriptionTypes";
import { LoggingUtils } from "../../utils/LoggingUtils";
import { countTokens } from "./utils/tokenUtils";

// Normaliza keywords para lowercase e remove espaços extras
function normalizeKeywords(keywords: string[] = []): string[] {
  return keywords.map((k) => k.trim().toLowerCase()).filter(Boolean);
}

export class PineconeMemoryService implements IPersistenceService {
  private embeddingService: IEmbeddingService;
  // Set that keeps track of processed transcription indices per speaker (brain memory index)
  private processedTranscriptionIndices: Record<string, Set<number>> = {};
  // Whether we're using basic mode (DuckDB) or complete mode (Pinecone)
  private useBasicMode: boolean = false;

  // Buffer to temporarily store messages before sending to Pinecone (cognitive buffer)
  private messageBuffer: {
    primaryUser: {
      messages: string[];
      lastUpdated: number;
    };
    external: Record<
      string,
      {
        messages: string[];
        lastUpdated: number;
      }
    >;
    lastFlushTime: number;
  } = {
    primaryUser: {
      messages: [],
      lastUpdated: Date.now(),
    },
    external: {},
    lastFlushTime: Date.now(),
  };

  // Buffer configuration (cognitive buffer tuning)
  private bufferConfig = {
    maxBufferAgeMs: 5 * 60 * 1000, // 5 minutes
    inactivityThresholdMs: 5 * 60 * 1000, // 5 minutes de inatividade força um flush
    minTokensBeforeFlush: 100, // Minimum tokens before considering flush
    maxTokensBeforeFlush: 150, // Maximum token limit
  };

  constructor(embeddingService: IEmbeddingService) {
    this.embeddingService = embeddingService;

    // DEPRECATED: PineconeMemoryService is being phased out - always use DuckDB now
    this.useBasicMode = true; // Force DuckDB mode

    LoggingUtils.logWarning(
      `[MEMORY-SERVICE] ⚠️  PineconeMemoryService is DEPRECATED. Using DuckDB local storage only.`
    );
    LoggingUtils.logInfo(
      `[MEMORY-SERVICE] Initialized DuckDB memory service (unified local storage)`
    );

    // Reset buffer state
    this.resetBuffer();

    // Mode change listeners removed - DuckDB is now the only storage backend
    // No need to switch between storage systems anymore
  }

  /**
   * Saves interaction to long-term memory in Pinecone
   */
  async saveInteraction(
    question: string,
    answer: string,
    speakerTranscriptions: SpeakerTranscription[],
    primaryUserSpeaker: string
  ): Promise<void> {
    if (!this.isAvailable() || !this.embeddingService.isInitialized()) {
      return;
    }

    try {
      // Identify new transcriptions per speaker (brain memory update)
      const newTranscriptions: SpeakerTranscription[] = [];

      // Filter only transcriptions that have not been processed yet (memory deduplication)
      for (let i = 0; i < speakerTranscriptions.length; i++) {
        const transcription = speakerTranscriptions[i];
        const { speaker } = transcription;

        // Initialize index set for this speaker (memory index init)
        if (!this.processedTranscriptionIndices[speaker]) {
          this.processedTranscriptionIndices[speaker] = new Set<number>();
        }

        // Add only new transcriptions (not previously processed) (brain memory growth)
        if (!this.processedTranscriptionIndices[speaker].has(i)) {
          newTranscriptions.push(transcription);
          // Marcar como processada para futuras chamadas
          this.processedTranscriptionIndices[speaker].add(i);
          LoggingUtils.logInfo(
            `[COGNITIVE-MEMORY] New transcription for speaker ${speaker}: ${transcription.text.substring(
              0,
              30
            )}...`
          );
        }
      }

      // If there are no new transcriptions and no question or answer, do nothing (no brain update required)
      if (
        newTranscriptions.length === 0 &&
        !question.trim() &&
        !answer.trim()
      ) {
        LoggingUtils.logInfo(
          `[COGNITIVE-BUFFER] No new content to add to cognitive buffer`
        );
        return;
      }

      // We do not store the question in the buffer, following the original flow (direct brain query)
      // The question will be processed directly at flush time (on-demand brain query)

      if (newTranscriptions.length > 0) {
        LoggingUtils.logInfo(
          `[COGNITIVE-BUFFER] Adding ${newTranscriptions.length} new transcriptions to cognitive buffer`
        );

        // Group ONLY new transcriptions by speaker (brain memory organization)
        const speakerMessages = this.groupTranscriptionsBySpeaker(
          newTranscriptions,
          primaryUserSpeaker
        );

        // Process grouped messages by speaker and add to buffer (brain memory buffer fill)
        for (const [speaker, messages] of speakerMessages.entries()) {
          // Skip if no messages (no brain update required)
          if (messages.length === 0) continue;

          const isUser = speaker === primaryUserSpeaker;

          if (isUser) {
            // Add primary user's messages to buffer (brain memory consolidation)
            this.messageBuffer.primaryUser.messages.push(...messages);
            this.messageBuffer.primaryUser.lastUpdated = Date.now();
            const currentTokens = this.countBufferTokens();
            LoggingUtils.logInfo(
              `[COGNITIVE-BUFFER] Added ${messages.length} messages to primary user's buffer. Total tokens: ${currentTokens}/${this.bufferConfig.maxTokensBeforeFlush}`
            );
          } else {
            // Initialize buffer for external speaker if it does not exist (brain buffer expansion)
            if (!this.messageBuffer.external[speaker]) {
              this.messageBuffer.external[speaker] = {
                messages: [],
                lastUpdated: Date.now(),
              };
            }

            // Add external speaker's messages to buffer (brain memory expansion)
            this.messageBuffer.external[speaker].messages.push(...messages);
            this.messageBuffer.external[speaker].lastUpdated = Date.now();
            const currentTokens = this.countBufferTokens();
            LoggingUtils.logInfo(
              `[COGNITIVE-BUFFER] Added ${messages.length} messages to buffer for speaker ${speaker}. Total tokens: ${currentTokens}/${this.bufferConfig.maxTokensBeforeFlush}`
            );
          }
        }
      }

      // Check if we should flush ONLY based on token limit (brain flush threshold)
      const shouldFlush = this.shouldFlushBuffer();

      if (shouldFlush) {
        // If buffer reached token limit, save everything including user's messages (cognitive flush)
        LoggingUtils.logInfo(
          `[COGNITIVE-BUFFER] Auto-flushing cognitive buffer due to token limit`
        );
        await this.flushBuffer(
          answer.trim() ? answer : null,
          primaryUserSpeaker,
          true
        );
      } else if (answer.trim()) {
        // If we have an assistant response but buffer is not full,
        // save ONLY the response (without user's messages), so we don't lose the response (brain response preservation)
        LoggingUtils.logInfo(
          `[COGNITIVE-BUFFER] Saving only assistant's response, retaining buffer state`
        );

        // Create a vector entry only for the response, without touching the buffer (direct brain memory insert)
        await this.saveAssistantResponseOnly(answer);
      }
    } catch (error) {
      LoggingUtils.logError(
        "[COGNITIVE-BUFFER] Error processing interaction for cognitive buffer",
        error
      );
    }
  }

  /**
   * Saves interaction directly to long-term memory bypassing buffer system
   * For PineconeMemoryService, this delegates to the regular saveInteraction since Pinecone doesn't use buffering
   */
  async saveDirectInteraction(
    question: string,
    answer: string,
    speakerTranscriptions: SpeakerTranscription[],
    primaryUserSpeaker: string,
    forceSave: boolean = true
  ): Promise<void> {
    LoggingUtils.logInfo(
      `[PINECONE-DIRECT-SAVE] Delegating to regular saveInteraction (Pinecone doesn't use buffering): question='${question.substring(
        0,
        50
      )}...', answer='${answer.substring(0, 50)}...', forceSave=${forceSave}`
    );

    // For Pinecone, direct save is the same as regular save since there's no buffering
    await this.saveInteraction(
      question,
      answer,
      speakerTranscriptions,
      primaryUserSpeaker
    );
  }

  /**
   * Checks if the memory service is available (DuckDB only)
   */
  isAvailable(): boolean {
    // Always check for DuckDB services (Pinecone deprecated)
    return (
      !!window.electronAPI?.saveToDuckDB && !!window.electronAPI.queryDuckDB
    );
  }

  /**
   * Creates a vector entry for Pinecone
   */
  createVectorEntry(
    id: string,
    embedding: number[],
    metadata: Record<string, unknown>
  ): { id: string; values: number[]; metadata: Record<string, unknown> } {
    return {
      id,
      values: embedding,
      metadata,
    };
  }

  /**
   * Queries memory store (DuckDB only - Pinecone deprecated)
   */
  async queryMemory(
    embedding: number[],
    topK: number = 5,
    keywords: string[] = [],
    filters?: Record<string, unknown>
  ): Promise<string> {
    if (!this.isAvailable() || !embedding?.length) {
      return "";
    }
    try {
      // Log filters for debug (brain query diagnostics)
      if (filters) {
        LoggingUtils.logInfo(
          `[MemoryService] filters: ${JSON.stringify(filters)}`
        );
      }

      // Always query DuckDB (Pinecone deprecated)
      LoggingUtils.logInfo(`[MEMORY] Querying DuckDB local storage`);
      const queryResponse = await window.electronAPI.queryDuckDB(
        embedding,
        topK,
        normalizeKeywords(keywords),
        filters
        // Using dynamic threshold - system will choose optimal value based on context
      );

      // Extract relevant texts from results (brain memory retrieval)
      const relevantTexts = queryResponse.matches
        .filter(
          (match: { metadata?: { content?: string } }) =>
            match.metadata && match.metadata.content
        )
        .map(
          (match: { metadata?: { content?: string } }) =>
            match.metadata?.content as string
        )
        .join("\n\n");

      if (relevantTexts) {
        LoggingUtils.logInfo(
          `[COGNITIVE-MEMORY] Relevant context retrieved via DuckDB`
        );
      }

      return relevantTexts;
    } catch (error) {
      LoggingUtils.logError(
        `[COGNITIVE-MEMORY] Error querying DuckDB memory`,
        error
      );
      return "";
    }
  }

  /**
   * Checks if the buffer should be persisted based ONLY on token limit (brain flush threshold)
   */
  private shouldFlushBuffer(): boolean {
    // Calculate total number of messages in buffer (for diagnostics)
    const totalUserMessages = this.messageBuffer.primaryUser.messages.length;
    const totalExternalMessages = Object.values(
      this.messageBuffer.external
    ).reduce((sum, speaker) => sum + speaker.messages.length, 0);
    const totalMessages = totalUserMessages + totalExternalMessages;

    // Check total number of tokens in buffer (brain load check)
    const totalTokens = this.countBufferTokens();

    // Detailed log to better understand buffer behavior (cognitive diagnostics)
    LoggingUtils.logInfo(
      `[COGNITIVE-BUFFER] Current status: ${totalTokens}/${this.bufferConfig.maxTokensBeforeFlush} tokens, ${totalMessages} total messages (${totalUserMessages} user, ${totalExternalMessages} external)`
    );

    // If minimum token threshold not reached, do not flush (brain conservation)
    if (totalTokens < this.bufferConfig.minTokensBeforeFlush) {
      LoggingUtils.logInfo(
        `[COGNITIVE-BUFFER] Minimum token threshold not reached (${totalTokens}/${this.bufferConfig.minTokensBeforeFlush})`
      );
      return false;
    }

    // If maximum token limit exceeded, flush (brain overflow)
    if (totalTokens >= this.bufferConfig.maxTokensBeforeFlush) {
      LoggingUtils.logInfo(
        `[COGNITIVE-BUFFER] Token limit exceeded (${totalTokens}/${this.bufferConfig.maxTokensBeforeFlush})`
      );
      return true;
    }

    // If here, between min and max, depends only on max limit (brain threshold logic)
    return false;
  }

  /**
   * Persists the buffer content in Pinecone and clears the buffer (neural persistence/flush)
   */
  private async flushBuffer(
    answer: string | null,
    primaryUserSpeaker: string,
    resetBufferAfterFlush: boolean = true
  ): Promise<void> {
    if (!this.isAvailable() || !this.embeddingService.isInitialized()) {
      LoggingUtils.logWarning(
        `[COGNITIVE-BUFFER] Neural persistence service unavailable, flush aborted`
      );
      return;
    }

    try {
      const now = Date.now();
      const uuid = now.toString();
      const pineconeEntries = [] as Array<{
        id: string;
        values: number[];
        metadata: Record<string, unknown>;
      }>;

      // Processar mensagens do usuário principal se houver
      if (this.messageBuffer.primaryUser.messages.length > 0) {
        const userMessages = this.messageBuffer.primaryUser.messages;
        const completeUserMessage = userMessages.join("\n");

        LoggingUtils.logInfo(
          `[Buffer] Criando embedding para ${
            userMessages.length
          } mensagens do usuário principal: "${completeUserMessage.substring(
            0,
            50
          )}${completeUserMessage.length > 50 ? "..." : ""}"`
        );
        const userEmbedding = await this.embeddingService.createEmbedding(
          completeUserMessage
        );

        pineconeEntries.push(
          this.createVectorEntry(
            `speaker-${uuid}-${primaryUserSpeaker}`,
            userEmbedding,
            {
              type: "complete_message",
              content: completeUserMessage,
              source: "user",
              speakerName: primaryUserSpeaker,
              speakerGroup: primaryUserSpeaker,
              isSpeaker: true,
              isUser: true,
              messageCount: userMessages.length,
              timestamp: new Date().toISOString(),
              bufferCreatedAt: new Date(
                this.messageBuffer.primaryUser.lastUpdated
              ).toISOString(),
              bufferFlushedAt: new Date(now).toISOString(),
            }
          )
        );
      }

      // Processar mensagens de cada falante externo
      for (const [speaker, data] of Object.entries(
        this.messageBuffer.external
      )) {
        if (data.messages.length === 0) continue;

        const externalMessages = data.messages;
        const completeExternalMessage = externalMessages.join("\n");

        LoggingUtils.logInfo(
          `[Buffer] Criando embedding para ${externalMessages.length} mensagens do falante ${speaker}`
        );
        const externalEmbedding = await this.embeddingService.createEmbedding(
          completeExternalMessage
        );

        pineconeEntries.push(
          this.createVectorEntry(
            `speaker-${uuid}-${speaker}`,
            externalEmbedding,
            {
              type: "complete_message",
              content: completeExternalMessage,
              source: "external",
              speakerName: speaker,
              speakerGroup: "external",
              isSpeaker: true,
              isUser: false,
              messageCount: externalMessages.length,
              timestamp: new Date().toISOString(),
              bufferCreatedAt: new Date(data.lastUpdated).toISOString(),
              bufferFlushedAt: new Date(now).toISOString(),
            }
          )
        );
      }

      // Adicionar resposta se fornecida
      if (answer) {
        LoggingUtils.logInfo(
          `[Buffer] Adicionando resposta ao salvar no Pinecone`
        );
        const answerEmbed = await this.embeddingService.createEmbedding(answer);

        pineconeEntries.push(
          this.createVectorEntry(`a-${uuid}`, answerEmbed, {
            type: "assistant_response",
            content: answer,
            source: "assistant",
            speakerName: "assistant",
            speakerGroup: "assistant",
            isSpeaker: false,
            isUser: false,
            timestamp: new Date().toISOString(),
            bufferFlushedAt: new Date(now).toISOString(),
          })
        );
      }

      // Verificar se há entradas para salvar
      if (pineconeEntries.length > 0) {
        // Always save to DuckDB (Pinecone deprecated)
        const result = await window.electronAPI?.saveToDuckDB(pineconeEntries);
        if (result?.success) {
          LoggingUtils.logInfo(
            `[Buffer] Persistido no DuckDB: ${pineconeEntries.length} entradas`
          );
        } else {
          // Check if error is due to Windows ARM64 incompatibility
          if (
            result?.error?.includes(
              "unsupported arch 'arm64' for platform 'win32'"
            ) ||
            result?.error?.includes("Windows ARM64")
          ) {
            LoggingUtils.logInfo(
              `[Buffer] DuckDB not available on Windows ARM64 - vector persistence disabled`
            );
          } else {
            LoggingUtils.logError(
              `[Buffer] Erro ao persistir no DuckDB: ${result?.error}`
            );
          }
        }

        // Atualizar timestamp do último flush
        this.messageBuffer.lastFlushTime = now;

        // Limpar o buffer apenas se necessário
        if (resetBufferAfterFlush) {
          LoggingUtils.logInfo(`[Buffer] Resetando buffer após flush`);
          this.resetBuffer();
        } else {
          LoggingUtils.logInfo(
            `[Buffer] Mantendo buffer após salvar resposta do assistente`
          );
        }
      } else {
        LoggingUtils.logInfo(`[Buffer] Nenhuma entrada para salvar no DuckDB`);
      }
    } catch (error) {
      LoggingUtils.logError(
        "[Buffer] Erro ao persistir buffer no DuckDB",
        error
      );
    }
  }

  /**
   * Clears the buffer after persistence (brain buffer reset)
   */
  private resetBuffer(): void {
    this.messageBuffer.primaryUser.messages = [];
    this.messageBuffer.external = {};
    // Keeps lastFlushTime for flush interval control (brain timing)

    LoggingUtils.logInfo(
      `[COGNITIVE-BUFFER] Cognitive buffer reset after neural persistence`
    );
  }

  /**
   * Saves only the assistant's response without touching the buffer (direct brain response persistence)
   * @param answer Assistant response
   */
  private async saveAssistantResponseOnly(answer: string): Promise<void> {
    if (
      !this.isAvailable() ||
      !this.embeddingService.isInitialized() ||
      !answer.trim()
    ) {
      return;
    }

    try {
      const now = Date.now();
      const uuid = now.toString();
      const pineconeEntries = [] as Array<{
        id: string;
        values: number[];
        metadata: Record<string, unknown>;
      }>;

      // Only process the assistant's response (brain response only)
      if (answer.trim()) {
        LoggingUtils.logInfo(
          `[COGNITIVE-BUFFER] Adding only assistant response to DuckDB without buffer flush`
        );
        const assistantEmbedding = await this.embeddingService.createEmbedding(
          answer
        );

        pineconeEntries.push(
          this.createVectorEntry(`assistant-${uuid}`, assistantEmbedding, {
            type: "assistant_response",
            content: answer,
            source: "assistant",
            speakerName: "assistant",
            speakerGroup: "assistant",
            isSpeaker: false,
            isUser: false,
            timestamp: new Date().toISOString(),
            bufferFlushedAt: new Date(now).toISOString(),
          })
        );

        // Always save only the response to DuckDB (Pinecone deprecated)
        if (pineconeEntries.length > 0) {
          const result = await window.electronAPI?.saveToDuckDB(
            pineconeEntries
          );
          if (result?.success) {
            LoggingUtils.logInfo(
              `[COGNITIVE-BUFFER] Persisted only assistant response to DuckDB: ${pineconeEntries.length} entries`
            );
          } else {
            // Check if error is due to Windows ARM64 incompatibility
            if (
              result?.error?.includes(
                "unsupported arch 'arm64' for platform 'win32'"
              ) ||
              result?.error?.includes("Windows ARM64")
            ) {
              LoggingUtils.logInfo(
                `[COGNITIVE-BUFFER] DuckDB not available on Windows ARM64 - vector persistence disabled`
              );
            } else {
              LoggingUtils.logError(
                `[COGNITIVE-BUFFER] Error persisting to DuckDB: ${result?.error}`
              );
            }
          }
        }
      }
    } catch (error) {
      LoggingUtils.logError(
        "[COGNITIVE-BUFFER] Error persisting assistant response to DuckDB",
        error
      );
    }
  }

  /**
   * Conta o total de tokens GPT no buffer atual
   * @returns Número total de tokens no buffer
   */
  private countBufferTokens(): number {
    // Concatenar todas as mensagens do usuário principal
    const userText = this.messageBuffer.primaryUser.messages.join("\n");
    let totalTokens = countTokens(userText);

    LoggingUtils.logInfo(
      `[Buffer-Debug] Texto do usuário: "${userText.substring(0, 50)}..." (${
        userText.length
      } caracteres, ${totalTokens} tokens)`
    );

    // Não contamos tokens de perguntas já que não as armazenamos no buffer

    // Adicionar tokens de todos os falantes externos
    for (const speakerData of Object.values(this.messageBuffer.external)) {
      const speakerText = speakerData.messages.join("\n");
      const speakerTokens = countTokens(speakerText);
      LoggingUtils.logInfo(
        `[Buffer-Debug] Texto de falante externo: "${speakerText.substring(
          0,
          50
        )}..." (${speakerText.length} caracteres, ${speakerTokens} tokens)`
      );
      totalTokens += speakerTokens;
    }

    return totalTokens;
  }

  /**
   * Agrupa transcrições por falante, tratando transcrições mistas
   * @param transcriptions - Lista de transcrições a serem agrupadas
   * @param primaryUserSpeaker - Identificador do falante principal (usuário)
   * @returns Mapa de falantes para suas mensagens agrupadas
   */
  private groupTranscriptionsBySpeaker(
    transcriptions: SpeakerTranscription[],
    primaryUserSpeaker: string
  ): Map<string, string[]> {
    // Inicializa estrutura de dados para armazenar mensagens por falante
    const speakerMessages = new Map<string, string[]>();

    /**
     * Função interna que divide uma transcrição com múltiplos falantes
     * @param text - Texto contendo marcadores de falantes [Speaker] Texto...
     * @returns Array de segmentos com falante normalizado e texto
     */
    const splitMixedTranscription = (
      text: string
    ): Array<{ speaker: string; text: string }> => {
      const results: Array<{ speaker: string; text: string }> = [];
      // Regex otimizada para encontrar padrões [Falante] Texto
      const speakerPattern = /\[([^\]]+)\]\s*(.*?)(?=\s*\[[^\]]+\]|$)/gs;

      // Processa todas as correspondências da regex
      let match;
      while ((match = speakerPattern.exec(text)) !== null) {
        const [, rawSpeaker, spokenText] = match;

        // Validação de dados antes de processar
        if (!rawSpeaker?.trim() || !spokenText?.trim()) continue;

        // Normalização do falante para categorias consistentes
        const normalizedSpeaker = this.normalizeSpeakerName(
          rawSpeaker.trim(),
          primaryUserSpeaker
        );

        results.push({
          speaker: normalizedSpeaker,
          text: spokenText.trim(),
        });
      }

      return results;
    };

    // Itera sobre todas as transcrições
    for (const { text, speaker } of transcriptions) {
      // Detecção eficiente de transcrições mistas (com marcadores de falantes)
      const isMixedTranscription =
        text.indexOf("[") > -1 && text.indexOf("]") > -1;

      if (isMixedTranscription) {
        // Processa transcrições mistas dividindo-as por falante
        const segments = splitMixedTranscription(text);

        // Agrupa textos por falante normalizado
        for (const { speaker: segmentSpeaker, text: segmentText } of segments) {
          // Inicializa array para o falante se necessário
          if (!speakerMessages.has(segmentSpeaker)) {
            speakerMessages.set(segmentSpeaker, []);
          }

          // Adiciona texto ao array do falante
          const messages = speakerMessages.get(segmentSpeaker);
          if (messages) messages.push(segmentText); // Evita o uso de ?. para melhor performance
        }
      } else {
        // Para transcrições normais (sem marcadores), usa o falante da transcrição
        const normalizedSpeaker = this.normalizeSpeakerName(
          speaker,
          primaryUserSpeaker
        );

        // Inicializa array para o falante se necessário
        if (!speakerMessages.has(normalizedSpeaker)) {
          speakerMessages.set(normalizedSpeaker, []);
        }

        // Adiciona texto ao array do falante
        const messages = speakerMessages.get(normalizedSpeaker);
        if (messages) messages.push(text);
      }
    }

    return speakerMessages;
  }

  /**
   * Saves vectors to memory store (DuckDB only - legacy method name for compatibility)
   * @param vectors Array of vectors
   * @returns Promise that resolves when vectors are saved
   */
  public async saveToPinecone(
    vectors: Array<{
      id: string;
      values: number[];
      metadata: Record<string, unknown>;
    }>
  ): Promise<void> {
    // Always save to DuckDB (Pinecone deprecated)
    LoggingUtils.logInfo(
      `[MEMORY] Saving ${vectors.length} vectors to DuckDB (legacy saveToPinecone method)`
    );
    const result = await window.electronAPI.saveToDuckDB(vectors);
    if (!result.success) {
      throw new Error(result.error || "Failed to save to DuckDB");
    }
  }

  /**
   * Normalizes the speaker name for consistent categories
   * @param rawSpeaker - Original speaker name
   * @param primaryUserSpeaker - Primary user speaker identifier
   * @returns Normalized speaker name
   */
  private normalizeSpeakerName(
    rawSpeaker: string,
    primaryUserSpeaker: string
  ): string {
    // Converts to lowercase for case-insensitive comparison
    const lowerSpeaker = rawSpeaker.toLowerCase();

    // Categorizes as "primary user" or "external"
    if (rawSpeaker === primaryUserSpeaker) {
      return primaryUserSpeaker;
    } else if (
      lowerSpeaker.includes("speaker") ||
      lowerSpeaker.includes("falante")
    ) {
      return "external";
    }

    // If it doesn't fit any special category, keeps the original
    return rawSpeaker;
  }
}
