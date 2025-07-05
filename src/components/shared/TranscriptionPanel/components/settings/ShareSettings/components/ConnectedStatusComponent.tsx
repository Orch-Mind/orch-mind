// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React, { useState } from "react";
import { ConnectionStatusProps } from "../types";
import { ClipboardUtils, ShareUtils } from "../utils";

// SRP: Componente responsável APENAS por mostrar status de conexão
// KISS: Interface simples e clara
export const ConnectedStatusComponent: React.FC<ConnectionStatusProps> = ({
  currentRoom,
  onDisconnect,
  isLoading,
}) => {
  if (!currentRoom) return null;

  return (
    <div className="space-y-3">
      <ConnectionStatus currentRoom={currentRoom} />
      <DisconnectButton onDisconnect={onDisconnect} isLoading={isLoading} />
    </div>
  );
};

// SRP: Componente focado apenas em mostrar status da conexão
const ConnectionStatus: React.FC<{
  currentRoom: NonNullable<ConnectionStatusProps["currentRoom"]>;
}> = ({ currentRoom }) => (
  <div className="p-3 bg-green-500/10 rounded border border-green-400/30">
    <ConnectionHeader currentRoom={currentRoom} />
    {currentRoom.code && currentRoom.type === "private" && (
      <ShareCodeSection code={currentRoom.code} />
    )}
  </div>
);

// SRP: Header com ícone e nome da room
const ConnectionHeader: React.FC<{
  currentRoom: NonNullable<ConnectionStatusProps["currentRoom"]>;
}> = ({ currentRoom }) => (
  <div className="flex items-center justify-between mb-2">
    <div className="flex items-center gap-2">
      <span className="text-lg">
        {ShareUtils.getRoomIcon(currentRoom.type)}
      </span>
      <div>
        <h4 className="text-green-400 font-medium text-xs">Connected</h4>
        <p className="text-[10px] text-gray-400">
          {ShareUtils.getRoomName(currentRoom.type, currentRoom.code)}
        </p>
      </div>
    </div>
    <PeerCount count={currentRoom.peersCount} />
  </div>
);

// SRP: Componente focado apenas em mostrar peer count
const PeerCount: React.FC<{ count: number }> = ({ count }) => (
  <div className="text-right">
    <div className="flex items-center gap-1 text-green-400 text-[10px]">
      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
      {count || 0} peers
    </div>
  </div>
);

// SRP: Seção focada apenas em mostrar e copiar código de share
const ShareCodeSection: React.FC<{ code: string }> = ({ code }) => {
  const [isCopying, setIsCopying] = useState(false);

  const handleCopyCode = async () => {
    if (isCopying) return; // Prevent multiple clicks

    // Use robust clipboard utility with visual feedback callbacks
    await ClipboardUtils.copyWithFeedback(
      code,
      `Room code ${code} copied! Share with others.`,
      () => setIsCopying(true), // onStart: show loading state
      (success) => {
        setIsCopying(false); // onComplete: hide loading state
        if (!success) {
          console.warn(
            "Copy failed, but user was notified with fallback options"
          );
        }
      }
    );
  };

  return (
    <div className="mb-2 p-2 bg-black/20 rounded">
      <span className="text-[9px] text-gray-500">Share Code:</span>
      <div className="flex items-center gap-2 mt-1">
        <code className="text-cyan-400 font-mono text-xs bg-black/30 px-2 py-1 rounded">
          {code}
        </code>
        <button
          onClick={handleCopyCode}
          disabled={isCopying}
          className={`text-[8px] transition-colors ${
            isCopying
              ? "text-yellow-400 cursor-wait"
              : "text-gray-400 hover:text-cyan-400 cursor-pointer"
          }`}
          title={isCopying ? "Copying..." : "Copy room code to clipboard"}
        >
          {isCopying ? "⏳" : "📋"}
        </button>
      </div>
    </div>
  );
};

// SRP: Botão focado apenas em desconectar
const DisconnectButton: React.FC<{
  onDisconnect: () => void;
  isLoading: boolean;
}> = ({ onDisconnect, isLoading }) => (
  <button
    onClick={onDisconnect}
    disabled={isLoading}
    className="w-full px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-[10px] font-medium transition-colors border border-red-400/30 disabled:opacity-50"
  >
    {isLoading ? "🔄 Disconnecting..." : "🚫 Disconnect"}
  </button>
);
