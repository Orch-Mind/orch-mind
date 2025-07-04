// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React, { useEffect, useState } from "react";
import { PrivateRoomProps } from "../types";

// SRP: Componente responsável APENAS pela interface de conexão inteligente
// KISS: Interface simples e focada
export const SmartConnectComponent: React.FC<
  PrivateRoomProps & {
    persistedState?: any;
    getRecentRoomCodes?: () => string[];
    reconnectToLastSession?: () => Promise<void>;
    shouldShowReconnectPanel?: () => boolean;
  }
> = ({
  onConnect,
  isLoading,
  roomCode,
  onRoomCodeChange,
  persistedState,
  getRecentRoomCodes,
  reconnectToLastSession,
  shouldShowReconnectPanel,
}) => {
  // Local state for mode to ensure re-rendering
  const [selectedMode, setSelectedModeLocal] = useState<"auto" | "manual">(
    persistedState?.lastSelectedMode || "auto"
  );

  // Smart Connect state
  const [smartStatus, setSmartStatus] = useState<{
    phase: "idle" | "scanning" | "found-peers" | "fallback";
    message: string;
  }>({
    phase: "idle",
    message: "Auto-detects: Local Network → Global Community (3s fallback)",
  });

  // Update local state when persisted state changes
  useEffect(() => {
    if (
      persistedState?.lastSelectedMode &&
      persistedState.lastSelectedMode !== selectedMode
    ) {
      setSelectedModeLocal(persistedState.lastSelectedMode);
    }
  }, [persistedState?.lastSelectedMode]);

  // Mode change function updates both local and global context
  const setSelectedMode = (mode: "auto" | "manual") => {
    console.log("🔄 [SMART-CONNECT] Mode changed to:", mode);
    setSelectedModeLocal(mode);
    if (persistedState?.updateSelectedMode) {
      persistedState.updateSelectedMode(mode);
    }
  };

  // SMART: Lógica inteligente de auto-connect com verificação de peers
  const handleSmartConnect = async () => {
    console.log("🎯 [SMART-CONNECT] Starting smart connection process...");

    try {
      // Phase 1: Scan local network
      setSmartStatus({
        phase: "scanning",
        message: "🔍 Scanning local network for peers...",
      });

      // Try local connection
      console.log("🔍 [SMART-CONNECT] Trying local network first...");
      await onConnect("local");

      // Wait for peers detection (3 seconds)
      console.log("⏳ [SMART-CONNECT] Waiting 3s for peer detection...");

      // Monitor for peers using a promise that resolves after 3 seconds
      const peersFound = await new Promise<boolean>((resolve) => {
        let peersDetected = false;

        // Listen for peers-updated events
        const handlePeersUpdate = (event: CustomEvent) => {
          const count = event.detail;
          console.log("📡 [SMART-CONNECT] Peers detected:", count);
          if (count > 0 && !peersDetected) {
            peersDetected = true;
            setSmartStatus({
              phase: "found-peers",
              message: `✅ Found ${count} peer(s) on local network!`,
            });
            resolve(true);
          }
        };

        // Listen for custom events from P2P Context
        window.addEventListener(
          "p2p-peers-updated",
          handlePeersUpdate as EventListener
        );

        // Timeout after 3 seconds
        setTimeout(() => {
          window.removeEventListener(
            "p2p-peers-updated",
            handlePeersUpdate as EventListener
          );
          if (!peersDetected) {
            console.log(
              "⏰ [SMART-CONNECT] No peers found in 3s, falling back to global..."
            );
            resolve(false);
          }
        }, 3000);
      });

      if (!peersFound) {
        // Phase 2: Fallback to global community
        setSmartStatus({
          phase: "fallback",
          message: "🌍 No local peers found, connecting to global community...",
        });

        console.log("🌍 [SMART-CONNECT] Falling back to global community...");

        // Disconnect from local first
        // Note: This should be handled by the P2P service when switching rooms

        // Connect to global
        await onConnect("general");

        setSmartStatus({
          phase: "found-peers",
          message: "✅ Connected to global community!",
        });
      }

      // Reset status after connection is established
      setTimeout(() => {
        setSmartStatus({
          phase: "idle",
          message:
            "Auto-detects: Local Network → Global Community (3s fallback)",
        });
      }, 2000);
    } catch (error) {
      console.error("❌ [SMART-CONNECT] Smart connection failed:", error);
      setSmartStatus({
        phase: "idle",
        message: "❌ Connection failed. Try again or use manual mode.",
      });

      // Reset status after error
      setTimeout(() => {
        setSmartStatus({
          phase: "idle",
          message:
            "Auto-detects: Local Network → Global Community (3s fallback)",
        });
      }, 3000);
    }
  };

  // KISS: Lógica simples de private connect
  const handlePrivateConnect = () => {
    onConnect("private", roomCode);
  };

  return (
    <div className="space-y-3">
      {/* Show reconnect option if previous session exists */}
      {shouldShowReconnectPanel?.() && reconnectToLastSession && (
        <ReconnectPanel
          lastConnectionType={persistedState.lastConnectionType}
          lastRoomCode={persistedState.lastRoomCode}
          onReconnect={reconnectToLastSession}
          isLoading={isLoading}
        />
      )}

      {/* KISS: Toggle simples entre modos */}
      <ModeToggle selectedMode={selectedMode} onModeChange={setSelectedMode} />

      {selectedMode === "auto" ? (
        <AutoModePanel
          onConnect={handleSmartConnect}
          isLoading={isLoading}
          smartStatus={smartStatus}
        />
      ) : (
        <ManualModePanel
          onConnect={onConnect}
          onPrivateConnect={handlePrivateConnect}
          isLoading={isLoading}
          roomCode={roomCode}
          onRoomCodeChange={onRoomCodeChange}
          getRecentRoomCodes={getRecentRoomCodes}
        />
      )}
    </div>
  );
};

// SRP: Componente focado apenas no toggle de modo
const ModeToggle: React.FC<{
  selectedMode: "auto" | "manual";
  onModeChange: (mode: "auto" | "manual") => void;
}> = ({ selectedMode, onModeChange }) => {
  console.log("🔄 [MODE-TOGGLE] Current mode:", selectedMode);

  return (
    <div className="flex bg-black/30 rounded-lg p-1">
      <button
        onClick={() => {
          console.log("🎯 [MODE-TOGGLE] Clicked Smart mode");
          onModeChange("auto");
        }}
        className={`flex-1 px-3 py-1.5 text-[10px] font-medium rounded transition-colors ${
          selectedMode === "auto"
            ? "bg-cyan-500/20 text-cyan-400 border border-cyan-400/30"
            : "text-gray-400 hover:text-cyan-400"
        }`}
      >
        🎯 Smart
      </button>
      <button
        onClick={() => {
          console.log("⚙️ [MODE-TOGGLE] Clicked Manual mode");
          onModeChange("manual");
        }}
        className={`flex-1 px-3 py-1.5 text-[10px] font-medium rounded transition-colors ${
          selectedMode === "manual"
            ? "bg-cyan-500/20 text-cyan-400 border border-cyan-400/30"
            : "text-gray-400 hover:text-cyan-400"
        }`}
      >
        ⚙️ Manual
      </button>
    </div>
  );
};

// SRP: Painel focado apenas no modo automático
const AutoModePanel: React.FC<{
  onConnect: () => void;
  isLoading: boolean;
  smartStatus: {
    phase: "idle" | "scanning" | "found-peers" | "fallback";
    message: string;
  };
}> = ({ onConnect, isLoading, smartStatus }) => {
  const getButtonText = () => {
    if (isLoading) {
      switch (smartStatus.phase) {
        case "scanning":
          return "🔍 Scanning Local...";
        case "fallback":
          return "🌍 Connecting Global...";
        default:
          return "🔄 Connecting...";
      }
    }
    return "🚀 Smart Connect";
  };

  const getStatusColor = () => {
    switch (smartStatus.phase) {
      case "scanning":
        return "text-yellow-400";
      case "found-peers":
        return "text-green-400";
      case "fallback":
        return "text-blue-400";
      default:
        return "text-gray-400";
    }
  };

  return (
    <div className="p-3 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded border border-cyan-400/30">
      <h4 className="text-cyan-400 font-medium text-xs mb-2">
        🎯 Smart Connect
      </h4>
      <p className={`text-[10px] mb-3 ${getStatusColor()}`}>
        {smartStatus.message}
      </p>
      <button
        onClick={onConnect}
        disabled={isLoading}
        className="w-full px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-400 rounded text-[11px] font-medium transition-all border border-cyan-400/30 disabled:opacity-50"
      >
        {getButtonText()}
      </button>
    </div>
  );
};

// SRP: Componente para reconectar à sessão anterior
const ReconnectPanel: React.FC<{
  lastConnectionType: string;
  lastRoomCode?: string;
  onReconnect: () => Promise<void>;
  isLoading: boolean;
}> = ({ lastConnectionType, lastRoomCode, onReconnect, isLoading }) => {
  const getConnectionLabel = () => {
    switch (lastConnectionType) {
      case "general":
        return "🌍 Community Room";
      case "local":
        return "📡 Local Network";
      case "private":
        return `🔒 Room ${lastRoomCode}`;
      default:
        return `${lastConnectionType}`;
    }
  };

  return (
    <div className="p-2 bg-amber-500/10 rounded border border-amber-400/30">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-amber-400 font-medium text-xs">
            Previous Session
          </h4>
          <p className="text-[10px] text-gray-400">{getConnectionLabel()}</p>
        </div>
        <button
          onClick={onReconnect}
          disabled={isLoading}
          className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded text-[10px] font-medium transition-colors border border-amber-400/30 disabled:opacity-50"
        >
          {isLoading ? "⏳" : "🔄 Reconnect"}
        </button>
      </div>
    </div>
  );
};

// SRP: Painel focado apenas no modo manual
const ManualModePanel: React.FC<{
  onConnect: (type: "general" | "local" | "private") => void;
  onPrivateConnect: () => void;
  isLoading: boolean;
  roomCode: string;
  onRoomCodeChange: (code: string) => void;
  getRecentRoomCodes?: () => string[];
}> = ({
  onConnect,
  onPrivateConnect,
  isLoading,
  roomCode,
  onRoomCodeChange,
  getRecentRoomCodes,
}) => (
  <div className="space-y-2">
    {/* KISS: Botões diretos para opções rápidas com ícones em cima */}
    <div className="grid grid-cols-2 gap-2">
      <button
        onClick={() => onConnect("general")}
        disabled={isLoading}
        className="px-3 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded text-[10px] font-medium transition-colors border border-purple-400/20 disabled:opacity-50 flex flex-col items-center justify-center"
      >
        <span className="text-sm mb-1">🌍</span>
        <span>Community</span>
      </button>
      <button
        onClick={() => onConnect("local")}
        disabled={isLoading}
        className="px-3 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded text-[10px] font-medium transition-colors border border-green-400/20 disabled:opacity-50 flex flex-col items-center justify-center"
      >
        <span className="text-sm mb-1">📡</span>
        <span>Local</span>
      </button>
    </div>

    {/* KISS: Input simples para room privada */}
    <PrivateRoomInput
      roomCode={roomCode}
      onRoomCodeChange={onRoomCodeChange}
      onConnect={onPrivateConnect}
      isLoading={isLoading}
      getRecentRoomCodes={getRecentRoomCodes}
    />
  </div>
);

// SRP: Componente focado apenas no input de room privada
const PrivateRoomInput: React.FC<{
  roomCode: string;
  onRoomCodeChange: (code: string) => void;
  onConnect: () => void;
  isLoading: boolean;
  getRecentRoomCodes?: () => string[];
}> = ({
  roomCode,
  onRoomCodeChange,
  onConnect,
  isLoading,
  getRecentRoomCodes,
}) => {
  // Conditional rendering: muda placeholder e botão baseado no input
  const hasCode = roomCode.trim().length > 0;
  const placeholderText = "Enter code to join or leave empty to create";
  const buttonText = hasCode ? "🔍" : "🆕";
  const buttonTitle = hasCode
    ? `Look for room: ${roomCode}`
    : "Create new private room";

  // Get recent room codes
  const recentCodes = getRecentRoomCodes?.() || [];

  return (
    <div className="p-2 bg-blue-500/10 rounded border border-blue-400/20">
      {/* Recent room codes */}
      {recentCodes.length > 0 && (
        <div className="mb-2">
          <p className="text-[8px] text-gray-500 mb-1">Recent rooms:</p>
          <div className="flex gap-1">
            {recentCodes.map((code, index) => (
              <button
                key={`${code}-${index}`}
                onClick={() => onRoomCodeChange(code)}
                className="px-2 py-0.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded text-[8px] font-medium transition-colors border border-blue-400/30"
                title={`Use room code: ${code}`}
              >
                {code}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-1 items-stretch">
        <input
          type="text"
          value={roomCode}
          onChange={(e) => onRoomCodeChange(e.target.value)}
          placeholder={placeholderText}
          className="flex-1 min-w-0 px-2 py-1 bg-black/50 border border-blue-400/30 rounded text-white placeholder-gray-500 text-[10px] focus:outline-none focus:border-blue-400 uppercase"
          maxLength={9}
        />
        <button
          onClick={onConnect}
          disabled={isLoading}
          title={buttonTitle}
          className="flex-shrink-0 w-8 h-8 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded text-[10px] font-medium transition-colors border border-blue-400/30 disabled:opacity-50 flex items-center justify-center"
        >
          {isLoading ? "⏳" : buttonText}
        </button>
      </div>

      {/* Conditional rendering: helper text */}
      <p className="text-[8px] text-gray-500 mt-1 px-1">
        {hasCode
          ? `Will look for room "${roomCode}", create if not found`
          : "Will create new room with random code"}
      </p>
    </div>
  );
};
