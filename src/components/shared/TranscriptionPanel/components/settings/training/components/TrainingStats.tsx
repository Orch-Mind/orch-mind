// SPDX-License-Identifier: MIT OR Apache-2.0
// Training Statistics Component - Following SRP and KISS
// Single responsibility: Display comprehensive training statistics

import React from "react";

interface TrainingStatsData {
  totalConversations: number;
  selectedConversations: number;
  totalMessages: number;
  validPairs: number;
  lastTraining?: string;
  processedConversations?: number;
  pendingConversations?: number;
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

  // Calculate additional metrics
  const avgMessagesPerConv =
    stats.totalConversations > 0
      ? Math.round(stats.totalMessages / stats.totalConversations)
      : 0;

  const avgPairsPerConv =
    stats.totalConversations > 0
      ? Math.round(stats.validPairs / stats.totalConversations)
      : 0;

  // Enhanced Quality Calculation based on Conversation Quality (CQ) best practices
  const calculateConversationQuality = () => {
    // Return 0 if no data or no valid pairs for training
    if (
      stats.totalMessages === 0 ||
      stats.totalConversations === 0 ||
      stats.validPairs === 0
    ) {
      return 0;
    }

    // 1. Pair Efficiency (40% weight) - How many messages form valid training pairs
    const pairEfficiency = (stats.validPairs * 2) / stats.totalMessages;

    // 2. Conversation Density (30% weight) - Average pairs per conversation
    // Good conversations should have 3-8 meaningful exchanges
    const avgPairsPerConversation = stats.validPairs / stats.totalConversations;
    const densityScore = Math.min(avgPairsPerConversation / 6, 1); // Normalize to 6 as optimal

    // 3. Conversation Length Quality (20% weight) - Optimal length conversations
    // Too short (< 4 messages) or too long (> 50 messages) are less valuable
    const avgLength = stats.totalMessages / stats.totalConversations;
    let lengthQuality = 1;
    if (avgLength < 4) {
      lengthQuality = avgLength / 4; // Penalty for too short
    } else if (avgLength > 50) {
      lengthQuality = Math.max(0.5, 50 / avgLength); // Penalty for too long
    }

    // 4. Data Completeness (10% weight) - Always 1 when we have valid pairs
    const completeness = 1;

    // Weighted final score
    const qualityScore =
      (pairEfficiency * 0.4 +
        densityScore * 0.3 +
        lengthQuality * 0.2 +
        completeness * 0.1) *
      100;

    return Math.round(Math.min(qualityScore, 100));
  };

  const conversationQuality = calculateConversationQuality();

  // Get quality rating based on score
  const getQualityRating = (score: number) => {
    if (score >= 80) return { label: "Excellent", color: "text-green-400" };
    if (score >= 65) return { label: "Good", color: "text-blue-400" };
    if (score >= 50) return { label: "Fair", color: "text-yellow-400" };
    if (score >= 30) return { label: "Poor", color: "text-orange-400" };
    return { label: "Very Poor", color: "text-red-400" };
  };

  const qualityRating = getQualityRating(conversationQuality);

  // Get last training from localStorage
  const getLastTrainingDate = () => {
    try {
      const adaptersData = localStorage.getItem("orch-lora-adapters");
      if (adaptersData) {
        const parsed = JSON.parse(adaptersData);
        if (
          parsed.adapters &&
          Array.isArray(parsed.adapters) &&
          parsed.adapters.length > 0
        ) {
          // Get the most recent adapter creation date
          const sortedAdapters = parsed.adapters
            .filter((adapter: any) => adapter.createdAt)
            .sort(
              (a: any, b: any) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
            );

          if (sortedAdapters.length > 0) {
            return sortedAdapters[0].createdAt;
          }
        }
      }
    } catch (error) {
      console.error("[TrainingStats] Error getting last training date:", error);
    }
    return null;
  };

  const lastTrainingDate = getLastTrainingDate();

  return (
    <div className="bg-gradient-to-r from-blue-900/50 to-indigo-900/50 backdrop-blur-sm rounded-md p-3 border border-blue-400/20 h-52 overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 bg-blue-500/20 rounded-sm flex items-center justify-center">
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
            <h3 className="text-sm font-semibold text-white">Training Stats</h3>
            <p className="text-blue-300 text-[8px]">Data Overview</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-mono text-cyan-400">{adaptersCount}</div>
          <div className="text-[7px] text-gray-400">Adapters</div>
        </div>
      </div>

      <div className="space-y-2">
        {/* General Statistics Grid */}
        <div className="grid grid-cols-2 gap-2 text-[9px]">
          {/* Total Conversations */}
          <div className="bg-blue-500/10 rounded p-1.5">
            <div className="flex items-center justify-between">
              <span className="text-blue-300 font-medium">Conversations</span>
              <span className="text-white font-mono text-sm">
                {stats.totalConversations}
              </span>
            </div>
            <div className="text-[7px] text-gray-400 mt-0.5">
              Total available
            </div>
          </div>

          {/* Total Messages */}
          <div className="bg-yellow-500/10 rounded p-1.5">
            <div className="flex items-center justify-between">
              <span className="text-yellow-300 font-medium">Messages</span>
              <span className="text-white font-mono text-sm">
                {stats.totalMessages}
              </span>
            </div>
            <div className="text-[7px] text-gray-400 mt-0.5">
              ~{avgMessagesPerConv} avg per conv
            </div>
          </div>

          {/* Valid Pairs */}
          <div className="bg-green-500/10 rounded p-1.5">
            <div className="flex items-center justify-between">
              <span className="text-green-300 font-medium">Valid Pairs</span>
              <span className="text-white font-mono text-sm">
                {stats.validPairs}
              </span>
            </div>
            <div className="text-[7px] text-gray-400 mt-0.5">
              ~{avgPairsPerConv} avg per conv
            </div>
          </div>

          {/* Enhanced Quality Score */}
          <div className="bg-cyan-500/10 rounded p-1.5">
            <div className="flex items-center justify-between">
              <span className="text-cyan-300 font-medium">Quality</span>
              <span className={`font-mono text-sm ${qualityRating.color}`}>
                {conversationQuality}%
              </span>
            </div>
            <div className="text-[7px] text-gray-400 mt-0.5">
              {qualityRating.label}
            </div>
          </div>
        </div>

        {/* Last Training Information */}
        {lastTrainingDate && (
          <div className="bg-gray-800/50 rounded-lg p-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-gray-300 font-medium">
                  Last Training
                </span>
              </div>
              <span className="text-xs text-cyan-400 font-mono">
                {formatDate(lastTrainingDate)}
              </span>
            </div>
            <div className="text-[7px] text-gray-400 mt-0.5">
              Most recent adapter creation
            </div>
          </div>
        )}

        {/* Enhanced Data Summary */}
        <div className="bg-gray-800/30 rounded-lg p-2">
          <div className="text-xs text-gray-300 mb-1">
            <div className="font-medium text-cyan-300 mb-0.5 text-[9px]">
              Quality Analysis:
            </div>
            <div className="text-[8px] text-gray-400">
              {stats.totalConversations} conversations with {stats.validPairs}{" "}
              training pairs. Quality:{" "}
              <span className={qualityRating.color}>
                {conversationQuality}% ({qualityRating.label})
              </span>{" "}
              based on pair density, conversation length, and data completeness.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainingStats;
