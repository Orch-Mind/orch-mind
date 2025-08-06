// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { ConnectionStatusProps } from "../types";
import { ClipboardUtils, ShareUtils } from "../utils";

// SRP: Componente responsável APENAS por mostrar status de conexão
// KISS: Interface simples e clara
export const ConnectedStatusComponent: React.FC<ConnectionStatusProps> = ({
  currentRoom,
  onDisconnect,
  isLoading,
  incomingAdapters = [],
}) => {
  if (!currentRoom) return null;

  return (
    <div className="space-y-3">
      <ConnectionStatus currentRoom={currentRoom} incomingAdapters={incomingAdapters} />
      <DisconnectButton onDisconnect={onDisconnect} isLoading={isLoading} />
    </div>
  );
};

// SRP: Componente focado apenas em mostrar status da conexão
const ConnectionStatus: React.FC<{
  currentRoom: NonNullable<ConnectionStatusProps["currentRoom"]>;
  incomingAdapters: ConnectionStatusProps["incomingAdapters"];
}> = ({ currentRoom, incomingAdapters }) => {
  // Determine background color based on room type for better visual feedback
  const getBackgroundClass = () => {
    switch (currentRoom.type) {
      case "general":
        return "bg-purple-500/10 border-purple-400/30";
      case "local":
        return "bg-green-500/10 border-green-400/30";
      case "private":
        return "bg-blue-500/10 border-blue-400/30";
      default:
        return "bg-green-500/10 border-green-400/30";
    }
  };

  return (
    <div className={`p-3 rounded ${getBackgroundClass()}`}>
      <ConnectionHeader currentRoom={currentRoom} incomingAdapters={incomingAdapters} />
      {currentRoom.code && currentRoom.type === "private" && (
        <ShareCodeSection code={currentRoom.code} />
      )}
    </div>
  );
};

// SRP: Header com ícone e nome da room
const ConnectionHeader: React.FC<{
  currentRoom: NonNullable<ConnectionStatusProps["currentRoom"]>;
  incomingAdapters: ConnectionStatusProps["incomingAdapters"];
}> = ({ currentRoom, incomingAdapters }) => {
  const { t } = useTranslation();
  
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <span className="text-lg">
          {ShareUtils.getRoomIcon(currentRoom.type)}
        </span>
        <div>
          <h4 className="text-green-400 font-medium text-xs">{t('share.connected')}</h4>
          <p className="text-[10px] text-gray-400">
            {ShareUtils.getRoomName(currentRoom.type, currentRoom.code)}
          </p>
        </div>
      </div>
      <PeerCount 
        count={currentRoom.peersCount} 
        incomingAdaptersCount={incomingAdapters?.length || 0} 
      />
    </div>
  );
};

// SRP: Componente focado apenas em mostrar peer count
// Uses same inclusive logic as getPeerStatus for consistency
const PeerCount: React.FC<{ count: number; incomingAdaptersCount?: number }> = ({ 
  count, 
  incomingAdaptersCount = 0 
}) => {
  const { t } = useTranslation();
  // Calculate total peers including special peers (like Docker) that provide incoming adapters
  const totalPeers = count + (count === 0 && incomingAdaptersCount > 0 ? 1 : 0);
  
  // Use correct singular/plural form
  const peerText = totalPeers === 1 
    ? `${totalPeers} ${t('share.peer')}` 
    : `${totalPeers} ${t('share.peers')}`;
  
  return (
    <div className="text-right">
      <div className="flex items-center gap-1 text-green-400 text-[10px]">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        {peerText}
      </div>
    </div>
  );
};

// SRP: Seção focada apenas em mostrar e copiar código de share
const ShareCodeSection: React.FC<{ code: string }> = ({ code }) => {
  const { t } = useTranslation();
  const [isCopying, setIsCopying] = useState(false);

  const handleCopyCode = async () => {
    if (isCopying) return; // Prevent multiple clicks

    // Use robust clipboard utility with visual feedback callbacks
    await ClipboardUtils.copyWithFeedback(
      code,
      t('share.roomCodeCopied', { code }),
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
      <span className="text-[9px] text-gray-500">{t('share.shareCode')}</span>
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
          title={isCopying ? t('share.copying') : t('share.copyRoomCodeTooltip')}
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
}> = ({ onDisconnect, isLoading }) => {
  const { t } = useTranslation();
  
  return (
    <button
      onClick={onDisconnect}
      disabled={isLoading}
      className="w-full px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-[10px] font-medium transition-colors border border-red-400/30 disabled:opacity-50"
    >
      {isLoading ? `🔄 ${t('share.disconnecting')}` : t('share.disconnect')}
    </button>
  );
};
