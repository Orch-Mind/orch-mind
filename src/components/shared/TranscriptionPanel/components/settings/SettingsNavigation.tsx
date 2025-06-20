// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { LockClosedIcon } from "@heroicons/react/24/outline";
import React from "react";
import { SettingsNavigationProps } from "./types";

interface ExtendedSettingsNavigationProps extends SettingsNavigationProps {
  dependenciesReady?: boolean;
}

/**
 * Componente para a navegação entre as abas do modal de configurações
 * Simbolicamente representa o cortex de navegação entre contextos neurais de configuração
 */
const SettingsNavigation: React.FC<ExtendedSettingsNavigationProps> = ({
  activeTab,
  setActiveTab,
  dependenciesReady = true,
}) => {
  const handleAdvancedClick = () => {
    if (dependenciesReady) {
      setActiveTab("advanced");
    } else {
      // Navigate to requirements tab if dependencies are not ready
      setActiveTab("requirements");
    }
  };

  return (
    <div className="flex space-x-2 mb-6 border-b border-cyan-400/30 pb-2">
      <button
        className="px-4 py-2 rounded-t-lg transition-all duration-200"
        style={{
          backgroundColor:
            activeTab === "general"
              ? "rgba(0, 250, 255, 0.15)"
              : "rgba(0, 0, 0, 0.2)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: `1px solid ${
            activeTab === "general"
              ? "rgba(0, 250, 255, 0.4)"
              : "rgba(0, 250, 255, 0.1)"
          }`,
          color: activeTab === "general" ? "#00faff" : "rgba(0, 250, 255, 0.6)",
          boxShadow:
            activeTab === "general" ? "0 0 15px rgba(0, 250, 255, 0.2)" : "",
        }}
        onMouseEnter={(e) => {
          if (activeTab !== "general") {
            e.currentTarget.style.backgroundColor = "rgba(0, 250, 255, 0.1)";
            e.currentTarget.style.borderColor = "rgba(0, 250, 255, 0.3)";
            e.currentTarget.style.color = "rgba(0, 250, 255, 0.9)";
          }
        }}
        onMouseLeave={(e) => {
          if (activeTab !== "general") {
            e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.2)";
            e.currentTarget.style.borderColor = "rgba(0, 250, 255, 0.1)";
            e.currentTarget.style.color = "rgba(0, 250, 255, 0.6)";
          }
        }}
        onClick={() => setActiveTab("general")}
      >
        General
      </button>

      <button
        className="px-4 py-2 rounded-t-lg transition-all duration-200"
        style={{
          backgroundColor:
            activeTab === "audio"
              ? "rgba(0, 250, 255, 0.15)"
              : "rgba(0, 0, 0, 0.2)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: `1px solid ${
            activeTab === "audio"
              ? "rgba(0, 250, 255, 0.4)"
              : "rgba(0, 250, 255, 0.1)"
          }`,
          color: activeTab === "audio" ? "#00faff" : "rgba(0, 250, 255, 0.6)",
          boxShadow:
            activeTab === "audio" ? "0 0 15px rgba(0, 250, 255, 0.2)" : "",
        }}
        onMouseEnter={(e) => {
          if (activeTab !== "audio") {
            e.currentTarget.style.backgroundColor = "rgba(0, 250, 255, 0.1)";
            e.currentTarget.style.borderColor = "rgba(0, 250, 255, 0.3)";
            e.currentTarget.style.color = "rgba(0, 250, 255, 0.9)";
          }
        }}
        onMouseLeave={(e) => {
          if (activeTab !== "audio") {
            e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.2)";
            e.currentTarget.style.borderColor = "rgba(0, 250, 255, 0.1)";
            e.currentTarget.style.color = "rgba(0, 250, 255, 0.6)";
          }
        }}
        onClick={() => setActiveTab("audio")}
      >
        Audio
      </button>
      <button
        className="px-4 py-2 rounded-t-lg transition-all duration-200 flex items-center gap-1"
        style={{
          backgroundColor:
            activeTab === "requirements"
              ? "rgba(0, 250, 255, 0.15)"
              : "rgba(0, 0, 0, 0.2)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: `1px solid ${
            activeTab === "requirements"
              ? "rgba(0, 250, 255, 0.4)"
              : "rgba(0, 250, 255, 0.1)"
          }`,
          color:
            activeTab === "requirements" ? "#00faff" : "rgba(0, 250, 255, 0.6)",
          boxShadow:
            activeTab === "requirements"
              ? "0 0 15px rgba(0, 250, 255, 0.2)"
              : "",
        }}
        onMouseEnter={(e) => {
          if (activeTab !== "requirements") {
            e.currentTarget.style.backgroundColor = "rgba(0, 250, 255, 0.1)";
            e.currentTarget.style.borderColor = "rgba(0, 250, 255, 0.3)";
            e.currentTarget.style.color = "rgba(0, 250, 255, 0.9)";
          }
        }}
        onMouseLeave={(e) => {
          if (activeTab !== "requirements") {
            e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.2)";
            e.currentTarget.style.borderColor = "rgba(0, 250, 255, 0.1)";
            e.currentTarget.style.color = "rgba(0, 250, 255, 0.6)";
          }
        }}
        onClick={() => setActiveTab("requirements")}
      >
        <span className="flex items-center gap-1">
          Requirements
          {!dependenciesReady && (
            <span className="relative flex items-center justify-center">
              <span className="absolute inline-flex h-2 w-2 rounded-full bg-yellow-400 opacity-75 animate-ping"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
            </span>
          )}
        </span>
      </button>
      <button
        className="px-4 py-2 rounded-t-lg transition-all duration-200 flex items-center gap-1"
        style={{
          backgroundColor:
            activeTab === "advanced"
              ? "rgba(0, 250, 255, 0.15)"
              : "rgba(0, 0, 0, 0.2)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: `1px solid ${
            activeTab === "advanced"
              ? "rgba(0, 250, 255, 0.4)"
              : "rgba(0, 250, 255, 0.1)"
          }`,
          color:
            activeTab === "advanced"
              ? "#00faff"
              : dependenciesReady
              ? "rgba(0, 250, 255, 0.6)"
              : "rgba(128, 128, 128, 0.4)",
          boxShadow:
            activeTab === "advanced" ? "0 0 15px rgba(0, 250, 255, 0.2)" : "",
          cursor: dependenciesReady ? "pointer" : "not-allowed",
        }}
        onMouseEnter={(e) => {
          if (activeTab !== "advanced" && dependenciesReady) {
            e.currentTarget.style.backgroundColor = "rgba(0, 250, 255, 0.1)";
            e.currentTarget.style.borderColor = "rgba(0, 250, 255, 0.3)";
            e.currentTarget.style.color = "rgba(0, 250, 255, 0.9)";
          }
        }}
        onMouseLeave={(e) => {
          if (activeTab !== "advanced" && dependenciesReady) {
            e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.2)";
            e.currentTarget.style.borderColor = "rgba(0, 250, 255, 0.1)";
            e.currentTarget.style.color = "rgba(0, 250, 255, 0.6)";
          }
        }}
        onClick={handleAdvancedClick}
        title={!dependenciesReady ? "Install requirements first" : undefined}
      >
        Advanced
        {!dependenciesReady && (
          <LockClosedIcon className="w-3 h-3 text-gray-500" />
        )}
      </button>
    </div>
  );
};

export default SettingsNavigation;
