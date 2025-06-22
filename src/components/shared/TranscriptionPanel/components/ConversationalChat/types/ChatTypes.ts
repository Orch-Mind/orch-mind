import { MicrophoneState, SelectedDevices } from "../../../../../context";
import { ChatMessage as PersistentChatMessage } from "../hooks/usePersistentMessages";
import { ChatConversation } from "./ChatHistoryTypes";

/**
 * Core chat message interface representing a single message in the chat
 */
export interface ChatMessage {
  /** Unique identifier for the message */
  id: string;
  /** Type of message - user input, system message, or error */
  type: "user" | "system" | "error";
  /** The actual message content */
  content: string;
  /** When the message was created */
  timestamp: Date;
  /** Whether this message has additional context */
  hasContext?: boolean;
  /** The context content if hasContext is true */
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
  transcriptions?: Array<{
    text: string;
    timestamp: string;
    speaker: string;
    sent?: boolean;
  }>;
}

export interface ChatControlsProps {
  microphoneState: MicrophoneState;
  onToggleRecording: () => void;
  onSend: () => void;
  onToggleContext: () => void;
  canSend: boolean;
  showContext: boolean;
  onToggleAudioSettings?: () => void;
  showAudioSettings?: boolean;
  audioSettingsButtonRef?: React.RefObject<HTMLElement>;
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
  processingStatus?: string;
  streamingContent?: string;
  isStreaming?: boolean;
  isThinking?: boolean;
  thinkingContent?: string;
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

/**
 * Main props interface for the ConversationalChat component
 */
export interface ConversationalChatProps {
  // Transcription handling
  /** Current transcription text from speech-to-text */
  transcriptionText: string;
  /** Handler for transcription text changes */
  onTranscriptionChange: (value: string) => void;
  /** Handler to clear transcription */
  onClearTranscription: () => void;

  // AI Response handling
  /** Current AI response text */
  aiResponseText: string;
  /** Handler for AI response text changes */
  onAiResponseChange: (value: string) => void;
  /** Handler to clear AI response */
  onClearAiResponse: () => void;

  // Context handling
  /** Temporary context for the current conversation */
  temporaryContext: string;
  /** Handler for temporary context changes */
  onTemporaryContextChange: (value: string) => void;

  // Recording controls
  /** Current microphone state */
  microphoneState: MicrophoneState;
  /** Handler to toggle recording on/off */
  onToggleRecording: () => void;
  /** Handler to send a prompt to the AI */
  onSendPrompt: (
    messageContent?: string,
    contextContent?: string,
    conversationMessages?: any[]
  ) => void;

  // Audio settings props (optional)
  /** Current selected language */
  language?: string;
  /** Handler to change language */
  setLanguage?: (value: string) => void;
  /** Whether microphone is enabled */
  isMicrophoneOn?: boolean;
  /** Handler to toggle microphone */
  setIsMicrophoneOn?: (value: boolean) => void;
  /** Whether system audio is enabled */
  isSystemAudioOn?: boolean;
  /** Handler to toggle system audio */
  setIsSystemAudioOn?: (value: boolean) => void;
  /** Available audio devices */
  audioDevices?: MediaDeviceInfo[];
  /** Currently selected audio devices */
  selectedDevices?: SelectedDevices;
  /** Handler for audio device changes */
  handleDeviceChange?: (deviceId: string, isSystemAudio: boolean) => void;

  // Chat History props (optional)
  /** Current active conversation */
  currentConversation?: ChatConversation | null;
  /** Handler to add a message to a conversation */
  onAddMessageToConversation?: (
    conversationId: string,
    message: PersistentChatMessage
  ) => Promise<void>;

  // Processing state callback (optional)
  /** Handler called when processing state changes */
  onProcessingChange?: (isProcessing: boolean) => void;

  // Chat history hook (optional)
  /** Chat history hook return value for accessing summarization state */
  chatHistory?: any;
}

/**
 * Chat state management interface used by internal hooks
 */
export interface ChatState {
  /** Current input message being typed */
  inputMessage: string;
  /** Setter for input message */
  setInputMessage: (value: string) => void;
  /** Current context text */
  currentContext: string;
  /** Setter for context text */
  setCurrentContext: (value: string) => void;
  /** Whether to show the context input field */
  showContextField: boolean;
  /** Toggle context field visibility */
  setShowContextField: (show: boolean) => void;
  /** Whether a message is currently being processed */
  isProcessing: boolean;
  /** Set processing state */
  setIsProcessing: (processing: boolean) => void;
  /** Reference to processing timeout for cleanup */
  processingTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
}

/**
 * Scroll state management interface for chat messages container
 */
export interface ScrollState {
  /** Whether to show the scroll-to-bottom button */
  showScrollButton: boolean;
  /** Function to scroll to the bottom of messages */
  scrollToBottom: () => void;
  /** Handler for scroll events */
  handleScroll: () => void;
  /** Reference to the messages container element */
  messagesRef: React.RefObject<HTMLDivElement | null>;
  /** Count of new messages since last scroll */
  newMessageCount: number;
  /** Whether there are new messages to notify about */
  hasNewMessages: boolean;
  /** Clear new message notification */
  clearNotification: () => void;
}

// Add new interface for ChatInputAreaProps
export interface ChatInputAreaProps extends ConversationalChatProps {
  chatState: ChatState;
  onSendMessage: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onToggleContext: () => void;
  onAddTestMessage: () => void;
  onAddTestAI: () => void;
  onRestore: () => void;
  onClearAll: () => void;
  hasBackup: boolean;
  onToggleAudioSettings?: () => void;
  showAudioSettings?: boolean;
  audioSettingsButtonRef?: React.RefObject<HTMLElement>;
}
