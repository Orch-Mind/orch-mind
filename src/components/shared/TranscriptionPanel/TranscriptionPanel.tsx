// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "../../../App";
import { useCognitionLog } from "../../context/CognitionLogContext";
import AudioControls from "./components/AudioControls";
import CognitionLogSection from "./components/CognitionLogSection";
import ImportModal from "./components/ImportModal";
import PanelHeader from "./components/PanelHeader";
import SettingsModal from "./components/SettingsModal";
import { useChatGptImport } from "./hooks/useChatGptImport";
import { useTranscriptionManager } from "./hooks/useTranscriptionManager";
import { TranscriptionPanelProps } from "./types/interfaces";
// Import para controlar a visibilidade da visualização quântica
import { useGeneralSettings } from "./components/settings/hooks/useGeneralSettings";
// Módulo cortical para cards simples
// Importação dos arquivos CSS modulares - estrutura neural-simbólica
import "./styles/TranscriptionPanel.animations.css"; // Animações e keyframes
import "./styles/TranscriptionPanel.buttons.css"; // Botões e controles interativos
import "./styles/TranscriptionPanel.chathistory.css"; // Histórico de chats
import "./styles/TranscriptionPanel.layout.css"; // Layout, grid e estrutura espacial
import "./styles/TranscriptionPanel.overrides.css"; // Overrides para single-column mode
import "./styles/TranscriptionPanel.settings.css"; // Componentes de configuração
import "./styles/TranscriptionPanel.tooltip.css"; // Tooltips e ajudas contextuais
import "./styles/TranscriptionPanel.variables.css"; // Variáveis globais e propriedades customizadas
import "./styles/TranscriptionPanel.visual.css"; // Efeitos visuais e glassmorfismo
// Quantum consciousness visualization import
import { QuantumVisualizationContainer } from "../QuantumVisualization/QuantumVisualizationContainer";
// Conversational Chat import
import { ConversationalChat } from "./components/ConversationalChat";
// Chat History imports
import { ChatHistorySidebar } from "./components/ConversationalChat/components/ChatHistorySidebar";
import { useChatHistory } from "./components/ConversationalChat/hooks/useChatHistory";
// Brain visualization is now handled in a separate module

const TranscriptionPanel: React.FC<TranscriptionPanelProps> = ({
  onClose,
  width,
}) => {
  const transcriptionManager = useTranscriptionManager();
  const { showToast } = useToast();

  // Hook para acessar as configurações gerais, incluindo enableMatrix
  const { enableMatrix } = useGeneralSettings();

  // Chat History Hook
  const chatHistory = useChatHistory();

  // Track processing state
  const [isProcessing, setIsProcessing] = useState(false);

  // Sidebar visibility state with persistence
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    // Load from localStorage, default to true
    const saved = localStorage.getItem("orchos-sidebar-open");
    return saved !== null ? saved === "true" : true;
  });

  // Mobile sidebar state (separate from desktop)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Save sidebar state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("orchos-sidebar-open", String(isSidebarOpen));
  }, [isSidebarOpen]);

  // Keyboard shortcut for toggling sidebar (Cmd/Ctrl + B)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Mobile soft dismiss - close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mobileSidebarOpen) {
        const sidebar = document.querySelector(".chat-history-sidebar");
        const toggleButton = document.querySelector(".mobile-sidebar-toggle");

        if (
          sidebar &&
          !sidebar.contains(e.target as Node) &&
          toggleButton &&
          !toggleButton.contains(e.target as Node)
        ) {
          setMobileSidebarOpen(false);
        }
      }
    };

    if (mobileSidebarOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Add overlay backdrop for mobile
      document.body.classList.add("mobile-sidebar-open");
    } else {
      document.body.classList.remove("mobile-sidebar-open");
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.classList.remove("mobile-sidebar-open");
    };
  }, [mobileSidebarOpen]);

  if (!transcriptionManager) return null;

  // Move stable callbacks here when setTexts is already defined

  const {
    language,
    setLanguage,
    microphoneState,
    connectionState,
    toggleRecording,
    handleSendPrompt,
    clearTranscription,
    clearAiResponse,
    toggleExpand,
    isExpanded,
    temporaryContext,
    setTemporaryContext,
    texts,
    setTexts,
    audioDevices,
    selectedDevices,
    handleDeviceChange,
    isMicrophoneOn,
    isSystemAudioOn,
    setIsMicrophoneOn,
    setIsSystemAudioOn,
    showDetailedDiagnostics,
    setShowDetailedDiagnostics,
    connectionDetails,
    setConnectionDetails,
    transcriptionRef,
    getConnectionStatus,
    disconnectFromDeepgram,
    connectToDeepgram,
    waitForConnectionState,
    hasActiveConnection,
    ConnectionState,
  } = transcriptionManager;

  const {
    events: cognitionEvents,
    exporters,
    clearEvents,
    exportEvents,
  } = useCognitionLog();

  const {
    importFile,
    setImportFile,
    importUserName,
    setImportUserName,
    importMode,
    setImportMode,
    importProgress,
    importStage,
    importSummary,
    isImporting,
    showImportModal,
    setShowImportModal,
    handleFileChange,
    handleStartImport,
    handleCloseImportModal,
  } = useChatGptImport(showToast);

  // Stable callbacks defined AFTER setTexts is available to avoid TS errors
  const handleTranscriptionChange = useCallback(
    (value: string) => {
      console.log("🔄 [PANEL] Transcription change:", value.substring(0, 50));
      setTexts((prev) => ({ ...prev, transcription: value }));
    },
    [setTexts]
  );

  const handleAiResponseChange = useCallback(
    (value: string) => {
      console.log("🔄 [PANEL] AI response change:", value.substring(0, 50));
      setTexts((prev) => ({ ...prev, aiResponse: value }));
    },
    [setTexts]
  );

  const handleTemporaryContextChange = useCallback(
    (value: string) => {
      console.log(
        "🔄 [PANEL] Temporary context change:",
        value.substring(0, 50)
      );
      setTemporaryContext(value);
    },
    [setTemporaryContext]
  );

  // Brain state and logic has been moved to BrainVisualization module

  // Brain visualization components have been moved to BrainVisualization module

  // --- Configurações simples para Audio/Language Controls ---
  const [showSettings, setShowSettings] = useState(false);
  const settingsContainerRef = useRef<HTMLDivElement>(null);
  const settingsBtnRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [settingsPopupPosition, setSettingsPopupPosition] = useState({
    top: 0,
    left: 0,
  });

  // Função para alternar a visibilidade das configurações
  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };

  // Fechar configurações ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        settingsBtnRef.current &&
        !settingsBtnRef.current.contains(event.target as Node) &&
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        setShowSettings(false);
      }
    }
    if (showSettings) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSettings]);

  useEffect(() => {
    if (showSettings && settingsBtnRef.current) {
      const rect = settingsBtnRef.current.getBoundingClientRect();
      const POPUP_WIDTH = 350;
      let left = rect.right + window.scrollX - POPUP_WIDTH;
      // Garante que não vaze para fora da viewport
      left = Math.max(8, Math.min(left, window.innerWidth - POPUP_WIDTH - 8));
      setSettingsPopupPosition({
        top: rect.bottom + window.scrollY + 8,
        left,
      });
    }
  }, [showSettings]);

  // Prevent body scroll when dashboard is active
  useEffect(() => {
    document.body.classList.add("orchos-active");
    return () => {
      document.body.classList.remove("orchos-active");
    };
  }, []);

  // Estados para modais
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Settings content for the chat component
  const settingsContent = (
    <div className="neural-settings-popup">
      <div className="mb-2 pb-2">
        <h3 className="orchos-title flex items-center gap-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#00faff"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          Neural Settings
        </h3>
      </div>
      <div className="flex flex-col gap-4 px-1">
        <AudioControls
          isMicrophoneOn={isMicrophoneOn}
          setIsMicrophoneOn={setIsMicrophoneOn}
          isSystemAudioOn={isSystemAudioOn}
          setIsSystemAudioOn={setIsSystemAudioOn}
          audioDevices={audioDevices}
          selectedDevices={selectedDevices}
          handleDeviceChange={handleDeviceChange}
        />
      </div>
    </div>
  );

  // Generate a key based on current conversation ID to force remount when conversation changes
  const chatKey = React.useMemo(
    () => chatHistory.currentConversationId || "default-chat",
    [chatHistory.currentConversationId]
  );

  // --- Render ---
  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        maxHeight: "100vh",
        maxWidth: "100vw",
      }}
    >
      {/* Panel Header - Now positioned absolutely */}
      <PanelHeader
        onClose={() => {
          if (window?.electronAPI?.closeWindow) {
            window.electronAPI.closeWindow();
          } else if (onClose) {
            onClose();
          }
        }}
        onMinimize={() => {
          if (window?.electronAPI?.minimizeWindow) {
            window.electronAPI.minimizeWindow();
          }
        }}
        onShowSettings={() => setShowSettingsModal(true)}
        onShowLogsModal={() => setShowLogsModal(true)}
        onShowImportModal={() => setShowImportModal(true)}
        onToggleDiagnostics={() =>
          setShowDetailedDiagnostics(!showDetailedDiagnostics)
        }
        connectionState={connectionState}
        microphoneState={microphoneState}
        hasActiveConnection={hasActiveConnection}
        onDisconnect={disconnectFromDeepgram}
        onReconnect={connectToDeepgram}
      />

      {/* Main Chat Dashboard Layout */}
      <div
        className={`orchos-quantum-dashboard with-sidebar ${
          !enableMatrix ? "single-column" : ""
        } ${!isSidebarOpen ? "sidebar-collapsed" : ""}`}
        style={{
          flex: "1 1 auto",
        }}
      >
        {/* Chat History Sidebar */}
        <div
          className={`chat-history-sidebar ${
            mobileSidebarOpen ? "mobile-open" : ""
          } ${!isSidebarOpen ? "desktop-collapsed" : ""}`}
        >
          <ChatHistorySidebar
            conversations={chatHistory.conversations}
            currentConversationId={chatHistory.currentConversationId}
            onSelectConversation={(id: string) => {
              // Clear any pending AI responses when switching conversations
              clearAiResponse();
              clearTranscription();
              chatHistory.selectConversation(id);
            }}
            onCreateNewConversation={() => {
              // Clear any pending AI responses when creating new conversation
              clearAiResponse();
              clearTranscription();
              return chatHistory.createNewConversation();
            }}
            onDeleteConversation={chatHistory.deleteConversation}
            onSearchConversations={chatHistory.searchConversations}
            isProcessing={isProcessing}
          />
        </div>

        {/* Desktop Sidebar Toggle Button - Outside sidebar as sibling */}
        <button
          className="desktop-sidebar-toggle"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          title={`${isSidebarOpen ? "Hide" : "Show"} sidebar (${
            navigator.platform.includes("Mac") ? "⌘" : "Ctrl"
          }+B)`}
          aria-label={`${isSidebarOpen ? "Hide" : "Show"} sidebar`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            {isSidebarOpen ? (
              // Chevron left icon when sidebar is open
              <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : (
              // Chevron right icon when sidebar is closed
              <path
                d="M9 18l6-6-6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
        </button>

        {/* Quantum Visualization Zone - Left Panel with Golden Ratio */}
        {/* Lógica corrigida: enableMatrix = true mostra, false esconde */}
        {enableMatrix && (
          <div
            key="quantum-visualization-zone"
            className="quantum-visualization-zone"
          >
            <QuantumVisualizationContainer
              cognitionEvents={cognitionEvents}
              height="100%"
              width="100%"
              lowPerformanceMode={false}
              showLegend={true}
            />
          </div>
        )}

        {/* Conversational Chat Zone - Main Panel */}
        <div
          key="neural-chat-zone"
          className="neural-chat-zone"
          style={{
            height: "100%",
            width: "100%",
            padding: "1.2rem",
            overflow: "hidden" /* Força o chat a usar scroll interno */,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <ConversationalChat
            key={chatKey}
            transcriptionText={texts.transcription}
            onTranscriptionChange={handleTranscriptionChange}
            onClearTranscription={clearTranscription}
            aiResponseText={texts.aiResponse}
            onAiResponseChange={handleAiResponseChange}
            onClearAiResponse={clearAiResponse}
            temporaryContext={temporaryContext}
            onTemporaryContextChange={handleTemporaryContextChange}
            microphoneState={microphoneState}
            onToggleRecording={toggleRecording}
            onSendPrompt={handleSendPrompt}
            // Audio settings props
            language={language}
            setLanguage={setLanguage}
            isMicrophoneOn={isMicrophoneOn}
            setIsMicrophoneOn={setIsMicrophoneOn}
            isSystemAudioOn={isSystemAudioOn}
            setIsSystemAudioOn={setIsSystemAudioOn}
            audioDevices={audioDevices}
            selectedDevices={selectedDevices}
            handleDeviceChange={handleDeviceChange}
            // Chat History props
            currentConversation={chatHistory.currentConversation}
            onAddMessageToConversation={chatHistory.addMessageToConversation}
            onProcessingChange={setIsProcessing}
          />
        </div>
      </div>

      {/* Import Modal - Always on top */}
      {showImportModal && (
        <ImportModal
          show={showImportModal}
          onClose={handleCloseImportModal}
          importFile={importFile}
          setImportFile={setImportFile}
          importUserName={importUserName}
          setImportUserName={setImportUserName}
          importMode={importMode}
          setImportMode={setImportMode}
          importProgress={importProgress}
          importStage={importStage}
          importSummary={importSummary}
          isImporting={isImporting}
          handleFileChange={handleFileChange}
          handleStartImport={handleStartImport}
          handleCloseImportModal={handleCloseImportModal}
        />
      )}

      {/* Modal de Logs de Cognição */}
      {showLogsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="orchos-cognition-logs-modal">
            <div className="orchos-cognition-logs-header">
              <h2 className="text-xl font-bold text-[#7c4dff] flex items-center gap-2">
                <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
                  <ellipse
                    cx="10"
                    cy="10"
                    rx="8"
                    ry="6"
                    stroke="#7c4dff"
                    strokeWidth="2"
                  />
                  <circle cx="10" cy="10" r="3" fill="#7c4dff" />
                </svg>
                Cognition Logs
              </h2>
              <button
                className="ml-2 px-2 py-1 rounded-full hover:bg-[#7c4dff22] transition"
                onClick={() => setShowLogsModal(false)}
                aria-label="Close logs modal"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M6 6l8 8M14 6l-8 8"
                    stroke="#7c4dff"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <CognitionLogSection
              cognitionEvents={cognitionEvents}
              exporters={exporters}
              exportEvents={exportEvents}
              clearEvents={clearEvents}
            />
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          show={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {/* Mobile Sidebar Toggle Button */}
      <button
        className="mobile-sidebar-toggle"
        onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        title="Histórico de conversas"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 12h18m-18-6h18m-18 12h18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
};

export default TranscriptionPanel;
