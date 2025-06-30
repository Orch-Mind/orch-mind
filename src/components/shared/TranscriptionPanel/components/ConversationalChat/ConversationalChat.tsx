// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React, { useCallback, useEffect, useRef, useState } from "react";
// TODO: Re-enable for future versions - Audio Settings in chat input
// import { AudioSettingsPopover } from "./components/AudioSettingsPopover";
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
import { MessageProcessor } from "./managers/MessageProcessor";
import { StreamingManager, StreamingState } from "./managers/StreamingManager";
import "./styles/ConversationalChat.input.css";
import "./styles/ConversationalChat.messages.css";
import { ConversationalChatProps } from "./types/ChatTypes";

export interface ConversationalChatRef {
  messageProcessor: MessageProcessor | null;
}

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
 *
 * ===== AUDIO SETTINGS REFACTORING =====
 *
 * REFATORAÇÃO COMPLETA - Language Settings movidos do Chat Input para General Settings:
 *
 * ❌ DESABILITADO no Chat Input (para versões futuras):
 * - Botão de Audio Settings nos controles do chat
 * - Popover AudioSettingsPopover
 * - Props onToggleAudioSettings, showAudioSettings, audioSettingsButtonRef
 * - Estado showAudioSettings e audioSettingsButtonRef
 *
 * ✅ ATIVADO em General Settings:
 * - LanguageSelector agora está em Settings → General → Language
 * - Sincronização automática via useGeneralSettings hook
 * - Persistência no localStorage via STORAGE_KEYS.DEEPGRAM_LANGUAGE
 *
 * COMO REATIVAR (versões futuras):
 * 1. Descomentar todos os blocos marcados com "TODO: Re-enable for future versions"
 * 2. Descomentar import do AudioSettingsPopover
 * 3. Descomentar props nos tipos ChatControlsProps e ChatInputAreaProps
 * 4. Funcionalidade estará 100% funcional novamente
 *
 * BENEFÍCIOS DA REFATORAÇÃO:
 * - UX melhorada: Language settings centralizados onde fazem sentido
 * - Popover do chat mais limpo: apenas controles de dispositivos de áudio
 * - Arquitetura SOLID: Separação clara de responsabilidades
 * - Sincronização automática entre componentes
 */
const ConversationalChatComponent = React.forwardRef<
  ConversationalChatRef,
  ConversationalChatProps
>(
  (
    {
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
    },
    ref
  ) => {
    // Estado do componente
    const componentId = useRef(
      `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    );
    const previousConversationId = useRef<string | null>(null);

    // Estado de UI
    // TODO: Re-enable for future versions - Audio Settings in chat input
    // const [showAudioSettings, setShowAudioSettings] = useState(false);
    const [isAtTop, setIsAtTop] = useState(false);
    // TODO: Re-enable for future versions - Audio Settings in chat input
    // const audioSettingsButtonRef = useRef<HTMLElement>(null!);
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
    } = useConversationSystem
      ? conversationMessagesHook
      : persistentMessagesHook;

    const recovery = useConversationSystem
      ? {
          hasBackup: false,
          restoreFromBackup: () => {},
          clearBackup: () => {},
          integrityCheck: () => false,
          lastSaveTime: 0,
        }
      : persistentMessagesHook.recovery;

    // Estado de streaming
    const [streamingState, setStreamingState] = useState<StreamingState>({
      isStreaming: false,
      streamingResponse: "",
      isThinking: false,
      thinkingContent: "",
    });

    // Debug streaming state changes
    useEffect(() => {
      console.log("[ConversationalChat] Streaming state updated:", {
        isStreaming: streamingState.isStreaming,
        streamingResponseLength: streamingState.streamingResponse.length,
        streamingResponsePreview: streamingState.streamingResponse.substring(
          0,
          50
        ),
        isThinking: streamingState.isThinking,
      });
    }, [streamingState]);

    // Estado de scroll - agora simplificado para usar a âncora
    const scrollState = useChatScroll({
      messages: chatMessages,
      streamingContent: streamingState.streamingResponse,
      processingStatus: processingStatus,
      thinkingContent: streamingState.thinkingContent,
      isThinking: streamingState.isThinking,
      containerRef: messagesContainerRef,
    });

    // Força scroll quando processamento começa
    useEffect(() => {
      if (chatState.isProcessing) {
        console.log("[ConversationalChat] Processing started, forcing scroll");
        // Pequeno delay para garantir que o DOM foi atualizado
        setTimeout(() => {
          scrollState.scrollToBottom("auto");
        }, 100);

        // Scroll adicional após um delay maior para garantir
        setTimeout(() => {
          scrollState.scrollToBottom("auto");
        }, 300);
      }
    }, [chatState.isProcessing, scrollState.scrollToBottom]);

    // Força scroll quando processingStatus muda (para capturar "Extraindo sinais neurais...")
    useEffect(() => {
      if (processingStatus && processingStatus.trim() !== "") {
        console.log(
          "[ConversationalChat] Processing status changed, forcing scroll:",
          processingStatus
        );
        // Delay para garantir que o TypingIndicator foi renderizado
        setTimeout(() => {
          scrollState.scrollToBottom("auto");
        }, 50);
      }
    }, [processingStatus, scrollState.scrollToBottom]);

    // Força scroll quando thinking começa
    useEffect(() => {
      if (streamingState.isThinking) {
        console.log("[ConversationalChat] Thinking started, forcing scroll");
        // Delay para garantir que o ThinkingMessage foi renderizado
        setTimeout(() => {
          scrollState.scrollToBottom("auto");
        }, 50);

        // Scroll adicional após um delay maior
        setTimeout(() => {
          scrollState.scrollToBottom("auto");
        }, 200);
      }
    }, [streamingState.isThinking, scrollState.scrollToBottom]);

    // Managers
    const streamingManagerRef = useRef<StreamingManager | null>(null);
    const messageProcessorRef = useRef<MessageProcessor | null>(null);

    // Inicializa managers e expõe handlers
    useEffect(() => {
      console.log("[ConversationalChat] Initializing managers");

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
        onClearAiResponse
      );

      // Expõe handlers de streaming no window APÓS criar o manager
      const streamingManager = streamingManagerRef.current;

      // Handler para início do streaming
      const handleStreamingStart = () => {
        console.log("[ConversationalChat] handleStreamingStart called");
        streamingManager.startStreaming();
        chatState.setIsProcessing(true);
        setProcessingStatus("");
      };

      // Handler para chunks de streaming
      const handleStreamingChunk = (chunk: string) => {
        console.log(
          "[ConversationalChat] handleStreamingChunk called:",
          chunk.substring(0, 30)
        );
        streamingManager.processChunk(chunk);
      };

      // Handler para fim do streaming
      const handleStreamingEnd = () => {
        console.log("[ConversationalChat] handleStreamingEnd called");
        streamingManager.endStreaming();
        // Delay para garantir que a mensagem foi adicionada antes de limpar o processamento
        setTimeout(() => {
          chatState.setIsProcessing(false);
        }, 100);
      };

      // Expõe handlers no window
      if (typeof window !== "undefined") {
        (window as any).__handleStreamingStart = handleStreamingStart;
        (window as any).__handleStreamingChunk = handleStreamingChunk;
        (window as any).__handleStreamingEnd = handleStreamingEnd;
        console.log(
          "[ConversationalChat] Streaming handlers exposed on window"
        );
      }

      return () => {
        // Cleanup handlers
        if (typeof window !== "undefined") {
          delete (window as any).__handleStreamingStart;
          delete (window as any).__handleStreamingChunk;
          delete (window as any).__handleStreamingEnd;
        }

        streamingManagerRef.current = null;
        messageProcessorRef.current?.dispose();
        messageProcessorRef.current = null;
      };
    }, [
      addMessage,
      chatState.setIsProcessing,
      onClearAiResponse,
      setProcessingStatus,
    ]);

    // Expõe a referência do MessageProcessor
    React.useImperativeHandle(
      ref,
      () => ({
        messageProcessor: messageProcessorRef.current,
      }),
      [messageProcessorRef.current]
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

        // Reset message processor state
        messageProcessorRef.current?.resetState();

        console.log("[CHAT] Conversation changed, state cleared");
      }

      previousConversationId.current = currentId || null;
    }, [currentConversation?.id]); // Deps reduzidas intencionalmente

    // Processa respostas de IA
    useEffect(() => {
      if (!messageProcessorRef.current) return;

      console.log("🔄 [ConversationalChat] aiResponseText changed:", {
        aiResponseText: aiResponseText
          ? aiResponseText.substring(0, 50)
          : "null",
        chatMessagesCount: chatMessages.length,
        isProcessing: chatState.isProcessing,
        isStreaming: streamingState.isStreaming,
        hasStreamingContent: !!streamingState.streamingResponse,
      });

      // Só processa se não estiver em streaming ativo
      if (!streamingState.isStreaming) {
        messageProcessorRef.current.clearProcessingRef(aiResponseText);
        messageProcessorRef.current.processAiResponse(
          aiResponseText || "",
          chatMessages,
          currentConversation?.messages
        );
      }
    }, [
      aiResponseText,
      chatMessages,
      currentConversation?.messages,
      streamingState.isStreaming,
    ]);

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
    }, []); // Dependências removidas para usar a lógica do hook

    // Handler para enviar mensagem
    const handleSendMessage = useCallback(() => {
      const messageContent = chatState.inputMessage.trim();
      if (!messageContent && !transcriptionText.trim()) return;

      const finalContent = messageContent || transcriptionText.trim();

      console.log("💬 [ConversationalChat] Sending new message:", {
        content: finalContent.substring(0, 50),
        currentMessagesCount: chatMessages.length,
        hasMessageProcessor: !!messageProcessorRef.current,
      });

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
            type: "assistant",
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
          scrollRef={messagesContainerRef}
          showScrollButton={scrollState.showScrollButton}
          onScrollToBottom={() => scrollState.scrollToBottom("auto")}
          processingStatus={processingStatus}
          streamingContent={streamingState.streamingResponse}
          isStreaming={streamingState.isStreaming}
          isThinking={streamingState.isThinking}
          thinkingContent={streamingState.thinkingContent}
          scrollAnchorRef={scrollState.scrollAnchorRef}
          onAddTestMessage={debugFunctions.addTestMessage || (() => {})}
          onResetState={debugFunctions.resetChatState}
          onClearMessages={clearMessages}
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
          // TODO: Re-enable for future versions - Audio Settings in chat input
          // onToggleAudioSettings={() => setShowAudioSettings(!showAudioSettings)}
          // showAudioSettings={showAudioSettings}
          // audioSettingsButtonRef={audioSettingsButtonRef}
        />

        {/* TODO: Re-enable for future versions - Audio Settings Popover in chat input
        <AudioSettingsPopover
          show={showAudioSettings}
          onClose={() => setShowAudioSettings(false)}
          anchorRef={audioSettingsButtonRef}
          settings={{
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
        */}
      </div>
    );
  }
);

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
