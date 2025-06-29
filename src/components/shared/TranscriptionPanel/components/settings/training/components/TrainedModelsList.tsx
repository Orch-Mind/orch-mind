// SPDX-License-Identifier: MIT OR Apache-2.0
// Trained Models List Component - Following SRP and KISS
// Single responsibility: Display and manage trained models list

import React from "react";

interface TrainedModelsListProps {
  models: string[];
  isDeleting: boolean;
  isTraining: boolean;
  onDeleteModel: (modelName: string) => void;
}

export const TrainedModelsList: React.FC<TrainedModelsListProps> = ({
  models,
  isDeleting,
  isTraining,
  onDeleteModel,
}) => {
  if (models.length === 0) {
    return (
      <div className="bg-black/20 backdrop-blur-sm rounded-md p-4 border border-cyan-400/20 h-full">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h3 className="text-xs font-semibold text-cyan-400">Models</h3>
            <p className="text-gray-400 text-[9px]">Trained LoRA</p>
          </div>
          <span className="px-2 py-1 bg-cyan-900/30 text-cyan-300 text-[8px] rounded-full">
            0
          </span>
        </div>

        <div className="text-center py-6">
          <svg
            className="w-8 h-8 text-gray-500 mx-auto mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          <p className="text-gray-400 text-[10px] font-medium mb-1">
            No trained models
          </p>
          <p className="text-gray-500 text-[8px]">
            Train your first LoRA model to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black/20 backdrop-blur-sm rounded-md p-4 border border-cyan-400/20 h-full">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h3 className="text-xs font-semibold text-cyan-400">Models</h3>
          <p className="text-gray-400 text-[9px]">Trained LoRA</p>
        </div>
        <span className="px-2 py-1 bg-cyan-900/30 text-cyan-300 text-[8px] rounded-full">
          {models.length}
        </span>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
        {models.map((modelName) => (
          <ModelItem
            key={modelName}
            modelName={modelName}
            isDeleting={isDeleting}
            isTraining={isTraining}
            onDelete={onDeleteModel}
          />
        ))}
      </div>
    </div>
  );
};

// Separate component for individual model item (SRP)
interface ModelItemProps {
  modelName: string;
  isDeleting: boolean;
  isTraining: boolean;
  onDelete: (modelName: string) => void;
}

const ModelItem: React.FC<ModelItemProps> = ({
  modelName,
  isDeleting,
  isTraining,
  onDelete,
}) => {
  const handleDelete = () => {
    onDelete(modelName);
  };

  return (
    <div className="group bg-gray-900/50 border border-gray-600/30 rounded p-3 hover:border-cyan-400/40 transition-all duration-200">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-mono text-[10px] font-medium truncate">
            {modelName}
          </h4>
          <p className="text-[8px] text-gray-400">Custom LoRA Model</p>
          <p className="text-[7px] text-cyan-400 mt-0.5">Ready for inference</p>
        </div>
        <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0 mt-0.5"></div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-[8px] text-gray-500">
          <div>Status: Active</div>
          <div className="text-[7px] text-cyan-400">LoRA r=32, α=64</div>
        </div>
        <button
          onClick={handleDelete}
          disabled={isDeleting || isTraining}
          className="px-2 py-1 bg-red-600/20 border border-red-400/40 text-red-300 text-[8px] rounded hover:bg-red-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDeleting ? "..." : "Delete"}
        </button>
      </div>
    </div>
  );
};
