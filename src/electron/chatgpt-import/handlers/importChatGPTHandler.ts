// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { ModeService, OrchOSModeEnum } from '../../../services/ModeService';
import { ChatGPTSession, ImportChatGPTParams, ImportResult } from '../interfaces/types';
import { DeduplicationService } from '../services/deduplication/DeduplicationService';
import { EmbeddingService } from '../services/embedding/EmbeddingService';
import { ChatGPTParser } from '../services/parser/ChatGPTParser';
import { VectorStorageService } from '../services/storage/VectorStorageService';
import { TextChunker } from '../services/text-processor/TextChunker';
import { Logger } from '../utils/logging';
import { ProgressReporter } from '../utils/progressReporter';

/**
 * Handler for importing ChatGPT history
 * Orchestrates different services following SOLID principles
 */
export async function importChatGPTHistoryHandler(params: ImportChatGPTParams): Promise<ImportResult> {
  const { fileBuffer, mode, applicationMode, openAIService, pineconeHelper, onProgress } = params;
  
  // Initialize services
  const logger = new Logger('[ImportChatGPT]');
  const progressReporter = new ProgressReporter(onProgress, logger);
  
  // Determine mode for service configuration
  let currentMode: OrchOSModeEnum;
  if (applicationMode) {
    // Convert string to enum
    if (applicationMode.toLowerCase() === 'basic') {
      currentMode = OrchOSModeEnum.BASIC;
    } else if (applicationMode.toLowerCase() === 'advanced') {
      currentMode = OrchOSModeEnum.ADVANCED;
    } else {
      logger.warn(`🟡 Unknown applicationMode: "${applicationMode}", falling back to ModeService`);
      currentMode = ModeService.getMode();
    }
    logger.info(`🔧 Using applicationMode from IPC: "${applicationMode}" -> ${currentMode}`);
  } else {
    currentMode = ModeService.getMode();
    logger.info(`🔧 No applicationMode provided, using ModeService: ${currentMode}`);
  }
  
  const isBasicMode = currentMode === OrchOSModeEnum.BASIC;
  const storageType = isBasicMode ? 'DuckDB' : 'Pinecone';
  logger.info(`🗄️ Storage mode: ${storageType} (${isBasicMode ? 'Basic' : 'Advanced'} mode)`);
  
  // Use the helper passed from IPC (already correct for the mode)
  const vectorHelper = pineconeHelper;
  
  const parser = new ChatGPTParser(progressReporter, logger);
  const deduplicationService = new DeduplicationService(vectorHelper, progressReporter, logger);
  const textChunker = new TextChunker();
  const embeddingService = new EmbeddingService(openAIService, logger, progressReporter, applicationMode);
  const storageService = new VectorStorageService(vectorHelper, progressReporter, logger, isBasicMode);
  
  try {
    // Log of start
    logger.info(`Starting ChatGPT import in ${mode} mode with applicationMode: ${applicationMode || 'auto-detect'} using ${storageType}`);
    
    // 1. Parse the file
    const rawSessions = parser.parseBuffer(fileBuffer);
    
    // 2. Extract messages
    let allMessages = parser.extractMessages(rawSessions);
    logger.info(`Extracted ${allMessages.length} messages from file`);
    
    // 3. Ensure all messages have valid IDs
    logger.info('PASSO 3: Ensuring all messages have valid IDs...');
    allMessages = parser.ensureMessageIds(allMessages);
    logger.info('PASSO 3: IDs ensured successfully');
    
    // 4. Deduplication
    logger.info('PASSO 4: Starting deduplication...');
    let uniqueMessages;
    try {
      uniqueMessages = await deduplicationService.filterDuplicates(allMessages, mode);
      logger.info(`PASSO 4: After deduplication: ${uniqueMessages.length} unique messages`);
      logger.info('PASSO 4 COMPLETED: Moving to step 5...');

      // Additional verification right after deduplication
      if (!uniqueMessages || !Array.isArray(uniqueMessages)) {
        throw new Error(`Invalid deduplication result: ${uniqueMessages}`);
      }
      
      logger.info('CRITICAL CHECKPOINT: Deduplication completed successfully');
    } catch (error) {
      logger.error('FATAL ERROR during deduplication:', error);
      if (error instanceof Error) {
        logger.error(`Error details: ${error.message}`);
        logger.error(`Stack trace: ${error.stack || 'Not available'}`);
      }
      throw new Error(`Deduplication failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    try {
      // 5. Data cleanup (overwrite mode)
      logger.info(`PASSO 5: Starting with mode=${mode}`);
      if (mode === 'overwrite') {
        logger.info(`PASSO 5: Deleting existing data (overwrite mode) from ${storageType}...`);
        await storageService.deleteExistingData();
        logger.info(`PASSO 5: Existing data deleted successfully from ${storageType}`);
      } else {
        logger.info('PASSO 5: Increment mode - skipping data cleanup');
      }
      logger.info('PASSO 5 COMPLETED: Moving to step 6...');
    } catch (error) {
      logger.error('FATAL ERROR in step 5:', error);
      throw new Error(`Step 5 failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Initialize embedding service based on mode
    if (isBasicMode) {
      logger.info('Initializing HuggingFace service for embeddings (Basic mode)...');
    } else if (openAIService) {
      logger.info('Initializing OpenAI service for embeddings (Advanced mode)...');
      const initialized = await embeddingService.ensureOpenAIInitialized();
      logger.info(`OpenAIService initialization status: ${initialized ? 'OK' : 'FAILED'}`);
      if (!initialized) {
        logger.error('OpenAIService could not be initialized. The OPENAI_KEY environment variable must be set.');
        logger.info('Set the OPENAI_KEY environment variable with your API key');
      }
    }

    // Verification of TextChunker before processing
    logger.info('VERIFICATION: Verifying TextChunker before processing...');
    try {
      logger.info(`TextChunker available: ${textChunker ? 'YES' : 'NO'}`);
      logger.info(`Number of messages to be processed: ${uniqueMessages.length}`);
      if (uniqueMessages.length > 0) {
        logger.info(`Example message for processing: ${JSON.stringify(uniqueMessages[0]).substring(0, 150)}...`);
      }
    } catch (err) {
      logger.error('Verification failed: Error verifying TextChunker:', err);
    }
    
    // 6. Process messages into chunks
    logger.info('PASSO 6: Starting message chunk processing...');
    let messageChunks;
    try {
      // Verify input for chunk processor
      logger.info(`PASSO 6: Input for processor: ${uniqueMessages.length} messages, first item: ${JSON.stringify(uniqueMessages[0]).substring(0, 100)}...`);
      
      messageChunks = textChunker.processMessagesIntoChunks(uniqueMessages);
      if (!messageChunks) {
        throw new Error('TextChunker returned undefined or null');
      }
      logger.info(`PASSO 6: Created ${messageChunks.length} text chunks from ${uniqueMessages.length} messages`);
      if (messageChunks.length > 0) {
        logger.info(`PASSO 6: Example chunk: ${JSON.stringify(messageChunks[0]).substring(0, 100)}...`);
      }
      
      logger.info('PASSO 6 COMPLETED: Moving to step 7...');
    } catch (error) {
      logger.error('FATAL ERROR in chunk processing:', error);
      throw new Error(`Chunk processing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // 7. Create batches for efficient processing
    logger.info('PASSO 7: Creating batches for efficient processing...');
    let batches;
    try {
      if (!messageChunks || messageChunks.length === 0) {
        throw new Error('No chunks available for batch processing');
      }
      batches = textChunker.createProcessingBatches(messageChunks);
      if (!batches) {
        throw new Error('TextChunker returned undefined or null when creating batches');
      }
      logger.info(`PASSO 7: Processing ${messageChunks.length} chunks in ${batches.length} batches`);
      logger.info(`PASSO 7: First batch has ${batches[0]?.length || 0} chunks`);
      logger.info('PASSO 7 COMPLETED: Moving to step 8...');
    } catch (error) {
      logger.error('FATAL ERROR in batch creation:', error);
      throw new Error(`Batch creation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Verification of transition between steps
    logger.info('TRANSITION: Moving from step 7 to step 8...');
    logger.info('=========== FIM DO DIAGNÓSTICO ===========');
    logger.info('===============================================');
    
    // 8. Generate embeddings and create vectors
    logger.info(`STARTING EMBEDDINGS GENERATION using ${isBasicMode ? 'HuggingFace' : 'OpenAI'}...`);
    let vectors;
    try {
      vectors = await embeddingService.generateEmbeddingsForChunks(batches, messageChunks);
      logger.info(`Generated ${vectors.length} vectors with embeddings`);
    } catch (error) {
      logger.error('FATAL ERROR in embedding generation:', error);
      throw new Error(`Embedding generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // 9. Save vectors to appropriate storage
    logger.info(`[DIAGNOSTIC] Vectors to be saved to ${storageType}: ${vectors.length}`);
    if (vectors.length > 0) {
      logger.info(`[DIAGNOSTIC] Example vector: ${JSON.stringify(vectors[0]).substring(0, 200)}`);
    } else {
      logger.warn('[DIAGNOSTIC] No vectors generated for saving!');
    }
    const saveResult = await storageService.saveVectors(vectors);
    logger.info(`[DIAGNOSTIC] Save result to ${storageType}: success=${saveResult.success}, error=${saveResult.error || 'none'}`);
    if (!saveResult.success) {
      logger.error(`[DIAGNOSTIC] Error saving vectors to ${storageType}: ${saveResult.error}`);
    }
    
    // 10. Calculate final statistics
    const totalMessagesInFile = rawSessions.reduce((acc: number, session: ChatGPTSession) => {
      return acc + Object.values(session.mapping || {}).length;
    }, 0);
    
    const skipped = totalMessagesInFile - vectors.length;
    
    // 11. Log of completion
    logger.info(`=============================================`);
    logger.info(`🎉 IMPORTATION COMPLETED SUCCESSFULLY`);
    logger.info(`📊 Statistics:`);
    logger.info(`- Mode: ${mode === 'overwrite' ? 'OVERWRITE' : 'INCREMENTAL'}`);
    logger.info(`- Storage: ${storageType} (${isBasicMode ? 'Basic' : 'Advanced'} mode)`);
    logger.info(`- Total messages in file: ${totalMessagesInFile}`);
    logger.info(`- Duplicated messages ignored: ${skipped} (${Math.round((skipped/totalMessagesInFile)*100)}%)`);
    logger.info(`- Vectors saved to ${storageType}: ${vectors.length} (${Math.round((vectors.length/totalMessagesInFile)*100)}%)`);
    logger.info(`=============================================`);
    
    return { 
      success: true, 
      imported: vectors.length, 
      skipped,
      totalMessagesInFile,
      mode
    };
  } catch (error) {
    logger.error(`Importation failed:`, error);
    return { 
      success: false, 
      imported: 0, 
      skipped: 0,
      totalMessagesInFile: 0,
      mode,
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
