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
        className={`px-4 py-2 rounded-t-lg ${
          activeTab === "general"
            ? "bg-cyan-500/20 text-cyan-300"
            : "text-cyan-400/60 hover:text-cyan-300"
        } transition-all duration-200`}
        onClick={() => setActiveTab("general")}
      >
        General
      </button>
      <button
        className={`px-4 py-2 rounded-t-lg ${
          activeTab === "interface"
            ? "bg-cyan-500/20 text-cyan-300"
            : "text-cyan-400/60 hover:text-cyan-300"
        } transition-all duration-200`}
        onClick={() => setActiveTab("interface")}
      >
        Interface
      </button>
      <button
        className={`px-4 py-2 rounded-t-lg ${
          activeTab === "audio"
            ? "bg-cyan-500/20 text-cyan-300"
            : "text-cyan-400/60 hover:text-cyan-300"
        } transition-all duration-200`}
        onClick={() => setActiveTab("audio")}
      >
        Audio
      </button>
      <button
        className={`px-4 py-2 rounded-t-lg ${
          activeTab === "requirements"
            ? "bg-cyan-500/20 text-cyan-300"
            : "text-cyan-400/60 hover:text-cyan-300"
        } transition-all duration-200 flex items-center gap-1`}
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
        className={`px-4 py-2 rounded-t-lg ${
          activeTab === "advanced"
            ? "bg-cyan-500/20 text-cyan-300"
            : dependenciesReady
            ? "text-cyan-400/60 hover:text-cyan-300"
            : "text-gray-500/40 cursor-not-allowed"
        } transition-all duration-200 flex items-center gap-1`}
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
