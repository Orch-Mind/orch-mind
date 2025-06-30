// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React, { useEffect, useState } from "react";
import { p2pShareService } from "../../../../../services/p2p/P2PShareService";
import { loadFromStorage } from "./training/utils";

interface SharedAdapter {
  name: string;
  topic: string;
  size: string;
  shared: boolean;
  peers: number;
}

interface IncomingAdapter {
  name: string;
  topic: string;
  size: string;
  from: string;
}

interface P2PRoom {
  type: "general" | "local" | "private";
  code?: string;
  peersCount: number;
  isActive: boolean;
}

// Smart Connect Component
const SmartConnectComponent: React.FC<{
  onConnect: (
    type: "general" | "local" | "private",
    privateCode?: string
  ) => void;
  isLoading: boolean;
  roomCode: string;
  onRoomCodeChange: (code: string) => void;
}> = ({ onConnect, isLoading, roomCode, onRoomCodeChange }) => {
  const [selectedMode, setSelectedMode] = useState<"auto" | "manual">("auto");

  const handleAutoConnect = () => {
    // Smart auto-detection: try local first, fallback to general
    onConnect("local");
  };

  const handlePrivateConnect = () => {
    onConnect("private", roomCode);
  };

  return (
    <div className="space-y-3">
      {/* Mode Toggle */}
      <div className="flex bg-black/30 rounded-lg p-1">
        <button
          onClick={() => setSelectedMode("auto")}
          className={`flex-1 px-3 py-1.5 text-[10px] font-medium rounded transition-colors ${
            selectedMode === "auto"
              ? "bg-cyan-500/20 text-cyan-400 border border-cyan-400/30"
              : "text-gray-400 hover:text-cyan-400"
          }`}
        >
          🎯 Smart
        </button>
        <button
          onClick={() => setSelectedMode("manual")}
          className={`flex-1 px-3 py-1.5 text-[10px] font-medium rounded transition-colors ${
            selectedMode === "manual"
              ? "bg-cyan-500/20 text-cyan-400 border border-cyan-400/30"
              : "text-gray-400 hover:text-cyan-400"
          }`}
        >
          ⚙️ Manual
        </button>
      </div>

      {selectedMode === "auto" ? (
        /* Auto Mode */
        <div className="p-3 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded border border-cyan-400/30">
          <h4 className="text-cyan-400 font-medium text-xs mb-2">
            🎯 Smart Connect
          </h4>
          <p className="text-[10px] text-gray-400 mb-3">
            Finds best connection: Local → Community → Create Room
          </p>
          <button
            onClick={handleAutoConnect}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-400 rounded text-[11px] font-medium transition-all border border-cyan-400/30 disabled:opacity-50"
          >
            {isLoading ? "🔄 Connecting..." : "🚀 Smart Connect"}
          </button>
        </div>
      ) : (
        /* Manual Mode */
        <div className="space-y-2">
          {/* Quick Options */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onConnect("general")}
              disabled={isLoading}
              className="px-3 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded text-[10px] font-medium transition-colors border border-purple-400/20 disabled:opacity-50"
            >
              🌍 Community
            </button>
            <button
              onClick={() => onConnect("local")}
              disabled={isLoading}
              className="px-3 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded text-[10px] font-medium transition-colors border border-green-400/20 disabled:opacity-50"
            >
              📡 Local
            </button>
          </div>

          {/* Private Room */}
          <div className="p-2 bg-blue-500/10 rounded border border-blue-400/20">
            <div className="flex gap-1">
              <input
                type="text"
                value={roomCode}
                onChange={(e) => onRoomCodeChange(e.target.value)}
                placeholder="PIZZA-123 or create new"
                className="flex-1 px-2 py-1 bg-black/50 border border-blue-400/30 rounded text-white placeholder-gray-500 text-[10px] focus:outline-none focus:border-blue-400 uppercase"
                maxLength={9}
              />
              <button
                onClick={handlePrivateConnect}
                disabled={isLoading}
                className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded text-[10px] font-medium transition-colors border border-blue-400/30 disabled:opacity-50"
              >
                🔒
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Connected Status Component
const ConnectedStatusComponent: React.FC<{
  currentRoom: P2PRoom | null;
  onDisconnect: () => void;
  isLoading: boolean;
}> = ({ currentRoom, onDisconnect, isLoading }) => {
  const getRoomIcon = () => {
    switch (currentRoom?.type) {
      case "general":
        return "🌍";
      case "local":
        return "📡";
      case "private":
        return "🔒";
      default:
        return "❓";
    }
  };

  const getRoomName = () => {
    switch (currentRoom?.type) {
      case "general":
        return "Community Room";
      case "local":
        return "Local Network";
      case "private":
        return `Room ${currentRoom.code}`;
      default:
        return "Unknown";
    }
  };

  return (
    <div className="space-y-3">
      {/* Connection Status */}
      <div className="p-3 bg-green-500/10 rounded border border-green-400/30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getRoomIcon()}</span>
            <div>
              <h4 className="text-green-400 font-medium text-xs">Connected</h4>
              <p className="text-[10px] text-gray-400">{getRoomName()}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-green-400 text-[10px]">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              {currentRoom?.peersCount || 0} peers
            </div>
          </div>
        </div>

        {currentRoom?.code && (
          <div className="mb-2 p-2 bg-black/20 rounded">
            <span className="text-[9px] text-gray-500">Share Code:</span>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-cyan-400 font-mono text-xs bg-black/30 px-2 py-1 rounded">
                {currentRoom.code}
              </code>
              <button
                onClick={() =>
                  navigator.clipboard.writeText(currentRoom.code || "")
                }
                className="text-[8px] text-gray-400 hover:text-cyan-400 transition-colors"
              >
                📋
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Disconnect Button */}
      <button
        onClick={onDisconnect}
        disabled={isLoading}
        className="w-full px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-[10px] font-medium transition-colors border border-red-400/30 disabled:opacity-50"
      >
        {isLoading ? "🔄 Disconnecting..." : "🚫 Disconnect"}
      </button>
    </div>
  );
};

const ShareSettings: React.FC = () => {
  const [sharedAdapters, setSharedAdapters] = useState<SharedAdapter[]>([]);
  const [incomingAdapters, setIncomingAdapters] = useState<IncomingAdapter[]>(
    []
  );
  const [currentRoom, setCurrentRoom] = useState<P2PRoom | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Carrega os modelos LoRA treinados localmente
  useEffect(() => {
    loadLocalAdapters();

    // Initialize P2P service
    p2pShareService.initialize().catch(console.error);

    // Setup event listeners
    const handleRoomJoined = (data: any) => {
      console.log("Joined room:", data);
      if (data.type === "general") {
        setCurrentRoom({ type: "general", peersCount: 0, isActive: true });
      } else if (data.type === "local") {
        setCurrentRoom({ type: "local", peersCount: 0, isActive: true });
      } else {
        setCurrentRoom({
          type: "private",
          code: data.code,
          peersCount: 0,
          isActive: true,
        });
      }
      setIsSharing(true);
    };

    const handlePeersUpdated = (count: number) => {
      setCurrentRoom((prev) => (prev ? { ...prev, peersCount: count } : null));
    };

    const handleAdaptersAvailable = (data: {
      from: string;
      adapters: any[];
    }) => {
      const newAdapters: IncomingAdapter[] = data.adapters.map((adapter) => ({
        name: adapter.name,
        topic: adapter.topic,
        size: formatFileSize(adapter.size),
        from: data.from,
      }));

      setIncomingAdapters((prev) => {
        // Remove duplicates and add new ones
        const filtered = prev.filter(
          (existing) =>
            !newAdapters.some(
              (newAdapter) =>
                newAdapter.topic === existing.topic &&
                newAdapter.from === existing.from
            )
        );
        return [...filtered, ...newAdapters];
      });
    };

    p2pShareService.on("room-joined", handleRoomJoined);
    p2pShareService.on("peers-updated", handlePeersUpdated);
    p2pShareService.on("adapters-available", handleAdaptersAvailable);

    return () => {
      // Cleanup event listeners - P2PShareService extends EventEmitter
      p2pShareService.removeListener("room-joined", handleRoomJoined);
      p2pShareService.removeListener("peers-updated", handlePeersUpdated);
      p2pShareService.removeListener(
        "adapters-available",
        handleAdaptersAvailable
      );
      p2pShareService.leaveRoom().catch(console.error);
    };
  }, []);

  const loadLocalAdapters = () => {
    const trainingHistory = loadFromStorage("orch-training-history", {
      trainedModels: [] as string[],
    });

    const adapters: SharedAdapter[] = trainingHistory.trainedModels.map(
      (modelName: string) => ({
        name: modelName,
        topic: "", // Será gerado quando compartilhar
        size: "Unknown", // TODO: Get actual file size from Ollama
        shared: false,
        peers: 0,
      })
    );
    setSharedAdapters(adapters);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024)
      return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
  };

  const stopSharing = async () => {
    setIsLoading(true);
    try {
      await p2pShareService.leaveRoom();
      setCurrentRoom(null);
      setIsSharing(false);
      setIncomingAdapters([]);
    } catch (error) {
      console.error("Error stopping sharing:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAdapterSharing = async (index: number) => {
    const updatedAdapters = [...sharedAdapters];
    updatedAdapters[index].shared = !updatedAdapters[index].shared;

    if (updatedAdapters[index].shared && !updatedAdapters[index].topic) {
      updatedAdapters[index].topic = generateAdapterTopic();

      try {
        await p2pShareService.shareAdapter(updatedAdapters[index].name, {
          name: updatedAdapters[index].name,
          size: 0,
          checksum: "pending",
          topic: updatedAdapters[index].topic,
        });
      } catch (error) {
        console.error("Error sharing adapter:", error);
        updatedAdapters[index].shared = false;
        showError("Failed to share adapter");
      }
    } else if (!updatedAdapters[index].shared && updatedAdapters[index].topic) {
      await p2pShareService.unshareAdapter(updatedAdapters[index].topic);
    }

    setSharedAdapters(updatedAdapters);
  };

  const downloadAdapter = async (adapter: IncomingAdapter) => {
    console.log("Downloading adapter:", adapter.name);
    try {
      await p2pShareService.requestAdapter(adapter.topic, adapter.from);
      showSuccess(`Started downloading ${adapter.name}`);
    } catch (error) {
      console.error("Error downloading adapter:", error);
      showError("Failed to download adapter");
    }
  };

  // Helper functions
  const generateLocalNetworkTopic = async (): Promise<string> => {
    // Simula geração de topic baseado na rede local
    const networkId = "local-network"; // TODO: Get real network ID
    const crypto = window.crypto;
    const data = new TextEncoder().encode(`orch-os-local-${networkId}`);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const generateFriendlyCode = (): string => {
    const words = [
      "MUSIC",
      "PIZZA",
      "COFFEE",
      "BOOKS",
      "GAMES",
      "ART",
      "SPACE",
      "OCEAN",
    ];
    const word = words[Math.floor(Math.random() * words.length)];
    const number = Math.floor(Math.random() * 999)
      .toString()
      .padStart(3, "0");
    return `${word}-${number}`;
  };

  const codeToTopic = async (code: string): Promise<string> => {
    const crypto = window.crypto;
    const data = new TextEncoder().encode(`orch-os-room-${code}`);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const generateAdapterTopic = (): string => {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  };

  const showError = (message: string) => {
    // TODO: Replace with proper toast notification
    alert(`❌ ${message}`);
  };

  const showSuccess = (message: string) => {
    // TODO: Replace with proper toast notification
    alert(`✅ ${message}`);
  };

  const handleSmartConnect = async (
    type: "general" | "local" | "private",
    privateCode?: string
  ) => {
    setIsLoading(true);
    try {
      if (type === "general") {
        await p2pShareService.joinGeneralRoom();
        setCurrentRoom({ type: "general", peersCount: 0, isActive: true });
      } else if (type === "local") {
        // Try local first, fallback to general if no local peers found
        try {
          const localTopic = await generateLocalNetworkTopic();
          await p2pShareService.joinRoom(localTopic);
          setCurrentRoom({ type: "local", peersCount: 0, isActive: true });

          // Wait a bit to see if peers are found, otherwise fallback
          setTimeout(async () => {
            if (currentRoom?.peersCount === 0) {
              await p2pShareService.joinGeneralRoom();
              setCurrentRoom({
                type: "general",
                peersCount: 0,
                isActive: true,
              });
            }
          }, 3000);
        } catch (error) {
          // Fallback to general room
          await p2pShareService.joinGeneralRoom();
          setCurrentRoom({ type: "general", peersCount: 0, isActive: true });
        }
      } else {
        // Private room - either join existing or create new
        const codeToUse = privateCode || roomCode.trim();
        if (codeToUse) {
          const topic = await codeToTopic(codeToUse);
          await p2pShareService.joinRoom(topic);
          setCurrentRoom({
            type: "private",
            code: codeToUse,
            peersCount: 0,
            isActive: true,
          });
        } else {
          // Create new private room
          const friendlyCode = generateFriendlyCode();
          const topic = await codeToTopic(friendlyCode);
          await p2pShareService.joinRoom(topic);
          setCurrentRoom({
            type: "private",
            code: friendlyCode,
            peersCount: 0,
            isActive: true,
          });
          setRoomCode(friendlyCode);
        }
      }
      setIsSharing(true);
    } catch (error) {
      console.error("Error connecting:", error);
      showError("Failed to connect");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3 max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center pb-2 border-b border-cyan-400/20">
        <h2 className="text-lg font-bold text-cyan-400 mb-0.5">
          🌐 P2P Sharing Center
        </h2>
      </div>

      {/* Connection Status & Stats */}
      <div className="grid grid-cols-2 gap-3">
        {/* Connection Status */}
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
                <svg
                  className="w-2 h-2 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                {isSharing
                  ? `${currentRoom?.peersCount || 0} peers`
                  : "Offline"}
              </div>
            </div>
          </div>
        </div>

        {/* Sharing Stats */}
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
                <p className="text-slate-400 text-[9px]">
                  Adapters & Downloads
                </p>
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
      </div>

      {/* Main Sharing Section */}
      <div className="grid grid-cols-12 gap-3">
        {/* Connection Controls */}
        <div className="col-span-5">
          <div className="bg-black/20 backdrop-blur-sm rounded-md p-3 border border-cyan-400/20">
            <h3 className="text-sm font-semibold text-cyan-400 mb-3">
              🌐 Smart Connect
            </h3>

            {!isSharing ? (
              <SmartConnectComponent
                onConnect={handleSmartConnect}
                isLoading={isLoading}
                roomCode={roomCode}
                onRoomCodeChange={setRoomCode}
              />
            ) : (
              <ConnectedStatusComponent
                currentRoom={currentRoom}
                onDisconnect={stopSharing}
                isLoading={isLoading}
              />
            )}
          </div>
        </div>

        {/* Your Adapters */}
        <div className="col-span-4">
          <div className="bg-black/20 backdrop-blur-sm rounded-md p-3 border border-cyan-400/20">
            <h3 className="text-sm font-semibold text-cyan-400 mb-3">
              📦 Your Adapters
            </h3>

            {sharedAdapters.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-400 text-[10px] mb-1">
                  No trained adapters found
                </p>
                <p className="text-gray-500 text-[9px]">Train a model first!</p>
              </div>
            ) : (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {sharedAdapters.map((adapter, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-black/20 rounded border border-slate-400/10"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium text-white truncate">
                        {adapter.name}
                      </p>
                      <p className="text-[9px] text-gray-400">
                        {adapter.size} •{" "}
                        {adapter.shared
                          ? currentRoom?.type === "general"
                            ? "Public in General"
                            : currentRoom?.type === "local"
                            ? "Shared Locally"
                            : `Shared in ${currentRoom?.code}`
                          : "Private"}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleAdapterSharing(idx)}
                      disabled={!isSharing}
                      className={`ml-2 px-2 py-0.5 rounded text-[9px] font-medium transition-colors border ${
                        adapter.shared
                          ? currentRoom?.type === "general"
                            ? "bg-purple-500/20 text-purple-400 border-purple-400/30 hover:bg-purple-500/30"
                            : currentRoom?.type === "local"
                            ? "bg-green-500/20 text-green-400 border-green-400/30 hover:bg-green-500/30"
                            : "bg-blue-500/20 text-blue-400 border-blue-400/30 hover:bg-blue-500/30"
                          : "bg-gray-500/20 text-gray-400 border-gray-400/30 hover:bg-gray-500/30"
                      } disabled:opacity-50`}
                    >
                      {adapter.shared ? "👁️ Public" : "🔒 Private"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Available Downloads */}
        <div className="col-span-3">
          <div className="bg-black/20 backdrop-blur-sm rounded-md p-3 border border-cyan-400/20">
            <h3 className="text-sm font-semibold text-cyan-400 mb-3">
              🎁 Available
            </h3>

            {!isSharing ? (
              <div className="text-center py-4">
                <p className="text-gray-400 text-[10px] mb-1">
                  Connect to see adapters
                </p>
                <p className="text-gray-500 text-[9px]">Start sharing first</p>
              </div>
            ) : incomingAdapters.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-400 text-[10px] mb-1">
                  No adapters yet
                </p>
                <p className="text-gray-500 text-[9px]">
                  {currentRoom?.type === "local"
                    ? "Check local network"
                    : "Share room code"}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                {incomingAdapters.map((adapter, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-black/50 rounded border border-cyan-400/10"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-medium text-xs truncate">
                        {adapter.name}
                      </h4>
                      <p className="text-[9px] text-gray-400">
                        {adapter.from} • {adapter.size}
                      </p>
                    </div>

                    <button
                      onClick={() => downloadAdapter(adapter)}
                      className="px-2 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded transition-colors border border-green-400/30 text-[9px] font-medium"
                    >
                      📥
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info Footer */}
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

      {/* Custom Scrollbar */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.1);
            border-radius: 2px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(34, 197, 94, 0.3);
            border-radius: 2px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(34, 197, 94, 0.5);
          }
        `,
        }}
      />
    </div>
  );
};

export default ShareSettings;
