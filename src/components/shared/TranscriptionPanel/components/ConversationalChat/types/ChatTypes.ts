import { MicrophoneState } from "../../../../../context";

// Core chat types
export interface ChatMessage {
  id: string;
  type: "user" | "system" | "error";
  content: string;
  timestamp: Date;
  hasContext?: boolean;
  contextContent?: string;
}

// Component props interfaces following Interface Segregation Principle
export interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  disabled?: boolean;
  placeholder?: string;
}

export interface ContextInputProps {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  show: boolean;
}

export interface TranscriptionDisplayProps {
  text: string;
  onClear: () => void;
}

export interface ChatControlsProps {
  microphoneState: MicrophoneState;
  onToggleRecording: () => void;
  onSend: () => void;
  onToggleContext: () => void;
  canSend: boolean;
  showContext: boolean;
}

export interface DebugControlsProps {
  onAddTestMessage: () => void;
  onAddTestAI: () => void;
  onRestore: () => void;
  onClearAll: () => void;
  hasBackup: boolean;
}

export interface ScrollButtonProps {
  show: boolean;
  onClick: () => void;
}

export interface ChatMessagesContainerProps {
  messages: ChatMessage[];
  isProcessing: boolean;
  onScrollChange: (isNearBottom: boolean) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  showScrollButton: boolean;
  onScrollToBottom: () => void;
  newMessageCount?: number;
  hasNewMessages?: boolean;
  onAddTestMessage?: () => void;
  onResetState?: () => void;
  onClearMessages?: () => void;
}

// Main component props
export interface ConversationalChatProps {
  transcriptionText: string;
  onTranscriptionChange: (value: string) => void;
  onClearTranscription: () => void;
  aiResponseText: string;
  onAiResponseChange: (value: string) => void;
  onClearAiResponse: () => void;
  temporaryContext: string;
  onTemporaryContextChange: (value: string) => void;
  microphoneState: MicrophoneState;
  onToggleRecording: () => void;
  onSendPrompt: (messageContent?: string, contextContent?: string) => void;
}

// Hook return types
export interface ChatState {
  inputMessage: string;
  setInputMessage: (value: string) => void;
  currentContext: string;
  setCurrentContext: (value: string) => void;
  showContextField: boolean;
  setShowContextField: (show: boolean) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  processingTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
}

export interface ScrollState {
  showScrollButton: boolean;
  scrollToBottom: () => void;
  handleScroll: () => void;
  messagesRef: React.RefObject<HTMLDivElement | null>;
  newMessageCount: number;
  hasNewMessages: boolean;
  clearNotification: () => void;
}
