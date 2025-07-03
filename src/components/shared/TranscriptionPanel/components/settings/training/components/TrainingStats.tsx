// SPDX-License-Identifier: MIT OR Apache-2.0
// Training Statistics Component - Following SRP and KISS
// Single responsibility: Display training statistics in a clean format

import React from "react";

interface TrainingStatsData {
  totalConversations: number;
  selectedConversations: number;
  totalMessages: number;
  validPairs: number;
  lastTraining?: string;
}

interface TrainingStatsProps {
  stats: TrainingStatsData;
  adaptersCount: number;
}

const TrainingStats: React.FC<TrainingStatsProps> = ({
  stats,
  adaptersCount,
}) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Unknown";
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-900/50 to-indigo-900/50 backdrop-blur-sm rounded-md p-3 border border-blue-400/20">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-blue-500/20 rounded-sm flex items-center justify-center">
            <svg
              className="w-3 h-3 text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white">Training Stats</h3>
            <p className="text-blue-300 text-[9px]">Data & Adapters</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[10px]">
        {/* Conversations */}
        <div className="bg-blue-500/10 rounded p-1.5">
          <div className="flex items-center justify-between">
            <span className="text-blue-300">Conversations</span>
            <span className="text-white font-mono">
              {stats.selectedConversations}/{stats.totalConversations}
            </span>
          </div>
        </div>

        {/* Training Pairs */}
        <div className="bg-green-500/10 rounded p-1.5">
          <div className="flex items-center justify-between">
            <span className="text-green-300">Valid Pairs</span>
            <span className="text-white font-mono">{stats.validPairs}</span>
          </div>
        </div>

        {/* LoRA Adapters */}
        <div className="bg-purple-500/10 rounded p-1.5">
          <div className="flex items-center justify-between">
            <span className="text-purple-300">LoRA Adapters</span>
            <span className="text-white font-mono">{adaptersCount}</span>
          </div>
        </div>

        {/* Messages */}
        <div className="bg-yellow-500/10 rounded p-1.5">
          <div className="flex items-center justify-between">
            <span className="text-yellow-300">Messages</span>
            <span className="text-white font-mono">{stats.totalMessages}</span>
          </div>
        </div>
      </div>

      {/* Last Training */}
      <div className="mt-2 pt-2 border-t border-blue-400/20">
        <div className="flex items-center justify-between text-[9px]">
          <span className="text-blue-300">Last Training:</span>
          <span className="text-gray-300">
            {formatDate(stats.lastTraining)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TrainingStats;
