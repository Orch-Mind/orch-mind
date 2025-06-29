// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";
import { SettingsNavigationProps } from "./types";

/**
 * Apenas estendendo o tipo SettingsNavigationProps para futuros parâmetros
 */
interface ExtendedSettingsNavigationProps extends SettingsNavigationProps {}

/**
 * Componente para a navegação entre as abas do modal de configurações
 * Simbolicamente representa o cortex de navegação entre contextos neurais de configuração
 */
const SettingsNavigation: React.FC<ExtendedSettingsNavigationProps> = ({
  activeTab,
  setActiveTab,
}) => {
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
            activeTab === "advanced" ? "#00faff" : "rgba(0, 250, 255, 0.6)",
          boxShadow:
            activeTab === "advanced" ? "0 0 15px rgba(0, 250, 255, 0.2)" : "",
        }}
        onMouseEnter={(e) => {
          if (activeTab !== "advanced") {
            e.currentTarget.style.backgroundColor = "rgba(0, 250, 255, 0.1)";
            e.currentTarget.style.borderColor = "rgba(0, 250, 255, 0.3)";
            e.currentTarget.style.color = "rgba(0, 250, 255, 0.9)";
          }
        }}
        onMouseLeave={(e) => {
          if (activeTab !== "advanced") {
            e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.2)";
            e.currentTarget.style.borderColor = "rgba(0, 250, 255, 0.1)";
            e.currentTarget.style.color = "rgba(0, 250, 255, 0.6)";
          }
        }}
        onClick={() => setActiveTab("advanced")}
      >
        Advanced
      </button>

      {/* Training Settings */}
      <button
        className="px-4 py-2 rounded-t-lg transition-all duration-200"
        style={{
          backgroundColor:
            activeTab === "training"
              ? "rgba(0, 250, 255, 0.15)"
              : "rgba(0, 0, 0, 0.2)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: `1px solid ${
            activeTab === "training"
              ? "rgba(0, 250, 255, 0.4)"
              : "rgba(0, 250, 255, 0.1)"
          }`,
          color:
            activeTab === "training" ? "#00faff" : "rgba(0, 250, 255, 0.6)",
          boxShadow:
            activeTab === "training" ? "0 0 15px rgba(0, 250, 255, 0.2)" : "",
        }}
        onMouseEnter={(e) => {
          if (activeTab !== "training") {
            e.currentTarget.style.backgroundColor = "rgba(0, 250, 255, 0.1)";
            e.currentTarget.style.borderColor = "rgba(0, 250, 255, 0.3)";
            e.currentTarget.style.color = "rgba(0, 250, 255, 0.9)";
          }
        }}
        onMouseLeave={(e) => {
          if (activeTab !== "training") {
            e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.2)";
            e.currentTarget.style.borderColor = "rgba(0, 250, 255, 0.1)";
            e.currentTarget.style.color = "rgba(0, 250, 255, 0.6)";
          }
        }}
        onClick={() => setActiveTab("training")}
      >
        Training
      </button>
    </div>
  );
};

export default SettingsNavigation;
