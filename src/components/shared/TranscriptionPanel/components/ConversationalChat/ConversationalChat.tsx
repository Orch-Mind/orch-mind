import React, { useCallback, useEffect, useRef, useState } from "react";
import { AudioSettingsPopover } from "./components/AudioSettingsPopover";
import { ChatInputArea } from "./components/ChatInputArea";
import { ChatMessagesContainer } from "./components/ChatMessagesContainer";
import { SummarizationIndicator } from "./components/SummarizationIndicator";
import { TokenStatusBar } from "./components/TokenStatusBar";
import "./ConversationalChat.css";
import { useChatScroll } from "./hooks/useChatScroll";
import { useChatState } from "./hooks/useChatState";
import { useConversationMessages } from "./hooks/useConversationMessages";
import { useConversationSync } from "./hooks/useConversationSync";
import { usePersistentMessages } from "./hooks/usePersistentMessages";
import { useProcessingStatus } from "./hooks/useProcessingStatus";
import { useStreamingHandlers } from "./hooks/useStreamingHandlers";
import { MessageProcessor } from "./managers/MessageProcessor";
import { StreamingManager, StreamingState } from "./managers/StreamingManager";
import "./styles/ConversationalChat.input.css";
import "./styles/ConversationalChat.messages.css";
import { ConversationalChatProps } from "./types/ChatTypes";

/**
 * Conversational Chat Component
 *
 * Aplica princípios SOLID, DRY, KISS:
 * - SRP: Cada manager/hook tem uma única responsabilidade
 * - DRY: Lógica compartilhada em managers e hooks reutilizáveis
 * - KISS: Componente principal simplificado, focado apenas em orquestração
 *
 * Arquitetura:
 * - ConversationManager: Gerencia sincronização de conversas
 * - StreamingManager: Gerencia estado de streaming
 * - MessageProcessor: Processa mensagens e respostas
 * - Hooks customizados: Encapsulam lógica específica
 */
const ConversationalChatComponent: React.FC<ConversationalChatProps> = ({
  transcriptionText,
  onTranscriptionChange,
  onClearTranscription,
  aiResponseText,
  onAiResponseChange,
  onClearAiResponse,
  temporaryContext,
  onTemporaryContextChange,
  microphoneState,
  onToggleRecording,
  onSendPrompt,
  // Audio settings
  language,
  setLanguage,
  isMicrophoneOn,
  setIsMicrophoneOn,
  isSystemAudioOn,
  setIsSystemAudioOn,
  audioDevices,
  selectedDevices,
  handleDeviceChange,
  // Chat history
  currentConversation,
  onAddMessageToConversation,
  onProcessingChange,
  chatHistory,
}) => {
  // Estado do componente
  const componentId = useRef(
    `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  );
  const previousConversationId = useRef<string | null>(null);

  // Estado de UI
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [isAtTop, setIsAtTop] = useState(false);
  const audioSettingsButtonRef = useRef<HTMLElement>(null!);
  const messagesContainerRef = useRef<HTMLDivElement>(null!);

  // Hooks customizados
  const chatState = useChatState();
  const { processingStatus, setProcessingStatus } = useProcessingStatus();
  const {
    syncedMessages,
    isSyncServiceInitialized,
    getMessagesForProcessor,
    getSummaryStats,
  } = useConversationSync(currentConversation || null);

  // Sistema de mensagens
  const useConversationSystem = !!(
    currentConversation && onAddMessageToConversation
  );
  const persistentMessagesHook = usePersistentMessages();
  const conversationMessagesHook = useConversationMessages({
    currentConversation: currentConversation || null,
    onAddMessage: onAddMessageToConversation || (async () => {}),
    onClearConversation: () => {},
  });

  const {
    messages: chatMessages,
    addMessage,
    clearMessages,
  } = useConversationSystem ? conversationMessagesHook : persistentMessagesHook;

  const recovery = useConversationSystem
    ? {
        hasBackup: false,
        restoreFromBackup: () => {},
        clearBackup: () => {},
        integrityCheck: () => false,
        lastSaveTime: 0,
      }
    : persistentMessagesHook.recovery;

  // Estado de scroll
  const scrollState = useChatScroll({
    messages: chatMessages,
    messagesContainerRef,
  });

  // Estado de streaming
  const [streamingState, setStreamingState] = useState<StreamingState>({
    isStreaming: false,
    streamingResponse: "",
    isThinking: false,
    thinkingContent: "",
  });

  // Managers
  const streamingManagerRef = useRef<StreamingManager | null>(null);
  const messageProcessorRef = useRef<MessageProcessor | null>(null);

  // Inicializa managers
  useEffect(() => {
    // Streaming Manager
    streamingManagerRef.current = new StreamingManager(
      setStreamingState,
      (content) => {
        // Callback quando streaming completa
        messageProcessorRef.current?.processStreamingComplete(content);
      }
    );

    // Message Processor
    messageProcessorRef.current = new MessageProcessor(
      (message) => {
        // Adapter para converter Omit<ChatMessage, "id" | "timestamp"> para AddMessageParams
        addMessage({
          type: message.type,
          content: message.content,
          hasContext: message.hasContext,
          contextContent: message.contextContent,
        });
      },
      chatState.setIsProcessing,
      onClearAiResponse,
      scrollState.scrollToBottom
    );

    return () => {
      streamingManagerRef.current = null;
      messageProcessorRef.current?.dispose();
      messageProcessorRef.current = null;
    };
  }, [
    addMessage,
    chatState.setIsProcessing,
    onClearAiResponse,
    scrollState.scrollToBottom,
  ]);

  // Expõe handlers de streaming no window
  useStreamingHandlers(
    streamingManagerRef.current!,
    chatState.setIsProcessing,
    setProcessingStatus
  );

  // Monitora mudanças de conversa
  useEffect(() => {
    const currentId = currentConversation?.id;
    const previousId = previousConversationId.current;

    if (currentConversation && currentId && currentId !== previousId) {
      // Limpa estado ao mudar de conversa
      chatState.setInputMessage("");
      chatState.setCurrentContext("");
      chatState.setShowContextField(false);

      // Limpa respostas pendentes
      if (aiResponseText?.includes("Process")) {
        onClearAiResponse();
      }

      console.log("[CHAT] Conversation changed, state cleared");
    }

    previousConversationId.current = currentId || null;
  }, [currentConversation?.id]); // Deps reduzidas intencionalmente

  // Processa respostas de IA
  useEffect(() => {
    if (!messageProcessorRef.current) return;

    messageProcessorRef.current.clearProcessingRef(aiResponseText);
    messageProcessorRef.current.processAiResponse(
      aiResponseText || "",
      chatMessages,
      currentConversation?.messages
    );
  }, [aiResponseText, chatMessages, currentConversation?.messages]);

  // Notifica mudanças de processamento
  useEffect(() => {
    onProcessingChange?.(chatState.isProcessing);
  }, [chatState.isProcessing, onProcessingChange]);

  // Limpa status quando processamento termina
  useEffect(() => {
    if (!chatState.isProcessing) {
      setProcessingStatus("");
    }
  }, [chatState.isProcessing, setProcessingStatus]);

  // Monitora posição do scroll
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setIsAtTop(container.scrollTop <= 50);
    };

    handleScroll();
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [chatMessages.length]);

  // Limpa streaming quando resposta completa chega
  useEffect(() => {
    if (
      aiResponseText &&
      !aiResponseText.includes("Process") &&
      streamingState.isStreaming
    ) {
      streamingManagerRef.current?.reset();
    }
  }, [aiResponseText, streamingState.isStreaming]);

  // Handler para enviar mensagem
  const handleSendMessage = useCallback(() => {
    const messageContent = chatState.inputMessage.trim();
    if (!messageContent && !transcriptionText.trim()) return;

    const finalContent = messageContent || transcriptionText.trim();

    // Processa mensagem
    messageProcessorRef.current?.processUserMessage(
      finalContent,
      chatState.currentContext,
      () => {
        // Limpa inputs
        chatState.setInputMessage("");
        chatState.setCurrentContext("");
        chatState.setShowContextField(false);
        onTemporaryContextChange("");

        if (transcriptionText.trim()) {
          onClearTranscription();
        }

        // Obtém mensagens para processador
        const conversationMessages = getMessagesForProcessor();

        // Envia prompt
        onSendPrompt(
          finalContent,
          chatState.currentContext || undefined,
          conversationMessages
        );
      }
    );
  }, [
    chatState,
    transcriptionText,
    onTemporaryContextChange,
    onClearTranscription,
    getMessagesForProcessor,
    onSendPrompt,
  ]);

  // Handler para teclas
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  // Handler para contexto
  const handleToggleContext = useCallback(() => {
    chatState.setShowContextField(!chatState.showContextField);
    if (chatState.showContextField) {
      chatState.setCurrentContext("");
    }
  }, [chatState]);

  // Debug functions (apenas em desenvolvimento)
  const debugFunctions = React.useMemo(() => {
    if (process.env.NODE_ENV === "production") return {};

    return {
      addTestMessage: () =>
        addMessage({ type: "user", content: "Test message" }),
      addTestAIResponse: () =>
        addMessage({
          type: "system",
          content: "This is a test AI response.",
        }),
      resetChatState: () => {
        chatState.setIsProcessing(false);
        messageProcessorRef.current?.clearProcessingState();
      },
    };
  }, [addMessage, chatState]);

  return (
    <div className="conversational-chat">
      {/* Indicador de Sumarização */}
      {chatHistory?.isSummarizing && (
        <SummarizationIndicator
          isSummarizing={true}
          tokenCount={chatHistory?.tokenStats?.currentTokens}
          maxTokens={chatHistory?.tokenStats?.maxTokens}
        />
      )}

      {/* Barra de Status de Tokens */}
      {currentConversation && chatHistory?.getTokenStats && (
        <TokenStatusBar
          currentTokens={chatHistory.getTokenStats()?.currentTokens || 0}
          maxTokens={chatHistory.getTokenStats()?.maxTokens || 32000}
          summarizationThreshold={30000}
          isAtTop={isAtTop}
        />
      )}

      {/* Container de Mensagens */}
      <ChatMessagesContainer
        messages={chatMessages}
        isProcessing={chatState.isProcessing}
        onScrollChange={() => {}}
        scrollRef={messagesContainerRef}
        showScrollButton={scrollState.showScrollButton}
        onScrollToBottom={scrollState.scrollToBottom}
        onAddTestMessage={debugFunctions.addTestMessage}
        onResetState={debugFunctions.resetChatState}
        onClearMessages={clearMessages}
        processingStatus={processingStatus}
        streamingContent={streamingState.streamingResponse}
        isStreaming={streamingState.isStreaming}
        isThinking={streamingState.isThinking}
        thinkingContent={streamingState.thinkingContent}
      />

      {/* Área de Input */}
      <ChatInputArea
        transcriptionText={transcriptionText}
        onTranscriptionChange={onTranscriptionChange}
        onClearTranscription={onClearTranscription}
        aiResponseText={aiResponseText}
        onAiResponseChange={onAiResponseChange}
        onClearAiResponse={onClearAiResponse}
        temporaryContext={temporaryContext}
        onTemporaryContextChange={onTemporaryContextChange}
        microphoneState={microphoneState}
        onToggleRecording={onToggleRecording}
        onSendPrompt={onSendPrompt}
        chatState={chatState}
        onSendMessage={handleSendMessage}
        onKeyPress={handleKeyPress}
        onToggleContext={handleToggleContext}
        onAddTestMessage={debugFunctions.addTestMessage || (() => {})}
        onAddTestAI={debugFunctions.addTestAIResponse || (() => {})}
        onRestore={recovery.restoreFromBackup}
        onClearAll={() => {
          clearMessages();
          recovery.clearBackup();
        }}
        hasBackup={recovery.hasBackup}
        onToggleAudioSettings={() => setShowAudioSettings(!showAudioSettings)}
        showAudioSettings={showAudioSettings}
        audioSettingsButtonRef={audioSettingsButtonRef}
      />

      {/* Popover de Configurações de Áudio */}
      <AudioSettingsPopover
        show={showAudioSettings}
        onClose={() => setShowAudioSettings(false)}
        anchorRef={audioSettingsButtonRef}
        settings={{
          language: language || "pt-BR",
          setLanguage: setLanguage || (() => {}),
          isMicrophoneOn: isMicrophoneOn || false,
          setIsMicrophoneOn: setIsMicrophoneOn || (() => {}),
          isSystemAudioOn: isSystemAudioOn || false,
          setIsSystemAudioOn: setIsSystemAudioOn || (() => {}),
          audioDevices: audioDevices || [],
          selectedDevices: selectedDevices || {
            microphone: null,
            systemAudio: null,
          },
          handleDeviceChange: handleDeviceChange || (() => {}),
        }}
      />
    </div>
  );
};

// Função de comparação customizada para otimizar re-renders
function areEqual(
  prev: ConversationalChatProps,
  next: ConversationalChatProps
): boolean {
  const isEqual =
    prev.aiResponseText === next.aiResponseText &&
    prev.temporaryContext === next.temporaryContext &&
    prev.microphoneState === next.microphoneState &&
    prev.onAiResponseChange === next.onAiResponseChange &&
    prev.onClearAiResponse === next.onClearAiResponse &&
    prev.onClearTranscription === next.onClearTranscription &&
    prev.onSendPrompt === next.onSendPrompt &&
    prev.onToggleRecording === next.onToggleRecording &&
    prev.onTranscriptionChange === next.onTranscriptionChange &&
    // Audio settings comparisons
    prev.language === next.language &&
    prev.setLanguage === next.setLanguage &&
    prev.isMicrophoneOn === next.isMicrophoneOn &&
    prev.setIsMicrophoneOn === next.setIsMicrophoneOn &&
    prev.isSystemAudioOn === next.isSystemAudioOn &&
    prev.setIsSystemAudioOn === next.setIsSystemAudioOn &&
    prev.handleDeviceChange === next.handleDeviceChange;
  // transcriptionText, audioDevices e selectedDevices deliberadamente ignorados

  if (!isEqual && process.env.NODE_ENV !== "production") {
    console.log(
      "🔄 [CHAT_RERENDER] ConversationalChat re-rendering due to prop change:",
      {
        aiResponseChanged: prev.aiResponseText !== next.aiResponseText,
        aiResponseText: {
          prev: prev.aiResponseText?.substring(0, 50),
          next: next.aiResponseText?.substring(0, 50),
        },
        temporaryContextChanged:
          prev.temporaryContext !== next.temporaryContext,
        microphoneStateChanged: prev.microphoneState !== next.microphoneState,
      }
    );
  }

  return isEqual;
}

// Export com memo para prevenir re-renders desnecessários
export const ConversationalChat = React.memo(
  ConversationalChatComponent,
  areEqual
);
