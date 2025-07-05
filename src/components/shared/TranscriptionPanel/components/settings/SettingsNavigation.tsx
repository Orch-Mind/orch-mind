// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";

interface SettingsNavigationProps {
  activeTab:
    | "general"
    | "advanced"
    | "training"
    | "share"
    | "download"
    | "deploy";
  onTabChange: (
    tab: "general" | "advanced" | "training" | "share" | "download" | "deploy"
  ) => void;
}

const SettingsNavigation: React.FC<SettingsNavigationProps> = ({
  activeTab,
  onTabChange,
}) => {
  const tabs = [
    { id: "general" as const, label: "General", icon: "⚙️" },
    { id: "advanced" as const, label: "Advanced", icon: "🔧" },
    { id: "training" as const, label: "Training", icon: "🎯" },
    { id: "share" as const, label: "Share", icon: "🔗" },
    { id: "download" as const, label: "Download", icon: "📥" },
    { id: "deploy" as const, label: "Deploy", icon: "🚀" },
  ];

  return (
    <div className="mb-6">
      {/* Tab Navigation with improved aesthetics */}
      <div className="flex flex-wrap gap-1 bg-gradient-to-r from-slate-900/60 to-gray-900/60 backdrop-blur-sm rounded-xl p-1.5 border border-cyan-400/10 justify-center">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`group relative flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 min-w-[100px] justify-center ${
              activeTab === tab.id
                ? "bg-gradient-to-r from-cyan-600/40 to-blue-600/40 text-cyan-200 border border-cyan-400/50 shadow-lg shadow-cyan-500/20"
                : "text-gray-400 hover:text-cyan-300 hover:bg-gradient-to-r hover:from-slate-800/50 hover:to-gray-800/50 border border-transparent hover:border-cyan-400/20"
            }`}
          >
            {/* Icon with glow effect for active tab */}
            <span
              className={`text-base transition-all duration-200 ${
                activeTab === tab.id
                  ? "drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]"
                  : "group-hover:drop-shadow-[0_0_4px_rgba(34,211,238,0.3)]"
              }`}
            >
              {tab.icon}
            </span>

            {/* Label */}
            <span className="font-medium tracking-wide">{tab.label}</span>

            {/* Active indicator */}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full"></div>
            )}
          </button>
        ))}
      </div>

      {/* Optional: Tab description */}
      <div className="mt-2 text-center">
        <p className="text-xs text-gray-500">
          {activeTab === "general" &&
            "Basic application settings and preferences"}
          {activeTab === "advanced" &&
            "Advanced configuration and API settings"}
          {activeTab === "training" &&
            "LoRA training configuration and data management"}
          {activeTab === "share" && "P2P sharing and network settings"}
          {activeTab === "download" && "Download adapters from the P2P network"}
          {activeTab === "deploy" && "Deploy and manage your LoRA adapters"}
        </p>
      </div>
    </div>
  );
};

export default SettingsNavigation;
