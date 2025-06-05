// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// TranscriptionStorageService.ts
// Service responsible for storing and managing transcriptions

import { ITranscriptionStorageService } from "../../interfaces/transcription/ITranscriptionStorageService";
import { EXTERNAL_SPEAKER_LABEL, SpeakerTranscription, SpeakerTranscriptionLog, UIUpdater } from "../../interfaces/transcription/TranscriptionTypes";
import { ISpeakerIdentificationService } from "../../interfaces/utils/ISpeakerIdentificationService";
import { LoggingUtils } from "../../utils/LoggingUtils";
import { DeepgramTranscriptionService } from "../DeepgramTranscriptionService";

export class TranscriptionStorageService implements ITranscriptionStorageService {
  // Estado
  private transcriptionList: string[] = [""];
  private speakerTranscriptions: SpeakerTranscription[] = [];
  private detectedSpeakers: Set<string> = new Set();
  private lastTranscription: string = "";
  private currentSpeaker: string = "";
  /**
   * Stores exactly the text sent to the UI, ready to be used in the prompt
   */
  private uiTranscriptionList: string[] = [];
  
  // Dependencies
  private speakerService: ISpeakerIdentificationService;
  private setTexts: UIUpdater;
  
  // New fields for question detection
  private lastQuestionPrompt: string = "";
  private lastPromptTimestamp: number = 0;
  private autoQuestionDetectionEnabled: boolean = true; // Default: enabled
  
  // Timer for question delay (kept for compatibility with cancelPendingQuestionTimer)
  private questionTimerId: NodeJS.Timeout | null = null;
  private pendingQuestionText: string = ""; // Text of the pending question
  private inQuestionCycle: boolean = false; // Flag to track if we're in a question cycle
  
  private transcriptionService: DeepgramTranscriptionService | null = null;
  
  constructor(speakerService: ISpeakerIdentificationService, setTexts: UIUpdater) {
    this.speakerService = speakerService;
    this.setTexts = setTexts;
  }
  
  /**
   * Sets the transcription service for auto-prompt functionality
   */
  setTranscriptionService(service: DeepgramTranscriptionService): void {
    this.transcriptionService = service;
  }
  
  /**
   * Adds a new transcription to the storage
   */
  addTranscription(text: string, speaker?: string): void {
    if (!text || !text.trim()) return;
    
    // If we are in a question cycle, new transcription cancels it (since prompt was already sent)
    if (this.inQuestionCycle) {
      LoggingUtils.logInfo(`New transcription received, ending question cycle: "${text.trim()}"`); 
      
      // Clear any existing timer
      if (this.questionTimerId) {
        clearTimeout(this.questionTimerId);
        this.questionTimerId = null;
      }
      
      // Exit the question cycle since new content arrived
      this.inQuestionCycle = false;
      this.pendingQuestionText = "";
    }
    
    const cleanText = text.trim();
    
    // Verifies if this text has already been added recently to avoid duplicates
    const isDuplicate = this.speakerTranscriptions.some(st => 
      st.text === cleanText && 
      Date.now() - new Date(st.timestamp).getTime() < 2000 // Within 2 seconds
    );
    
    if (isDuplicate) {
      LoggingUtils.logInfo(`Ignoring duplicate transcription: "${cleanText}"`);
      return;
    }
    
    // Explicit speaker marker verification
    // If the text contains speaker markers [Guilherme] or [Speaker N], use the segmentation logic
    if (cleanText.includes('[') && cleanText.includes(']')) {
      // Verify if there are recognizable speaker marker patterns
      const hasSpeakerMarkers = /\[(Guilherme|Speaker\s*\d+)\]/i.test(cleanText);
      
      if (hasSpeakerMarkers) {
        // Process each segment separately using the service
        const segments = this.speakerService.splitMixedTranscription(cleanText);
        
        if (segments.length > 0) {
          // For each segment, add as individual transcription
          for (const segment of segments) {
            // Verifies if this segment has already been added recently to avoid duplicates
            const isSegmentDuplicate = this.speakerTranscriptions.some(st => 
              st.text === segment.text.trim() && 
              st.speaker === segment.speaker &&
              Date.now() - new Date(st.timestamp).getTime() < 2000
            );
            
            if (!isSegmentDuplicate) {
              this.addSingleSpeakerTranscription(segment.text, segment.speaker);
              // Updates the current speaker of the service
              this.currentSpeaker = segment.speaker;
            }
          }
          
          return;
        }
      }
    }
    
    // RULE FOR TEXT WITHOUT EXPLICIT SPEAKER MARKERS
    // If there is no clear marker, use the speaker provided or try to infer it
    
    // 1. If the speaker was explicitly provided, use it
    if (speaker?.trim()) {
      const normalizedSpeaker = this.speakerService.normalizeAndIdentifySpeaker(speaker.trim());
      this.addSingleSpeakerTranscription(cleanText, normalizedSpeaker);
      this.currentSpeaker = normalizedSpeaker;
      return;
    }
    
    // 2. If there is no speaker, use the current one or assume the primary user
    const speakerToUse = this.currentSpeaker || this.speakerService.getPrimaryUserSpeaker();
    this.addSingleSpeakerTranscription(cleanText, speakerToUse);
    
    // Logs the current speaker
    LoggingUtils.logInfo(`Speaker assigned: "${speakerToUse}" for text without marker: "${cleanText.substring(0, 30)}..."`);
  }
  
  /**
   * Returns all formatted and sent transcriptions to the UI, ready for prompt
   */
  getUITranscriptionText(): string {
    return this.uiTranscriptionList.join('\n');
  }
  
  /**
   * Alias for getUITranscriptionText - maintained for internal compatibility
   */
  getTranscriptionPromptText(): string {
    return this.getUITranscriptionText();
  }
  
  /**
   * Cancels any pending question timer and exits the question cycle
   */
  cancelPendingQuestionTimer(): void {
    if (this.questionTimerId) {
      LoggingUtils.logInfo(`Canceling pending question timer for: "${this.pendingQuestionText}"`);
      clearTimeout(this.questionTimerId);
      this.questionTimerId = null;
    }
    
    // Always exit the question cycle
    this.inQuestionCycle = false;
    this.pendingQuestionText = "";
    LoggingUtils.logInfo('Question cycle ended.');
  }
  
  /**
   * Adds a single speaker transcription
   */
  addSingleSpeakerTranscription(text: string, speaker: string): void {
    if (!text || !text.trim()) return;
    
    this.detectedSpeakers.add(speaker);
    LoggingUtils.logInfo(`Adding transcription for "${speaker}": "${text}"`);
    
    // Add to the traditional list
    this.transcriptionList.push(text);
    this.lastTranscription = text;
    
    // Add to the speaker-specific list
    this.speakerTranscriptions.push({
      text: text.trim(),
      speaker,
      timestamp: new Date().toISOString()
    });
    
    // Check if we should auto-trigger a prompt based on question detection
    this.detectQuestionAndTriggerPrompt(text.trim(), speaker);
  }
  
  /**
   * Enable or disable automatic question detection
   */
  setAutoQuestionDetection(enabled: boolean): void {
    this.autoQuestionDetectionEnabled = enabled;
    LoggingUtils.logInfo(`Auto-question detection ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Detects if the transcription is a question and triggers a prompt if conditions are met
   */
  private detectQuestionAndTriggerPrompt(text: string, speaker: string): void {
    // Exit if auto-detection is disabled or we don't have the service
    if (!this.autoQuestionDetectionEnabled || !this.transcriptionService) return;
    
    const trimmedText = text.trim();
    
    // 1. Check if text ends with a question mark
    if (!trimmedText.endsWith('?')) return;
    
    // 2. Check if the primary user is the only speaker
    if (!this.transcriptionService.isOnlyUserSpeaking()) return;
    
    // 3. Check if the speaker is the primary user
    if (speaker !== this.speakerService.getPrimaryUserSpeaker()) return;
    
    // 4. Check if this is the same question as last time
    if (trimmedText === this.lastQuestionPrompt) {
      LoggingUtils.logInfo(`Duplicate question detected, ignoring prompt for: "${trimmedText}"`);
      return;
    }
    
    // 5. Already in a question cycle?
    if (this.inQuestionCycle) {
      LoggingUtils.logInfo(`Already in a question cycle, ignoring new question: "${trimmedText}"`);
      return;
    }
    
    // Update tracking fields and store the pending question
    this.lastQuestionPrompt = trimmedText;
    this.lastPromptTimestamp = Date.now();
    this.pendingQuestionText = trimmedText;
    
    // If not already in a question cycle, start one
    if (!this.inQuestionCycle) {
      LoggingUtils.logInfo(`Question detected: "${trimmedText}". Starting question cycle...`);
      this.inQuestionCycle = true;
      
      // Send prompt immediately instead of waiting 10 seconds
      LoggingUtils.logInfo(`Sending prompt immediately for question: "${this.pendingQuestionText}"`);
      this.transcriptionService?.sendTranscriptionPrompt();
      
      // Exit the question cycle immediately
      this.inQuestionCycle = false;
      this.pendingQuestionText = "";
    }
  }
  
  /**
   * Returns the current list of transcriptions
   */
  getTranscriptionList(): string[] {
    return this.transcriptionList;
  }
  
  /**
   * Returns transcriptions organized by speaker
   */
  getSpeakerTranscriptions(): SpeakerTranscription[] {
    return this.speakerTranscriptions;
  }
  
  /**
   * Returns transcription logs grouped by speaker for debugging/UI
   */
  getTranscriptionLogs(): SpeakerTranscriptionLog[] {
    // Option 1: Return transcriptions grouped by speaker (original)
    return this.getTranscriptionLogsByUser();
    
    // Option 2: We could also return a single chronological transcription
    // if the UI prefers this format
    // return this.getChronologicalTranscriptionLog();
  }
  
  /**
   * Returns logs grouped by speaker (original format)
   */
  private getTranscriptionLogsByUser(): SpeakerTranscriptionLog[] {
    // Temporary map to group transcriptions
    const tempGroups: Map<string, {
      isUser: boolean;
      displayName: string; 
      transcriptions: { text: string; timestamp: string }[]
    }> = new Map();
    
    // Use Set to avoid duplicates
    const processedTexts = new Map<string, Set<string>>();
    
    // Keep track of speaker numbers for consistency
    const speakerNumbers = new Map<string, string>();
    
    // Process each transcription and correctly determine its group
    for (const transcription of this.speakerTranscriptions) {
      // Check if it contains mixed text with multiple speakers
      if (transcription.text.includes('[') && transcription.text.includes(']')) {
        // Split the transcription into segments by speaker
        const segments = this.speakerService.splitMixedTranscription(transcription.text);
        
        // Process each segment separately
        for (const segment of segments) {
          // Clear any existing speaker prefix from the text
          const segmentText = segment.text.replace(/^\[[^\]]+\]\s*/, '');
          
          // Get original speaker information if available in the segment
          const originalSpeakerMatch = segment.text.match(/^\[([^\]]+)\]/);
          const originalSpeaker = originalSpeakerMatch ? originalSpeakerMatch[1].trim() : null;
          
          const normalizedSpeaker = segment.speaker;
          const isUserMsg = normalizedSpeaker === this.speakerService.getPrimaryUserSpeaker();
          
          // IMPROVEMENT: Determine specific display name for each speaker
          let displayName: string;
          let groupKey: string;
          
          if (isUserMsg) {
            // For primary user, use their name
            displayName = this.speakerService.getPrimaryUserSpeaker();
            groupKey = this.speakerService.getPrimaryUserSpeaker();
          } else {
            // For external speakers, try to use the original label specifically
            if (originalSpeaker && originalSpeaker.toLowerCase().includes("speaker")) {
              // If the original label contains "Speaker", use it as is
              displayName = originalSpeaker;
              
              // Extract speaker number to group correctly
              const speakerNumberMatch = originalSpeaker.match(/speaker\s*(\d+)/i);
              if (speakerNumberMatch && speakerNumberMatch[1]) {
                groupKey = `speaker_${speakerNumberMatch[1]}`;
              } else {
                groupKey = `external_${originalSpeaker}`;
              }
              
              // Register this speaker number for consistency
              speakerNumbers.set(groupKey, displayName);
            } else {
              // If no specific label, check if we already have a number for this speaker
              const speakerText = segmentText.toLowerCase();
              const textSpeakerMatch = speakerText.match(/speaker\s*(\d+)/i);
              
              if (textSpeakerMatch && textSpeakerMatch[1]) {
                // Use the speaker number found in the text
                const speakerNum = textSpeakerMatch[1];
                groupKey = `speaker_${speakerNum}`;
                displayName = speakerNumbers.get(groupKey) || `Speaker ${speakerNum}`;
                speakerNumbers.set(groupKey, displayName);
              } else {
                // Use generic label for external
                groupKey = "external_generic";
                displayName = EXTERNAL_SPEAKER_LABEL;
              }
            }
          }
          
          // Initialize group if necessary
          if (!tempGroups.has(groupKey)) {
            tempGroups.set(groupKey, {
              isUser: isUserMsg,
              displayName,
              transcriptions: []
            });
            processedTexts.set(groupKey, new Set());
          }
          
          // Check if we have already processed this text for this speaker
          const groupTexts = processedTexts.get(groupKey);
          if (groupTexts && !groupTexts.has(segmentText)) {
            // Add the segment to the appropriate group
            const group = tempGroups.get(groupKey);
            if (group) {
              group.transcriptions.push({
                text: segmentText,
                timestamp: transcription.timestamp
              });
              
              // Mark as processed
              groupTexts.add(segmentText);
            }
          }
        }
      } else {
        // For transcriptions without markers, use the speaker from the transcription
        const normalizedSpeaker = transcription.speaker;
        const isUserMsg = normalizedSpeaker === this.speakerService.getPrimaryUserSpeaker();
        
        // IMPROVEMENT: Determine display name and specific key
        let displayName: string;
        let groupKey: string;
        
        if (isUserMsg) {
          // For primary user, use their name
          displayName = this.speakerService.getPrimaryUserSpeaker();
          groupKey = this.speakerService.getPrimaryUserSpeaker();
        } else {
          // For external speakers, check mentions of Speaker in the text
          const speakerText = transcription.text.toLowerCase();
          const speakerMatch = speakerText.match(/speaker\s*(\d+)/i);
          
          if (speakerMatch && speakerMatch[1]) {
            // Use the speaker number found
            const speakerNum = speakerMatch[1];
            groupKey = `speaker_${speakerNum}`;
            displayName = `Speaker ${speakerNum}`;
            speakerNumbers.set(groupKey, displayName);
          } else {
            // Use generic label for external
            groupKey = "external_generic";
            displayName = EXTERNAL_SPEAKER_LABEL;
          }
        }
        
        // Initialize group if necessary
        if (!tempGroups.has(groupKey)) {
          tempGroups.set(groupKey, {
            isUser: isUserMsg,
            displayName,
            transcriptions: []
          });
          processedTexts.set(groupKey, new Set());
        }
        
        // Check if we have already processed this text for this speaker
        const groupTexts = processedTexts.get(groupKey);
        if (groupTexts && !groupTexts.has(transcription.text)) {
          // Add the transcription to the appropriate group
          const group = tempGroups.get(groupKey);
          if (group) {
            group.transcriptions.push({
              text: transcription.text,
              timestamp: transcription.timestamp
            });
            
            // Mark as processed
            groupTexts.add(transcription.text);
          }
        }
      }
    }
    
    // Convert the map to the expected return format, applying the correct speaker formatting within each group
    const logs: SpeakerTranscriptionLog[] = Array.from(tempGroups.entries())
      .map(([groupKey, data]) => {
        // Sort transcriptions by timestamp
        const sortedTranscriptions = [...data.transcriptions]
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        
        // Apply correct speaker formatting within the group
        const formattedTranscriptions = sortedTranscriptions.map((t, index) => {
          // Always show the speaker prefix for each group of transcriptions in the UI
          const text = index === 0 ? 
            `[${data.displayName}] ${t.text}` : t.text;
          
          return {
            text,
            timestamp: t.timestamp
          };
        });
        
        return {
          speaker: data.displayName,
          isUser: data.isUser,
          transcriptions: formattedTranscriptions
        };
      });
    
    // Sort to put the primary user first, followed by external speakers in numeric order
    return logs.sort((a, b) => {
      // Primary user always first
      if (a.isUser) return -1;
      if (b.isUser) return 1;
      
      // Sort external speakers by number (Speaker 1, Speaker 2, etc.)
      const numA = a.speaker.match(/speaker\s*(\d+)/i)?.[1];
      const numB = b.speaker.match(/speaker\s*(\d+)/i)?.[1];
      
      if (numA && numB) {
        return parseInt(numA) - parseInt(numB);
      }
      
      // If no number, use alphabetical order
      return a.speaker.localeCompare(b.speaker);
    });
  }
  
  /**
   * Clears the transcription data
   */
  clearTranscriptionData(): void {
    this.transcriptionList = [""];
    this.speakerTranscriptions = [];
    this.detectedSpeakers = new Set();
    this.lastTranscription = "";
    this.updateUI({ transcription: "" });
  }
  
  /**
   * Checks if there are valid transcriptions by any speaker
   */
  hasValidTranscriptions(): boolean {
    return this.speakerTranscriptions.length > 0 || 
           this.transcriptionList.some(text => text && text.trim().length > 0);
  }
  
  /**
   * Returns the last known transcription
   */
  getLastTranscription(): string {
    return this.lastTranscription;
  }
  
  /**
   * Returns the last message from the primary user
   */
  getLastMessageFromUser(): SpeakerTranscription | null {
    // Filter only messages where the speaker is the primary user
    // Do not use filterTranscriptionsByUser as it may be filtering messages from the user that mention "Speaker"
    const userMessages = this.speakerTranscriptions.filter(st => 
      st.speaker === this.speakerService.getPrimaryUserSpeaker()
    );
    
    return userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;
  }
  
  /**
   * Returns the last messages from each external speaker
   */
  getLastMessagesFromExternalSpeakers(): Map<string, SpeakerTranscription> {
    const lastMessages = new Map<string, SpeakerTranscription>();
    
    // Get all external speakers - simplified to only "external"
    if (this.detectedSpeakers.has("external")) {
      const messages = this.speakerService.filterTranscriptionsBySpeaker("external", this.speakerTranscriptions);
      if (messages.length > 0) {
        lastMessages.set("external", messages[messages.length - 1]);
      }
    }
    
    return lastMessages;
  }
  
  /**
   * Returns the set of detected speakers
   */
  getDetectedSpeakers(): Set<string> {
    return this.detectedSpeakers;
  }
  
  /**
   * Sets the current speaker
   */
  setCurrentSpeaker(speaker: string): void {
    this.currentSpeaker = speaker;
  }
  
  /**
   * Returns the current speaker
   */
  getCurrentSpeaker(): string {
    return this.currentSpeaker;
  }
  
  /**
   * Public method to update the UI with transcriptions directly from the LiveTranscriptionProcessor
   * @param transcription The transcription text to be added to the UI
   */
  public updateTranscriptionUI(transcription: string): void {
    this.updateUI({ transcription });
  }

  /**
   * Updates the UI with new values
   */
  private updateUI(update: Record<string, unknown>): void {
    // Implement incremental logic that substitutes messages when they are incremental
    if (typeof update.transcription === "string") {
      if (!this.uiTranscriptionList) this.uiTranscriptionList = [];
      
      // Extrai texto e normaliza
      const newText = update.transcription.trim();
      
      if (newText) {
        // Verifica se o novo texto é uma versão incremental de alguma mensagem existente
        let isIncremental = false;
        
        // Verifica se a nova mensagem é uma extensão de alguma mensagem anterior
        for (let i = this.uiTranscriptionList.length - 1; i >= 0; i--) {
          const existingText = this.uiTranscriptionList[i];
          
          // Verifica se o texto atual é uma extensão de um texto existente
          if (newText.startsWith(existingText) && newText !== existingText) {
            console.log(`🛠️ Substituindo mensagem incremental:`);
            console.log(`  Anterior: "${existingText}"`);
            console.log(`  Nova: "${newText}"`);
            
            // Substitui a versão anterior pela nova versão mais completa
            this.uiTranscriptionList[i] = newText;
            isIncremental = true;
            break;
          }
        }
        
        // Se não for incremental, adiciona como nova mensagem
        if (!isIncremental && 
            (this.uiTranscriptionList.length === 0 || 
             this.uiTranscriptionList[this.uiTranscriptionList.length - 1] !== newText)) {
          console.log(`💾 Adicionando nova mensagem: "${newText}"`);
          this.uiTranscriptionList.push(newText);
        }
      }
      
      // IMPORTANTE: Atualiza o estado da UI com o histórico completo
      const fullText = this.uiTranscriptionList.join('\n');
      console.log(`📄 Estado atual da transcrição UI: ${fullText.length} caracteres, ${this.uiTranscriptionList.length} mensagens`);
      this.setTexts(prev => ({
        ...prev,
        transcription: fullText
      }));
      return; // Evita a chamada abaixo
    }
    
    // For other updates that are not transcriptions
    this.setTexts((prev) => ({ ...prev, ...update }));
  }
  
  /**
   * Returns chronological transcription log (alternative option)
   * This function creates a single log entry combining all messages
   * in chronological order, maintaining speaker markings.
   */
  private getChronologicalTranscriptionLog(): SpeakerTranscriptionLog[] {
    // If no transcriptions, return empty array
    if (this.speakerTranscriptions.length === 0) {
      return [];
    }
    
    // Sort transcriptions by timestamp
    const sortedTranscriptions = [...this.speakerTranscriptions]
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    // Remove duplicates while maintaining order
    const processedTexts = new Set<string>();
    
    // Map to track consistent speaker labels
    const speakerLabels = new Map<string, string>();
    speakerLabels.set(this.speakerService.getPrimaryUserSpeaker(), this.speakerService.getPrimaryUserSpeaker());
    
    // Format each message with the appropriate speaker label
    const formattedTranscriptions: { text: string, timestamp: string }[] = [];
    let lastSpeakerKey = "";
    
    for (const transcription of sortedTranscriptions) {
      // Skip duplicates
      if (processedTexts.has(transcription.text)) continue;
      processedTexts.add(transcription.text);
      
      // Determine the correct speaker label
      let speakerKey = transcription.speaker;
      let speakerLabel: string;
      
      if (speakerKey === this.speakerService.getPrimaryUserSpeaker()) {
        speakerLabel = this.speakerService.getPrimaryUserSpeaker();
      } else {
        // For external speaker, try to extract a specific number
        const speakerMatch = transcription.text.match(/speaker\s*(\d+)/i);
        if (speakerMatch && speakerMatch[1]) {
          const speakerNum = speakerMatch[1];
          const specificSpeakerKey = `speaker_${speakerNum}`;
          speakerKey = specificSpeakerKey;
          
          if (!speakerLabels.has(specificSpeakerKey)) {
            speakerLabels.set(specificSpeakerKey, `Speaker ${speakerNum}`);
          }
          
          speakerLabel = speakerLabels.get(specificSpeakerKey) || `Speaker ${speakerNum}`;
        } else {
          // Extract original label, if available
          const originalLabel = transcription.text.includes('[') ? 
            transcription.text.match(/^\[([^\]]+)\]/)?.[1] : null;
            
          if (originalLabel?.includes("Speaker")) {
            speakerLabel = originalLabel;
            const speakerNumMatch = originalLabel.match(/speaker\s*(\d+)/i);
            if (speakerNumMatch && speakerNumMatch[1]) {
              const specificSpeakerKey = `speaker_${speakerNumMatch[1]}`;
              speakerKey = specificSpeakerKey;
              speakerLabels.set(specificSpeakerKey, originalLabel);
            } else {
              speakerKey = "external_generic";
              speakerLabel = EXTERNAL_SPEAKER_LABEL;
            }
          } else {
            speakerKey = "external_generic";
            speakerLabel = EXTERNAL_SPEAKER_LABEL;
          }
        }
      }
      
      // Clear any existing speaker markers from the text
      const cleanText = transcription.text.replace(/^\[[^\]]+\]\s*/, '');
      
      // Include speaker marker only if different from the previous
      const showSpeaker = (lastSpeakerKey !== speakerKey);
      const formattedText = showSpeaker ? 
        `[${speakerLabel}] ${cleanText}` : 
        cleanText;
      
      formattedTranscriptions.push({
        text: formattedText,
        timestamp: transcription.timestamp
      });
      
      lastSpeakerKey = speakerKey;
    }
    
    // Return as a single log entry for chronological display
    return [{
      speaker: "Complete Conversation",
      isUser: false,
      transcriptions: formattedTranscriptions
    }];
  }
} 