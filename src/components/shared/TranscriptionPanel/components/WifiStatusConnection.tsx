// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React, { useEffect, useRef, useState } from "react";
import { ConnectionState, MicrophoneState } from "../../../context";
import { useP2PContext } from "../context/P2PContext";
import styles from "./WifiStatusConnection.module.css";

interface WifiStatusConnectionProps {
  connectionState?: ConnectionState;
  microphoneState?: MicrophoneState;
  onStatusClick?: () => void;
  showDetailedText?: boolean;
  className?: string;
  onDisconnect?: () => void;
  onReconnect?: () => void;
}

/**
 * Neural signal visualization component for P2P connection state
 * Symbolic intent: Interface neuron for P2P connectivity visualization
 */
const WifiStatusConnection: React.FC<WifiStatusConnectionProps> = ({
  showDetailedText = false,
  className = "",
  onStatusClick,
}) => {
  // Use global P2P context instead of local hook
  const { status: p2pStatus } = useP2PContext();

  // Estado para controlar a visibilidade do popup de status P2P
  const [showStatusPopup, setShowStatusPopup] = useState(false);
  const statusPopupRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);

  // Gerencia cliques fora do popup para fechá-lo
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showStatusPopup &&
        statusPopupRef.current &&
        !statusPopupRef.current.contains(event.target as Node) &&
        iconRef.current &&
        !iconRef.current.contains(event.target as Node)
      ) {
        setShowStatusPopup(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showStatusPopup]);

  // Alterna a visibilidade do popup de status
  const toggleStatusPopup = () => {
    setShowStatusPopup((prev) => !prev);
  };

  // Convert P2P status to user-friendly message
  const getConnectionStatusText = () => {
    if (p2pStatus.isLoading) {
      return "Connecting to P2P...";
    } else if (p2pStatus.isConnected && p2pStatus.currentRoom) {
      const roomName =
        p2pStatus.currentRoom.type === "general"
          ? "Community"
          : p2pStatus.currentRoom.type === "local"
          ? "Local Network"
          : `Room ${p2pStatus.currentRoom.code}`;
      return `Connected to ${roomName}`;
    } else {
      return "P2P Disconnected";
    }
  };

  // Determine colors based on P2P connection state
  const getConnectionColors = () => {
    if (p2pStatus.isConnected && !p2pStatus.isLoading) {
      // Connected - green cyan with peer-based intensity
      const intensity = p2pStatus.currentRoom?.peersCount || 0 > 0 ? 1 : 0.7;
      return {
        primary: "#00faff",
        secondary: `rgba(0, 250, 255, ${intensity * 0.8})`,
        glow: `rgba(0, 250, 255, ${intensity * 0.5})`,
        textColor: "text-green-400",
      };
    } else if (p2pStatus.isLoading) {
      // Connecting - yellow
      return {
        primary: "#ffe066",
        secondary: "rgba(255, 224, 102, 0.8)",
        glow: "rgba(255, 224, 102, 0.5)",
        textColor: "text-yellow-400",
      };
    } else {
      // Disconnected - gray
      return {
        primary: "#888888",
        secondary: "rgba(136, 136, 136, 0.8)",
        glow: "rgba(136, 136, 136, 0.5)",
        textColor: "text-gray-400",
      };
    }
  };

  // Get color variables for the component
  const colors = getConnectionColors();
  const statusText = getConnectionStatusText();

  // Generate dynamic classNames based on P2P connection state
  const getConnectionStateClass = () => {
    if (p2pStatus.isConnected && !p2pStatus.isLoading) {
      return "wifi-status-fully-connected";
    } else if (p2pStatus.isLoading) {
      return "wifi-status-connecting";
    } else {
      return "wifi-status-disconnected";
    }
  };

  // Add dynamic classes based on connection state
  const connectionStateClass = getConnectionStateClass();

  // Determine CSS classes for status text
  const getStatusTextClass = () => {
    if (p2pStatus.isConnected && !p2pStatus.isLoading) {
      return styles.statusConnected;
    } else if (p2pStatus.isLoading) {
      return styles.statusConnecting;
    } else {
      return styles.statusDisconnected;
    }
  };

  return (
    <div
      className={`${styles.wifiStatusConnection} ${connectionStateClass} ${className}`}
      title={statusText}
      ref={iconRef}
      onClick={toggleStatusPopup}
    >
      {/* P2P Status popup flutuante */}
      {showStatusPopup && (
        <div
          className={`${styles.statusPopupContainer} cursor-pointer`}
          ref={statusPopupRef}
          onClick={(e) => {
            e.stopPropagation();
            setShowStatusPopup(false);
            if (onStatusClick) {
              onStatusClick();
            }
          }}
        >
          <div
            className={`${styles.statusPopup} hover:bg-black/20 transition-colors`}
          >
            <div className="p-3 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-cyan-400/20">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: p2pStatus.isConnected
                      ? "#00faff"
                      : "#888888",
                    boxShadow: p2pStatus.isConnected
                      ? "0 0 8px rgba(0, 250, 255, 0.6)"
                      : "none",
                  }}
                ></div>
                <h3 className="text-sm font-semibold text-cyan-400">
                  P2P Status
                </h3>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span
                    className={`font-mono ${
                      p2pStatus.isConnected
                        ? "text-green-400"
                        : p2pStatus.isLoading
                        ? "text-yellow-400"
                        : "text-gray-400"
                    }`}
                  >
                    {p2pStatus.isLoading
                      ? "Connecting..."
                      : p2pStatus.isConnected
                      ? "Connected"
                      : "Disconnected"}
                  </span>
                </div>

                {p2pStatus.isConnected && p2pStatus.currentRoom && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Room:</span>
                      <span className="text-cyan-400 font-mono">
                        {p2pStatus.currentRoom.type === "general"
                          ? "Community"
                          : p2pStatus.currentRoom.type === "local"
                          ? "Local Network"
                          : p2pStatus.currentRoom.code || "Private"}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-400">Peers:</span>
                      <span className="text-cyan-400 font-mono">
                        {p2pStatus.currentRoom.peersCount}
                      </span>
                    </div>
                  </>
                )}

                {p2pStatus.lastError && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Error:</span>
                    <span className="text-red-400 font-mono text-[10px]">
                      {p2pStatus.lastError}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-cyan-400/20">
                <p className="text-[10px] text-gray-500">
                  Click anywhere on this popup to open P2P settings
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={styles.wifiIconContainer}>
        {/* WiFi icon with neural aesthetic for P2P status */}
        <svg
          width="26"
          height="26"
          viewBox="0 0 26 26"
          fill="none"
          className={styles.neuralSignalIcon}
        >
          {/* Outer ring with neural aesthetic */}
          <circle
            cx="13"
            cy="13"
            r="11"
            className={`${styles.neuralRing} ${
              p2pStatus.isConnected && !p2pStatus.isLoading
                ? styles.neuralRingActive
                : ""
            }`}
            stroke="currentColor"
            strokeWidth="1.5"
            strokeOpacity={
              p2pStatus.isConnected ? "1" : p2pStatus.isLoading ? "0.8" : "0.6"
            }
            fill="transparent"
          />

          {/* WiFi signal wave - upper arc */}
          <path
            d="M6.5 13 A9 9 0 0 1 19.5 13"
            className={styles.neuralWave}
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeOpacity={p2pStatus.isConnected ? "1" : "0.25"}
          />

          {/* WiFi signal wave - lower arc */}
          <path
            d="M9 16.5 A6 6 0 0 1 17 16.5"
            className={styles.neuralWave}
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeOpacity={p2pStatus.isConnected ? "1" : "0.25"}
          />

          {/* Central signal point */}
          <circle
            cx="13"
            cy="19.5"
            r="1.8"
            className={`${styles.neuralCore} ${
              p2pStatus.isConnected && !p2pStatus.isLoading
                ? styles.neuralCoreActive
                : ""
            }`}
            fill="currentColor"
            fillOpacity={p2pStatus.isConnected ? "1" : "0.25"}
          />
        </svg>
      </div>

      {showDetailedText && (
        <span className={`${styles.statusText} ${getStatusTextClass()}`}>
          {statusText}
        </span>
      )}
    </div>
  );
};

export default WifiStatusConnection;
