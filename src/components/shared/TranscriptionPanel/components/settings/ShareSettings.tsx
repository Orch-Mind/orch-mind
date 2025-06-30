// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React, { useEffect, useState } from "react";
import { p2pShareService } from "../../../../../services/p2p/P2PShareService";
import "./ShareSettings/styles.css";

// SRP: Imports segregados por responsabilidade
import {
  AdapterListComponent,
  AvailableAdaptersComponent,
  ConnectedStatusComponent,
  SmartConnectComponent,
} from "./ShareSettings/components";
import { useAdapters } from "./ShareSettings/hooks/useAdapters";
import { useP2PConnection } from "./ShareSettings/hooks/useP2PConnection";
import { StorageDebugUtils } from "./ShareSettings/utils";

// KISS: Componente principal focado APENAS em orquestração
const ShareSettings: React.FC = () => {
  const [roomCode, setRoomCode] = useState("");

  // SRP: Hooks especializados para diferentes responsabilidades
  const {
    currentRoom,
    isLoading,
    isSharing,
    connect,
    disconnect,
    updatePeerCount,
    setCurrentRoom,
    persistedState,
    reconnectToLastSession,
    resetP2PState,
    getRecentRoomCodes,
    updateSharedAdapters,
    shouldShowReconnectPanel,
  } = useP2PConnection();

  const {
    sharedAdapters,
    incomingAdapters,
    loadLocalAdapters,
    toggleAdapterSharing,
    downloadAdapter,
    addAvailableAdapters,
    clearIncomingAdapters,
  } = useAdapters(updateSharedAdapters);

  // DEBUGGING: Log component mount and key state changes
  useEffect(() => {
    console.log("🚀 [SHARESETS] ShareSettings component mounted");
    console.log("🚀 [SHARESETS] Initial persistence state:", persistedState);

    // Test localStorage functionality
    console.log("🧪 [SHARESETS] Testing localStorage functionality...");
    const isLocalStorageWorking = StorageDebugUtils.testLocalStorage();

    if (isLocalStorageWorking) {
      // Inspect current P2P state
      StorageDebugUtils.inspectP2PState();
      StorageDebugUtils.getAllOrchKeys();
    } else {
      console.error(
        "❌ [SHARESETS] localStorage is not working - persistence will fail!"
      );
    }
  }, []);

  useEffect(() => {
    console.log("🔍 [SHARESETS] State changed:", {
      isSharing,
      currentRoom,
      sharedAdaptersCount: sharedAdapters.length,
      persistedStateSharing: persistedState.isSharing,
    });
  }, [isSharing, currentRoom, sharedAdapters.length, persistedState.isSharing]);

  // SRP: Effect focado APENAS na inicialização com melhor ordem
  useEffect(() => {
    const initializeShareSettings = async () => {
      console.log("🔄 [SHARESETS] Starting ShareSettings initialization...");

      // Step 1: Load local adapters FIRST
      console.log("📂 [SHARESETS] Step 1: Loading local adapters...");
      loadLocalAdapters();

      // Step 2: Initialize P2P service
      console.log("🌐 [SHARESETS] Step 2: Initializing P2P service...");
      await initializeP2P();

      console.log("✅ [SHARESETS] ShareSettings initialization completed");
    };

    initializeShareSettings();
    return cleanupP2P;
  }, []);

  // KISS: Funções simples e focadas
  const initializeP2P = async () => {
    try {
      console.log("🔄 [SHARESETS] Initializing P2P share service...");
      await p2pShareService.initialize();
      console.log("✅ [SHARESETS] P2P service initialized");

      console.log("🔄 [SHARESETS] Setting up P2P event listeners...");
      setupEventListeners();
      console.log("✅ [SHARESETS] P2P event listeners set up");
    } catch (error) {
      console.error("❌ [SHARESETS] Failed to initialize P2P:", error);
    }
  };

  const setupEventListeners = () => {
    // SRP: Event handlers focados em suas responsabilidades específicas
    console.log("🔧 [SHARESETS] Registering event listeners...");

    p2pShareService.on("room-joined", handleRoomJoined);
    p2pShareService.on("peers-updated", updatePeerCount);
    p2pShareService.on("adapters-available", addAvailableAdapters);

    console.log("✅ [SHARESETS] Event listeners registered");
  };

  const cleanupP2P = () => {
    console.log("🧹 [SHARESETS] Cleaning up P2P connections...");
    p2pShareService.removeAllListeners();
    p2pShareService.leaveRoom().catch(console.error);
    console.log("✅ [SHARESETS] P2P cleanup completed");
  };

  // KISS: Handler simples para room joined
  const handleRoomJoined = (data: any) => {
    const roomType = data.type || "local";
    console.log("🏠 [SHARESETS] Room joined:", { roomType, data });

    setCurrentRoom({
      type: roomType,
      code: data.code,
      peersCount: 0,
      isActive: true,
    });
  };

  // SRP: Handler focado apenas em desconexão
  const handleDisconnect = async () => {
    console.log("🔌 [SHARESETS] Handling disconnect...");
    await disconnect();
    clearIncomingAdapters();
    console.log("✅ [SHARESETS] Disconnect completed");
  };

  // YAGNI: Render simples sem over-engineering
  return (
    <div className="space-y-3 max-w-7xl mx-auto">
      <ShareHeader />
      <ConnectionStats
        currentRoom={currentRoom}
        isSharing={isSharing}
        sharedAdapters={sharedAdapters}
        incomingAdapters={incomingAdapters}
      />
      <MainSharingSection
        currentRoom={currentRoom}
        isSharing={isSharing}
        isLoading={isLoading}
        roomCode={roomCode}
        setRoomCode={setRoomCode}
        onConnect={connect}
        onDisconnect={handleDisconnect}
        sharedAdapters={sharedAdapters}
        incomingAdapters={incomingAdapters}
        onToggleSharing={toggleAdapterSharing}
        onDownload={downloadAdapter}
        persistedState={persistedState}
        getRecentRoomCodes={getRecentRoomCodes}
        reconnectToLastSession={reconnectToLastSession}
        resetP2PState={resetP2PState}
        shouldShowReconnectPanel={shouldShowReconnectPanel}
      />
      <InfoFooter currentRoom={currentRoom} />
    </div>
  );
};

// SRP: Componente focado apenas no header
const ShareHeader: React.FC = () => (
  <div className="text-center pb-2 border-b border-cyan-400/20">
    <h2 className="text-lg font-bold text-cyan-400 mb-0.5">
      🌐 P2P Sharing Center
    </h2>
  </div>
);

// SRP: Componente focado apenas nas estatísticas
const ConnectionStats: React.FC<{
  currentRoom: ReturnType<typeof useP2PConnection>["currentRoom"];
  isSharing: boolean;
  sharedAdapters: ReturnType<typeof useAdapters>["sharedAdapters"];
  incomingAdapters: ReturnType<typeof useAdapters>["incomingAdapters"];
}> = ({ currentRoom, isSharing, sharedAdapters, incomingAdapters }) => (
  <div className="grid grid-cols-2 gap-3">
    <ConnectionStatusCard currentRoom={currentRoom} isSharing={isSharing} />
    <SharingStatsCard
      sharedAdapters={sharedAdapters}
      incomingAdapters={incomingAdapters}
    />
  </div>
);

// SRP: Card focado apenas no status de conexão
const ConnectionStatusCard: React.FC<{
  currentRoom: ReturnType<typeof useP2PConnection>["currentRoom"];
  isSharing: boolean;
}> = ({ currentRoom, isSharing }) => (
  <div className="bg-gradient-to-r from-slate-900/50 to-gray-900/50 backdrop-blur-sm rounded-md p-3 border border-slate-400/20">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <div className="w-6 h-6 bg-slate-500/20 rounded-sm flex items-center justify-center">
          <svg
            className="w-3 h-3 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-xs font-semibold text-white">Connection</h3>
          <p className="text-slate-400 text-[9px]">P2P Network Status</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-xs font-mono text-cyan-400 truncate max-w-32">
          {isSharing
            ? currentRoom?.type === "general"
              ? "General Room"
              : currentRoom?.type === "local"
              ? "Local Network"
              : `Room: ${currentRoom?.code}`
            : "Disconnected"}
        </p>
        <div
          className={`flex items-center text-[9px] ${
            isSharing ? "text-green-400" : "text-gray-400"
          }`}
        >
          <svg className="w-2 h-2 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          {isSharing ? `${currentRoom?.peersCount || 0} peers` : "Offline"}
        </div>
      </div>
    </div>
  </div>
);

// SRP: Card focado apenas nas estatísticas de sharing
const SharingStatsCard: React.FC<{
  sharedAdapters: ReturnType<typeof useAdapters>["sharedAdapters"];
  incomingAdapters: ReturnType<typeof useAdapters>["incomingAdapters"];
}> = ({ sharedAdapters, incomingAdapters }) => (
  <div className="bg-gradient-to-r from-cyan-900/50 to-blue-900/50 backdrop-blur-sm rounded-md p-3 border border-cyan-400/20">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <div className="w-6 h-6 bg-cyan-500/20 rounded-sm flex items-center justify-center">
          <svg
            className="w-3 h-3 text-cyan-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-xs font-semibold text-white">Sharing</h3>
          <p className="text-slate-400 text-[9px]">Adapters & Downloads</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-xs font-mono text-cyan-400">
          {sharedAdapters.filter((a) => a.shared).length}/
          {sharedAdapters.length}
        </p>
        <div className="flex items-center text-cyan-400 text-[9px]">
          <span>{incomingAdapters.length} available</span>
        </div>
      </div>
    </div>
  </div>
);

// SRP: Seção principal focada no layout
const MainSharingSection: React.FC<{
  currentRoom: ReturnType<typeof useP2PConnection>["currentRoom"];
  isSharing: boolean;
  isLoading: boolean;
  roomCode: string;
  setRoomCode: (code: string) => void;
  onConnect: ReturnType<typeof useP2PConnection>["connect"];
  onDisconnect: () => void;
  sharedAdapters: ReturnType<typeof useAdapters>["sharedAdapters"];
  incomingAdapters: ReturnType<typeof useAdapters>["incomingAdapters"];
  onToggleSharing: ReturnType<typeof useAdapters>["toggleAdapterSharing"];
  onDownload: ReturnType<typeof useAdapters>["downloadAdapter"];
  persistedState: ReturnType<typeof useP2PConnection>["persistedState"];
  getRecentRoomCodes: ReturnType<typeof useP2PConnection>["getRecentRoomCodes"];
  reconnectToLastSession: ReturnType<
    typeof useP2PConnection
  >["reconnectToLastSession"];
  resetP2PState: ReturnType<typeof useP2PConnection>["resetP2PState"];
  shouldShowReconnectPanel: ReturnType<
    typeof useP2PConnection
  >["shouldShowReconnectPanel"];
}> = ({
  currentRoom,
  isSharing,
  isLoading,
  roomCode,
  setRoomCode,
  onConnect,
  onDisconnect,
  sharedAdapters,
  incomingAdapters,
  onToggleSharing,
  onDownload,
  persistedState,
  getRecentRoomCodes,
  reconnectToLastSession,
  resetP2PState,
  shouldShowReconnectPanel,
}) => (
  <div className="flex gap-3 justify-between">
    {/* KISS: Layout flexbox com distribuição igual de espaço */}
    <div className="flex-1 min-w-0">
      <div className="bg-black/20 backdrop-blur-sm rounded-md p-3 border border-cyan-400/20 h-full">
        <h3 className="text-sm font-semibold text-cyan-400 mb-3">
          🌐 Smart Connect
        </h3>

        {!isSharing ? (
          <SmartConnectComponent
            onConnect={onConnect}
            isLoading={isLoading}
            roomCode={roomCode}
            onRoomCodeChange={setRoomCode}
            persistedState={persistedState}
            getRecentRoomCodes={getRecentRoomCodes}
            reconnectToLastSession={reconnectToLastSession}
            shouldShowReconnectPanel={shouldShowReconnectPanel}
          />
        ) : (
          <ConnectedStatusComponent
            currentRoom={currentRoom}
            onDisconnect={onDisconnect}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>

    <div className="flex-1 min-w-0">
      <AdapterListComponent
        adapters={sharedAdapters}
        currentRoom={currentRoom}
        onToggleSharing={onToggleSharing}
        isSharing={isSharing}
      />
    </div>

    <div className="flex-1 min-w-0">
      <AvailableAdaptersComponent
        adapters={incomingAdapters}
        currentRoom={currentRoom}
        onDownload={onDownload}
        isSharing={isSharing}
      />
    </div>
  </div>
);

// SRP: Footer focado apenas em informações
const InfoFooter: React.FC<{
  currentRoom: ReturnType<typeof useP2PConnection>["currentRoom"];
}> = ({ currentRoom }) => (
  <div className="p-2 bg-amber-500/10 rounded border border-amber-400/30">
    <p className="text-[10px] text-amber-400">
      <strong>💡 How it works:</strong>
      {currentRoom?.type === "general"
        ? " General room connects you to the global Orch-OS community. Models shared here are visible to everyone!"
        : currentRoom?.type === "local"
        ? " Auto-discovery finds peers on your local network. Perfect for sharing within the same office or home."
        : " Private rooms use simple codes like PIZZA-123. Share the code with trusted peers to connect securely."}
    </p>
  </div>
);

export default ShareSettings;
