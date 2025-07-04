// SPDX-License-Identifier: MIT OR Apache-2.0
// Training Types - Following ISP (Interface Segregation Principle)
// Each interface has a single, specific responsibility

// === CONVERSATION INTERFACES ===
export interface TrainingMessage {
  role: string;
  content: string;
  timestamp?: string;
}

export interface TrainingConversation {
  id: string;
  messages: TrainingMessage[];
}

export interface ConversationSummary {
  id: string;
  title: string;
  messageCount: number;
  validPairs: number;
  preview: string;
}

export interface ConversationStatus {
  id: string;
  title: string;
  messageCount: number;
  validPairs: number;
  isProcessed: boolean;
  isSelected: boolean;
  lastTrainedAt?: Date;
  preview?: string;
}

// === TRAINING INTERFACES ===
export interface TrainingRequest {
  conversations: TrainingConversation[];
  baseModel: string;
  outputName: string; // Unique adapter identifier generated with timestamp
  action?: "enable_real_adapter" | "disable_real_adapter"; // Optional action for adapter management
}

export interface TrainingProgress {
  progress: number;
  status: string;
  startTime: number | null;
  estimatedTime: string;
}

export interface TrainingResult {
  success: boolean;
  adapterPath?: string;
  error?: string;
  details?: TrainingDetails;
}

export interface TrainingDetails {
  trainingExamples: number;
  modelName: string;
  adapterId?: string;
  trainingDuration?: number;
  errorDetails?: string;
  activeModel?: string;
  validationStatus?: "passed" | "failed" | "unknown";
  hasRealWeights?: boolean;
}

// === STATS INTERFACES ===
export interface TrainingStats {
  totalConversations: number;
  processedConversations: number;
  pendingConversations: number;
  totalMessages: number;
}

// === MODEL INTERFACES ===
export interface TrainedModel {
  name: string;
  createdAt: string;
  trainingExamples: number;
}

// === VALIDATION INTERFACES ===
export interface ValidationResult {
  id: string;
  valid: boolean;
  validPairs: number;
  totalMessages: number;
  error?: string;
}

export interface ValidationSummary {
  totalValidPairs: number;
  validationResults: ValidationResult[];
}

// === UI STATE INTERFACES ===
export interface ModalState {
  showSuccess: boolean;
  showReset: boolean;
  showDeleteModel: boolean;
  showDeleteAdapter: boolean;
  modelToDelete: string;
  adapterToDelete: string;
}

export interface TrainingState {
  isTraining: boolean;
  isDeleting: boolean;
  trainedModelName: string;
}
