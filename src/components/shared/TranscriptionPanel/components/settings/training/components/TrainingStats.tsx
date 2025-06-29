// SPDX-License-Identifier: MIT OR Apache-2.0
// Training Statistics Component - Following SRP and KISS
// Single responsibility: Display training statistics in a clean format

import React from 'react';
import type { TrainingStats as StatsType } from '../types';

interface TrainingStatsProps {
  stats: StatsType;
  trainedModelsCount: number;
}

export const TrainingStats: React.FC<TrainingStatsProps> = ({ 
  stats, 
  trainedModelsCount 
}) => {
  const readyCount = stats.pendingConversations;

  return (
    <div className="grid grid-cols-4 gap-2">
      {/* Total Conversations */}
      <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 backdrop-blur-sm rounded-md p-2 border border-cyan-400/20">
        <div className="text-center">
          <p className="text-[8px] text-cyan-300 uppercase tracking-wider font-medium">
            Chats
          </p>
          <p className="text-sm font-bold text-white">
            {stats.totalConversations}
          </p>
        </div>
      </div>

      {/* Total Messages */}
      <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 backdrop-blur-sm rounded-md p-2 border border-green-400/20">
        <div className="text-center">
          <p className="text-[8px] text-green-300 uppercase tracking-wider font-medium">
            Messages
          </p>
          <p className="text-sm font-bold text-white">
            {stats.totalMessages}
          </p>
        </div>
      </div>

      {/* Trained Models */}
      <div className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 backdrop-blur-sm rounded-md p-2 border border-yellow-400/20">
        <div className="text-center">
          <p className="text-[8px] text-yellow-300 uppercase tracking-wider font-medium">
            Trained
          </p>
          <p className="text-sm font-bold text-white">
            {trainedModelsCount}
          </p>
        </div>
      </div>

      {/* Ready for Training */}
      <div className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 backdrop-blur-sm rounded-md p-2 border border-purple-400/20">
        <div className="text-center">
          <p className="text-[8px] text-purple-300 uppercase tracking-wider font-medium">
            Ready
          </p>
          <p className="text-sm font-bold text-white">
            {readyCount}
          </p>
        </div>
      </div>
    </div>
  );
};